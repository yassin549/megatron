import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, Prisma } from '@megatron/database';
import { solveDeltaShares, calculateSellRevenue, TradeEvent, MONETARY_CONFIG, validateParams, calculateBuyCost, solveDeltaSharesFromRevenue } from '@megatron/lib-common';
import { Redis } from 'ioredis';

// Initialize Redis
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const CONFIG = MONETARY_CONFIG;

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { type, assetId, amount, stopLoss, takeProfit } = body;
    // Guidelines:
    // BUY: amount is USDC usually. IF 'shares' provided in body, amounts to specific shares.
    // SELL: amount is SHARES.

    if (!type || !['buy', 'sell'].includes(type)) {
        return NextResponse.json({ error: 'Invalid trade type' }, { status: 400 });
    }
    if (!assetId) {
        return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Amount validation
    if (!amount && !body.shares) {
        return NextResponse.json({ error: 'Amount or shares required' }, { status: 400 });
    }

    const tradeAmount = amount ? parseFloat(amount) : 0;
    const sl = stopLoss !== undefined ? parseFloat(stopLoss) : undefined;
    const tp = takeProfit !== undefined ? parseFloat(takeProfit) : undefined;

    try {
        const result = await db.$transaction(async (tx: any) => {
            const asset = await tx.asset.findUnique({
                where: { id: assetId },
                include: { pool: true },
            });

            if (!asset) throw new Error('Asset not found');
            if (asset.status !== 'active' && asset.status !== 'funding') throw new Error(`Asset is not active`);

            const params = asset.pricingParams as { P0: number; k: number } | null;
            if (!params) throw new Error('Asset has no pricing params');
            const { P0, k } = params;

            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user) throw new Error('User not found');
            if (user.isBlacklisted) throw new Error('User is blacklisted');

            // Fetch current position
            const position = await tx.position.findUnique({
                where: { userId_assetId: { userId, assetId } }
            });

            const currentShares = position ? position.shares.toNumber() : 0;
            const currentCollateral = position ? (position.collateral?.toNumber() || 0) : 0;

            let tradeRecord;
            let outputAmount = 0;

            if (type === 'buy') {
                // ==========================================
                // BUY LOGIC (Long Entry OR Short Cover)
                // ==========================================

                const currentSupply = asset.totalSupply.toNumber();

                // Determine netAmount (USDC)
                let netAmount = 0;
                let usedTradeAmount = 0;
                let deltaShares = 0;

                // Support buying specific SHARE amount (e.g. covering short)
                if (body.shares) {
                    const targetShares = parseFloat(body.shares);
                    if (targetShares <= 0) throw new Error('Invalid share amount');

                    // Calculate required USDC to buy targetShares
                    // Cost is Net. User needs to Pay (Cost / (1 - SwapFee)).
                    const costNet = calculateBuyCost(P0, k, currentSupply, targetShares);
                    const costGross = costNet / (1 - CONFIG.SWAP_FEE);

                    usedTradeAmount = costGross;
                    netAmount = costNet;
                    deltaShares = targetShares;
                    outputAmount = targetShares;
                } else {
                    // Standard Amount (USDC) input
                    usedTradeAmount = tradeAmount;
                    const fee = usedTradeAmount * CONFIG.SWAP_FEE;
                    netAmount = usedTradeAmount - fee;
                    deltaShares = solveDeltaShares(P0, k, currentSupply, netAmount);
                    outputAmount = deltaShares;
                }

                // Re-calculate Fee for records
                const fee = usedTradeAmount * CONFIG.SWAP_FEE;
                const lpFee = fee * CONFIG.LP_SHARE;
                const platformFee = fee * CONFIG.PLATFORM_SHARE;

                // LOGIC BRANCH: Are we covering a short?
                if (currentShares < 0) {
                    // --- COVER SHORT ---
                    // Prevent over-covering
                    if (currentShares + deltaShares > 0.0001) {
                        throw new Error('Cannot flip position (Short -> Long) in one trade. Buy only enough to cover.');
                    }

                    const cost = usedTradeAmount; // Total user needs to pay

                    // Release Collateral
                    const fraction = deltaShares / Math.abs(currentShares);
                    const releasedCollateral = currentCollateral * fraction;

                    // Check Balance: Wallet + Released Collateral >= Cost
                    if (user.walletHotBalance.toNumber() + releasedCollateral < cost) {
                        throw new Error('Insufficient collateral + wallet balance to cover.');
                    }

                    const refund = releasedCollateral - cost;

                    await tx.user.update({
                        where: { id: userId },
                        data: { walletHotBalance: { increment: refund } }
                    });

                    // Update Position
                    await tx.position.update({
                        where: { userId_assetId: { userId, assetId } },
                        data: {
                            shares: { increment: deltaShares },
                            collateral: { decrement: releasedCollateral },
                        }
                    });

                    // Update Asset Supply
                    await tx.asset.update({
                        where: { id: assetId },
                        data: { totalSupply: { increment: deltaShares } }
                    });

                    if (asset.pool) {
                        await tx.liquidityPool.update({
                            where: { id: asset.pool.id },
                            data: { totalUsdc: { increment: netAmount } }
                        });
                    }

                } else {
                    // --- NORMAL LONG ---
                    if (user.walletHotBalance.lessThan(usedTradeAmount)) {
                        throw new Error(`Insufficient funds. Need ${usedTradeAmount.toFixed(2)} USDC.`);
                    }

                    await tx.user.update({
                        where: { id: userId },
                        data: { walletHotBalance: { decrement: usedTradeAmount } },
                    });

                    await tx.asset.update({
                        where: { id: assetId },
                        data: { totalSupply: { increment: deltaShares } },
                    });

                    if (asset.pool) {
                        await tx.liquidityPool.update({
                            where: { id: asset.pool.id },
                            data: { totalUsdc: { increment: netAmount } },
                        });
                    }

                    // Create/Update Position
                    if (position) {
                        const oldShares = position.shares.toNumber();
                        const oldTotalCost = oldShares * position.avgPrice.toNumber();
                        const newTotalCost = oldTotalCost + netAmount;
                        const newTotalShares = oldShares + deltaShares;
                        await tx.position.update({
                            where: { userId_assetId: { userId, assetId } },
                            data: {
                                shares: newTotalShares,
                                avgPrice: newTotalCost / newTotalShares,
                                stopLoss: sl !== undefined ? sl : undefined,
                                takeProfit: tp !== undefined ? tp : undefined,
                            }
                        });
                    } else {
                        await tx.position.create({
                            data: {
                                userId, assetId,
                                shares: deltaShares,
                                avgPrice: netAmount / deltaShares,
                                stopLoss: sl !== undefined ? sl : null,
                                takeProfit: tp !== undefined ? tp : null,
                            }
                        });
                    }
                }

                // Common Fee Updates
                try {
                    await tx.platformTreasury.upsert({
                        where: { id: 'treasury' },
                        create: { id: 'treasury', balance: platformFee },
                        update: { balance: { increment: platformFee } },
                    });
                } catch (e) { }

                tradeRecord = await tx.trade.create({
                    data: {
                        assetId, buyerId: userId,
                        quantity: deltaShares,
                        price: netAmount / deltaShares,
                        fee, side: 'buy',
                        timestamp: new Date(),
                    },
                });

                await tx.ledger.create({
                    data: {
                        userId, deltaAmount: -usedTradeAmount, currency: 'USDC', reason: 'trade', refId: tradeRecord.id,
                        metadata: { type: 'buy', assetId, shares: deltaShares },
                    },
                });

            } else {
                // ==========================================
                // SELL LOGIC (Exit Long OR Open Short)
                // ==========================================

                let shareAmount = 0;
                let grossUsdc = 0;
                const currentSupply = asset.totalSupply.toNumber();

                // If body.shares is provided (like from handleExitPosition), use it as raw shares.
                // Otherwise, use tradeAmount as USDC.
                if (body.shares) {
                    shareAmount = parseFloat(body.shares);
                    grossUsdc = calculateSellRevenue(P0, k, currentSupply, shareAmount);
                } else {
                    // tradeAmount is USDC
                    grossUsdc = tradeAmount;
                    shareAmount = solveDeltaSharesFromRevenue(P0, k, currentSupply, grossUsdc);
                }

                outputAmount = grossUsdc;

                const fee = grossUsdc * CONFIG.SWAP_FEE;
                const netUsdc = grossUsdc - fee;
                const lpFee = fee * CONFIG.LP_SHARE;
                const platformFee = fee * CONFIG.PLATFORM_SHARE;

                if (currentShares > 0) {
                    // --- EXIT LONG ---
                    if (currentShares < shareAmount) {
                        // Flip not supported yet
                        throw new Error('Insufficient shares to sell. To short, please close position first.');
                    }

                    await tx.position.update({
                        where: { userId_assetId: { userId, assetId } },
                        data: { shares: { decrement: shareAmount } }
                    });

                    await tx.asset.update({
                        where: { id: assetId },
                        data: { totalSupply: { decrement: shareAmount } }
                    });

                    await tx.user.update({
                        where: { id: userId },
                        data: { walletHotBalance: { increment: netUsdc } }
                    });

                    if (asset.pool) {
                        await tx.liquidityPool.update({
                            where: { id: asset.pool.id },
                            data: { totalUsdc: { decrement: grossUsdc } }
                        });
                    }

                } else {
                    // --- OPEN SHORT ---
                    // Only allowed if currentShares <= 0 (already short or neutral)

                    // 1. Calculate Collateral Requirement
                    // Proceeds = grossUsdc.
                    // User Margin = 100% of Proceeds
                    const marginRequired = grossUsdc;
                    const totalCollateralLock = grossUsdc + marginRequired;

                    // Check Balance
                    if (user.walletHotBalance.toNumber() < marginRequired) {
                        throw new Error(`Insufficient funds for Short Margin. Need ${marginRequired.toFixed(2)} USDC.`);
                    }

                    // Action
                    // 1. Lock User Margin
                    await tx.user.update({
                        where: { id: userId },
                        data: { walletHotBalance: { decrement: marginRequired } }
                    });

                    // 2. Reduce Supply (Price Drops)
                    await tx.asset.update({
                        where: { id: assetId },
                        data: { totalSupply: { decrement: shareAmount } }
                    });

                    // 3. Pool pays out grossUsdc... INTO Collateral
                    if (asset.pool) {
                        if (asset.pool.totalUsdc.toNumber() < grossUsdc) {
                            throw new Error(`Insufficient liquidity in pool to facilitate this short. Pool only has ${asset.pool.totalUsdc.toFixed(2)} USDC.`);
                        }
                        await tx.liquidityPool.update({
                            where: { id: asset.pool.id },
                            data: { totalUsdc: { decrement: grossUsdc } }
                        });
                    }

                    // 4. Update/Create Position
                    if (position) {
                        await tx.position.update({
                            where: { userId_assetId: { userId, assetId } },
                            data: {
                                shares: { decrement: shareAmount }, // Becomes negative
                                collateral: { increment: totalCollateralLock },
                            }
                        });
                    } else {
                        await tx.position.create({
                            data: {
                                userId, assetId,
                                shares: -shareAmount,
                                avgPrice: grossUsdc / shareAmount,
                                collateral: totalCollateralLock,
                                stopLoss: sl !== undefined ? sl : null,
                                takeProfit: tp !== undefined ? tp : null,
                            }
                        });
                    }
                }

                // Common Fee Updates
                try {
                    await tx.platformTreasury.upsert({
                        where: { id: 'treasury' },
                        create: { id: 'treasury', balance: platformFee },
                        update: { balance: { increment: platformFee } },
                    });
                } catch (e) { }


                tradeRecord = await tx.trade.create({
                    data: {
                        assetId, buyerId: userId,
                        quantity: shareAmount,
                        price: grossUsdc / shareAmount,
                        fee, side: 'sell',
                        timestamp: new Date(),
                    },
                });

                await tx.ledger.create({
                    data: {
                        userId, deltaAmount: netUsdc, currency: 'USDC', reason: 'trade', refId: tradeRecord.id,
                        metadata: { type: 'sell', assetId, shares: shareAmount },
                    },
                });
            }

            return { trade: tradeRecord, outputAmount };
        }, { maxWait: 5000, timeout: 10000 });

        const event: TradeEvent = {
            type: 'trade',
            assetId,
            tradeId: result.trade.id,
            price: result.trade.price.toNumber(),
            quantity: result.trade.quantity.toNumber(),
            buyerId: userId,
            timestamp: result.trade.timestamp.getTime(),
            volume5m: 0,
        };
        redis.publish('megatron:events', JSON.stringify(event)).catch(console.error);

        return NextResponse.json({ success: true, tradeId: result.trade.id, outputAmount: result.outputAmount });

    } catch (error: any) {
        console.error('Trade failed:', error);
        return NextResponse.json({ error: error.message || 'Trade failed' }, { status: 500 });
    }
}
