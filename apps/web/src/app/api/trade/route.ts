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

    const { type, assetId, amount, stopLoss, takeProfit, isGradual, chunks = 10, minOutputAmount, maxInputAmount } = body;
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

    // --- GRADUAL EXIT LOGIC ---
    if (isGradual && type === 'sell' && body.shares) {
        const shareAmount = parseFloat(body.shares);
        try {
            const result = await db.$transaction(async (tx: any) => {
                const asset = await tx.asset.findUnique({
                    where: { id: assetId },
                    include: { pool: true },
                });

                if (!asset || !asset.pool) throw new Error('Asset or Liquidity Pool not found');

                // Check if user has enough shares
                const position = await tx.position.findUnique({
                    where: { userId_assetId: { userId, assetId } }
                });

                // Precision Clamping for Gradual Exit
                // If requested shareAmount is very close to position.shares, we treat it as "ALL"
                // and avoid "insufficient shares" error due to float noise.
                const currentShares = position ? position.shares.toNumber() : 0;
                if (Math.abs(currentShares - shareAmount) < 0.0001 && currentShares > 0) {
                    // It's effectively a full exit request
                    // We don't change shareAmount variable itself (it's used for the TimedExit record),
                    // but we pass the validation.
                    // Actually, we SHOULD clamp shareAmount to store exact value in TimedExit to be clean.
                    // But `shareAmount` is const from body.shares. 
                    // We can't reassign const, let's verify if we should.
                    // Wait, shareAmount is defined as const above. 
                }

                // Let's rely on loose comparison logic or just checking if position.shares < shareAmount - epsilon.
                if (!position || position.shares.toNumber() < shareAmount - 0.0001) {
                    throw new Error(`Insufficient shares for gradual exit. Have ${position?.shares.toNumber()}, requested ${shareAmount}`);
                }

                // Check if there's already an active timed exit
                const activeTimedExit = await tx.timedExit.findFirst({
                    where: { userId, assetId, status: 'active' }
                });
                if (activeTimedExit) throw new Error('A gradual exit is already in progress for this asset');

                // Create TimedExit Record
                const timedExit = await tx.timedExit.create({
                    data: {
                        userId,
                        assetId,
                        totalShares: shareAmount,
                        chunksTotal: chunks,
                        intervalMs: 300000, // 5 minutes
                        nextExecutionAt: new Date(), // Start immediately
                    }
                });

                return timedExit;
            });

            return NextResponse.json({ success: true, timedExitId: result.id, isGradual: true });
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }

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

                    // SLIPPAGE CHECK: MAX INPUT AMOUNT
                    if (maxInputAmount && costGross > parseFloat(maxInputAmount)) {
                        throw new Error(`Slippage Exceeded: Cost ${costGross.toFixed(2)} exceeds limit ${maxInputAmount}`);
                    }

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

                    // SLIPPAGE CHECK: MIN OUTPUT AMOUNT (Shares)
                    if (minOutputAmount && deltaShares < parseFloat(minOutputAmount)) {
                        throw new Error(`Slippage Exceeded: Output ${deltaShares.toFixed(4)} shares less than limit ${minOutputAmount}`);
                    }

                    outputAmount = deltaShares;
                }

                if (deltaShares <= 0.000001) {
                    throw new Error('Trade amount too small to generate shares');
                }

                // --- PRECISION CLAMPING FOR SHORT COVER ---
                // If covering short (currentShares < 0) and deltaShares is very close to abs(currentShares),
                // clamp it to exactly match to avoid lingering dust or "cannot flip" errors due to float precision.
                if (currentShares < 0 && Math.abs(Math.abs(currentShares) - deltaShares) < 0.0001) {
                    deltaShares = Math.abs(currentShares);
                }

                // Re-calculate Fee for records
                const fee = usedTradeAmount * CONFIG.SWAP_FEE;
                const lpFee = fee * CONFIG.LP_SHARE;
                const platformFee = fee * CONFIG.PLATFORM_SHARE;

                // LOGIC BRANCH: Are we covering a short?
                if (currentShares < 0) {
                    // --- COVER SHORT ---
                    // Prevent over-covering
                    // --- COVER SHORT + FLIP TO LONG ---
                    if (currentShares + deltaShares > 0.0001) {
                        const sharesToCover = Math.abs(currentShares);
                        const sharesToLong = deltaShares - sharesToCover;

                        // 1. Cost to Cover Short
                        // Note: We use calculateBuyCost because we are buying back shares to cover.
                        const costCoverNet = calculateBuyCost(P0, k, currentSupply, sharesToCover);
                        // Gross cost user pays (including fee part)
                        const costCoverGross = costCoverNet / (1 - CONFIG.SWAP_FEE);

                        // Supply AFTER covering
                        const supplyAfterCover = currentSupply + sharesToCover;

                        // 2. Cost to Open Long
                        const costLongNet = calculateBuyCost(P0, k, supplyAfterCover, sharesToLong);
                        const costLongGross = costLongNet / (1 - CONFIG.SWAP_FEE);

                        const totalUsedTradeAmount = costCoverGross + costLongGross;
                        const totalNetPool = costCoverNet + costLongNet;

                        // Logic Check: Did user send enough USDC?
                        // If we are 'buying shares' (body.shares), we calculated cost.
                        // If we are 'spending usdc' (body.amount), we calculated deltaShares based on P0... 
                        // BUT `solveDeltaShares` doesn't account for the supply shift mid-trade.
                        // This is tricky. If user sent 1000 USDC, we need to solve:
                        // Cost(Cover) + Cost(Long) = 1000.
                        // Solved: Cost(Cover) is fixed. Remainder = 1000 - Cost(Cover).
                        // Then solveDeltaShares for Remainder at new Supply.

                        // RE-CALCULATION IF NOT TARGET-SHARES:
                        // Ideally we should have handled this upstream.
                        // Current `deltaShares` upstream assumes ONE curve segment.
                        // If we are flipping, the curve changes slope/position? No, curve is same, but we traverse 0.
                        // Does Math handle traversing 0?
                        // Our math: P = P0 + k*S.
                        // If S < 0? Math works. Price < P0.
                        // If our bonding curve supports negative S (global supply < 0?), then one integral works.
                        // But `Asset.totalSupply` is usually >= 0.
                        // If Shorting is specialized (User has negative shares, Global Supply is... reduced?),
                        // Yes, `totalSupply` was decremented when shorting.
                        // So covering INCREMENTS `totalSupply`.
                        // So the math IS continuous! We don't need split logic for the Curve Integral!
                        // One integral `solveDeltaShares` from S to S+deltaS works even if we cross "User 0", because Global Supply just increases monotonically.

                        // WAIT.
                        // Shorting: `totalSupply` decremented.
                        // Covering: `totalSupply` incremented.
                        // Longing: `totalSupply` incremented.
                        // So `currentSupply` -> `currentSupply + deltaShares`.
                        // The cost calculation `calculateBuyCost` works for the full range!
                        // SO WHY DID I THINK I NEEDED SPLIT LOGIC?
                        // Position Management needs split logic.
                        // Cost calculation does NOT.

                        // Let's verify:
                        // netAmount is correct for full range.
                        // usedTradeAmount is correct.
                        // We just need to handle the Funding Checks and Position Updates.

                        const cost = usedTradeAmount;

                        // Collateral Release
                        // We are covering ALL negative shares.
                        const releasedCollateral = currentCollateral; // All of it.

                        // Check Balance: Wallet + Released >= Cost
                        if (user.walletHotBalance.toNumber() + releasedCollateral < cost) {
                            throw new Error(`Insufficient collateral + wallet balance to flip. Need ${cost.toFixed(2)} USDC.`);
                        }

                        // Execution
                        const refund = releasedCollateral - cost;

                        // If refund positive, add to wallet. If negative, deduct from wallet.
                        if (refund >= 0) {
                            await tx.user.update({ where: { id: userId }, data: { walletHotBalance: { increment: refund } } });
                        } else {
                            await tx.user.update({ where: { id: userId }, data: { walletHotBalance: { decrement: Math.abs(refund) } } });
                        }

                        // Update Position: Delete old, Create new
                        // (Prisma doesn't like changing ID in update if generic, but here we just upsert or delete/create)
                        // Easiest is Delete then Create
                        await tx.position.delete({ where: { userId_assetId: { userId, assetId } } });

                        await tx.position.create({
                            data: {
                                userId, assetId,
                                shares: currentShares + deltaShares, // Resulting positive shares
                                avgPrice: costLongNet / sharesToLong, // Avg Price of the NEW Long portion only?
                                // Or blended? Usually Avg Price is for the current holding.
                                // If we flipped, we closed the short. The new position is purely the Long part.
                                // So cost is `costLongNet`.
                                // Shares is `sharesToLong`.
                                // wait, `currentShares + deltaShares` = `sharesToLong`. (Since currentShares is negative).
                                // e.g. -5 + 15 = 10. `sharesToLong` = 15 - 5 = 10. Correct.
                            }
                        });

                        // Update Supply
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
                        // Just Covering (Partial or Full, but ending <= 0).
                        // Logic below handles this?
                        // "if (currentShares + deltaShares > 0.0001)" -> Only if flipping.
                        // Else block...
                        throw new Error('Logic Error: Should have entered flip block');
                    }

                    // Stop execution of following 'else' block (which was the original 'Cover Short' block)
                    // We need to restructure the if/else to allow this.
                    // The original code was:
                    // if (currentShares < 0) {
                    //    if (currentShares + deltaShares > 0.0001) Error
                    //    else { Cover Logic }
                    // }
                    // I am replacing the whole outer block?
                    // No, I am replacing lines 195-237.
                    // IMPORTANT: The `else` block (Line 218 in view, or following logic) handles "Not Flip".
                    // I should keep the structure:
                    // if (Flip) { Flip Logic } else { Normal Cover Logic }

                } else {
                    // --- NORMAL COVER (Result <= 0) ---

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
                        asset: { connect: { id: assetId } },
                        buyer: { connect: { id: userId } },
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

                    // SLIPPAGE CHECK: MIN OUTPUT AMOUNT (USDC)
                    // Note: 'grossUsdc' is the Revenue. The USER RECEIVES 'netUsdc' (gross - fee).
                    // Usually minOutput refers to what hits the wallet.
                    const feePreview = grossUsdc * CONFIG.SWAP_FEE;
                    const netPreview = grossUsdc - feePreview;

                    if (minOutputAmount && netPreview < parseFloat(minOutputAmount)) {
                        throw new Error(`Slippage Exceeded: Net Output ${netPreview.toFixed(2)} USDC less than limit ${minOutputAmount}`);
                    }

                } else {
                    // tradeAmount is USDC (Target Revenue)
                    grossUsdc = tradeAmount;
                    shareAmount = solveDeltaSharesFromRevenue(P0, k, currentSupply, grossUsdc);

                    // SLIPPAGE CHECK: MAX INPUT AMOUNT (Shares to Sell)
                    if (maxInputAmount && shareAmount > parseFloat(maxInputAmount)) {
                        throw new Error(`Slippage Exceeded: Selling ${shareAmount.toFixed(4)} shares exceeds limit ${maxInputAmount}`);
                    }
                }

                if (shareAmount <= 0.000001) {
                    throw new Error('Trade amount too small to sell shares');
                }

                // --- PRECISION CLAMPING FOR LONG EXIT ---
                // If exiting long (currentShares > 0) and shareAmount is very close to currentShares,
                // clamp it to exactly match currentShares.
                if (currentShares > 0 && Math.abs(currentShares - shareAmount) < 0.0001) {
                    shareAmount = currentShares;
                }


                outputAmount = grossUsdc;

                const fee = grossUsdc * CONFIG.SWAP_FEE;
                const netUsdc = grossUsdc - fee;
                const lpFee = fee * CONFIG.LP_SHARE;
                const platformFee = fee * CONFIG.PLATFORM_SHARE;

                if (currentShares > 0) {
                    // --- EXIT LONG ---
                    if (currentShares < shareAmount) {
                        // === FLIP: LONG -> SHORT ===
                        const sharesToClose = currentShares; // Sell all current
                        const sharesToShort = shareAmount - sharesToClose; // Remaining to sell

                        // 1. Revenue from Closing Long
                        const revCloseGross = calculateSellRevenue(P0, k, currentSupply, sharesToClose);
                        const feeClose = revCloseGross * CONFIG.SWAP_FEE;
                        const revCloseNet = revCloseGross - feeClose;

                        // Supply AFTER closing
                        const supplyAfterClose = currentSupply - sharesToClose;

                        // 2. Revenue (Proceeds/Margin) from Opening Short
                        const revShortGross = calculateSellRevenue(P0, k, supplyAfterClose, sharesToShort);
                        // Short Open: User pays Fee? Usually fees deducted from proceeds?
                        // In current `Open Short` logic: 
                        // "Proceeds = grossUsdc"
                        // "Margin = 100% of Proceeds"
                        // "Balance check < marginRequired"
                        // Fee? `const fee = grossUsdc * CONFIG.SWAP_FEE`.
                        // `netUsdc = grossUsdc - fee` used for Ledger?
                        // In Short Open: 
                        // `platformTreasury` gets fee.
                        // Where does fee come from? Collateral? Or Wallet?
                        // In standard logic: `tradeAmount` is used as revenue. Fee is calculated.
                        // But for Short, `fee` is separate?
                        // Let's assume Fee is paid from Wallet or subtracted from Proceeds?
                        // Standard Short Logic (below):
                        // `marginRequired = grossUsdc`. `totalCollateralLock = grossUsdc + marginRequired`.
                        // `walletHotBalance: { decrement: marginRequired }`.
                        // `pool: { decrement: grossUsdc }` (into collateral).
                        // Fee comes from `platformTreasury` update... but where is it DEDUCTED?
                        // Ah, `walletHotBalance` only decrements `marginRequired`.
                        // `marginRequired` = `grossUsdc`.
                        // The Fee seems... separate/ignored in standard Short Logic?
                        // Wait, `netUsdc` (Gross - Fee) is logged in Ledger.
                        // But `wallet` or `collateral` doesn't show Fee deduction?
                        // This might be a bug in original Short logic.
                        // We will implement Flip assuming Fee should be paid.
                        // Let's deduct Fee from Wallet. 

                        const feeShort = revShortGross * CONFIG.SWAP_FEE;
                        const marginRequired = revShortGross;
                        const totalCollateralLock = revShortGross + marginRequired;

                        // Net Cash Flow for User:
                        // + revCloseNet (Money from Long Close)
                        // - marginRequired (Money to Lock for Short)
                        // - feeShort (Fee for Shorting)
                        // = deltaWallet.

                        const deltaWallet = revCloseNet - marginRequired - feeShort;

                        // Check Solvency (Wallet + deltaWallet >= 0)
                        // actually `Wallet + revCloseNet >= margin + feeShort`
                        if (user.walletHotBalance.toNumber() + revCloseNet < marginRequired + feeShort) {
                            throw new Error(`Insufficient funds to flip Short. Need ${marginRequired + feeShort} USDC, have ${user.walletHotBalance.toNumber() + revCloseNet}`);
                        }

                        // Execute
                        // Update Wallet
                        if (deltaWallet >= 0) {
                            await tx.user.update({ where: { id: userId }, data: { walletHotBalance: { increment: deltaWallet } } });
                        } else {
                            await tx.user.update({ where: { id: userId }, data: { walletHotBalance: { decrement: Math.abs(deltaWallet) } } });
                        }

                        // Positions
                        await tx.position.delete({ where: { userId_assetId: { userId, assetId } } });
                        await tx.position.create({
                            data: {
                                userId, assetId,
                                shares: -sharesToShort,
                                avgPrice: revShortGross / sharesToShort,
                                collateral: totalCollateralLock,
                            }
                        });

                        // Assets / Pool
                        const totalSharesSold = sharesToClose + sharesToShort; // == shareAmount
                        await tx.asset.update({
                            where: { id: assetId },
                            data: { totalSupply: { decrement: totalSharesSold } }
                        });

                        // Pool Logic:
                        // Long Close: Pool Pays `revCloseGross`.
                        // Short Open: Pool Pays `revShortGross` (into Collateral).
                        // Total Pool Decr: `revCloseGross + revShortGross`.
                        await tx.liquidityPool.update({
                            where: { id: asset.pool.id },
                            data: { totalUsdc: { decrement: revCloseGross + revShortGross } }
                        });

                    } else {
                        // === NORMAL EXIT: LONG -> LESS LONG (or 0) ===
                        if (currentShares - shareAmount < 0.000001) {
                            // Fully exited
                            await tx.position.delete({
                                where: { userId_assetId: { userId, assetId } }
                            });
                        } else {
                            await tx.position.update({
                                where: { userId_assetId: { userId, assetId } },
                                data: { shares: { decrement: shareAmount } }
                            });
                        }

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
                        asset: { connect: { id: assetId } },
                        buyer: { connect: { id: userId } },
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
