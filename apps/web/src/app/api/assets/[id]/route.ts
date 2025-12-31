import { NextResponse } from 'next/server';
import { db } from '@megatron/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
): Promise<NextResponse> {
    try {
        const { id } = params;

        // Fetch asset with pool data
        let asset = await db.asset.findUnique({
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

        // Slug Fallback Search
        if (!asset) {
            console.log(`[API/assets/[id]] ID ${id} not found, trying name lookup...`);
            // Attempt to find by name (slugified)
            asset = await db.asset.findFirst({
                where: {
                    OR: [
                        { name: { mode: 'insensitive', equals: id.replace(/-/g, ' ') } },
                        { id: { mode: 'insensitive', equals: id } } // Redundant but safe for cross-env sync
                    ]
                },
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
        }

        if (!asset) {
            return NextResponse.json(
                { error: 'Asset not found' },
                { status: 404 }
            );
        }

        // Calculate 24h stats
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Get trades for volume
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
            volume24h += t.price.toNumber() * t.quantity.toNumber();
        }

        // Get price 24h ago for change
        // Get price 24h ago for change
        let oldPriceTick = await db.priceTick.findFirst({
            where: {
                assetId: id,
                timestamp: { lte: oneDayAgo },
            },
            orderBy: { timestamp: 'desc' },
            select: { priceDisplay: true },
        });

        // If asset is new (<24h), use the earliest available tick as the baseline
        if (!oldPriceTick) {
            oldPriceTick = await db.priceTick.findFirst({
                where: { assetId: id },
                orderBy: { timestamp: 'asc' },
                select: { priceDisplay: true },
            });
        }

        // Get latest oracle logs (LLM reasoning)
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
                llmResponse: true, // Include to extract reasoning field
            },
        });

        // Get price history for chart
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
        const currentPrice = asset.lastDisplayPrice?.toNumber() ?? pricingParams?.P0 ?? 10;
        const oldPrice = oldPriceTick?.priceDisplay?.toNumber() ?? currentPrice;
        const change24h = oldPrice > 0 ? ((currentPrice - oldPrice) / oldPrice) * 100 : 0;

        // Calculate market cap
        const marketCap = currentPrice * asset.totalSupply.toNumber();

        // Get User Position if logged in
        let userPosition = null;
        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
            userPosition = await db.position.findUnique({
                where: {
                    userId_assetId: {
                        userId: session.user.id,
                        assetId: id
                    }
                }
            });
        }

        // Get Holders Count
        const holdersCount = await db.position.count({
            where: {
                assetId: id,
                shares: { gt: 0 }
            }
        });

        // Get 24h Range (High/Low)
        const range24h = await db.priceTick.aggregate({
            where: {
                assetId: id,
                timestamp: { gte: oneDayAgo }
            },
            _min: { priceDisplay: true },
            _max: { priceDisplay: true }
        });
        const low24h = range24h._min.priceDisplay?.toNumber() ?? currentPrice;
        const high24h = range24h._max.priceDisplay?.toNumber() ?? currentPrice;

        return NextResponse.json({
            asset: {
                id: asset.id,
                name: asset.name,
                description: asset.description,
                type: asset.type,
                status: asset.status,
                price: currentPrice,
                change24h: Math.round(change24h * 100) / 100,
                volume24h: Math.round(volume24h * 100) / 100,
                marketCap: Math.round(marketCap * 100) / 100,
                totalSupply: asset.totalSupply.toNumber(),
                liquidity: asset.pool?.totalUsdc.toNumber() ?? 0,
                softCap: asset.softCap.toNumber(),
                hardCap: asset.hardCap.toNumber(),
                fundingDeadline: asset.fundingDeadline?.toISOString() ?? null,
                fundingProgress: asset.pool
                    ? Math.min(100, (asset.pool.totalUsdc.toNumber() / asset.softCap.toNumber()) * 100)
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
                    shares: userPosition.shares.toNumber(),
                    avgPrice: userPosition.avgPrice.toNumber(),
                    stopLoss: userPosition.stopLoss?.toNumber() ?? null,
                    takeProfit: userPosition.takeProfit?.toNumber() ?? null,
                } : null,
            },
            oracleLogs: oracleLogs.map((log: any) => {
                let reasoning = null;
                // Safely extract reasoning from the JSON blob
                if (log.llmResponse && typeof log.llmResponse === 'object') {
                    // Try to get reasoning from top level or within a 'reasoning' field if structured differently
                    reasoning = (log.llmResponse as any).reasoning || null;
                }

                return {
                    id: log.id,
                    deltaPercent: log.deltaPercent.toNumber(),
                    confidence: log.confidence.toNumber(),
                    summary: log.summary,
                    reasoning: reasoning, // Explicitly return reasoning
                    sourceUrls: log.sourceUrls as string[],
                    createdAt: log.createdAt.toISOString(),
                };
            }),
            priceHistory: priceHistory.reverse().map((tick: any) => ({
                timestamp: tick.timestamp.toISOString(),
                price: tick.priceDisplay.toNumber(),
                priceMarket: tick.priceMarket.toNumber(),
                priceFundamental: tick.priceFundamental.toNumber(),
                volume: tick.volume5m.toNumber(),
            })),
        });
    } catch (error) {
        console.error('[API/assets/[id]] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch asset' },
            { status: 500 }
        );
    }
}
