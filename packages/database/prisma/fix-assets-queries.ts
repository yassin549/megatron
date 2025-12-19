import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixExistingAssets() {
    const assets = await prisma.asset.findMany({
        where: {
            OR: [
                { oracleQueries: { equals: [] } },
                { oracleQueries: { equals: {} } }
            ]
        }
    });

    console.log(`Found ${assets.length} assets with empty queries.`);

    for (const asset of assets) {
        const queries = [
            `${asset.name} latest developments and news`,
            `${asset.name} market sentiment and analysis`,
            `${asset.name} ecosystem growth and indicators`
        ];

        await prisma.asset.update({
            where: { id: asset.id },
            data: { oracleQueries: queries }
        });

        console.log(`✅ Fixed queries for: ${asset.name}`);
    }
}

fixExistingAssets()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
