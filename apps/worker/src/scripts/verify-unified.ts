
import { db } from '@megatron/database';
import { TradeExecutor } from '@megatron/lib-common';

async function main() {
    console.log('--- Verifying Unified Trade Logic ---');

    // Setup
    const user = await db.user.findFirst();
    const asset = await db.asset.findFirst();

    if (!user || !asset) {
        console.error('No user or asset found (Database empty?)');
        // Try creating one? No, too risky to mutate DB state blindly if empty.
        // We assume Dev DB has seed.
        return;
    }

    const userId = user.id;
    const assetId = asset.id;

    console.log(`Using User: ${user.email} (${userId})`);
    console.log(`Using Asset: ${asset.name} (${assetId})`);

    try {
        // 1. BUY (Long)
        console.log('\n--- 1. BUY 100 USDC ---');
        const buyResult = await TradeExecutor.executeBuy(userId, assetId, 100);
        console.log(`Bought ${buyResult.outputAmount.toFixed(4)} shares. Price: ${buyResult.trade.price.toFixed(4)}`);

        // 2. SELL HALF (Reduce Long)
        const halfShares = buyResult.outputAmount / 2;
        console.log(`\n--- 2. SELL ${halfShares.toFixed(4)} Shares ---`);
        const sellResult = await TradeExecutor.executeSell(userId, assetId, halfShares);
        console.log(`Sold for ${sellResult.outputAmount.toFixed(2)} USDC (Gross).`);

        // 3. FLIP TO SHORT (Sell Remainder + Short More)
        // Current Shares approx halfShares.
        // We sell halfShares + 10 more shares (assuming possible?)
        // Let's sell by USDC Amount to target a short? 
        // No, executeSell takes shares usually.
        // Let's Sell remaining + 5 shares.
        const remaining = halfShares; // roughly
        const toSell = remaining + 5;
        console.log(`\n--- 3. FLIP: Sell ${toSell.toFixed(4)} Shares (Long -> Short) ---`);

        // This might fail if user doesn't have collateral.
        // Check balance first?
        const balance = await db.user.findUnique({ where: { id: userId } });
        console.log(`User Balance: ${balance?.walletHotBalance}`);

        const flipResult = await TradeExecutor.executeSell(userId, assetId, toSell);
        console.log(`Flipped! Trade Price: ${flipResult.trade.price.toFixed(4)}`);

        const pos = await db.position.findUnique({ where: { userId_assetId: { userId, assetId } } });
        console.log(`New Position: ${pos?.shares} shares (Should be negative approx -5)`);


        // 4. FLIP BACK TO LONG
        // Currently -5 shares.
        // Buy 10 shares -> Net +5.
        console.log(`\n--- 4. FLIP BACK: Buy 10 Shares (Short -> Long) ---`);
        const flipBack = await TradeExecutor.executeBuy(userId, assetId, 0, 10);
        console.log(`Flipped Back! Trade Price: ${flipBack.trade.price.toFixed(4)}`);

        const pos2 = await db.position.findUnique({ where: { userId_assetId: { userId, assetId } } });
        console.log(`Final Position: ${pos2?.shares} shares (Should be positive approx 5)`);

    } catch (e) {
        console.error('Test Failed:', e);
    }
}

main().catch(console.error);
