
import { db } from '@megatron/database';
import { Prisma } from '@megatron/database';
import { DEFAULT_CONFIG } from '@megatron/lib-common';
import { checkAndTrackDailyLimit } from '../modules/lp-limits';

/**
 * Process Withdrawal Queue
 * - Runs daily
 * - Processes FIFO up to 10% of pool daily limit
 */
export async function processWithdrawalQueue() {
    console.log('Starting Withdrawal Queue Processing...');

    const pools = await db.liquidityPool.findMany({
        where: { status: 'active' }
    });

    for (const pool of pools) {
        // 1. Calculate Daily Limit (Delegated to Global Redis Check)
        // const totalLiquidity = pool.totalUsdc.toNumber();
        // const maxDailyWithdrawal = totalLiquidity * DEFAULT_CONFIG.DAILY_POOL_WITHDRAWAL_PCT;

        // 2. Fetch Pending Requests FIFO
        // We need to join with LPShare to filter by poolId
        const pendingRequests = await db.withdrawalQueue.findMany({
            where: {
                status: 'pending',
                lpShare: {
                    poolId: pool.id
                }
            },
            orderBy: { requestedAt: 'asc' },
            include: { lpShare: true }
        });

        let processedAmount = 0;

        for (const req of pendingRequests) {
            const amount = req.amountUsdc.toNumber();

            // Check if we hit the limit
            // Check Global Limit (Redis)
            try {
                await checkAndTrackDailyLimit(pool.id, amount);
            } catch (err) {
                console.log(`Pool ${pool.id}: Daily limit reached (Global). Stopping queue.`);
                break;
            }

            try {
                // Execute Withdrawal (Atomic)
                await db.$transaction(async (tx: Prisma.TransactionClient) => {
                    // Update Request Status
                    await tx.withdrawalQueue.update({
                        where: { id: req.id },
                        data: {
                            status: 'processed',
                            processedAt: new Date()
                        }
                    });

                    // Burn Shares & Send Funds logic
                    // Need to calculate shares to burn again based on current contribution ratio
                    // Or keep it proportional to principal as per instant logic

                    const lp = req.lpShare;
                    const totalContributed = lp.contributedUsdc.toNumber();
                    // Avoid division by zero if something weird happened
                    if (totalContributed <= 0) throw new Error("Invalid LP state");

                    const sharesToBurn = new Prisma.Decimal(
                        (amount / totalContributed) * lp.lpShares.toNumber()
                    );

                    await tx.lPShare.update({
                        where: { id: lp.id },
                        data: {
                            lpShares: { decrement: sharesToBurn },
                            contributedUsdc: { decrement: amount }
                        }
                    });

                    await tx.liquidityPool.update({
                        where: { id: pool.id },
                        data: {
                            totalUsdc: { decrement: amount },
                            totalLPShares: { decrement: sharesToBurn }
                        }
                    });

                    await tx.user.update({
                        where: { id: lp.userId },
                        data: { walletHotBalance: { increment: amount } }
                    });

                    await tx.ledger.create({
                        data: {
                            userId: lp.userId,
                            deltaAmount: amount,
                            currency: 'USDC',
                            reason: 'lp_withdraw_queue',
                            refId: req.id
                        }
                    });
                });

                processedAmount += amount;
                console.log(`Processed withdrawal ${req.id} for ${amount} USDC`);

            } catch (error) {
                console.error(`Failed to process withdrawal ${req.id}:`, error);
                // Optionally mark as failed or retry next time
            }
        }
    }
    console.log('Withdrawal Queue Processing Complete.');
}

/**
 * Check Funding Deadlines
 * - Runs hourly
 * - Refunds LPs if Soft Cap not met
 */
export async function checkFundingDeadlines() {
    console.log('Checking Funding Deadlines...');

    const now = new Date();

    // Find Funding Assets past deadline
    // We fetch all expired funding assets and filter manually because Prisma 
    // doesn't support comparing fields (totalUsdc < softCap) in where clause directly.

    // Prisma doesn't support comparing fields directly in where clause like that easily without raw query
    // So we fetch all expired funding assets and filter manually
    const candidates = await db.asset.findMany({
        where: {
            status: 'funding',
            fundingDeadline: { lt: now }
        },
        include: { pool: true }
    });

    for (const asset of candidates) {
        if (!asset.pool) continue;

        const raised = asset.pool.totalUsdc.toNumber();
        const softCap = asset.softCap.toNumber();

        if (raised < softCap) {
            console.log(`Asset ${asset.id} failed funding (${raised}/${softCap}). Refunding...`);

            // Refund LPs
            const lps = await db.lPShare.findMany({
                where: { poolId: asset.pool.id }
            });

            await db.$transaction(async (tx: Prisma.TransactionClient) => {
                for (const lp of lps) {
                    const refundAmount = lp.contributedUsdc.toNumber();

                    await tx.user.update({
                        where: { id: lp.userId },
                        data: { walletHotBalance: { increment: refundAmount } }
                    });

                    await tx.ledger.create({
                        data: {
                            userId: lp.userId,
                            deltaAmount: refundAmount,
                            currency: 'USDC',
                            reason: 'lp_refund',
                            refId: asset.id
                        }
                    });
                }

                await tx.asset.update({
                    where: { id: asset.id },
                    data: { status: 'cancelled' }
                });

                await tx.liquidityPool.update({
                    where: { id: asset.pool!.id },
                    data: { status: 'failed' } // LPPoolStatus enum
                });
            });
        }
    }
}
