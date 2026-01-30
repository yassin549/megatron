import { NextResponse } from 'next/server';
import { db } from '@megatron/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRedisClient } from '@megatron/lib-integrations';
import { MONETARY_CONFIG } from '@megatron/lib-common';

import { isAdmin } from '@/lib/admin';
export const dynamic = 'force-dynamic';

// Helper for timing out async operations
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
    const timeoutPromise = new Promise<T>((resolve) => {
        setTimeout(() => resolve(fallback), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]);
}

export async function GET(req: Request) {
    try {
        if (!await isAdmin(req)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // 1. Core Stats - Fetch directly from source tables
        const [
            totalUsers,
            activeAssetsCount,
            totalAssetsCount,
            allTimeFeesResult,
            treasury,
        ] = await Promise.all([
            db.user.count(),
            db.asset.count({
                where: {
                    status: { in: ['active', 'funding'] }
                }
            }),
            db.asset.count(),
            db.trade.aggregate({ _sum: { fee: true } }),
            db.platformTreasury.findUnique({ where: { id: 'treasury' } }),
        ]);

        console.log(`[ADMIN-STATS] raw counts: users=${totalUsers}, activeAssets=${activeAssetsCount}, totalAssets=${totalAssetsCount}`);

        // Volume query: Optimized by using Prisma's aggregate instead of raw query for better type safety and pooling
        let totalVolume24h = 0;
        try {
            // Volume = Sum of (price * quantity) for all trades in last 24h
            const volumeResult = await db.$queryRaw<{ volume: number }[]>`
                SELECT COALESCE(SUM(CAST(price AS DOUBLE PRECISION) * CAST(quantity AS DOUBLE PRECISION)), 0) as volume 
                FROM "Trade" 
                WHERE timestamp >= ${oneDayAgo}
            `;
            totalVolume24h = Number(volumeResult[0]?.volume || 0);
        } catch (e) {
            console.error('Volume query failed:', e);
            // Non-critical: allow dashboard to load even if volume fails
        }

        // 24h Fees query
        let totalFees24h = 0;
        try {
            const fees24h = await db.trade.aggregate({
                where: { timestamp: { gte: oneDayAgo } },
                _sum: { fee: true }
            });
            totalFees24h = Number(fees24h._sum.fee || 0);
        } catch (e) {
            console.error('Fees 24h query failed:', e);
        }

        const allTimeFees = Number(allTimeFeesResult._sum?.fee || 0);
        const platformShare = MONETARY_CONFIG?.PLATFORM_SHARE ?? 0.1;
        const calculatedPlatformRevenue = allTimeFees * platformShare;

        // 2. Health Checks with 2s timeout each
        let dbStatus = 'Disconnected';
        try {
            dbStatus = await withTimeout(
                db.$queryRaw`SELECT 1`.then(() => 'Connected'),
                2000,
                'Timeout'
            );
        } catch (e) {
            console.error('Database check failed:', e);
        }

        let redisStatus = 'Disconnected';
        try {
            redisStatus = await withTimeout(
                (async () => {
                    const redis = getRedisClient();
                    if (!redis) return 'No Client';
                    const ping = await redis.ping();
                    return ping === 'PONG' ? 'Connected' : 'Error';
                })(),
                2000,
                'Timeout'
            );
        } catch (e) {
            console.error('Redis check failed:', e);
        }

        let workerStatus = 'Not running';
        try {
            workerStatus = await withTimeout(
                (async () => {
                    const redis = getRedisClient();
                    if (!redis) return 'No Client';
                    const heartbeat = await redis.get('worker_heartbeat');
                    if (heartbeat) {
                        const lastHeartbeat = parseInt(heartbeat);
                        if (Date.now() - lastHeartbeat < 90000) {
                            return 'Active';
                        }
                    }
                    return 'Not running';
                })(),
                2000,
                'Timeout'
            );
        } catch (e) {
            console.error('Worker status check failed:', e);
        }

        // Return stats. Treasury balance is the primary for revenue, but we fall back to 
        // calculated fees if the treasury record is missing/uninitialized.
        const treasuryBalance = treasury ? Number(treasury.balance) : 0;
        const displayedRevenue = treasuryBalance > 0 ? treasuryBalance : calculatedPlatformRevenue;

        return NextResponse.json({
            stats: {
                totalUsers,
                activeAssets: activeAssetsCount,
                totalAssets: totalAssetsCount,
                totalVolume24h,
                platformFees: calculatedPlatformRevenue,
                allTimeFees: allTimeFees,
                platformFees24h: totalFees24h,
                treasuryBalance: displayedRevenue
            },
            health: {
                database: dbStatus,
                redis: redisStatus,
                worker: workerStatus
            }
        });
    } catch (error: any) {
        console.error('Failed to fetch admin stats:', error);
        return NextResponse.json(
            { error: error?.message || 'Internal Server Error', code: error?.code },
            { status: 500 }
        );
    }
}
