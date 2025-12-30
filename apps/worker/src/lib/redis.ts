import { getRedisClient } from '@megatron/lib-integrations';
import { TradeEvent, OracleEvent } from '@megatron/lib-common';

export const redis = getRedisClient();

export const CHANNELS = {
    EVENTS: 'megatron:events',
};

/**
 * Publish an oracle event to the events channel
 */
export async function publishOracleEvent(event: OracleEvent): Promise<void> {
    try {
        await redis.publish(CHANNELS.EVENTS, JSON.stringify(event));
        console.log(`[Redis] Published oracle event for ${event.assetId} (delta: ${event.deltaPercent}%)`);
    } catch (error) {
        console.error('[Redis] Failed to publish oracle event:', error);
    }
}

/**
 * Publish a trade event to the events channel
 */
export async function publishTradeEvent(event: TradeEvent): Promise<void> {
    try {
        await redis.publish(CHANNELS.EVENTS, JSON.stringify(event));
        console.log(`[Redis] Published trade event for ${event.assetId}`);
    } catch (error) {
        console.error('[Redis] Failed to publish trade event:', error);
    }
}

export async function closeRedis(): Promise<void> {
    if (redis) {
        await redis.quit();
    }
}
