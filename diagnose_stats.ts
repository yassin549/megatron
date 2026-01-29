
import { db } from './packages/database/src';

async function diagnose() {
    console.log('--- Database Diagnosis ---');
    try {
        const userCount = await db.user.count();
        console.log('Total Users:', userCount);

        const activeAssets = await db.asset.count({ where: { status: 'active' } });
        console.log('Active Assets:', activeAssets);

        const allAssets = await db.asset.count();
        console.log('Total Assets:', allAssets);

        const treasury = await db.platformTreasury.findUnique({ where: { id: 'treasury' } });
        console.log('Treasury Record:', treasury);

        const tradeCount = await db.trade.count();
        console.log('Total Trades:', tradeCount);

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const volumeResult = await db.$queryRaw<{ volume: number }[]>`
            SELECT COALESCE(SUM(CAST(price AS DOUBLE PRECISION) * CAST(quantity AS DOUBLE PRECISION)), 0) as volume 
            FROM "Trade" 
            WHERE timestamp >= ${oneDayAgo}
        `;
        console.log('24h Volume:', volumeResult[0]?.volume);

        const fees24h = await db.trade.aggregate({
            where: { timestamp: { gte: oneDayAgo } },
            _sum: { fee: true }
        });
        console.log('24h Fees:', fees24h._sum.fee);

    } catch (error) {
        console.error('Diagnosis failed:', error);
    } finally {
        await db.$disconnect();
    }
}

diagnose();
