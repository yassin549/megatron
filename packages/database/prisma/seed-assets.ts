import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Assets that were hardcoded in the frontend - now seeding to DB with 'funding' status
const INITIAL_ASSETS = [
    {
        name: 'Bitcoin Twitter Sentiment',
        description: 'Tracks the overall sentiment of Bitcoin-related discussions on Twitter/X, powered by AI analysis.',
        type: 'social',
        oracleQueries: ['Bitcoin Twitter sentiment today', 'BTC social media mood'],
        pricingParams: { P0: 10.0, k: 0.001 },
        softCap: 5000,
        hardCap: 25000,
        imageUrl: '/assets/market-images/bitcoin_sentiment_art_1766049298594.png',
    },
    {
        name: 'US Unemployment Rate',
        description: 'Synthetic asset tied to the monthly US unemployment rate. Price reflects market expectations of economic health.',
        type: 'economics',
        oracleQueries: ['US unemployment rate latest', 'US jobless claims news'],
        pricingParams: { P0: 8.0, k: 0.0008 },
        softCap: 10000,
        hardCap: 50000,
        imageUrl: '/assets/market-images/us_unemployment_art_1766049317205.png',
    },
    {
        name: 'Premier League Champion',
        description: 'Trade on predictions for the English Premier League winner. Price reflects market probability.',
        type: 'sports',
        oracleQueries: ['Premier League standings 2024', 'EPL title race predictions'],
        pricingParams: { P0: 15.0, k: 0.0012 },
        softCap: 8000,
        hardCap: 40000,
        imageUrl: '/assets/market-images/premier_league_art_1766049339610.png',
    },
    {
        name: 'Global Temperature Anomaly',
        description: 'Tracks global temperature deviation from historical averages. Climate-linked synthetic asset.',
        type: 'weather',
        oracleQueries: ['global temperature anomaly today', 'climate change temperature data'],
        pricingParams: { P0: 6.0, k: 0.0005 },
        softCap: 3000,
        hardCap: 15000,
        imageUrl: '/assets/market-images/global_temp_art_1766049359120.png',
    },
    {
        name: 'ETH Gas Price Index',
        description: 'Synthetic asset tracking Ethereum network gas prices. Trade on network congestion expectations.',
        type: 'crypto',
        oracleQueries: ['ETH gas price today', 'Ethereum gas fees trend'],
        pricingParams: { P0: 20.0, k: 0.0015 },
        softCap: 7500,
        hardCap: 35000,
        imageUrl: '/assets/market-images/eth_gas_art_1766049379493.png',
    },
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
        name: 'GTA VI Release Date Sentiment',
        description: 'Tracks market confidence in the scheduled release window of GTA VI.',
        type: 'gaming',
        oracleQueries: ['GTA VI release date news', 'Rockstar Games official announcements'],
        pricingParams: { P0: 25.0, k: 0.002 },
        softCap: 15000,
        hardCap: 75000,
    },
    {
        name: 'SpaceX Starship IFT-5',
        description: 'Success probability of the next Starship flight test based on analyst reports.',
        type: 'space',
        oracleQueries: ['SpaceX Starship news', 'FAA launch license updates'],
        pricingParams: { P0: 30.0, k: 0.003 },
        softCap: 20000,
        hardCap: 100000,
    },
    {
        name: 'Venture Capital Activity Index',
        description: 'Measures global startup funding rounds and unicorn creation rates.',
        type: 'startups',
        oracleQueries: ['global startup funding trends', 'venture capital news today'],
        pricingParams: { P0: 12.0, k: 0.001 },
        softCap: 12000,
        hardCap: 60000,
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
