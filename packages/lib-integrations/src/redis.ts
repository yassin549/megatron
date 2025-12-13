import Redis from 'ioredis';

const REDIS_URL = process.env.UPSTASH_REDIS_URL || process.env.UPSTASH_REST_URL;

// Singleton Redis client
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
    if (!redisClient) {
        if (!REDIS_URL) {
            console.warn('Redis URL not found, using localhost default');
        }
        redisClient = new Redis(REDIS_URL || 'redis://localhost:6379');

        redisClient.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });
    }
    return redisClient;
}

export async function closeRedis(): Promise<void> {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
}
