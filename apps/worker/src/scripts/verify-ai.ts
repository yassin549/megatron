import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const log = await prisma.oracleLog.findFirst({
        orderBy: { createdAt: 'desc' }
    });

    if (log && log.llmResponse) {
        try {
            // llmResponse is already Json in Prisma types, but might be 'any' or object
            const response = log.llmResponse as any;
            console.log('--- LATEST AI ANALYSIS ---');
            console.log(`Asset: ${log.assetId}`);
            console.log(`Summary: ${log.summary}`);
            console.log(`Reasoning: ${response.reasoning || 'N/A'}`);
            console.log('--------------------------');
        } catch (e) {
            console.error('Failed to parse details:', e);
        }
    } else {
        console.log('No AI logs found.');
    }
    await prisma.$disconnect();
}

main().catch(console.error);
