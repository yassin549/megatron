import { NextResponse } from 'next/server';
import { db } from '@megatron/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRedisClient } from '@megatron/lib-integrations';
import { MONETARY_CONFIG } from '@megatron/lib-common';

async function isAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return false;

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true }
    });

    return user?.isAdmin === true;
}

export async function GET() {
    try {
        if (!await isAdmin()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // 1. Core Stats
        const [
            totalUsers,
            activeAssetsCount,
            tradeStats,
            allTimeTradeStats,
            treasury
        ] = await Promise.all([
            db.user.count(),
            db.asset.count({ where: { status: 'active' } }),
            db.trade.findMany({
                where: { timestamp: { gte: oneDayAgo } },
                select: { price: true, quantity: true, fee: true }
            }),
            db.trade.aggregate({
                _sum: { fee: true }
            }),
            db.platformTreasury.findUnique({ where: { id: 'treasury' } })
        ]);

        const allTimeFees = Number(allTimeTradeStats._sum.fee || 0);
        const realPlatformRevenue = allTimeFees * MONETARY_CONFIG.PLATFORM_SHARE;

        let totalVolume24h = 0;
        let totalFees24h = 0;
        for (const t of tradeStats) {
            totalVolume24h += Number(t.price) * Number(t.quantity);
            totalFees24h += Number(t.fee);
        }

        // 2. Health Checks
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
                const diff = Date.now() - parseInt(heartbeat);
                if (diff < 90000) { // Active if heartbeat in last 90 seconds
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
                database: 'Connected',
                redis: redisStatus,
                worker: workerStatus
            }
        });
    } catch (error) {
        console.error('Failed to fetch admin stats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
