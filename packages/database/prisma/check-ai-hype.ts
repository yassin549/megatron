import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAIHypeIndex() {
    const asset = await prisma.asset.findUnique({
        where: { id: 'ai-hype-index' },
        include: {
            oracleLogs: {
                take: 5,
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!asset) {
        console.log('AI Hype Index not found');
        return;
    }

    console.log('--- AI Hype Index ---');
    console.log(`Status: ${asset.status}`);
    console.log(`Queries: ${JSON.stringify(asset.oracleQueries)}`);
    console.log(`Last 5 Logs: ${JSON.stringify(asset.oracleLogs, null, 2)}`);
}

checkAIHypeIndex()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
