import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAssets() {
    const assets = await prisma.asset.findMany({
        select: { id: true, name: true, type: true },
        orderBy: { name: 'asc' }
    });
    console.log(JSON.stringify(assets, null, 2));
}

listAssets()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
