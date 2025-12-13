import { db } from '@megatron/database';
import { redis } from '../lib/redis';
import { DEFAULT_CONFIG } from '@megatron/lib-common';

/**
 * Checks if a withdrawal would exceed the daily pool limit (10% of TVL).
 * If safe, increments the daily counter.
 * 
 * @param poolId - The liquidity pool ID
 * @param amountUsdc - The amount attempting to be withdrawn
 * @throws Error if limit exceeded
 */
export async function checkAndTrackDailyLimit(poolId: string, amountUsdc: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const key = `daily_withdraw:${poolId}:${today}`;

    if (!redis) throw new Error("Redis client not initialized");

    // 1. Get current usage
    const currentUsageStr = await redis.get(key);
    const currentUsage = currentUsageStr ? parseFloat(currentUsageStr) : 0;

    // 2. Get Pool TVL (Total Value Locked)
    const pool = await db.liquidityPool.findUnique({
        where: { id: poolId },
        select: { totalUsdc: true } // We use totalUsdc as the proxy for TVL
    });

    if (!pool) throw new Error(`Pool ${poolId} not found`);

    const totalLiquidity = pool.totalUsdc.toNumber();
    const limit = totalLiquidity * DEFAULT_CONFIG.DAILY_POOL_WITHDRAWAL_PCT;

    // 3. Check Limit
    if (currentUsage + amountUsdc > limit) {
        throw new Error(
            `Daily withdrawal limit reached for pool. ` +
            `Used: ${currentUsage.toFixed(2)} / Limit: ${limit.toFixed(2)} USDC`
        );
    }

    // 4. Track usage (Atomic increment if possible, but GET+SET is acceptable for this granularity)
    // INCRBYFLOAT is best for atomic updates
    await redis.incrbyfloat(key, amountUsdc);

    // Set expiry to 24h + buffer if it's a new key
    if (!currentUsageStr) {
        await redis.expire(key, 60 * 60 * 25);
    }
}
