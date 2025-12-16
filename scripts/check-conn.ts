
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

async function check() {
    console.log('--- DIAGNOSTIC START ---');
    console.log('CWD:', process.cwd());
    const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
    console.log('DB URL defined:', !!dbUrl);
    if (dbUrl) console.log('DB URL prefix:', dbUrl.substring(0, 15) + '...');

    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || process.env.KV_URL;
    console.log('Redis URL defined:', !!redisUrl);
    if (redisUrl) console.log('Redis URL prefix:', redisUrl.substring(0, 15) + '...');

    const prisma = new PrismaClient({
        datasources: {
            db: { url: dbUrl }
        }
    });

    console.log('\nTesting DB Connection...');
    try {
        await prisma.$connect();
        const count = await prisma.user.count();
        console.log('✅ DB Connected! User count:', count);
    } catch (e: any) {
        console.error('❌ DB Fail:', e.message);
    } finally {
        await prisma.$disconnect();
    }

    if (redisUrl) {
        console.log('\nTesting Redis Connection...');
        const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 });
        try {
            await redis.ping();
            console.log('✅ Redis Connected!');
        } catch (e: any) {
            console.error('❌ Redis Fail:', e.message);
        } finally {
            redis.disconnect();
        }
    }

    console.log('--- DIAGNOSTIC END ---');
}

check();
