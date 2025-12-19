import { runLlmCycleForAsset } from './src/modules/llm-pipeline';
import { db } from '@megatron/database';
import './src/preload';

async function testCycle() {
    const assetId = 'ai-hype-index';
    console.log(`Running manual LLM cycle for ${assetId}...`);
    try {
        await runLlmCycleForAsset(assetId);
        console.log('✅ Cycle completed successfully');

        const logs = await db.oracleLog.findMany({
            where: { assetId },
            take: 1,
            orderBy: { createdAt: 'desc' }
        });
        console.log('Last Log:', JSON.stringify(logs[0], null, 2));
    } catch (error) {
        console.error('❌ Cycle failed:', error);
    }
}

testCycle()
    .catch(console.error)
    .finally(() => db.$disconnect());
