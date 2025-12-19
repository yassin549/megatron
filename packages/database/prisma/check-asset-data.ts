import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAssetData() {
    const assets = await prisma.asset.findMany({
        select: {
            id: true,
            name: true,
            status: true,
            oracleQueries: true,
            lastMarketPrice: true,
            lastFundamental: true,
            lastDisplayPrice: true,
            oracleLogs: {
                take: 1,
                orderBy: { createdAt: 'desc' }
            },
            priceTicks: {
                take: 1,
                orderBy: { timestamp: 'desc' }
            }
        }
    });

    console.log('--- Assets ---');
    assets.forEach(a => {
        console.log(`Asset: ${a.name} (${a.id})`);
        console.log(`  Status: ${a.status}`);
        console.log(`  Queries: ${JSON.stringify(a.oracleQueries)}`);
        console.log(`  Prices: M:${a.lastMarketPrice} F:${a.lastFundamental} D:${a.lastDisplayPrice}`);
        console.log(`  Last Oracle Log: ${a.oracleLogs[0]?.createdAt || 'NONE'}`);
        console.log(`  Last Price Tick: ${a.priceTicks[0]?.timestamp || 'NONE'}`);
        console.log('----------------');
    });
}

checkAssetData()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
