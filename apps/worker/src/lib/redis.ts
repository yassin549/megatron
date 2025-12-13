import Redis from 'ioredis';
import { TradeEvent, OracleEvent } from '@megatron/lib-common';

// Config
const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || process.env.KV_URL;

// Client
// Handle valid URL check to avoid "EPERM /" error if empty string or invalid
export let redis: Redis | null = null;

if (REDIS_URL && (REDIS_URL.startsWith('redis://') || REDIS_URL.startsWith('rediss://'))) {
    redis = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        // prevent crashing on connection error
        retryStrategy(times) {
            if (times > 3) return null; // stop retrying
            return Math.min(times * 50, 2000);
        },
    });

    redis.on('error', (err) => {
        // Suppress unhandled error events
        console.warn('Redis connection error:', err.message);
    });
} else {
    console.warn('⚠️  REDIS_URL not set or invalid. Using Mock Redis (no events published).');
}

export async function publishOracleEvent(event: OracleEvent): Promise<void> {
    if (!redis) {
        if (process.env.NODE_ENV === 'development') {
            console.log('[Mock Redis] Would publish:', JSON.stringify(event));
        }
        return;
    }

    try {
        await redis.publish(CHANNELS.EVENTS, JSON.stringify(event));
    } catch (error) {
        console.error('Failed to publish event:', error);
    }
}

// Pub/Sub constants
export const CHANNELS = {
    EVENTS: 'megatron:events',
};

/**
 * Publish a trade event to the events channel
 */
export async function publishTradeEvent(event: TradeEvent): Promise<void> {
    if (!redis) {
        if (process.env.NODE_ENV === 'development') {
            console.log('[Mock Redis] Would publish:', JSON.stringify(event));
        }
        return;
    }

    try {
        await redis.publish(CHANNELS.EVENTS, JSON.stringify(event));
    } catch (error) {
        console.error('Failed to publish event:', error);
    }
}

export async function closeRedis(): Promise<void> {
    if (redis) {
        await redis.quit();
    }
}
