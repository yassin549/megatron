
import { db } from '@megatron/database';

async function checkReasoning() {
    const log = await db.oracleLog.findFirst({
        orderBy: { createdAt: 'desc' }
    });
    console.log('Latest log LLM response:', JSON.stringify(log?.llmResponse, null, 2));
}

checkReasoning()
    .catch(console.error)
    .finally(() => db.$disconnect());
