import { NextResponse } from 'next/server';
import { db } from '@megatron/database';

export async function GET(): Promise<NextResponse> {
    try {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Total assets count
        const totalAssets = await db.asset.count();

        // 24h volume across all assets
        const trades = await db.trade.findMany({
            where: {
                timestamp: { gte: oneDayAgo },
            },
            select: {
                price: true,
                quantity: true,
            },
        });

        let volume24h = 0;
        for (const t of trades) {
            volume24h += t.price.toNumber() * t.quantity.toNumber();
        }

        // Total liquidity across all pools
        const liquidityResult = await db.liquidityPool.aggregate({
            _sum: {
                totalUsdc: true,
            },
        });
        const totalLiquidity = liquidityResult._sum.totalUsdc?.toNumber() ?? 0;

        // Count active traders (users with trades in last 24h)
        const activeTraders = await db.trade.groupBy({
            by: ['buyerId'],
            where: {
                timestamp: { gte: oneDayAgo },
            },
        });

        return NextResponse.json({
            totalAssets,
            volume24h: Math.round(volume24h * 100) / 100,
            totalLiquidity: Math.round(totalLiquidity * 100) / 100,
            activeTraders: activeTraders.length,
        });
    } catch (error) {
        console.error('[API/assets/stats] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}
