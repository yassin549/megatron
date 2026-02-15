import { db } from '@megatron/database';
import { Prisma } from '@prisma/client';

export async function enrichAssets(assets: any[], userBookmarks: Set<string> = new Set()) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const assetIds = assets.map(a => a.id);

    if (assetIds.length === 0) {
        return [];
    }

    const [tradeVolumes, holders, oldPriceTicks, oldestPriceTicks] = await Promise.all([
        db.$queryRaw<{ assetId: string; side: string; volume: number }[]>`
            SELECT "assetId", "side",
                   COALESCE(SUM(CAST(price AS DOUBLE PRECISION) * CAST(quantity AS DOUBLE PRECISION)), 0) AS volume
            FROM "Trade"
            WHERE "timestamp" >= ${oneDayAgo} AND "assetId" IN (${Prisma.join(assetIds)})
            GROUP BY "assetId", "side"
        `,
        db.$queryRaw<{ assetId: string; holders: number }[]>`
            SELECT "assetId", COUNT(*)::int AS holders
            FROM "Position"
            WHERE "shares" > 0 AND "assetId" IN (${Prisma.join(assetIds)})
            GROUP BY "assetId"
        `,
        db.$queryRaw<{ assetId: string; priceDisplay: number }[]>`
            SELECT DISTINCT ON ("assetId") "assetId", "priceDisplay"
            FROM "PriceTick"
            WHERE "timestamp" <= ${oneDayAgo} AND "assetId" IN (${Prisma.join(assetIds)})
            ORDER BY "assetId", "timestamp" DESC
        `,
        db.$queryRaw<{ assetId: string; priceDisplay: number }[]>`
            SELECT DISTINCT ON ("assetId") "assetId", "priceDisplay"
            FROM "PriceTick"
            WHERE "assetId" IN (${Prisma.join(assetIds)})
            ORDER BY "assetId", "timestamp" ASC
        `
    ]);

    const volumeMap = new Map<string, { buy: number; sell: number }>();
    for (const row of tradeVolumes) {
        const current = volumeMap.get(row.assetId) || { buy: 0, sell: 0 };
        if (row.side === 'buy') current.buy += Number(row.volume || 0);
        if (row.side === 'sell') current.sell += Number(row.volume || 0);
        volumeMap.set(row.assetId, current);
    }

    const holdersMap = new Map<string, number>();
    for (const row of holders) {
        holdersMap.set(row.assetId, Number(row.holders || 0));
    }

    const oldPriceMap = new Map<string, number>();
    for (const row of oldPriceTicks) {
        if (row.priceDisplay !== null && row.priceDisplay !== undefined) {
            oldPriceMap.set(row.assetId, Number(row.priceDisplay));
        }
    }
    for (const row of oldestPriceTicks) {
        if (!oldPriceMap.has(row.assetId) && row.priceDisplay !== null && row.priceDisplay !== undefined) {
            oldPriceMap.set(row.assetId, Number(row.priceDisplay));
        }
    }

    return await Promise.all(
        assets.map(async (asset) => {
            const volumes = volumeMap.get(asset.id) || { buy: 0, sell: 0 };
            const buyVolume = volumes.buy;
            const sellVolume = volumes.sell;
            const volume24h = buyVolume + sellVolume;
            const pressure = volume24h > 0 ? (buyVolume / volume24h) * 100 : 50;

            const holdersCount = holdersMap.get(asset.id) || 0;

            const currentPrice = Number(asset.lastDisplayPrice || 0) ||
                (asset.pricingParams as { P0?: number })?.P0 || 10;

            // Old price logic
            let oldPrice = oldPriceMap.get(asset.id);
            if (oldPrice === undefined) {
                oldPrice = (asset.pricingParams as { P0?: number })?.P0;
            }

            const effectiveOldPrice = oldPrice ?? currentPrice;

            const change24h = effectiveOldPrice > 0
                ? ((currentPrice - effectiveOldPrice) / effectiveOldPrice) * 100
                : 0;

            const lastFundamental = Number(asset.lastFundamental) || null;
            const oracleLog = asset.oracleLogs?.[0];
            const lastUpdateChange = oracleLog?.deltaPercent ? Number(oracleLog.deltaPercent) : change24h;
            const aiConfidence = Number(oracleLog?.confidence) || null;
            const aiSummary = oracleLog?.summary ?? null;

            return {
                id: asset.id,
                name: asset.name,
                description: asset.description,
                type: asset.type,
                status: asset.status as 'funding' | 'active' | 'paused',
                price: currentPrice,
                change24h: Math.round(lastUpdateChange * 100) / 100,
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
                pressure: Math.round(pressure),
                marketCap: Math.round(currentPrice * Number(asset.totalSupply) * 100) / 100,
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
        take: 500,
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
    const lastDelta = oracleLogs[0]?.deltaPercent !== undefined ? Number(oracleLogs[0].deltaPercent) : change24h;

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
            change24h: Math.round(lastDelta * 100) / 100,
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
            userTrades: userId ? (await db.trade.findMany({
                where: {
                    assetId: id,
                    buyerId: userId,
                },
                orderBy: { timestamp: 'desc' },
                take: 50,
                select: {
                    price: true,
                    quantity: true,
                    side: true,
                    timestamp: true,
                }
            })).map((t: any) => ({
                price: Number(t.price),
                quantity: Number(t.quantity),
                side: t.side as 'buy' | 'sell',
                time: Math.floor(t.timestamp.getTime() / 1000),
            })) : [],
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
                summary: log.summary ? String(log.summary) : null,
                reasoning: reasoning ? String(reasoning) : null,
                sourceUrls: Array.isArray(log.sourceUrls) ? log.sourceUrls.map(String) : [],
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
