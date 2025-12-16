import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const log = await prisma.adminLog.findFirst({
        orderBy: { timestamp: 'desc' }
    });

    if (log && log.details) {
        try {
            const details = JSON.parse(log.details as string);
            console.log('--- LATEST REASONING ---');
            console.log(details.reasoning);
            console.log('------------------------');
        } catch (e) {
            console.error('Failed to parse details:', e);
        }
    } else {
        console.log('No logs found.');
    }
    await prisma.$disconnect();
}

main().catch(console.error);
