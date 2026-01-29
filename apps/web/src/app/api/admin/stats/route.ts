import { NextResponse } from 'next/server';
import { db } from '@megatron/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRedisClient } from '@megatron/lib-integrations';
import { MONETARY_CONFIG } from '@megatron/lib-common';

import { isAdmin } from '@/lib/admin';


export async function GET(req: Request) {
    try {
        if (!await isAdmin(req)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        // 1. Core Stats
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const [
            totalUsers,
            activeAssetsCount,
            allTimeFeesResult,
            treasury,
        ] = await Promise.all([
            db.user.count().catch(() => 0),
            db.asset.count({ where: { status: 'active' } }).catch(() => 0),
            db.trade.aggregate({ _sum: { fee: true } }).catch(() => ({ _sum: { fee: 0 } })),
            db.platformTreasury.findUnique({ where: { id: 'treasury' } }).catch(() => null),
        ]);

        // Volume query can be complex, wrap it
        let totalVolume24h = 0;
        try {
            const volumeResult = await db.$queryRaw<{ volume: number }[]>`
                SELECT COALESCE(SUM(price * quantity), 0) as volume 
                FROM "Trade" 
                WHERE timestamp >= ${oneDayAgo}
            `;
            totalVolume24h = Number(volumeResult[0]?.volume || 0);
        } catch (e) {
            console.error('Volume query failed:', e);
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

        const allTimeFees = Number((allTimeFeesResult as any)?._sum?.fee || 0);
        const realPlatformRevenue = allTimeFees * (MONETARY_CONFIG?.PLATFORM_SHARE || 0.1);

        // 2. Health Checks
        let dbStatus = 'Disconnected';
        try {
            // Heartbeat check
            await db.$executeRaw`SELECT 1`;
            dbStatus = 'Connected';
        } catch (e) {
            console.error('Database check failed:', e);
        }

        let redisStatus = 'Disconnected';
        try {
            const redis = getRedisClient();
            if (redis) {
                const ping = await redis.ping();
                if (ping === 'PONG') redisStatus = 'Connected';
            }
        } catch (e) {
            console.error('Redis check failed:', e);
        }

        let workerStatus = 'Not running';
        try {
            const redis = getRedisClient();
            if (redis) {
                const heartbeat = await redis.get('worker_heartbeat');
                if (heartbeat) {
                    const lastHeartbeat = parseInt(heartbeat);
                    if (Date.now() - lastHeartbeat < 90000) {
                        workerStatus = 'Active';
                    }
                }
            }
        } catch (e) {
            console.error('Worker status check failed:', e);
        }

        return NextResponse.json({
            stats: {
                totalUsers: totalUsers || 0,
                activeAssets: activeAssetsCount || 0,
                totalVolume24h,
                platformFees: realPlatformRevenue,
                platformFees24h: totalFees24h,
                treasuryBalance: treasury ? Number(treasury.balance) : 0
            },
            health: {
                database: dbStatus,
                redis: redisStatus,
                worker: workerStatus
            }
        });
    } catch (error) {
        console.error('Failed to fetch admin stats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
