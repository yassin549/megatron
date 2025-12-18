import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAssets() {
    console.log('🧹 Preparing to wipe all assets except core markets...');

    // Core assets to KEEP
    const KEEP_NAMES = ['AI Hype Index', 'Venture Capital Activity Index'];
    const KEEP_IDS = KEEP_NAMES.map(n => n.toLowerCase().replace(/\s+/g, '-'));

    console.log(`📌 Keeping: ${KEEP_NAMES.join(', ')}`);

    const assets = await prisma.asset.findMany({
        where: {
            NOT: {
                id: { in: KEEP_IDS }
            }
        },
        select: { id: true, name: true }
    });

    if (assets.length === 0) {
        console.log('✨ No additional assets found to remove.');
        return;
    }

    console.log(`⚠️ Found ${assets.length} assets to delete.`);

    for (const asset of assets) {
        console.log(`  🗑️ Deleting ${asset.name} (${asset.id})...`);
        try {
            // Manual deletion of dependent records
            await prisma.trade.deleteMany({ where: { assetId: asset.id } });
            await prisma.position.deleteMany({ where: { assetId: asset.id } });
            await prisma.priceTick.deleteMany({ where: { assetId: asset.id } });
            await prisma.oracleLog.deleteMany({ where: { assetId: asset.id } });
            await prisma.bookmark.deleteMany({ where: { assetId: asset.id } });
            await prisma.liquidityPool.deleteMany({ where: { assetId: asset.id } });

            await prisma.asset.delete({ where: { id: asset.id } });
            console.log(`  ✅ Deleted ${asset.name}`);
        } catch (e) {
            console.error(`  ❌ Failed to delete ${asset.name}:`, e);
        }
    }

    console.log('✨ Asset rationalization complete.');
}

resetAssets()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
