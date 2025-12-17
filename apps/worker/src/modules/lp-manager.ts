
import { db } from '@megatron/database';
import {
    VESTING_MILESTONES,
    calculateVestedAmount,
    PricingParams,
    DEFAULT_CONFIG,
    MONETARY_CONFIG,
    TradeEvent
} from '@megatron/lib-common';
import { Prisma } from '@megatron/database';
import { redis, CHANNELS } from '../lib/redis';
import { checkAndTrackDailyLimit } from './lp-limits';

/**
 * Handle LP Contribution
 * - Validates asset state
 * - Transfers USDC from User to Pool
 * - Mints LP Shares
 * - Creates Vesting Schedule
 * - Activates asset if Soft Cap reached
 */
export async function contributeToPool(userId: string, assetId: string, amountUsdc: number) {
    if (amountUsdc <= 0) throw new Error('Contribution must be positive');

    return await db.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1. Fetch Asset & Pool
        const asset = await tx.asset.findUnique({
            where: { id: assetId },
            include: { pool: true }
        });

        if (!asset) throw new Error('Asset not found');
        if (asset.status !== 'funding' && asset.status !== 'active') {
            throw new Error(`Asset not in funding or active state (status: ${asset.status})`);
        }

        const pool = asset.pool;
        if (!pool) throw new Error('Liquidity Pool not initialized');

        // 2. Validate User Balance
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');
        if (user.walletHotBalance.lessThan(amountUsdc)) {
            throw new Error('Insufficient funds');
        }

        // 3. Calculate Shares
        // If pool is empty or totalLPShares is 0 (first contributor)
        // shares = amount * 1e18 (normalize to 18 decimals like ERC20)
        // Else: shares = (amount / totalUsdc) * totalLPShares
        let newShares: Prisma.Decimal;
        const totalUsdc = pool.totalUsdc.toNumber();
        const totalLpShares = pool.totalLPShares.toNumber();

        if (totalUsdc === 0 || totalLpShares === 0) {
            // 1:1 ratio for first contributor, scaled by 1e18 if needed, 
            // but schema uses Decimal, let's just keep 1:1 value (e.g. 100 USDC = 100 Shares)
            // to avoid extreme massive numbers if not needed.
            // Masterplan formula: "lp_shares = contribution_amount * 1e18".
            // Let's stick to simple 1:1 logic for readability unless 1e18 requested.
            // Masterplan said "1e18", but decimal type handles precision.
            // Let's us 1:1 for simplicity: 1 USDC = 1 LP Share initially.
            newShares = new Prisma.Decimal(amountUsdc);
        } else {
            newShares = new Prisma.Decimal((amountUsdc / totalUsdc) * totalLpShares);
        }

        // 4. Update Balances (Transfer User -> Pool)
        await tx.user.update({
            where: { id: userId },
            data: { walletHotBalance: { decrement: amountUsdc } }
        });

        await tx.liquidityPool.update({
            where: { id: pool.id },
            data: {
                totalUsdc: { increment: amountUsdc },
                totalLPShares: { increment: newShares }
            }
        });

        // 5. Upsert LP Share Record
        const existingLp = await tx.lPShare.findUnique({
            where: { poolId_userId: { poolId: pool.id, userId } },
            include: { unlockSchedule: true }
        });

        let lpShareId = existingLp?.id;
        const now = new Date();

        if (existingLp) {
            await tx.lPShare.update({
                where: { id: existingLp.id },
                data: {
                    lpShares: { increment: newShares },
                    contributedUsdc: { increment: amountUsdc }
                }
            });
        } else {
            const newLp = await tx.lPShare.create({
                data: {
                    poolId: pool.id,
                    userId,
                    lpShares: newShares,
                    contributedUsdc: amountUsdc,
                }
            });
            lpShareId = newLp.id;
        }

        // 6. Create Vesting Schedule
        // We create NEW schedule entries for this specific contribution
        // Note: Schema links schedule to lpShareId. Simple model: Just add rows.
        // Complex model: Track each contribution batch.
        // For MVP, we add schedule rows for this contribution's portion.
        // Or we simplify and just say "all holdings follow schedule from first contribution"? 
        // No, Masterplan says "Vesting Creation (when LP contributes)".
        // We'll add 4 new rows for this contribution.
        if (!lpShareId) throw new Error("Failed to get LP Share ID"); // Should not happen

        for (const milestone of VESTING_MILESTONES) {
            const unlockDate = new Date(now.getTime() + (milestone.days * 24 * 60 * 60 * 1000));
            await tx.lPUnlockSchedule.create({
                data: {
                    lpShareId: lpShareId,
                    unlockDate,
                    unlockPercentage: new Prisma.Decimal(milestone.percentage),
                    unlocked: false
                }
            });
        }

        // 7. Write Ledger
        await tx.ledger.create({
            data: {
                userId,
                deltaAmount: -amountUsdc,
                currency: 'USDC',
                reason: 'lp_contribution',
                refId: pool.id,
                metadata: { assetId, shares: newShares.toNumber() }
            }
        });

        // 8. Activation Check
        // If Funding & Reached Soft Cap
        const finalPoolUsdc = totalUsdc + amountUsdc;
        const softCap = asset.softCap.toNumber();

        if (asset.status === 'funding' && finalPoolUsdc >= softCap) {
            // ACTIVATE
            await tx.asset.update({
                where: { id: assetId },
                data: {
                    status: 'active',
                    activatedAt: now
                }
            });

            await tx.liquidityPool.update({
                where: { id: pool.id },
                data: { status: 'active' }
            });

            // We should emit event, but inside transaction it's risky if tx fails.
            // We'll return a flag to caller or use after-commit hook pattern (executeBuyAndPublish)
        }

        return { lpShareId, newShares, activated: (asset.status === 'funding' && finalPoolUsdc >= softCap) };

    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60000, maxWait: 20000 });
}

