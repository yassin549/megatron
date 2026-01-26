import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllAssets() {
    console.log('🗑️  Deleting all assets...');

    try {
        // Delete in order due to foreign key constraints

        // 1. Delete timed exits (references Asset)
        const timedExits = await prisma.timedExit.deleteMany({});
        console.log(`  ✅ Deleted ${timedExits.count} timed exits`);

        // 2. Delete limit orders (references Asset)
        const limitOrders = await prisma.limitOrder.deleteMany({});
        console.log(`  ✅ Deleted ${limitOrders.count} limit orders`);

        // 3. Delete bookmarks (references Asset)
        const bookmarks = await prisma.bookmark.deleteMany({});
        console.log(`  ✅ Deleted ${bookmarks.count} bookmarks`);

        // 4. Delete trades (references Asset)
        const trades = await prisma.trade.deleteMany({});
        console.log(`  ✅ Deleted ${trades.count} trades`);

        // 5. Delete all positions
        const positions = await prisma.position.deleteMany({});
        console.log(`  ✅ Deleted ${positions.count} positions`);

        // 6. Delete all LP shares
        const lpShares = await prisma.lPShare.deleteMany({});
        console.log(`  ✅ Deleted ${lpShares.count} LP shares`);

        // 7. Delete all liquidity pools
        const pools = await prisma.liquidityPool.deleteMany({});
        console.log(`  ✅ Deleted ${pools.count} liquidity pools`);

        // 8. Delete all oracle logs
        const oracleLogs = await prisma.oracleLog.deleteMany({});
        console.log(`  ✅ Deleted ${oracleLogs.count} oracle logs`);

        // 9. Delete all price ticks
        const priceTicks = await prisma.priceTick.deleteMany({});
        console.log(`  ✅ Deleted ${priceTicks.count} price ticks`);

        // 10. Finally delete all assets
        const assets = await prisma.asset.deleteMany({});
        console.log(`  ✅ Deleted ${assets.count} assets`);

        console.log('\n🎉 All assets deleted successfully!');
        console.log('You can now create new assets through the admin dashboard.');

    } catch (error) {
        console.error('❌ Error deleting assets:', error);
        throw error;
    }
}

deleteAllAssets()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
