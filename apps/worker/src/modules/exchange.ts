
import { db } from '@megatron/database';
import { MONETARY_CONFIG, solveDeltaShares, calculateSellRevenue, TradeEvent } from '@megatron/lib-common';
import { publishTradeEvent } from '../lib/redis';
import { Prisma } from '@megatron/database';

const CONFIG = MONETARY_CONFIG;

/**
 * Execute a buy order for an asset.
 * 
 * @param userId - The user buying the asset
 * @param assetId - The asset to buy
 * @param amountUsdc - The amount of USDC to spend
 * @returns The trade record and shares bought
 */
export async function executeBuy(userId: string, assetId: string, amountUsdc: number, minSharesOut: number = 0) {
    if (amountUsdc <= 0) throw new Error('Amount must be positive');

    // Use a transaction with Serializable isolation to prevent race conditions
    return await db.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1. Fetch Asset and User with locking (simulated by finding distinct row first or relying on isolation level)
        // Prisma 'Serializable' should handle the isolation, but explicit row locking is better if supported.
        // Since simple 'findUnique' doesn't support 'lock' in standard Client yet without raw query, we rely on isolation.

        const asset = await tx.asset.findUnique({
            where: { id: assetId },
            include: { pool: true },
        });

        if (!asset) throw new Error('Asset not found');
        if (asset.status !== 'active') throw new Error(`Asset is not active (status: ${asset.status})`);

        // Parse pricing params safely
        const params = asset.pricingParams as { P0: number; k: number } | null;
        if (!params) throw new Error('Asset has no pricing params');
        const { P0, k } = params;

        const user = await tx.user.findUnique({
            where: { id: userId },
        });

        if (!user) throw new Error('User not found');
        if (user.isBlacklisted) throw new Error('User is blacklisted');
        if (user.walletHotBalance.lessThan(amountUsdc)) {
            throw new Error(`Insufficient funds: ${user.walletHotBalance} < ${amountUsdc}`);
        }

        // 2. Calculations
        const fee = amountUsdc * CONFIG.SWAP_FEE;
        const netAmount = amountUsdc - fee;
        const currentSupply = asset.totalSupply.toNumber();

        // Calculates shares user receives for the NET amount
        // Note: Some models take fee from input, others from output. 
        // Plan implies: "Total fee = trade_amount * 0.005". So fee is taken from the input amount.
        // The amount going into the bonding curve is `netAmount`.
        // Wait, masterplan says: "cost = ... = A". "Set Cost = A". "deltaShares = solveDeltaShares(..., A)".
        // If I take fee first, then A = amount - fee.
        const deltaShares = solveDeltaShares(P0, k, currentSupply, netAmount);

        if (deltaShares < minSharesOut) {
            throw new Error(`Slippage Exceeded: Expected ${minSharesOut} shares, got ${deltaShares}`);
        }

        const lpFee = fee * CONFIG.LP_SHARE;
        const platformFee = fee * CONFIG.PLATFORM_SHARE;

        // 3. Update State

        // 3.1 User Balance
        await tx.user.update({
            where: { id: userId },
            data: {
                walletHotBalance: { decrement: amountUsdc },
            },
        });

        // 3.2 Asset Supply
        const updatedAsset = await tx.asset.update({
            where: { id: assetId },
            data: {
                totalSupply: { increment: deltaShares },
            },
        });

        // 3.3 Liquidity Pool
        // The pool gains the NET amount (reserves)
        // Wait, bonding curve reserves usually hold the funds backing the shares. 
        // If it's pure bonding curve, the "pool" IS the reserve.
        // The masterplan says: "Liquidity Pool created... User's initial $100...".
        // So yes, we add netAmount to pool.
        if (!asset.pool) throw new Error('Asset has no liquidity pool');

        await tx.liquidityPool.update({
            where: { id: asset.pool.id },
            data: {
                totalUsdc: { increment: netAmount },
                // unclaimedFees: { increment: lpFee } // Optional: track total fees in pool separately?
                // Plan says: "lp.unclaimedRewards += lp_portion * ownership_pct"
            },
        });

        // 3.4 Platform Fee
        // Check if treasury row exists, if not create
        // We use a fixed ID 'treasury' as per schema change (assuming it worked)
        // If migration failed, this might fail. We should upsert.
        await tx.platformTreasury.upsert({
            where: { id: 'treasury' },
            create: { id: 'treasury', balance: platformFee },
            update: { balance: { increment: platformFee } },
        });

        // 3.5 Distribute LP Fees
        // This is the expensive loop part.
        // Fetch all LPs for this pool
        const lps = await tx.lPShare.findMany({
            where: { poolId: asset.pool.id },
        });

        const totalLpShares = asset.pool.totalLPShares.toNumber();

        if (totalLpShares > 0) {
            for (const lp of lps) {
                const share = lp.lpShares.toNumber() / totalLpShares;
                const reward = lpFee * share;

                await tx.lPShare.update({
                    where: { id: lp.id },
                    data: {
                        unclaimedRewards: { increment: reward },
                    },
                });
            }
        } else {
            // If no LPs (should not happen if soft cap met), where does fee go?
            // For now, add to platform treasury or leave in pool as 'unclaimed'
            // We'll leave it in the pool unallocated or add to treasury.
            // Let's add it to treasury to be safe.
            await tx.platformTreasury.update({
                where: { id: 'treasury' },
                data: { balance: { increment: lpFee } },
            });
        }

        // 3.6 Create Trade Record
        const trade = await tx.trade.create({
            data: {
                assetId,
                buyerId: userId,
                price: netAmount / deltaShares, // Average execution price
                quantity: deltaShares,
                fee: fee,
                side: 'buy',
                timestamp: new Date(),
            },
        });

        // 3.7 Update/Create Position
        // We need to calculate new average price
        // But avgPrice logic can be complex (FIFO vs Weighted Avg). 
        // Masterplan doesn't specify strictly, usually Weighted Average Price.
        const existingPosition = await tx.position.findUnique({
            where: { userId_assetId: { userId, assetId } },
        });

        if (existingPosition) {
            const oldShares = existingPosition.shares.toNumber();
            const oldTotalCost = oldShares * existingPosition.avgPrice.toNumber();
            const newTotalCost = oldTotalCost + netAmount;
            const newTotalShares = oldShares + deltaShares;
            const newAvgPrice = newTotalCost / newTotalShares;

            await tx.position.update({
                where: { userId_assetId: { userId, assetId } },
                data: {
                    shares: newTotalShares,
                    avgPrice: newAvgPrice,
                },
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

        // 3.8 Create Ledger Entry
        await tx.ledger.create({
            data: {
                userId,
                deltaAmount: -amountUsdc,
                currency: 'USDC',
                reason: 'trade',
                refId: trade.id,
                metadata: { type: 'buy', assetId, shares: deltaShares },
            },
        });

        return { trade, deltaShares };

    }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000, // Wait for lock
        timeout: 60000, // Max transaction time
    });
}

