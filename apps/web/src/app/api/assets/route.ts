import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, Prisma } from '@megatron/database';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
    try {
        const session = await getServerSession(authOptions);
        let userBookmarks = new Set<string>();

        if (session?.user?.id) {
            const bookmarks = await db.bookmark.findMany({
                where: { userId: session.user.id },
                select: { assetId: true }
            });
            userBookmarks = new Set(bookmarks.map(b => b.assetId));
        }

        // Fetch all assets with their pools
        const assets = await db.asset.findMany({
            include: {
                pool: {
                    select: {
                        totalUsdc: true,
                        totalLPShares: true,
                    },
                },
                oracleLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        confidence: true,
                        summary: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        // Calculate 24h stats for each asset
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const enrichedAssets = await Promise.all(
            assets.map(async (asset) => {
                // Get 24h volume from trades
                const volumeResult = await db.trade.aggregate({
                    where: {
                        assetId: asset.id,
                        timestamp: { gte: oneDayAgo },
                    },
                    _sum: {
                        fee: true,
                    },
                });

                // Calculate volume as sum of (price * quantity) for all trades
                const trades = await db.trade.findMany({
                    where: {
                        assetId: asset.id,
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

                // Get Holders Count
                const holdersCount = await db.position.count({
                    where: {
                        assetId: asset.id,
                        shares: { gt: 0 }
                    }
                });

                // Get price 24h ago for change calculation
                const oldPriceTick = await db.priceTick.findFirst({
                    where: {
                        assetId: asset.id,
                        timestamp: { lte: oneDayAgo },
                    },
                    orderBy: { timestamp: 'desc' },
                    select: { priceDisplay: true },
                });

                const currentPrice = asset.lastDisplayPrice?.toNumber() ??
                    (asset.pricingParams as { P0?: number })?.P0 ?? 10;
                const oldPrice = oldPriceTick?.priceDisplay?.toNumber() ?? currentPrice;
                const change24h = oldPrice > 0
                    ? ((currentPrice - oldPrice) / oldPrice) * 100
                    : 0;

                const lastFundamental = asset.lastFundamental?.toNumber() ?? null;
                const oracleLog = asset.oracleLogs[0];
                const aiConfidence = oracleLog?.confidence?.toNumber() ?? null;
                const aiSummary = oracleLog?.summary ?? null;

                return {
                    id: asset.id,
                    name: asset.name,
                    description: asset.description,
                    type: asset.type,
                    status: asset.status as 'funding' | 'active' | 'paused',
                    price: currentPrice,
                    change24h: Math.round(change24h * 100) / 100,
                    volume24h: Math.round(volume24h * 100) / 100,
                    totalSupply: asset.totalSupply.toNumber(),
                    softCap: asset.softCap.toNumber(),
                    hardCap: asset.hardCap.toNumber(),
                    fundingDeadline: asset.fundingDeadline?.toISOString() ?? null,
                    poolLiquidity: asset.pool?.totalUsdc.toNumber() ?? 0,
                    fundingProgress: asset.pool
                        ? Math.min(100, (asset.pool.totalUsdc.toNumber() / asset.softCap.toNumber()) * 100)
                        : 0,
                    // AI Data
                    lastFundamental,
                    aiConfidence,
                    aiSummary,
                    imageUrl: asset.imageUrl,
                    holders: holdersCount,
                    isBookmarked: userBookmarks.has(asset.id),
                };
            })
        );

        return NextResponse.json({ assets: enrichedAssets });
    } catch (error) {
        console.error('[API/assets] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch assets' },
            { status: 500 }
        );
    }
}
