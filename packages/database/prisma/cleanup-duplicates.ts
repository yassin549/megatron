import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
    console.log('🔍 Checking for duplicate assets...');

    const assets = await prisma.asset.findMany({
        select: { id: true, name: true, type: true }
    });

    const nameMap = new Map<string, string[]>();
    assets.forEach(a => {
        if (!nameMap.has(a.name)) nameMap.set(a.name, []);
        nameMap.get(a.name)!.push(a.id);
    });

    for (const [name, ids] of nameMap.entries()) {
        if (ids.length > 1) {
            console.log(`⚠️ Found duplicate for "${name}": ${ids.join(', ')}`);

            // The "canonical" ID should be the slug-based one
            const canonicalId = name.toLowerCase().replace(/\s+/g, '-');

            // If the canonical ID exists in the list, keep it. Otherwise keep the first slug-like one.
            const targetId = ids.includes(canonicalId) ? canonicalId : ids.find(id => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) || ids[0];

            const toDelete = ids.filter(id => id !== targetId);

            for (const delId of toDelete) {
                console.log(`  🗑️ Deleting duplicate ${delId} for "${name}"...`);
                try {
                    // Manual deletion of dependent records to avoid constraint errors
                    await prisma.trade.deleteMany({ where: { assetId: delId } });
                    await prisma.position.deleteMany({ where: { assetId: delId } });
                    await prisma.priceTick.deleteMany({ where: { assetId: delId } });
                    await prisma.oracleLog.deleteMany({ where: { assetId: delId } });
                    await prisma.bookmark.deleteMany({ where: { assetId: delId } });
                    await prisma.liquidityPool.deleteMany({ where: { assetId: delId } });

                    await prisma.asset.delete({ where: { id: delId } });
                    console.log(`  ✅ Deleted ${delId}`);
                } catch (e) {
                    console.error(`  ❌ Failed to delete ${delId}:`, e);
                }
            }
        }
    }
    console.log('✨ Cleanup complete.');
}

cleanup()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
