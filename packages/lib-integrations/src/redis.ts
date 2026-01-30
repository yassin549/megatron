import Redis from 'ioredis';

const REDIS_URL = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;

// Helper to sanitize URL for logging
function sanitizeUrl(url: string | undefined): string {
    if (!url) return 'undefined';
    try {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.host}`;
    } catch {
        return 'invalid-url';
    }
}

// Singleton Redis client
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
    if (!redisClient) {
        if (!REDIS_URL || (!REDIS_URL.startsWith('redis://') && !REDIS_URL.startsWith('rediss://'))) {
            const fallbackUrl = 'redis://127.0.0.1:6379';
            console.warn(`[Redis] Invalid or missing REDIS_URL (${sanitizeUrl(REDIS_URL)}), falling back to ${fallbackUrl}`);
            redisClient = new Redis(fallbackUrl);
        } else {
            console.log(`[Redis] Connecting to ${sanitizeUrl(REDIS_URL)}...`);
            redisClient = new Redis(REDIS_URL, {
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
        }

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
