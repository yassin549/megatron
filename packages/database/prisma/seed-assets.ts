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
        type: 'venture',
        oracleQueries: ['global startup funding trends', 'venture capital news today'],
        pricingParams: { P0: 12.0, k: 0.001 },
        softCap: 12000,
        hardCap: 60000,
        imageUrl: '/assets/market-images/global_temp_art_1766049359120.png',
    },
    {
        name: 'Tech Sector Momentum',
        description: 'Tracks momentum in tech stocks, IPOs, and major product launches.',
        type: 'technology',
        oracleQueries: ['tech stocks today', 'technology IPO news'],
        pricingParams: { P0: 15.0, k: 0.001 },
        softCap: 8000,
        hardCap: 40000,
        imageUrl: '/assets/market-images/global_temp_art_1766049359120.png',
    },
    {
        name: 'Innovation Index',
        description: 'Measures breakthrough innovation announcements and patent filings.',
        type: 'innovation',
        oracleQueries: ['breakthrough innovation', 'technology breakthroughs'],
        pricingParams: { P0: 20.0, k: 0.001 },
        softCap: 10000,
        hardCap: 50000,
        imageUrl: '/assets/market-images/global_temp_art_1766049359120.png',
    },
    {
        name: 'Startup Ecosystem Health',
        description: 'Tracks startup formation, accelerator activity, and founder sentiment.',
        type: 'startups',
        oracleQueries: ['startup ecosystem', 'new startups founded'],
        pricingParams: { P0: 14.0, k: 0.001 },
        softCap: 7000,
        hardCap: 35000,
        imageUrl: '/assets/market-images/global_temp_art_1766049359120.png',
    },
    {
        name: 'Market Volatility Gauge',
        description: 'Tracks overall market volatility and investor sentiment.',
        type: 'markets',
        oracleQueries: ['market volatility', 'stock market sentiment'],
        pricingParams: { P0: 10.0, k: 0.001 },
        softCap: 5000,
        hardCap: 25000,
        imageUrl: '/assets/market-images/global_temp_art_1766049359120.png',
    },
    {
        name: 'Crypto Trading Volume Index',
        description: 'Measures trading activity across major cryptocurrency exchanges.',
        type: 'trading',
        oracleQueries: ['crypto trading volume', 'cryptocurrency market activity'],
        pricingParams: { P0: 16.0, k: 0.001 },
        softCap: 9000,
        hardCap: 45000,
        imageUrl: '/assets/market-images/global_temp_art_1766049359120.png',
    },
    {
        name: 'Global Economic Sentiment',
        description: 'Tracks global economic outlook through news and analyst reports.',
        type: 'macro',
        oracleQueries: ['global economic outlook', 'economic sentiment'],
        pricingParams: { P0: 11.0, k: 0.001 },
        softCap: 6000,
        hardCap: 30000,
        imageUrl: '/assets/market-images/global_temp_art_1766049359120.png',
    },
    {
        name: 'Inflation Expectations Index',
        description: 'Measures inflation expectations from economists and central banks.',
        type: 'economics',
        oracleQueries: ['inflation expectations', 'central bank inflation'],
        pricingParams: { P0: 13.0, k: 0.001 },
        softCap: 7000,
        hardCap: 35000,
        imageUrl: '/assets/market-images/global_temp_art_1766049359120.png',
    },
    {
        name: 'Political Stability Score',
        description: 'Tracks geopolitical risk and political stability across major economies.',
        type: 'politics',
        oracleQueries: ['geopolitical risk', 'political stability news'],
        pricingParams: { P0: 17.0, k: 0.001 },
        softCap: 10000,
        hardCap: 50000,
        imageUrl: '/assets/market-images/global_temp_art_1766049359120.png',
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
