
import { db, Prisma } from '@megatron/database';
import {
    MONETARY_CONFIG,
    solveDeltaShares,
    calculateSellRevenue,
    calculateBuyCost,
    solveDeltaSharesFromRevenue
} from './index';

// Configuration interface to decouple from MONETARY_CONFIG details if needed
interface TradeConfig {
    SWAP_FEE: number;
    LP_SHARE: number;
    PLATFORM_SHARE: number;
}

const CONFIG: TradeConfig = MONETARY_CONFIG;

export interface TradeResult {
    trade: any; // Using any for Prisma Trade type compatibility
    outputAmount: number; // Shares bought or USDC received (Net)
    eventData: {
        type: 'trade';
        assetId: string;
        tradeId: string;
        price: number;
        quantity: number;
        buyerId: string;
        timestamp: number;
        volume5m: number;
    }
}

export class TradeExecutor {

    /**
     * Execute a Buy Order (Entry Long or Cover Short)
     * Handles flipping from Short to Long if needed.
     */
    static async executeBuy(
        userId: string,
        assetId: string,
        amountUsdc: number, // If buying by Amount (Input)
        targetShares?: number, // If buying by Shares (Output, e.g. covering exact amount)
        limits?: { maxInput?: number, minOutput?: number },
        positionOptions?: { stopLoss?: number | null, takeProfit?: number | null }
    ): Promise<TradeResult> {
        if (!amountUsdc && !targetShares) throw new Error("Amount or Target Shares required");

        return await db.$transaction(async (tx: Prisma.TransactionClient) => {
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

            const position = await tx.position.findUnique({
                where: { userId_assetId: { userId, assetId } }
            });

            const currentShares = position ? position.shares.toNumber() : 0;
            const currentSupply = asset.totalSupply.toNumber();

            let netAmount = 0;
            let usedTradeAmount = 0; // Gross USDC User Pays
            let deltaShares = 0;

            // --- 1. CALCULATIONS ---

            if (targetShares) {
                // Buying specific amount of shares (e.g. Coverage)
                if (targetShares <= 0) throw new Error('Invalid share amount');

                // Check Max Input Slippage
                const costNet = calculateBuyCost(P0, k, currentSupply, targetShares);
                const costGross = costNet / (1 - CONFIG.SWAP_FEE);

                if (limits?.maxInput && costGross > limits.maxInput) {
                    throw new Error(`Slippage: Cost ${costGross.toFixed(2)} > Limit ${limits.maxInput}`);
                }

                usedTradeAmount = costGross;
                netAmount = costNet;
                deltaShares = targetShares;

            } else {
                // Buying with specific amount of USDC
                if (amountUsdc <= 0) throw new Error('Invalid amount');

                usedTradeAmount = amountUsdc;
                const fee = usedTradeAmount * CONFIG.SWAP_FEE;
                netAmount = usedTradeAmount - fee;
                deltaShares = solveDeltaShares(P0, k, currentSupply, netAmount);

                if (limits?.minOutput && deltaShares < limits.minOutput) {
                    throw new Error(`Slippage: Output ${deltaShares.toFixed(4)} < Limit ${limits.minOutput}`);
                }
            }

            if (deltaShares <= 0.000001) throw new Error('Trade amount too small');

            // --- PRECISION CLAMPING (Short Cover) ---
            if (currentShares < 0 && Math.abs(Math.abs(currentShares) - deltaShares) < 0.0001) {
                deltaShares = Math.abs(currentShares);
            }

            const fee = usedTradeAmount * CONFIG.SWAP_FEE;

            // --- 2. LOGIC BRANCHING (Cover vs Open) ---

            if (currentShares < 0) {
                // === COVER SHORT / FLIP ===
                if (currentShares + deltaShares > 0.0001) {
                    // FLIP: Short -> Long
                    await this.handleFlipShortToLong(
                        tx, userId, asset, user, position!,
                        currentShares, deltaShares, currentSupply, P0, k,
                        positionOptions
                    );
                } else {
                    // NORMAL COVER (Stay Short or Neutral)
                    await this.handleNormalBuy(
                        tx, userId, asset, user, position,
                        usedTradeAmount, netAmount, deltaShares, // Normal logic
                        false, // isCovering? Yes.
                        positionOptions
                    );
                }
            } else {
                // === NORMAL LONG ENTRY ===
                await this.handleNormalBuy(
                    tx, userId, asset, user, position,
                    usedTradeAmount, netAmount, deltaShares,
                    false,
                    positionOptions
                );
            }

            // --- 3. FEES & RECORDS ---
            await this.distributeFees(tx, asset.pool?.id, fee);

            const tradeRecord = await tx.trade.create({
                data: {
                    assetId, buyerId: userId,
                    price: netAmount / deltaShares,
                    quantity: deltaShares,
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

            return {
                trade: tradeRecord,
                outputAmount: deltaShares,
                eventData: {
                    type: 'trade' as const,
                    assetId,
                    tradeId: tradeRecord.id,
                    price: tradeRecord.price.toNumber(),
                    quantity: tradeRecord.quantity.toNumber(),
                    buyerId: userId,
                    timestamp: tradeRecord.timestamp.getTime(),
                    volume5m: 0
                }
            };
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 5000,
            timeout: 20000
        });
    }

    /**
     * Execute a Sell Order (Exit Long or Open Short)
     */
    static async executeSell(
        userId: string,
        assetId: string,
        amountShares?: number, // If selling specific Shares (Input)
        targetUsdc?: number,   // If selling for specific USDC (Output)
        limits?: { maxInput?: number, minOutput?: number },
        positionOptions?: { stopLoss?: number | null, takeProfit?: number | null }
    ): Promise<TradeResult> {
        if (!amountShares && !targetUsdc) throw new Error("Shares or Target USDC required");

        return await db.$transaction(async (tx: Prisma.TransactionClient) => {
            const asset = await tx.asset.findUnique({
                where: { id: assetId },
                include: { pool: true },
            });

            if (!asset) throw new Error('Asset not found');
            if (asset.status !== 'active' && asset.status !== 'funding') throw new Error(`Asset is not active`); // Allow selling in funding? Usually not. But verify logic.

            const params = asset.pricingParams as { P0: number; k: number } | null;
            if (!params) throw new Error('Asset has no pricing params');
            const { P0, k } = params;

            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user) throw new Error('User not found');
            if (user.isBlacklisted) throw new Error('User is blacklisted');

            const position = await tx.position.findUnique({
                where: { userId_assetId: { userId, assetId } }
            });

            const currentShares = position ? position.shares.toNumber() : 0;
            const currentSupply = asset.totalSupply.toNumber();

            let shareAmount = 0;
            let grossUsdc = 0;

            // --- 1. CALCULATIONS ---

            if (amountShares) {
                shareAmount = amountShares;
                grossUsdc = calculateSellRevenue(P0, k, currentSupply, shareAmount);

                const feePreview = grossUsdc * CONFIG.SWAP_FEE;
                const netPreview = grossUsdc - feePreview;

                if (limits?.minOutput && netPreview < limits.minOutput) {
                    throw new Error(`Slippage: Net ${netPreview.toFixed(2)} < Limit ${limits.minOutput}`);
                }
            } else {
                // Selling for Target USDC (Revenue)
                if (targetUsdc! <= 0) throw new Error("Invalid target USDC");
                grossUsdc = targetUsdc!;
                shareAmount = solveDeltaSharesFromRevenue(P0, k, currentSupply, grossUsdc);

                if (limits?.maxInput && shareAmount > limits.maxInput) {
                    throw new Error(`Slippage: Shares ${shareAmount.toFixed(4)} > Limit ${limits.maxInput}`);
                }
            }

            if (shareAmount <= 0.000001) throw new Error('Trade amount too small');

            // Clamping
            if (currentShares > 0 && Math.abs(currentShares - shareAmount) < 0.0001) {
                shareAmount = currentShares;
            }

            const fee = grossUsdc * CONFIG.SWAP_FEE;
            const netUsdc = grossUsdc - fee;

            // --- 2. LOGIC BRANCHING ---

            if (currentShares > 0) {
                // === EXIT LONG / FLIP ===
                if (currentShares < shareAmount) {
                    // FLIP: Long -> Short
                    await this.handleFlipLongToShort(
                        tx, userId, asset, user, position!,
                        currentShares, shareAmount, currentSupply, P0, k,
                        positionOptions
                    );
                } else {
                    // NORMAL EXIT (Reduce Long)
                    await this.handleNormalSell(
                        tx, userId, asset, user, position!,
                        shareAmount, grossUsdc, netUsdc,
                        positionOptions
                    );
                }
            } else {
                // === OPEN SHORT ===
                await this.handleOpenShort(
                    tx, userId, assetId, asset, user, position,
                    shareAmount, grossUsdc,
                    positionOptions
                );
            }

            // --- 3. FEES & RECORDS ---
            await this.distributeFees(tx, asset.pool?.id, fee);

            const tradeRecord = await tx.trade.create({
                data: {
                    assetId, buyerId: userId,
                    price: grossUsdc / shareAmount,
                    quantity: shareAmount,
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

            return {
                trade: tradeRecord,
                outputAmount: grossUsdc, // Usually return Revenue for Sells? Or Net? Let's return Gross for consistency with route.
                eventData: {
                    type: 'trade' as const,
                    assetId,
                    tradeId: tradeRecord.id,
                    price: tradeRecord.price.toNumber(),
                    quantity: tradeRecord.quantity.toNumber(),
                    buyerId: userId,
                    timestamp: tradeRecord.timestamp.getTime(),
                    volume5m: 0
                }
            };
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 5000,
            timeout: 20000
        });
    }

    // =========================================
    // PRIVATE HANDLERS
    // =========================================

    private static async handleNormalBuy(
        tx: Prisma.TransactionClient,
        userId: string, asset: any, user: any, position: any,
        usedTradeAmount: number, netAmount: number, deltaShares: number,
        isCovering: boolean = false,
        positionOptions?: { stopLoss?: number | null, takeProfit?: number | null }
    ) {
        // Balance Check
        if (user.walletHotBalance.lessThan(usedTradeAmount)) {
            throw new Error(`Insufficient funds: ${user.walletHotBalance} < ${usedTradeAmount}`);
        }

        // Action
        await tx.user.update({
            where: { id: userId },
            data: { walletHotBalance: { decrement: usedTradeAmount } },
        });

        await tx.asset.update({
            where: { id: asset.id },
            data: { totalSupply: { increment: deltaShares } },
        });

        if (asset.pool) {
            await tx.liquidityPool.update({
                where: { id: asset.pool.id },
                data: { totalUsdc: { increment: netAmount } },
            });
        }

        const sl = positionOptions?.stopLoss;
        const tp = positionOptions?.takeProfit;

        // Position Logic
        // If covering (position is neg), new position is less neg or 0.
        // If longing (position is pos or 0), new position is more pos.
        // We can just add shares and recalculate avgPrice if longing.
        // If covering, we usually keep avgPrice of the SHORT intact? Or update?
        // Standard: Covering doesn't change Avg Entry Price of the remaining short.

        if (position) {
            const oldShares = position.shares.toNumber();
            const newShares = oldShares + deltaShares; // delta is pos. old is neg or pos.

            let newAvgPrice = position.avgPrice.toNumber();

            if (!isCovering) {
                // Averaging UP (Long)
                const oldTotalCost = oldShares * position.avgPrice.toNumber();
                const conversionCost = netAmount; // Cost for new shares
                newAvgPrice = (oldTotalCost + conversionCost) / newShares;
            }
            // If covering, we just reduce size, avgPrice stays same.

            if (Math.abs(newShares) < 1e-8) {
                await tx.position.delete({ where: { id: position.id } });
            } else {
                // Only update SL/TP if explicitly provided (not undefined)
                const updateData: any = { shares: newShares, avgPrice: newAvgPrice };
                if (sl !== undefined) updateData.stopLoss = sl;
                if (tp !== undefined) updateData.takeProfit = tp;

                await tx.position.update({
                    where: { id: position.id },
                    data: updateData
                });
            }
        } else {
            await tx.position.create({
                data: {
                    userId, assetId: asset.id,
                    shares: deltaShares,
                    avgPrice: netAmount / deltaShares,
                    stopLoss: sl,
                    takeProfit: tp
                }
            });
        }
    }

    private static async handleFlipShortToLong(
        tx: Prisma.TransactionClient,
        userId: string, asset: any, user: any, position: any,
        currentShares: number, deltaShares: number, currentSupply: number, P0: number, k: number,
        positionOptions?: { stopLoss?: number | null, takeProfit?: number | null }
    ) {
        // currentShares is Negative (e.g. -5)
        // deltaShares is Positive (e.g. 15)
        // sharesToCover = 5. sharesToLong = 10.
        const sharesToCover = Math.abs(currentShares);
        const sharesToLong = deltaShares - sharesToCover;

        // 1. Cost to Cover (-5 -> 0)
        // We are buying back `sharesToCover` starting from `currentSupply`.
        // WAIT. When shorting, supply decremented. So we are traversing BACK up.
        // calculateBuyCost handles "buying shares". As we buy, Supply Increases.
        // So yes, we just Buy 5 shares.
        const costCoverNet = calculateBuyCost(P0, k, currentSupply, sharesToCover);
        const costCoverGross = costCoverNet / (1 - CONFIG.SWAP_FEE);

        // Supply will be `currentSupply + sharesToCover`
        const midSupply = currentSupply + sharesToCover;

        // 2. Cost to Long (0 -> 10)
        const costLongNet = calculateBuyCost(P0, k, midSupply, sharesToLong);
        const costLongGross = costLongNet / (1 - CONFIG.SWAP_FEE);

        const totalRequired = costCoverGross + costLongGross;
        const totalNetPool = costCoverNet + costLongNet;

        // Collateral Release
        const releasedCollateral = position.collateral.toNumber();

        // Check if Wallet + Collateral >= TotalCost
        if (user.walletHotBalance.toNumber() + releasedCollateral < totalRequired) {
            throw new Error(`Insufficient funds to flip. Need ${totalRequired.toFixed(2)}, have ${user.walletHotBalance.toNumber()} + Collateral ${releasedCollateral}`);
        }

        // Logic:
        // User pays `totalRequired`
        // User gets `releasedCollateral` back
        // Net Change = `releasedCollateral - totalRequired`
        const refund = releasedCollateral - totalRequired;
        if (refund >= 0) {
            await tx.user.update({ where: { id: userId }, data: { walletHotBalance: { increment: refund } } });
        } else {
            await tx.user.update({ where: { id: userId }, data: { walletHotBalance: { decrement: Math.abs(refund) } } });
        }

        // Assets/Pool
        await tx.asset.update({
            where: { id: asset.id },
            data: { totalSupply: { increment: deltaShares } }
        });
        if (asset.pool) {
            await tx.liquidityPool.update({
                where: { id: asset.pool.id },
                data: { totalUsdc: { increment: totalNetPool } }
            });
        }

        // Position: Delete old Short, Create new Long
        await tx.position.delete({ where: { id: position.id } });
        await tx.position.create({
            data: {
                userId, assetId: asset.id,
                shares: sharesToLong, // Pure long portion
                avgPrice: costLongNet / sharesToLong, // Avg of the long part
                collateral: 0,
                stopLoss: positionOptions?.stopLoss,
                takeProfit: positionOptions?.takeProfit
            }
        });
    }

    private static async handleNormalSell(
        tx: Prisma.TransactionClient,
        userId: string, asset: any, user: any, position: any,
        shareAmount: number, grossUsdc: number, netUsdc: number,
        positionOptions?: { stopLoss?: number | null, takeProfit?: number | null }
    ) {
        // Reduces Long Position
        const newShares = position.shares.toNumber() - shareAmount;

        if (Math.abs(newShares) < 1e-8) {
            await tx.position.delete({ where: { id: position.id } });
        } else {
            const updateData: any = { shares: newShares };
            if (positionOptions?.stopLoss !== undefined) updateData.stopLoss = positionOptions.stopLoss;
            if (positionOptions?.takeProfit !== undefined) updateData.takeProfit = positionOptions.takeProfit;

            await tx.position.update({
                where: { id: position.id },
                data: updateData
            });
        }

        await tx.asset.update({
            where: { id: asset.id },
            data: { totalSupply: { decrement: shareAmount } }
        });

        await tx.liquidityPool.update({
            where: { id: asset.pool.id },
            data: { totalUsdc: { decrement: grossUsdc } }
        });

        await tx.user.update({
            where: { id: userId },
            data: { walletHotBalance: { increment: netUsdc } }
        });
    }

    private static async handleOpenShort(
        tx: Prisma.TransactionClient,
        userId: string, assetId: string, asset: any, user: any, position: any,
        shareAmount: number, grossUsdc: number,
        positionOptions?: { stopLoss?: number | null, takeProfit?: number | null }
    ) {
        // If position exists, it's (neg). We checked "currentShares > 0" in main.
        // If currentShares < 0, we are "Adding to Short".
        // If currentShares == 0 (no pos), we create.

        const marginRequired = grossUsdc;
        const totalCollateralLock = grossUsdc + marginRequired;

        if (user.walletHotBalance.toNumber() < marginRequired) {
            throw new Error(`Insufficient funds for Margin. Need ${marginRequired}`);
        }

        await tx.user.update({
            where: { id: userId },
            data: { walletHotBalance: { decrement: marginRequired } }
        });

        await tx.asset.update({
            where: { id: asset.id },
            data: { totalSupply: { decrement: shareAmount } }
        });

        if (asset.pool) {
            // Validate Pool Liquidity
            if (asset.pool.totalUsdc.toNumber() < grossUsdc) {
                throw new Error(`Insufficient pool liquidity`);
            }
            await tx.liquidityPool.update({
                where: { id: asset.pool.id },
                data: { totalUsdc: { decrement: grossUsdc } }
            });
        }

        const sl = positionOptions?.stopLoss;
        const tp = positionOptions?.takeProfit;

        if (position) {
            // Adding to Short
            // Collateral increases
            const updateData: any = {
                shares: { decrement: shareAmount }, // More negative
                collateral: { increment: totalCollateralLock }
            };
            if (sl !== undefined) updateData.stopLoss = sl;
            if (tp !== undefined) updateData.takeProfit = tp;

            await tx.position.update({
                where: { id: position.id },
                data: updateData
            });
        } else {
            // New Short
            await tx.position.create({
                data: {
                    userId, assetId,
                    shares: -shareAmount,
                    avgPrice: grossUsdc / shareAmount,
                    collateral: totalCollateralLock,
                    stopLoss: sl,
                    takeProfit: tp
                }
            });
        }
    }

    private static async handleFlipLongToShort(
        tx: Prisma.TransactionClient,
        userId: string, asset: any, user: any, position: any,
        currentShares: number, shareAmount: number, currentSupply: number, P0: number, k: number,
        positionOptions?: { stopLoss?: number | null, takeProfit?: number | null }
    ) {
        // currentShares (Long) = 10
        // shareAmount (Sell) = 15
        // sharesToClose = 10. sharesToShort = 5.
        const sharesToClose = currentShares;
        const sharesToShort = shareAmount - sharesToClose;

        // 1. Revenue from Closing Long (10 -> 0)
        // Supply decreases by 10.
        const revCloseGross = calculateSellRevenue(P0, k, currentSupply, sharesToClose);
        const feeClose = revCloseGross * CONFIG.SWAP_FEE;
        const revCloseNet = revCloseGross - feeClose;

        const midSupply = currentSupply - sharesToClose;

        // 2. Revenue from Opening Short (0 -> -5)
        // Supply decreases by 5.
        const revShortGross = calculateSellRevenue(P0, k, midSupply, sharesToShort);

        // Fee for Shorting
        const feeShort = revShortGross * CONFIG.SWAP_FEE;

        // Margin for Short
        const marginRequired = revShortGross;
        const totalCollateralLock = revShortGross + marginRequired;

        // Net Cash Flow
        // + revCloseNet (Money In)
        // - marginRequired (Money Locked)
        // - feeShort (Fee Paid)
        const deltaWallet = revCloseNet - marginRequired - feeShort;

        // Check Solvency: Wallet + deltaWallet >= 0
        if (user.walletHotBalance.toNumber() + deltaWallet < 0) {
            throw new Error(`Insufficient funds to flip to Short. Net: ${deltaWallet.toFixed(2)}`);
        }

        // Execute
        if (deltaWallet >= 0) {
            await tx.user.update({ where: { id: userId }, data: { walletHotBalance: { increment: deltaWallet } } });
        } else {
            await tx.user.update({ where: { id: userId }, data: { walletHotBalance: { decrement: Math.abs(deltaWallet) } } });
        }

        await tx.asset.update({
            where: { id: asset.id },
            data: { totalSupply: { decrement: shareAmount } }
        });

        if (asset.pool) {
            await tx.liquidityPool.update({
                where: { id: asset.pool.id },
                data: { totalUsdc: { decrement: revCloseGross + revShortGross } }
            });
        }

        await tx.position.delete({ where: { id: position.id } });
        await tx.position.create({
            data: {
                userId, assetId: asset.id,
                shares: -sharesToShort,
                avgPrice: revShortGross / sharesToShort,
                collateral: totalCollateralLock,
                stopLoss: positionOptions?.stopLoss,
                takeProfit: positionOptions?.takeProfit
            }
        });
    }

    private static async distributeFees(tx: Prisma.TransactionClient, poolId: string | undefined, feeAmount: number) {
        const lpFee = feeAmount * CONFIG.LP_SHARE;
        const platformFee = feeAmount * CONFIG.PLATFORM_SHARE;

        // Platform
        await tx.platformTreasury.upsert({
            where: { id: 'treasury' },
            create: { id: 'treasury', balance: platformFee },
            update: { balance: { increment: platformFee } },
        });

        // LPs
        // Ideally we optimize this to not iterate ALL LPs in transaction.
        // But for consistency with original impl, we keep it. 
        // Optimized Way: Add to "Global Pool Rewards" and calculate claimable on the fly?
        // Masterplan says: "pool.unclaimedFees" is not enough, we need per-user.
        // Current impl iterates. We stick to it for now (risk: big pools = slow tx).
        // TODO: Optimize LP Fee Distribution
        if (!poolId) return;

        const pool = await tx.liquidityPool.findUnique({ where: { id: poolId } });
        if (!pool) return; // Should not happen

        if (pool.totalLPShares.toNumber() > 0) {
            const lps = await tx.lPShare.findMany({ where: { poolId } });
            const totalShares = pool.totalLPShares.toNumber();
            for (const lp of lps) {
                const share = lp.lpShares.toNumber() / totalShares;
                // Add check to avoid 0 updates
                if (share > 0) {
                    await tx.lPShare.update({
                        where: { id: lp.id },
                        data: { unclaimedRewards: { increment: lpFee * share } }
                    });
                }
            }
        } else {
            // No LPs? Treasury takes it.
            await tx.platformTreasury.update({
                where: { id: 'treasury' },
                data: { balance: { increment: lpFee } }
            });
        }
    }
}
