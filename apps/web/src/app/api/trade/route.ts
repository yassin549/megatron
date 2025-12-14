import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, Prisma } from '@megatron/database';
import { solveDeltaShares, calculateSellRevenue, TradeEvent } from '@megatron/lib-common';
import { Redis } from 'ioredis';

// Initialize Redis for publishing events
// We use the same URL as the worker to ensure they talk on the same channel
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const CONFIG = {
    SWAP_FEE: 0.005,
    LP_SHARE: 0.9,
    PLATFORM_SHARE: 0.1,
};

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

    const { type, assetId, amount } = body; // amount is USDC for buy, Shares for sell

    if (!type || !['buy', 'sell'].includes(type)) {
        return NextResponse.json({ error: 'Invalid trade type' }, { status: 400 });
    }
    if (!assetId || !amount || parseFloat(amount) <= 0) {
        return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const tradeAmount = parseFloat(amount);

    try {
        const result = await db.$transaction(async (tx: any) => {
            // 1. Fetch Asset
            const asset = await tx.asset.findUnique({
                where: { id: assetId },
                include: { pool: true },
            });

            if (!asset) throw new Error('Asset not found');
            if (asset.status !== 'active') throw new Error(`Asset is not active (status: ${asset.status})`);

            // Check pricing params
            const params = asset.pricingParams as { P0: number; k: number } | null;
            if (!params) throw new Error('Asset has no pricing params');
            const { P0, k } = params;

            // Fetch User
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user) throw new Error('User not found');
            if (user.isBlacklisted) throw new Error('User is blacklisted');

            let tradeRecord;
            let outputAmount;

            if (type === 'buy') {
                // --- BUY LOGIC ---
                // User inputs USDC amount
                if (user.walletHotBalance.lessThan(tradeAmount)) {
                    throw new Error(`Insufficient funds`);
                }

                // Calc fees
                const fee = tradeAmount * CONFIG.SWAP_FEE;
                const netAmount = tradeAmount - fee;
                const currentSupply = asset.totalSupply.toNumber();

                // Calc output shares
                const deltaShares = solveDeltaShares(P0, k, currentSupply, netAmount);
                outputAmount = deltaShares;

                // Distribution
                const lpFee = fee * CONFIG.LP_SHARE;
                const platformFee = fee * CONFIG.PLATFORM_SHARE;

                // Updates
                await tx.user.update({
                    where: { id: userId },
                    data: { walletHotBalance: { decrement: tradeAmount } },
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

                // Platform Fee
                try {
                    await tx.platformTreasury.upsert({
                        where: { id: 'treasury' },
                        create: { id: 'treasury', balance: platformFee },
                        update: { balance: { increment: platformFee } },
                    });
                } catch (err) {
                    // Ignore if treasury table doesn't exist yet (migration issue), log it
                    console.warn("Treasury update failed", err);
                }

                // LP Fees
                if (asset.pool) {
                    const lps = await tx.lPShare.findMany({ where: { poolId: asset.pool.id } });
                    const totalLpShares = asset.pool.totalLPShares.toNumber();
                    if (totalLpShares > 0) {
                        for (const lp of lps) {
                            const share = lp.lpShares.toNumber() / totalLpShares;
                            await tx.lPShare.update({
                                where: { id: lp.id },
                                data: { unclaimedRewards: { increment: lpFee * share } },
                            });
                        }
                    }
                }

                // Record Trade
                tradeRecord = await tx.trade.create({
                    data: {
                        assetId,
                        buyerId: userId,
                        quantity: deltaShares,
                        price: netAmount / deltaShares,
                        fee,
                        side: 'buy',
                        timestamp: new Date(),
                    },
                });

                // Update Position
                const existingPosition = await tx.position.findUnique({
                    where: { userId_assetId: { userId, assetId } },
                });

                if (existingPosition) {
                    const oldShares = existingPosition.shares.toNumber();
                    const oldTotalCost = oldShares * existingPosition.avgPrice.toNumber();
                    const newTotalCost = oldTotalCost + netAmount;
                    const newTotalShares = oldShares + deltaShares;
                    await tx.position.update({
                        where: { userId_assetId: { userId, assetId } },
                        data: { shares: newTotalShares, avgPrice: newTotalCost / newTotalShares },
                    });
                } else {
                    await tx.position.create({
                        data: {
                            userId,
                            assetId,
                            shares: deltaShares,
                            avgPrice: netAmount / deltaShares,
                        },
                    });
                }

                // Ledger
                await tx.ledger.create({
                    data: {
                        userId,
                        deltaAmount: -tradeAmount,
                        currency: 'USDC',
                        reason: 'trade',
                        refId: tradeRecord.id,
                        metadata: { type: 'buy', assetId, shares: deltaShares },
                    },
                });

            } else {
                // --- SELL LOGIC ---
                // User inputs SHARE amount
                const position = await tx.position.findUnique({
                    where: { userId_assetId: { userId, assetId } }
                });

                if (!position || position.shares.lessThan(tradeAmount)) {
                    throw new Error('Insufficient shares');
                }

                const currentSupply = asset.totalSupply.toNumber();
                const grossUsdc = calculateSellRevenue(P0, k, currentSupply, tradeAmount);
                outputAmount = grossUsdc;

                const fee = grossUsdc * CONFIG.SWAP_FEE;
                const netUsdc = grossUsdc - fee;
                const lpFee = fee * CONFIG.LP_SHARE;
                const platformFee = fee * CONFIG.PLATFORM_SHARE;

                // Updates
                await tx.position.update({
                    where: { userId_assetId: { userId, assetId } },
                    data: { shares: { decrement: tradeAmount } }
                });

                await tx.asset.update({
                    where: { id: assetId },
                    data: { totalSupply: { decrement: tradeAmount } }
                });

                if (asset.pool) {
                    await tx.liquidityPool.update({
                        where: { id: asset.pool.id },
                        data: { totalUsdc: { decrement: grossUsdc } }
                    });
                }

                await tx.user.update({
                    where: { id: userId },
                    data: { walletHotBalance: { increment: netUsdc } }
                });

                // Platform Fee
                try {
                    await tx.platformTreasury.upsert({
                        where: { id: 'treasury' },
                        create: { id: 'treasury', balance: platformFee },
                        update: { balance: { increment: platformFee } },
                    });
                } catch (err) {
                    console.warn("Treasury update failed", err);
                }

                // LP Fees
                if (asset.pool) {
                    const lps = await tx.lPShare.findMany({ where: { poolId: asset.pool.id } });
                    const totalLpShares = asset.pool.totalLPShares.toNumber();
                    if (totalLpShares > 0) {
                        for (const lp of lps) {
                            const share = lp.lpShares.toNumber() / totalLpShares;
                            await tx.lPShare.update({
                                where: { id: lp.id },
                                data: { unclaimedRewards: { increment: lpFee * share } },
                            });
                        }
                    }
                }

                tradeRecord = await tx.trade.create({
                    data: {
                        assetId,
                        buyerId: userId,
                        quantity: tradeAmount,
                        price: grossUsdc / tradeAmount,
                        fee,
                        side: 'sell',
                        timestamp: new Date(),
                    },
                });

                await tx.ledger.create({
                    data: {
                        userId,
                        deltaAmount: netUsdc,
                        currency: 'USDC',
                        reason: 'trade',
                        refId: tradeRecord.id,
                        metadata: { type: 'sell', assetId, shares: tradeAmount },
                    },
                });
            }

            return { trade: tradeRecord, outputAmount };
        }, {
            maxWait: 5000,
            timeout: 10000
        });

        // Publish Event for Price Engine
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
        // Fire and forget
        redis.publish('megatron:events', JSON.stringify(event)).catch(console.error);

        return NextResponse.json({ success: true, tradeId: result.trade.id, outputAmount: result.outputAmount });

    } catch (error: any) {
        console.error('Trade execution failed:', error);
        return NextResponse.json({ error: error.message || 'Trade failed' }, { status: 500 });
    }
}
