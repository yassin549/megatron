
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ASSET_IMAGES: Record<string, string> = {
    'Bitcoin Twitter Sentiment': '/assets/generated/bitcoin.png',
    'US Unemployment Rate': '/assets/generated/unemployment.png',
    'Premier League Champion': '/assets/generated/soccer.png',
    'Global Temperature Anomaly': '/assets/generated/climate.png',
    'ETH Gas Price Index': '/assets/generated/eth_gas.png',
    'AI Hype Index': '/assets/generated/ai_hype.png',
};

async function main() {
    console.log('🔄 Updating asset images...');

    for (const [name, imageUrl] of Object.entries(ASSET_IMAGES)) {
        const result = await prisma.asset.updateMany({
            where: { name },
            data: { imageUrl },
        });

        if (result.count > 0) {
            console.log(`✅ Updated ${name} -> ${imageUrl}`);
        } else {
            console.log(`⚠️  Asset not found: ${name}`);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
