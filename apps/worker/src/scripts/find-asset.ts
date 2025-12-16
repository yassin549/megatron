
import { db } from '@megatron/database';

async function findAsset() {
    const asset = await db.asset.findFirst({
        where: { name: 'AI Hype Index' },
        include: { pool: true }
    });
    console.log(JSON.stringify(asset, null, 2));
}

findAsset()
    .catch(console.error)
    .finally(() => db.$disconnect());
