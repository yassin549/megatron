
import { getRedisClient, closeRedis } from '../packages/lib-integrations/src/redis';
import dotenv from 'dotenv';
import path from 'path';

// Try to load .env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function check() {
    console.log('--- REDIS DIAGNOSTIC ---');
    const redisUrl = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL || 'DEFAULT (localhost)';
    console.log(`Configured URL: ${redisUrl.includes('localhost') ? redisUrl : 'HIDDEN (Remote)'}`);

    const client = getRedisClient();

    try {
        console.log('Attempting PING...');
        const res = await client.ping();
        console.log(`PING Result: ${res}`);
    } catch (error: any) {
        console.error('CONNECTION FAILED:');
        console.error(error.message);
        if (error.code) console.error(`Error Code: ${error.code}`);
        if (error.address) console.error(`Target Address: ${error.address}:${error.port}`);
    } finally {
        await closeRedis();
    }
}

check();