/**
 * Helper to emit event after transaction commits (best effort)
 */
export async function executeBuyAndPublish(userId: string, assetId: string, amountUsdc: number, minSharesOut: number = 0) {
    try {
        const { trade, deltaShares } = await executeBuy(userId, assetId, amountUsdc, minSharesOut);

        // Publish event
        const event: TradeEvent = {
            type: 'trade',
            assetId,
            tradeId: trade.id,
            price: trade.price.toNumber(),
            quantity: trade.quantity.toNumber(),
            buyerId: userId,
            timestamp: trade.timestamp.getTime(),
            volume5m: 0, // TODO: calculate rolling volume
        };

        // Non-blocking publish
        publishTradeEvent(event).catch(console.error);

        return trade;
    } catch (error) {
        console.error('ExecuteBuy failed:', error);
        throw error;
    }
}

/**
 * Execute a sell order for an asset.
 * 
 * @param userId - The user selling the shares
 * @param assetId - The asset to sell
 * @param sharesToSell - The number of shares to sell
 * @param minUsdcOut - Slippage protection: minimum USDC to receive
 * @returns The trade record and net USDC received
 */
export async function executeSell(userId: string, assetId: string, sharesToSell: number, minUsdcOut: number = 0) {
    if (sharesToSell <= 0) throw new Error('Shares must be positive');

    return await db.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1. Fetch Asset & User & Position
        const asset = await tx.asset.findUnique({
            where: { id: assetId },
            include: { pool: true },
        });

        if (!asset) throw new Error('Asset not found');
        if (asset.status !== 'active') throw new Error(`Asset is not active (status: ${asset.status})`);

        const params = asset.pricingParams as { P0: number; k: number } | null;
        if (!params) throw new Error('Asset has no pricing params');
        const { P0, k } = params;

        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');
        if (user.isBlacklisted) throw new Error('User is blacklisted');

        const position = await tx.position.findUnique({
            where: { userId_assetId: { userId, assetId } }
        });

        if (!position || position.shares.lessThan(sharesToSell)) {
            throw new Error('Insufficient shares to sell');
        }

        // 2. Calculations
        const currentSupply = asset.totalSupply.toNumber();
        const grossUsdc = calculateSellRevenue(P0, k, currentSupply, sharesToSell);

        const fee = grossUsdc * CONFIG.SWAP_FEE;
        const netUsdc = grossUsdc - fee;

        if (netUsdc < minUsdcOut) {
            throw new Error(`Slippage Exceeded: Expected ${minUsdcOut} USDC, got ${netUsdc}`);
        }

        const lpFee = fee * CONFIG.LP_SHARE;
        const platformFee = fee * CONFIG.PLATFORM_SHARE;

        // 3. Update State

        // 3.1 Decrement Shares (User Position)
        // Check if full sell to delete position? Or just update.
        // Update is safer usually to keep history or just checks.
        // We'll update.
        await tx.position.update({
            where: { userId_assetId: { userId, assetId } },
            data: {
                shares: { decrement: sharesToSell }
            }
        });

        // 3.2 Decrement Asset Supply
        await tx.asset.update({
            where: { id: assetId },
            data: { totalSupply: { decrement: sharesToSell } }
        });

        // 3.3 Decrement Pool Limits (Pay out from Pool)
        // The pool loses the GROSS amount (reserves paid out)
        if (!asset.pool) throw new Error('Asset has no liquidity pool');

        await tx.liquidityPool.update({
            where: { id: asset.pool.id },
            data: {
                totalUsdc: { decrement: grossUsdc }
            }
        });

        // 3.4 Increment User Balance (Net)
        await tx.user.update({
            where: { id: userId },
            data: { walletHotBalance: { increment: netUsdc } }
        });

        // 3.5 Platform Fee
        await tx.platformTreasury.upsert({
            where: { id: 'treasury' },
            create: { id: 'treasury', balance: platformFee },
            update: { balance: { increment: platformFee } },
        });

        // 3.6 Distribute LP Fees
        // Same logic as buy, fees come from the deduction
        const lps = await tx.lPShare.findMany({
            where: { poolId: asset.pool.id },
        });
        const totalLpShares = asset.pool.totalLPShares.toNumber();

        if (totalLpShares > 0) {
            for (const lp of lps) {
                const share = lp.lpShares.toNumber() / totalLpShares;
                const reward = lpFee * share;
                await tx.lPShare.update({
                    where: { id: lp.id },
                    data: { unclaimedRewards: { increment: reward } },
                });
            }
        } else {
            await tx.platformTreasury.update({
                where: { id: 'treasury' },
                data: { balance: { increment: lpFee } },
            });
        }

        // 3.7 Create Trade Record
        const trade = await tx.trade.create({
            data: {
                assetId,
                buyerId: userId,
                // price = Gross / Shares (Execution price before fees)
                price: grossUsdc / sharesToSell,
                quantity: sharesToSell,
                fee: fee,
                side: 'sell',
                timestamp: new Date(),
            },
        });

        // 3.8 Ledger
        await tx.ledger.create({
            data: {
                userId,
                deltaAmount: netUsdc,
                currency: 'USDC',
                reason: 'trade',
                refId: trade.id,
                metadata: { type: 'sell', assetId, shares: sharesToSell },
            },
        });

        return { trade, netUsdc };

    }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 60000,
    });
}

