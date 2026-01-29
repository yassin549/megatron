
import { db } from './packages/database/src';
import { MONETARY_CONFIG } from './packages/lib-common/src/shared';

async function verify() {
    console.log('--- Verifying Admin Stats Queries ---');
    try {
        const totalUsers = await db.user.count();
        console.log('Total Users:', totalUsers);

        const activeAssets = await db.asset.count({ where: { status: 'active' } });
        console.log('Active Assets:', activeAssets);

        const allTimeFeesResult = await db.trade.aggregate({ _sum: { fee: true } });
        const allTimeFees = Number(allTimeFeesResult._sum?.fee || 0);
        console.log('All-time Fees:', allTimeFees);

        const platformShare = MONETARY_CONFIG.PLATFORM_SHARE;
        const calculatedRevenue = allTimeFees * platformShare;
        console.log('Calculated Revenue (Fees * Share):', calculatedRevenue);

        const treasury = await db.platformTreasury.findUnique({ where: { id: 'treasury' } });
        console.log('Treasury Record Balance:', treasury ? Number(treasury.balance) : 'Missing');

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const volumeResult = await db.$queryRaw<{ volume: number }[]>`
            SELECT COALESCE(SUM(CAST(price AS DOUBLE PRECISION) * CAST(quantity AS DOUBLE PRECISION)), 0) as volume 
            FROM "Trade" 
            WHERE timestamp >= ${oneDayAgo}
        `;
        console.log('24h Volume:', Number(volumeResult[0]?.volume || 0));

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await db.$disconnect();
    }
}

verify();
