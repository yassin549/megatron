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
            // Keep the slug-based ID if it exists, otherwise keep the first one
            const slugId = ids.find(id => id.includes('-'));
            const toDelete = ids.filter(id => id !== (slugId || ids[0]));

            for (const delId of toDelete) {
                console.log(`  🗑️ Deleting ${delId}...`);
                try {
                    // Delete associated records first if not handled by cascade
                    await prisma.liquidityPool.deleteMany({ where: { assetId: delId } });
                    await prisma.trade.deleteMany({ where: { assetId: delId } });
                    await prisma.position.deleteMany({ where: { assetId: delId } });
                    await prisma.priceTick.deleteMany({ where: { assetId: delId } });
                    await prisma.oracleLog.deleteMany({ where: { assetId: delId } });
                    await prisma.bookmark.deleteMany({ where: { assetId: delId } });

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