export async function executeSellAndPublish(userId: string, assetId: string, sharesToSell: number, minUsdcOut: number = 0) {
    try {
        const { trade, netUsdc } = await executeSell(userId, assetId, sharesToSell, minUsdcOut);

        const event: TradeEvent = {
            type: 'trade',
            assetId,
            tradeId: trade.id,
            price: trade.price.toNumber(),
            quantity: trade.quantity.toNumber(),
            buyerId: userId, // In a sell, buyerId is still the actor (User) or we need a 'sellerId'? 
            // Schema has 'sellerId', but for AMM, User is SELLING.
            // Trade record: buyerId stores the User. Schema comment: "sellerId NULL for AMM sells".
            // Actually, if User Sell:
            // buyerId = NULL (or platform?), sellerId = User.
            // Let's check Schema: "buyerId String", "sellerId String?".
            // If User Sells, User is Seller. Who is Buyer? The AMM.
            // But 'buyerId' is non-nullable!
            // Convention: In AMM, the user is always the 'initiator'.
            // If Side='sell', then 'buyerId' could be the User (initiator) or we must put a placeholder.
            // Re-reading Schema: "buyerId String ... BuyerTrades relation".
            // If I put User in buyerId for a Sell, it's confusing.
            // Maybe I should swap fields?
            // "sellerId: userId, buyerId: 'AMM'?"
            // But buyerId is a Foreign Key to User table. cannot use 'AMM'.
            // Standard AMM pattern: User is always stored in primary 'userId' column (here buyerId?) OR we need a platform user.
            // Let's stick to: "buyerId" = User, side = "sell". 
            // This implies "TraderId" rather than "BuyerId".
            // Let's check 'executeBuy' implementation... "buyerId: userId".
            // For 'executeSell', we will use "buyerId: userId" as well (The Trader), and rely on 'side: sell'.
            // Ideally we'd fix the schema to 'userId' instead of 'buyerId', but schema is fixed.
            timestamp: trade.timestamp.getTime(),
            volume5m: 0,
        };

        publishTradeEvent(event).catch(console.error);
        return trade;
    } catch (error) {
        console.error('ExecuteSell failed:', error);
        throw error;
    }
}
