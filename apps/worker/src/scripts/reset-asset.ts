
import { PrismaClient } from '@megatron/database';

const db = new PrismaClient();

async function main() {
    console.log('🔄 Resetting AI Hype Index...');

    const asset = await db.asset.findFirst({
        where: { name: 'AI Hype Index' }
    });

    if (!asset) {
        console.error('Asset not found!');
        return;
    }

    console.log(`Found Asset: ${asset.id}`);

    // Delete related data
    console.log('Cleaning up Oracle Logs...');
    await db.oracleLog.deleteMany({ where: { assetId: asset.id } });

    console.log('Cleaning up Price Ticks...');
    await db.priceTick.deleteMany({ where: { assetId: asset.id } });

    console.log('Cleaning up Trades...');
    await db.trade.deleteMany({ where: { assetId: asset.id } });

    // Reset Asset State
    console.log('Resetting Asset Price & Status...');
    await db.asset.update({
        where: { id: asset.id },
        data: {
            status: 'active', // Keep active so worker picks it up immediately
            lastDisplayPrice: 10.00,
            lastMarketPrice: 10.00,
            lastFundamental: 10.00
        }
    });

    console.log('✅ Asset Reset Complete. New analysis cycles should generate fresh reasoning.');
}

main()
    .catch(console.error)
    .finally(() => db.$disconnect());
