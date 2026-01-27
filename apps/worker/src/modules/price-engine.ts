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
import { checkTargets } from './target-manager';

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

async function calculatePressure24h(assetId: string): Promise<number> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const trades = await db.trade.findMany({
        where: { assetId, timestamp: { gte: since } },
        select: { price: true, quantity: true, side: true }
    });

    let buyVolume = 0;
    let sellVolume = 0;
    for (const t of trades) {
        const vol = t.price.toNumber() * t.quantity.toNumber();
        if (t.side === 'buy') buyVolume += vol;
        else sellVolume += vol;
    }

    const total = buyVolume + sellVolume;
    return total > 0 ? (buyVolume / total) * 100 : 50;
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

    // Aggressive Sync: Shift the bonding curve (P0) on Oracle events
    if (typeof context.deltaPercent === 'number') {
        fundamental = updateFundamental(fundamental, context.deltaPercent, DEFAULT_CONFIG.EMA_BETA);

        // Calculate TARGET P0 to match the new fundamental price
        // linear marginalPrice = targetP0 + k * supply
        // targetP0 = fundamental - (k * supply)
        let targetP0 = fundamental - (k * supply);
        if (targetP0 < 0.01) targetP0 = 0.01;

        const currentP0 = P0;

        // CIRCUIT BREAKER: Cap max change per tick to 5%
        // This prevents massive jumps if the Oracle hallucinates or volume spikes weirdly.
        const maxChange = currentP0 * 0.05;
        if (Math.abs(targetP0 - currentP0) > maxChange) {
            console.warn(`[PriceEngine] Circuit Breaker: Target P0 ${targetP0} exceeds max deviation from ${currentP0}. Capping.`);
            if (targetP0 > currentP0) targetP0 = currentP0 + maxChange;
            else targetP0 = currentP0 - maxChange;
        }

        // DAMPENING: Move P0 gradually towards target (Alpha 0.2)
        // P0_new = P0_old * (1 - alpha) + Target * alpha
        const alpha = 0.2;
        const newP0 = currentP0 * (1 - alpha) + targetP0 * alpha;

        params.P0 = newP0;
        console.log(`[PriceEngine] Shifted P0 to ${newP0.toFixed(4)} (Target: ${targetP0.toFixed(4)}) for asset ${assetId} (+${context.deltaPercent}%)`);
    }

    // FIX #10: Use volume from context if available (for trade events)
    const volume5m = await computeVolume5m(assetId, context.tradeVolume);
    const pressure = await calculatePressure24h(assetId);

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
                pricingParams: params as any, // Persist shifted P0
            },
        }),
    ]);

    // Check targets after price update
    await checkTargets(asset.id, displayPrice);

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
            pressure,
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
    const heartbeat = async () => {
        try {
            const assets = await db.asset.findMany({
                where: { status: { in: ['active', 'funding'] } },
                select: { id: true, name: true }
            });

            const now = Date.now();
            for (const asset of assets) {
                const lastTick = await db.priceTick.findFirst({
                    where: { assetId: asset.id },
                    orderBy: { timestamp: 'desc' },
                    select: { timestamp: true }
                });

                if (!lastTick || now - lastTick.timestamp.getTime() > 65000) {
                    // console.log(`[PriceEngine] Heartbeat: Forcing tick for ${asset.name}`);
                    await recomputePrice(asset.id, {});
                }
            }
        } catch (error) {
            console.error('[PriceEngine] Heartbeat error:', error);
        }
    };

    void heartbeat();
    setInterval(heartbeat, 60000);

    // Subscriber initialization
    console.log('[PriceEngine] Initializing subscriber...');

    // We create a fresh client specifically for subscription
    const sub = new Redis(REDIS_URL || 'redis://127.0.0.1:6379', {
        maxRetriesPerRequest: null,
        retryStrategy: (times) => Math.min(times * 200, 5000)
    });

    sub.on('error', (err) => {
        console.warn('[PriceEngine] Redis Subscriber error:', err.message);
    });

    sub.on('connect', () => {
        console.log('[PriceEngine] Subscriber connected');
    });

    sub.on('message', async (channel, message) => {
        if (channel !== CHANNELS.EVENTS) return;

        try {
            const event = JSON.parse(message) as TradeEvent | OracleEvent;
            if (event.type === 'trade') {
                console.log(`[PriceEngine] Processing trade event for ${event.assetId}`);
                await handleTradeEvent(event as TradeEvent);
            } else if (event.type === 'oracle') {
                console.log(`[PriceEngine] Processing oracle event for ${event.assetId} (delta: ${event.deltaPercent}%)`);
                await handleOracleEvent(event as OracleEvent);
            }
        } catch (err) {
            console.error('[PriceEngine] Failed to process message:', err);
        }
    });

    try {
        await sub.subscribe(CHANNELS.EVENTS);
        console.log('[PriceEngine] Subscribed to', CHANNELS.EVENTS);
    } catch (err) {
        console.error('[PriceEngine] Critical: Failed to subscribe to events channel', err);
    }
}
