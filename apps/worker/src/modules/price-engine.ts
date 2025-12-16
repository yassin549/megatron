import { db } from '@megatron/database';
import {
    DEFAULT_CONFIG,
    type TradeEvent,
    type OracleEvent,
    combinePrice,
    updateFundamental, // FIX #11: Import helper
} from '@megatron/lib-common';
import { marginalPrice } from '@megatron/lib-common';
import { publishEvent as publishAblyEvent } from '@megatron/lib-integrations';
import Redis from 'ioredis';
import { CHANNELS } from '../lib/redis';

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || process.env.KV_URL;

let subscriber: Redis | null = null;

// FIX #10: Volume cache to avoid N+1 queries
interface VolumeCache {
    value: number;
    timestamp: number;
}
const volumeCache: Map<string, VolumeCache> = new Map();
const VOLUME_CACHE_TTL_MS = 30_000; // 30 seconds

interface PriceContext {
    deltaPercent?: number;
    tradeVolume?: number; // Optional volume from TradeEvent
}

// FIX #10: Volume computation with caching
async function computeVolume5m(assetId: string, incrementalValue?: number): Promise<number> {
    const now = Date.now();
    const cached = volumeCache.get(assetId);

    // If cache is fresh (and no incremental update), use it
    if (cached && now - cached.timestamp < VOLUME_CACHE_TTL_MS && incrementalValue === undefined) {
        return cached.value;
    }

    // If we have an incremental value and a recent cache, just add to it
    if (cached && incrementalValue !== undefined && now - cached.timestamp < VOLUME_CACHE_TTL_MS) {
        const newValue = cached.value + incrementalValue;
        volumeCache.set(assetId, { value: newValue, timestamp: now });
        return newValue;
    }

    // Otherwise, recompute from DB
    const since = new Date(now - 5 * 60 * 1000);
    const trades = await db.trade.findMany({
        where: {
            assetId,
            timestamp: { gte: since },
        },
        select: {
            price: true,
            quantity: true,
        },
    });

    let volume = 0;
    for (const t of trades) {
        volume += t.price.toNumber() * t.quantity.toNumber();
    }

    volumeCache.set(assetId, { value: volume, timestamp: now });
    return volume;
}

async function recomputePrice(assetId: string, context: PriceContext = {}): Promise<void> {
    const asset = await db.asset.findUnique({
        where: { id: assetId },
        select: {
            id: true,
            pricingParams: true,
            totalSupply: true,
            lastFundamental: true,
        },
    });

    if (!asset) return;

    const params = asset.pricingParams as { P0: number; k: number } | null;
    if (!params) return;

    const { P0, k } = params;
    const supply = asset.totalSupply.toNumber();

    const marketPrice = marginalPrice(P0, k, supply);

    let fundamental = asset.lastFundamental ? asset.lastFundamental.toNumber() : P0;

    // FIX #11: Use updateFundamental helper from lib-common
    if (typeof context.deltaPercent === 'number') {
        fundamental = updateFundamental(fundamental, context.deltaPercent, DEFAULT_CONFIG.EMA_BETA);
    }

    // FIX #10: Use volume from context if available (for trade events)
    const volume5m = await computeVolume5m(assetId, context.tradeVolume);

    const { displayPrice, marketWeight } = combinePrice(
        marketPrice,
        fundamental,
        volume5m,
        DEFAULT_CONFIG.V0,
    );

    const now = new Date();

    await db.$transaction([
        db.priceTick.create({
            data: {
                assetId: asset.id,
                timestamp: now,
                priceDisplay: displayPrice,
                priceMarket: marketPrice,
                priceFundamental: fundamental,
                weightMarket: marketWeight,
                volume5m,
                supply,
            },
        }),
        db.asset.update({
            where: { id: asset.id },
            data: {
                lastMarketPrice: marketPrice,
                lastFundamental: fundamental,
                lastDisplayPrice: displayPrice,
            },
        }),
    ]);

    try {
        await publishAblyEvent(`prices:${asset.id}`, 'price_tick', {
            assetId: asset.id,
            timestamp: now.toISOString(),
            priceDisplay: displayPrice,
            priceMarket: marketPrice,
            priceFundamental: fundamental,
            weightMarket: marketWeight,
            volume5m,
            supply,
        });
    } catch (err) {
        console.error('Price Engine: failed to publish to Ably', err);
    }
}

export async function runPriceRecomputeForTest(assetId: string, context: PriceContext = {}): Promise<void> {
    await recomputePrice(assetId, context);
}

async function handleTradeEvent(event: TradeEvent): Promise<void> {
    // FIX #10: Pass trade volume for incremental cache update
    const tradeVolume = (event.price ?? 0) * (event.quantity ?? 0);
    await recomputePrice(event.assetId, { tradeVolume });
}

async function handleOracleEvent(event: OracleEvent): Promise<void> {
    if (typeof event.deltaPercent !== 'number') {
        return;
    }
    await recomputePrice(event.assetId, { deltaPercent: event.deltaPercent });
}

export async function startPriceEngine(): Promise<void> {
    if (!REDIS_URL || (!REDIS_URL.startsWith('redis://') && !REDIS_URL.startsWith('rediss://'))) {
        console.warn('Price Engine: REDIS_URL/UPSTASH_REDIS_URL not set or invalid. Price engine subscriber disabled.');
        return;
    }

    subscriber = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            if (times > 3) return null;
            return Math.min(times * 50, 2000);
        },
    });

    subscriber.on('error', (err) => {
        console.warn('Price Engine Redis error:', err.message);
    });

    subscriber.on('message', async (_channel, message) => {
        try {
            const event = JSON.parse(message) as TradeEvent | OracleEvent;
            if (event && event.type === 'trade') {
                await handleTradeEvent(event as TradeEvent);
            } else if (event && event.type === 'oracle') {
                await handleOracleEvent(event as OracleEvent);
            }
        } catch (err) {
            console.error('Price Engine: failed to process message', err);
        }
    });

    await subscriber.subscribe(CHANNELS.EVENTS);
    console.log('Price Engine: subscribed to', CHANNELS.EVENTS);

    // FIX #12: Heartbeat loop to ensure 1-minute chart candles even with zero volume
    setInterval(async () => {
        try {
            const assets = await db.asset.findMany({
                where: {
                    status: { in: ['active', 'funding'] }
                },
                select: { id: true }
            });

            const now = Date.now();

            for (const asset of assets) {
                // Check last tick time
                const lastTick = await db.priceTick.findFirst({
                    where: { assetId: asset.id },
                    orderBy: { timestamp: 'desc' },
                    select: { timestamp: true }
                });

                // If no tick in last 60s, force a "stagnation" tick
                // We use 65s to allow for slight drift/processing time so we don't double-tick immediately after an event
                if (!lastTick || now - lastTick.timestamp.getTime() > 65000) {
                    // console.log(`[PriceEngine] Heartbeat tick for ${asset.id}`);
                    await recomputePrice(asset.id, {});
                }
            }
        } catch (error) {
            console.error('[PriceEngine] Heartbeat error:', error);
        }
    }, 60000); // Check every minute
}
