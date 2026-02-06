
import { TradeExecutor } from '@megatron/lib-common';
import { publishTradeEvent } from '../lib/redis';

/**
 * Execute a buy order for an asset.
 * Delegates to Shared TradeExecutor.
 */
export async function executeBuy(userId: string, assetId: string, amountUsdc: number, minSharesOut: number = 0) {
    const result = await TradeExecutor.executeBuy(
        userId,
        assetId,
        amountUsdc,
        undefined, // targetShares
        { minOutput: minSharesOut }
    );
    return {
        trade: result.trade,
        deltaShares: result.outputAmount
    };
}

/**
 * Helper to emit event after transaction commits (best effort)
 */
export async function executeBuyAndPublish(userId: string, assetId: string, amountUsdc: number, minSharesOut: number = 0) {
    try {
        const result = await TradeExecutor.executeBuy(
            userId,
            assetId,
            amountUsdc,
            undefined,
            { minOutput: minSharesOut }
        );

        // Publish event
        publishTradeEvent(result.eventData).catch(console.error);

        return result.trade;
    } catch (error) {
        console.error('ExecuteBuy failed:', error);
        throw error;
    }
}

/**
 * Execute a sell order for an asset.
 * Delegates to Shared TradeExecutor.
 */
export async function executeSell(userId: string, assetId: string, sharesToSell: number, minUsdcOut: number = 0) {
    // Shared Logic returns GROSS USDC in outputAmount
    // We need to check minUsdcOut against NET?
    // TradeExecutor has 'minOutput' check.
    // In TradeExecutor.executeSell:
    // If 'minOutput' is provided, it checks 'netPreview' (Net).
    // See TradeExecutor Logic: "if (limits?.minOutput && netPreview < limits.minOutput)"
    // So passing minUsdcOut as minOutput works correcty.

    const result = await TradeExecutor.executeSell(
        userId,
        assetId,
        sharesToSell,
        undefined, // targetUsdc
        { minOutput: minUsdcOut }
    );

    // Legacy return expected: { trade, netUsdc }
    // Result.outputAmount is GROSS.
    // We need Net.
    // We can fetch fee from trade record or recheck config.
    // Config is CONFIG.SWAP_FEE. Not exported?
    // We can infer from trade: trade.price * trade.quantity = GROSS.
    // trade.fee is stored.
    // Net = Gross - Fee.
    const gross = result.outputAmount;
    const fee = result.trade.fee.toNumber();
    const netUsdc = gross - fee;

    return {
        trade: result.trade,
        netUsdc
    };
}

export async function executeSellAndPublish(userId: string, assetId: string, sharesToSell: number, minUsdcOut: number = 0) {
    try {
        const result = await TradeExecutor.executeSell(
            userId,
            assetId,
            sharesToSell,
            undefined,
            { minOutput: minUsdcOut }
        );

        publishTradeEvent(result.eventData).catch(console.error);
        return result.trade;
    } catch (error) {
        console.error('ExecuteSell failed:', error);
        throw error;
    }
}
