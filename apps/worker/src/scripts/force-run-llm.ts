
import { db } from '@megatron/database';
import { runLlmCycleForAsset } from '../modules/llm-pipeline'; // Adjust import if needed, assuming runLlmCycleForAsset is exported
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function main() {
    console.log('🚀 Forcing LLM Cycle Start...');

    const asset = await db.asset.findFirst({
        where: { name: 'US Unemployment Rate' }
    });

    if (!asset) {
        console.error('❌ Asset not found');
        return;
    }

    console.log(`Found Asset: ${asset.id} (${asset.status})`);

    try {
        console.log('Running Cycle...');
        await runLlmCycleForAsset(asset.id);
        console.log('✅ Cycle Complete. Check DB for new logs.');

        // VERIFICATION: Print the latest log reasoning
        const lastLog = await db.oracleLog.findFirst({
            orderBy: { createdAt: 'desc' }
        });
        if (lastLog) {
            try {
                // llmResponse is already a JSON object in the DB (typed as Json), so we cast it
                const details = lastLog.llmResponse as any;
                console.log('\n====== [VERIFIED AI REASONING] ======');
                console.log(details.reasoning);
                console.log('=====================================\n');
            } catch (e) {
                console.log('Could not parse verification log');
            }
        }
    } catch (error) {
        console.error('❌ Cycle Failed:', error);
    }
}

main()
    .catch(console.error)
    .finally(() => db.$disconnect());