/**
 * Claim accumulated fees
 */
export async function claimFees(userId: string, assetId: string) {
    return await db.$transaction(async (tx: Prisma.TransactionClient) => {
        const asset = await tx.asset.findUnique({
            where: { id: assetId },
            include: { pool: true }
        });

        if (!asset || !asset.pool) throw new Error("Asset or pool not found");

        const lpShare = await tx.lPShare.findUnique({
            where: { poolId_userId: { poolId: asset.pool.id, userId } }
        });

        if (!lpShare) throw new Error("No LP position found");

        const rewards = lpShare.unclaimedRewards;
        if (rewards.lessThanOrEqualTo(0)) throw new Error("No rewards to claim");

        // Credit User
        await tx.user.update({
            where: { id: userId },
            data: { walletHotBalance: { increment: rewards } }
        });

        // Reset LP Rewards
        await tx.lPShare.update({
            where: { id: lpShare.id },
            data: { unclaimedRewards: 0 }
        });

        // Ledger
        await tx.ledger.create({
            data: {
                userId,
                deltaAmount: rewards,
                currency: 'USDC',
                reason: 'lp_fee_claim',
                refId: lpShare.id,
                metadata: { assetId }
            }
        });

        return rewards;
    });
}

/**
 * Instant Withdrawal
 * - Calculates vested amount
 * - Checks 25% limit
 * - Burns shares -> Sends USDC
 */
