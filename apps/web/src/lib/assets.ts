import { db } from '@megatron/database';

export async function enrichAssets(assets: any[], userBookmarks: Set<string> = new Set()) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return await Promise.all(
        assets.map(async (asset) => {
            // Calculate 24h volume
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
                volume24h += Number(t.price) * Number(t.quantity);
            }

            // Get Holders Count
            const holdersCount = await db.position.count({
                where: {
                    assetId: asset.id,
                    shares: { gt: 0 }
                }
            });

            // Get price 24h ago
            const oldPriceTick = await db.priceTick.findFirst({
                where: {
                    assetId: asset.id,
                    timestamp: { lte: oneDayAgo },
                },
                orderBy: { timestamp: 'desc' },
                select: { priceDisplay: true },
            });

            const currentPrice = Number(asset.lastDisplayPrice || 0) ||
                (asset.pricingParams as { P0?: number })?.P0 || 10;

            // Old price logic
            let oldPrice = oldPriceTick?.priceDisplay ? Number(oldPriceTick.priceDisplay) : undefined;

            if (oldPrice === undefined) {
                oldPrice = (asset.pricingParams as { P0?: number })?.P0;
            }

            if (oldPrice === undefined) {
                const oldestTick = await db.priceTick.findFirst({
                    where: { assetId: asset.id },
                    orderBy: { timestamp: 'asc' },
                    select: { priceDisplay: true }
                });
                oldPrice = oldestTick?.priceDisplay ? Number(oldestTick.priceDisplay) : undefined;
            }

            const effectiveOldPrice = oldPrice ?? currentPrice;

            const change24h = effectiveOldPrice > 0
                ? ((currentPrice - effectiveOldPrice) / effectiveOldPrice) * 100
                : 0;

            const lastFundamental = Number(asset.lastFundamental) || null;
            const oracleLog = asset.oracleLogs?.[0];
            const aiConfidence = Number(oracleLog?.confidence) || null;
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
                totalSupply: Number(asset.totalSupply),
                softCap: Number(asset.softCap),
                hardCap: Number(asset.hardCap),
                fundingDeadline: asset.fundingDeadline?.toISOString() ?? null,
                poolLiquidity: asset.pool?.totalUsdc ? Number(asset.pool.totalUsdc) : 0,
                fundingProgress: asset.pool && asset.softCap
                    ? Math.min(100, (Number(asset.pool.totalUsdc) / Number(asset.softCap)) * 100)
                    : 0,
                lastFundamental,
                aiConfidence,
                aiSummary,
                imageUrl: asset.imageUrl,
                holders: holdersCount,
                isBookmarked: userBookmarks.has(asset.id),
            };
        })
    );
}
