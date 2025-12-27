import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Assets that were hardcoded in the frontend - now seeding to DB with 'funding' status
const INITIAL_ASSETS = [
    {
        name: 'AI Hype Index',
        description: 'Measures the intensity of AI/ML hype across news and social media. Higher = more hype.',
        type: 'ai',
        oracleQueries: ['AI news today', 'artificial intelligence trends social media'],
        pricingParams: { P0: 18.0, k: 0.001 },
        softCap: 6000,
        hardCap: 30000,
        imageUrl: '/assets/market-images/ai_hype_art_1766049397389.png',
    },
    {
        name: 'Venture Capital Activity Index',
        description: 'Measures global startup funding rounds and unicorn creation rates.',
        type: 'startups',
        oracleQueries: ['global startup funding trends', 'venture capital news today'],
        pricingParams: { P0: 12.0, k: 0.001 },
        softCap: 12000,
        hardCap: 60000,
        imageUrl: '/assets/market-images/global_temp_art_1766049359120.png', // Using existing placeholder
    },
];

export async function seedAssets(): Promise<void> {
    console.log('🌱 Seeding initial assets with funding status...');

    // Calculate funding deadline (30 days from now)
    const fundingDeadline = new Date();
    fundingDeadline.setDate(fundingDeadline.getDate() + 30);

    for (const assetData of INITIAL_ASSETS) {
        console.log(`  🔄 Processing: ${assetData.name} (${assetData.type})`);

        // Use upsert to create or update asset and its initial price/status
        const asset = await prisma.asset.upsert({
            where: { id: assetData.name.toLowerCase().replace(/\s+/g, '-') }, // Deterministic ID for upsert
            update: {
                type: assetData.type,
                description: assetData.description,
                imageUrl: (assetData as any).imageUrl,
            },
            create: {
                id: assetData.name.toLowerCase().replace(/\s+/g, '-'),
                name: assetData.name,
                description: assetData.description,
                type: assetData.type,
                oracleQueries: assetData.oracleQueries,
                imageUrl: (assetData as any).imageUrl,
                pricingModel: 'linear_bonding',
                pricingParams: assetData.pricingParams as unknown as Prisma.JsonObject,
                status: 'funding',
                softCap: new Prisma.Decimal(assetData.softCap),
                hardCap: new Prisma.Decimal(assetData.hardCap),
                fundingDeadline,
                totalSupply: new Prisma.Decimal(0),
                lastDisplayPrice: new Prisma.Decimal(assetData.pricingParams.P0),
                lastMarketPrice: new Prisma.Decimal(assetData.pricingParams.P0),
                lastFundamental: new Prisma.Decimal(assetData.pricingParams.P0),
            },
        });

        // Upsert associated liquidity pool
        await prisma.liquidityPool.upsert({
            where: { assetId: asset.id },
            update: {},
            create: {
                assetId: asset.id,
                totalUsdc: new Prisma.Decimal(0),
                totalLPShares: new Prisma.Decimal(0),
                unclaimedFees: new Prisma.Decimal(0),
                status: 'funding',
            },
        });

        console.log(`  ✅ Synced: ${asset.name}`);
    }

    console.log('✅ Asset seeding complete!');
}

// Allow running directly
if (require.main === module) {
    seedAssets()
        .catch((e) => {
            console.error('❌ Error seeding assets:', e);
            process.exit(1);
        })
        .finally(() => prisma.$disconnect());
}
