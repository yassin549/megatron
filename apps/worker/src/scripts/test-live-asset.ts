
import 'dotenv/config';
import { db } from '@megatron/database';
import { runLlmCycleForAsset } from '../modules/llm-pipeline';
import { runPriceRecomputeForTest } from '../modules/price-engine';
import { Prisma } from '@prisma/client';

const ASSET_ID = '860ba70e-5a44-41d2-bc85-0c1de4faa46d'; // AI Hype Index

async function main() {
    console.log('🚀 Starting Live Price Engine Test for "AI Hype Index"...\n');

    // 1. Force Activate Asset
    console.log('1️⃣  Setting Asset Status to ACTIVE...');
    await db.asset.update({
        where: { id: ASSET_ID },
        data: {
            status: 'active',
            activatedAt: new Date(),
            // Ensure we have good queries for the live test
            oracleQueries: ['AI artificial intelligence news sentiment today', 'latest AI hype trends'],
        }
    });
    console.log('   ✅ Asset is now ACTIVE.\n');

    // 2. Capture Initial State
    const initialAsset = await db.asset.findUnique({ where: { id: ASSET_ID } });
    console.log('2️⃣  Initial Price State:');
    console.log(`   - Market Price: $${initialAsset?.lastMarketPrice}`);
    console.log(`   - Fundamental (AI) Price: $${initialAsset?.lastFundamental}`);
    console.log(`   - Display Price: $${initialAsset?.lastDisplayPrice}\n`);

    // 3. Trigger AI Pipeline
    console.log('3️⃣  Running AI/LLM Pipeline (Fetching News & Analyzing)...');
    console.log('   (This uses Google Serper & LLM, might take a few seconds)');

    const startTime = Date.now();
    try {
        await runLlmCycleForAsset(ASSET_ID);
    } catch (e) {
        console.error('   ❌ LLM Pipeline Failed:', e);
        return;
    }
    const duration = Date.now() - startTime;
    console.log(`   ✅ AI Analysis Complete in ${duration}ms.\n`);

    // 4. Retrieve AI Result
    const newLog = await db.oracleLog.findFirst({
        where: { assetId: ASSET_ID },
        orderBy: { createdAt: 'desc' }
    });

    console.log('4️⃣  AI Oracle Output:');
    if (newLog) {
        console.log(`   - Summary: "${newLog.summary}"`);
        console.log(`   - Confidence: ${(Number(newLog.confidence) * 100).toFixed(1)}%`);
        console.log(`   - Delta Signal: ${Number(newLog.deltaPercent) > 0 ? '+' : ''}${newLog.deltaPercent}%`);
        console.log(`   - Sources: ${(newLog.sourceUrls as string[]).length} found`);
    } else {
        console.log('   ⚠️ No Oracle Log found! Validation might have failed or no news found.');
    }
    console.log('');

    // 5. Trigger Price Engine
    console.log('5️⃣  Recomputing Price (Fusion of Market + AI)...');
    // Using the AI delta if available to simulate the event flow
    if (newLog) {
        // Pass the delta explicitly as if it came from the event
        await runPriceRecomputeForTest(ASSET_ID, { deltaPercent: Number(newLog.deltaPercent) });
    } else {
        await runPriceRecomputeForTest(ASSET_ID);
    }
    console.log('   ✅ Price Engine Tick Processed.\n');

    // 6. Final Verification
    const finalAsset = await db.asset.findUnique({ where: { id: ASSET_ID } });
    const latestTick = await db.priceTick.findFirst({
        where: { assetId: ASSET_ID },
        orderBy: { timestamp: 'desc' }
    });

    console.log('6️⃣  FINAL RESULTS:');
    console.log(`   - Old Price: $${initialAsset?.lastDisplayPrice}`);
    console.log(`   - NEW Price: $${finalAsset?.lastDisplayPrice}`);

    if (latestTick) {
        console.log(`   - Tick Recorded At: ${latestTick.timestamp.toISOString()}`);
        console.log(`   - Market Weight: ${latestTick.weightMarket}`);
    }

    const priceChange = Number(finalAsset?.lastDisplayPrice) - Number(initialAsset?.lastDisplayPrice);
    console.log(`\n🎉 Price Change: ${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(4)} (${((priceChange / Number(initialAsset?.lastDisplayPrice)) * 100).toFixed(2)}%)`);
}

main()
    .catch(console.error)
    .finally(() => db.$disconnect());