export async function withdrawLiquidityInstant(userId: string, assetId: string, amountUsdc: number) {
    if (amountUsdc <= 0) throw new Error("Amount must be positive");

    return await db.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1. Fetch & Validate
        const asset = await tx.asset.findUnique({
            where: { id: assetId },
            include: { pool: true }
        });
        if (!asset || !asset.pool) throw new Error("Asset/Pool not found");

        // Check Daily Limit
        await checkAndTrackDailyLimit(asset.pool.id, amountUsdc);

        const lpShare = await tx.lPShare.findUnique({
            where: { poolId_userId: { poolId: asset.pool.id, userId } },
            include: { unlockSchedule: true }
        });

        if (!lpShare) throw new Error("LP not found");

        // 2. Calculate Vested & Limits
        // We need to map Prisma objects to our shared interface if needed, 
        // or just pass them if structure matches.
        // Prisma 'Decimal' needstoNumber() for our helper.
        // Helper expects simple objects.
        const schedule = lpShare.unlockSchedule.map(s => ({
            days: 0, // Not used by helper if we convert date directly? 
            // Helper uses days from start... wait.
            // Our helper `calculateVestedAmount` iterates schedule and checks logic.
            // But we stored explicit `unlockDate` in DB!
            // So we don't need `days` from start, we just check `unlockDate`.
            // Wait, helper implementation:
            // "const milestoneTime = start + (milestone.days...)"
            // The helper assumes relative days.
            // But our DB stores absolute dates.
            // We should arguably just check the DB dates directly.
            // Let's implement custom logic here using the DB dates for accuracy.
            percentage: s.unlockPercentage.toNumber(),
            unlockDate: s.unlockDate
        }));

        const now = new Date();
        let maxUnlockedPct = 0;
        for (const s of schedule) {
            if (now >= s.unlockDate) {
                maxUnlockedPct = Math.max(maxUnlockedPct, s.percentage);
            }
        }

        const totalContributed = lpShare.contributedUsdc.toNumber();
        const vestedPrincipal = totalContributed * (maxUnlockedPct / 100);
        const instantLimit = vestedPrincipal * MONETARY_CONFIG.MAX_INSTANT_WITHDRAWAL_PCT;

        if (amountUsdc > instantLimit) {
            throw new Error(`Exceeds instant limit (${instantLimit.toFixed(2)} USDC)`);
        }

        // 3. Execution (Burn & Send)
        // Calculate shares to burn based on Pool NAV? 
        // Or proportional to contribution?
        // Masterplan: "Burn LP shares proportionally... sharesToBurn = (amount / lp.contributedUsdc) * lp.lpShares"
        // This keeps it simple (principal-based withdrawal).
        const currentLpShares = lpShare.lpShares.toNumber();
        const sharesToBurn = new Prisma.Decimal((amountUsdc / totalContributed) * currentLpShares);

        await tx.lPShare.update({
            where: { id: lpShare.id },
            data: {
                lpShares: { decrement: sharesToBurn },
                contributedUsdc: { decrement: amountUsdc }
            }
        });

        await tx.liquidityPool.update({
            where: { id: asset.pool.id },
            data: {
                totalUsdc: { decrement: amountUsdc },
                totalLPShares: { decrement: sharesToBurn }
            }
        });

        await tx.user.update({
            where: { id: userId },
            data: { walletHotBalance: { increment: amountUsdc } }
        });

        await tx.ledger.create({
            data: {
                userId,
                deltaAmount: amountUsdc,
                currency: 'USDC',
                reason: 'lp_withdraw_instant',
                refId: lpShare.id
            }
        });

        return { withdrawn: amountUsdc, sharesBurned: sharesToBurn };
    });
}

/**
 * Request Queued Withdrawal
 * - For amounts > instant limit but <= vested
 * - Adds to WithdrawalQueue
 */
export async function requestWithdrawal(userId: string, assetId: string, amountUsdc: number) {
    if (amountUsdc <= 0) throw new Error("Amount must be positive");

    return await db.$transaction(async (tx: Prisma.TransactionClient) => {
        const asset = await tx.asset.findUnique({
            where: { id: assetId },
            include: { pool: true }
        });
        if (!asset || !asset.pool) throw new Error("Asset/Pool not found");

        const lpShare = await tx.lPShare.findUnique({
            where: { poolId_userId: { poolId: asset.pool.id, userId } },
            include: { unlockSchedule: true }
        });
        if (!lpShare) throw new Error("LP not found");

        // Calculate Vested
        const schedule = lpShare.unlockSchedule.map(s => ({
            percentage: s.unlockPercentage.toNumber(),
            unlockDate: s.unlockDate
        }));
        const now = new Date();
        let maxUnlockedPct = 0;
        for (const s of schedule) {
            if (now >= s.unlockDate) {
                maxUnlockedPct = Math.max(maxUnlockedPct, s.percentage);
            }
        }

        const totalContributed = lpShare.contributedUsdc.toNumber();
        const vestedPrincipal = totalContributed * (maxUnlockedPct / 100);

        if (amountUsdc > vestedPrincipal) {
            throw new Error(`Exceeds vested amount (${vestedPrincipal.toFixed(2)} USDC)`);
        }

        // Create Queue Entry
        await tx.withdrawalQueue.create({
            data: {
                lpShareId: lpShare.id,
                amountUsdc: amountUsdc,
                status: 'pending'
            }
        });

        return { queued: true, amount: amountUsdc };
    });
}
