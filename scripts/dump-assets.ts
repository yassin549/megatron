
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const assets = await prisma.asset.findMany({
        select: {
            name: true,
            imageUrl: true,
            status: true
        }
    });
    console.log(JSON.stringify(assets, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
