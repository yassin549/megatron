import { NextResponse } from 'next/server';
import { db } from '@megatron/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRedisClient } from '@megatron/lib-integrations';
import { MONETARY_CONFIG } from '@megatron/lib-common';

async function isAdmin(req: Request) {
    // 1. Check Session (Standard)
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { isAdmin: true }
        });
        if (user?.isAdmin) return true;
    }

    // 2. Check Header (Admin Dashboard Specific)
    const adminPassword = process.env.ADMIN_PASSWORD;
    const headerPassword = req.headers.get('X-Admin-Password');
    if (adminPassword && headerPassword === adminPassword) {
        return true;
    }

    return false;
}

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
            volume24hResult,
            fees24hResult
        ] = await Promise.all([
            db.user.count(),
            db.asset.count({ where: { status: 'active' } }),
            db.trade.aggregate({ _sum: { fee: true } }),
            db.platformTreasury.findUnique({ where: { id: 'treasury' } }),
            db.$queryRaw<{ volume: number }[]>`SELECT SUM(price * quantity) as volume FROM "Trade" WHERE timestamp >= ${oneDayAgo}`,
            db.trade.aggregate({
                where: { timestamp: { gte: oneDayAgo } },
                _sum: { fee: true }
            })
        ]);

        const totalVolume24h = volume24hResult[0]?.volume ? Number(volume24hResult[0].volume) : 0;
        const totalFees24h = Number(fees24hResult._sum.fee || 0);
        const allTimeFees = Number(allTimeFeesResult._sum.fee || 0);
        const realPlatformRevenue = allTimeFees * MONETARY_CONFIG.PLATFORM_SHARE;

        // 2. Health Checks
        let dbStatus = 'Disconnected';
        try {
            await db.$queryRaw`SELECT 1`;
            dbStatus = 'Connected';
        } catch (e) {
            console.error('Database check failed:', e);
        }

        let redisStatus = 'Disconnected';
        try {
            const redis = getRedisClient();
            const ping = await redis.ping();
            if (ping === 'PONG') redisStatus = 'Connected';
        } catch (e) {
            console.error('Redis check failed:', e);
        }

        let workerStatus = 'Not running';
        try {
            const redis = getRedisClient();
            const heartbeat = await redis.get('worker_heartbeat');
            if (heartbeat) {
                // Key expires in 60s, so existence means it's recent. 
                // We double check the timestamp just in case.
                const lastHeartbeat = parseInt(heartbeat);
                if (Date.now() - lastHeartbeat < 90000) {
                    workerStatus = 'Active';
                }
            }
        } catch (e) {
            console.error('Worker status check failed:', e);
        }

        return NextResponse.json({
            stats: {
                totalUsers,
                activeAssets: activeAssetsCount,
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
