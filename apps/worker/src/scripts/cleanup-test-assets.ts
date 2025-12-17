
import './setup-env';
import { db } from '@megatron/database';

async function main() {
    console.log("=== CLEANING UP TEST ASSETS ===");

    // 1. Find Assets
    const testAssets = await db.asset.findMany({
        where: {
            OR: [
                { name: { startsWith: 'Test Asset' } },
                { name: { startsWith: 'Monetary Test' } }
            ]
        },
        include: { pool: true }
    });

    console.log(`Found ${testAssets.length} test assets to delete.`);

    for (const asset of testAssets) {
        console.log(`Deleting asset: ${asset.name} (${asset.id})...`);
        const poolId = asset.pool?.id;

        // DELETE DEPENDENCIES

        // 1. Trades
        await db.trade.deleteMany({ where: { assetId: asset.id } });

        // 2. Positions
        await db.position.deleteMany({ where: { assetId: asset.id } });

        // 3. Oracle Logs
        await db.oracleLog.deleteMany({ where: { assetId: asset.id } });

        // 4. Bookmarks
        await db.bookmark.deleteMany({ where: { assetId: asset.id } });

        // 5. Price Ticks (if any)
        await db.priceTick.deleteMany({ where: { assetId: asset.id } });

        if (poolId) {
            // 6. Withdrawal Queue (via LPShare)
            // Need to find LPShares first
            const shares = await db.lPShare.findMany({ where: { poolId } });
            const shareIds = shares.map(s => s.id);

            if (shareIds.length > 0) {
                await db.withdrawalQueue.deleteMany({ where: { lpShareId: { in: shareIds } } });
                await db.lPUnlockSchedule.deleteMany({ where: { lpShareId: { in: shareIds } } });

                // 7. LP Shares
                await db.lPShare.deleteMany({ where: { poolId } });
            }

            // 8. Liquidity Pool
            await db.liquidityPool.delete({ where: { id: poolId } });
        }

        // 9. Asset
        await db.asset.delete({ where: { id: asset.id } });
        console.log(`Deleted ${asset.name}`);
    }

    console.log("=== CLEANUP COMPLETE ===");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
