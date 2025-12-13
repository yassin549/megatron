
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Static map to ensure good looking images for demo
const STATIC_IMAGES: Record<string, string> = {
    // Crypto
    'ETH Gas Price Index': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
    'Bitcoin Twitter Sentiment': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png',
    'Solana TPS': 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png',

    // Social / Tech
    'AI Hype Index': 'https://cdn-icons-png.flaticon.com/512/8637/8637107.png',
    'Elon Musk Tweet Count': 'https://cdn-icons-png.flaticon.com/512/5968/5968958.png',

    // Sports
    'Premier League Champion': 'https://cdn-icons-png.flaticon.com/512/1152/1152912.png',
    'NBA MVP Odds': 'https://cdn-icons-png.flaticon.com/512/889/889442.png',

    // Economics
    'US Unemployment Rate': 'https://cdn-icons-png.flaticon.com/512/2721/2721291.png',
    'Fed Interest Rate': 'https://cdn-icons-png.flaticon.com/512/2620/2620586.png',

    // Weather/Climate
    'Global Temperature Anomaly': 'https://cdn-icons-png.flaticon.com/512/1684/1684375.png',
    'California Rainfall': 'https://cdn-icons-png.flaticon.com/512/1163/1163657.png',
};

async function main() {
    console.log('🖼️  Fetching asset images...');

    const assets = await prisma.asset.findMany();

    for (const asset of assets) {
        let imageUrl = STATIC_IMAGES[asset.name];

        // If not in static map, use a generic based on type
        if (!imageUrl) {
            switch (asset.type) {
                case 'crypto': imageUrl = 'https://cdn-icons-png.flaticon.com/512/7922/7922246.png'; break;
                case 'sports': imageUrl = 'https://cdn-icons-png.flaticon.com/512/857/857455.png'; break;
                case 'weather': imageUrl = 'https://cdn-icons-png.flaticon.com/512/1163/1163763.png'; break;
                case 'economics': imageUrl = 'https://cdn-icons-png.flaticon.com/512/3310/3310653.png'; break;
                case 'social': imageUrl = 'https://cdn-icons-png.flaticon.com/512/1063/1063233.png'; break;
                default: imageUrl = 'https://cdn-icons-png.flaticon.com/512/1665/1665654.png';
            }
        }

        console.log(`Updating ${asset.name} -> ${imageUrl}`);

        await prisma.asset.update({
            where: { id: asset.id },
            data: { imageUrl }
        });
    }

    console.log('✅ All assets updated with images.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
