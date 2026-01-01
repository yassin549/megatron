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

export async function getAssetDetail(id: string, userId?: string) {
    const asset = await db.asset.findUnique({
        where: { id },
        include: {
            pool: {
                select: {
                    totalUsdc: true,
                    totalLPShares: true,
                    status: true,
                },
            },
        },
    });

    if (!asset) return null;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const trades = await db.trade.findMany({
        where: {
            assetId: id,
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

    let oldPriceTick = await db.priceTick.findFirst({
        where: {
            assetId: id,
            timestamp: { lte: oneDayAgo },
        },
        orderBy: { timestamp: 'desc' },
        select: { priceDisplay: true },
    });

    if (!oldPriceTick) {
        oldPriceTick = await db.priceTick.findFirst({
            where: { assetId: id },
            orderBy: { timestamp: 'asc' },
            select: { priceDisplay: true },
        });
    }

    const oracleLogs = await db.oracleLog.findMany({
        where: { assetId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
            id: true,
            deltaPercent: true,
            confidence: true,
            summary: true,
            sourceUrls: true,
            createdAt: true,
            llmResponse: true,
        },
    });

    const priceHistory = await db.priceTick.findMany({
        where: { assetId: id },
        orderBy: { timestamp: 'desc' },
        take: 100,
        select: {
            timestamp: true,
            priceDisplay: true,
            priceMarket: true,
            priceFundamental: true,
            volume5m: true,
        },
    });

    const pricingParams = asset.pricingParams as { P0?: number; k?: number } | null;
    const currentPrice = Number(asset.lastDisplayPrice || 0) || pricingParams?.P0 || 10;
    const oldPrice = oldPriceTick?.priceDisplay ? Number(oldPriceTick.priceDisplay) : currentPrice;
    const change24h = oldPrice > 0 ? ((currentPrice - oldPrice) / oldPrice) * 100 : 0;
    const marketCap = currentPrice * Number(asset.totalSupply);

    let userPosition = null;
    if (userId) {
        userPosition = await db.position.findUnique({
            where: {
                userId_assetId: {
                    userId,
                    assetId: id
                }
            }
        });
    }

    const holdersCount = await db.position.count({
        where: {
            assetId: id,
            shares: { gt: 0 }
        }
    });

    const range24h = await db.priceTick.aggregate({
        where: {
            assetId: id,
            timestamp: { gte: oneDayAgo }
        },
        _min: { priceDisplay: true },
        _max: { priceDisplay: true }
    });
    const low24h = range24h._min.priceDisplay ? Number(range24h._min.priceDisplay) : currentPrice;
    const high24h = range24h._max.priceDisplay ? Number(range24h._max.priceDisplay) : currentPrice;

    return {
        asset: {
            id: asset.id,
            name: asset.name,
            description: asset.description,
            type: asset.type,
            status: asset.status,
            price: currentPrice,
            marketPrice: Number(asset.lastMarketPrice || 0) || currentPrice,
            change24h: Math.round(change24h * 100) / 100,
            volume24h: Math.round(volume24h * 100) / 100,
            marketCap: Math.round(marketCap * 100) / 100,
            totalSupply: Number(asset.totalSupply),
            liquidity: Number(asset.pool?.totalUsdc || 0),
            softCap: Number(asset.softCap),
            hardCap: Number(asset.hardCap),
            fundingDeadline: asset.fundingDeadline?.toISOString() ?? null,
            fundingProgress: asset.pool
                ? Math.min(100, (Number(asset.pool.totalUsdc) / Number(asset.softCap)) * 100)
                : 0,
            oracleQueries: asset.oracleQueries as string[],
            pricingParams,
            createdAt: asset.createdAt.toISOString(),
            activatedAt: asset.activatedAt?.toISOString() ?? null,
            imageUrl: asset.imageUrl,
            holders: holdersCount,
            low24h,
            high24h,
            userPosition: userPosition ? {
                shares: Number(userPosition.shares),
                avgPrice: Number(userPosition.avgPrice),
                stopLoss: userPosition.stopLoss ? Number(userPosition.stopLoss) : null,
                takeProfit: userPosition.takeProfit ? Number(userPosition.takeProfit) : null,
            } : null,
        },
        oracleLogs: oracleLogs.map((log: any) => {
            let reasoning = null;
            if (log.llmResponse && typeof log.llmResponse === 'object') {
                reasoning = (log.llmResponse as any).reasoning || null;
            }

            return {
                id: log.id,
                deltaPercent: Number(log.deltaPercent),
                confidence: Number(log.confidence),
                summary: log.summary,
                reasoning: reasoning,
                sourceUrls: log.sourceUrls as string[],
                createdAt: log.createdAt.toISOString(),
            };
        }),
        priceHistory: priceHistory.reverse().map((tick: any) => ({
            timestamp: tick.timestamp.toISOString(),
            price: Number(tick.priceDisplay),
            priceMarket: Number(tick.priceMarket),
            priceFundamental: Number(tick.priceFundamental),
            volume: Number(tick.volume5m),
        })),
    };
}
