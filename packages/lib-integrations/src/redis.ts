import Redis from 'ioredis';

const REDIS_URL = process.env.UPSTASH_REDIS_URL || process.env.UPSTASH_REST_URL;

// Singleton Redis client
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
    if (!redisClient) {
        if (!REDIS_URL) {
            console.warn('[Redis] No URL found in env, using default localhost:6379');
        }

        redisClient = new Redis(REDIS_URL || 'redis://127.0.0.1:6379', {
            maxRetriesPerRequest: null, // Critical for robust workers: don't fail on request timeouts
            retryStrategy(times) {
                // Exponential backoff with a cap at 5 seconds
                const delay = Math.min(times * 100, 5000);
                console.log(`[Redis] Connection lost. Retrying in ${delay}ms (attempt ${times})...`);
                return delay;
            },
            reconnectOnError(err) {
                const targetError = 'READONLY';
                if (err.message.includes(targetError)) {
                    return true; // Reconnect on READONLY error
                }
                return false;
            }
        });

        redisClient.on('error', (err) => {
            console.error('[Redis] Client Error:', err.message);
        });

        redisClient.on('connect', () => {
            console.log('[Redis] Connected successfully');
        });
    }
    return redisClient;
}

export const CHANNELS = {
    EVENTS: 'megatron:events',
};

export async function closeRedis(): Promise<void> {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
}
