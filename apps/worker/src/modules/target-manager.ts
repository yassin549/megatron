import { db } from '@megatron/database';
import { executeBuyAndPublish, executeSellAndPublish } from './exchange';

/**
 * Checks all active positions for an asset and executes TP/SL if hit.
 */
export async function checkTargets(assetId: string, currentPrice: number) {
    try {
        // Fetch all positions for this asset with targets set
        const positions = await db.position.findMany({
            where: {
                assetId,
                NOT: {
                    shares: {
                        gt: -1e-8,
                        lt: 1e-8
                    }
                },
                OR: [
                    { stopLoss: { not: null } },
                    { takeProfit: { not: null } }
                ]
            },
            include: { user: true }
        });

        if (positions.length === 0) {
            return;
        }

        console.log(`[TargetManager] Checking ${positions.length} positions for asset ${assetId} at price ${currentPrice.toFixed(4)}`);

        for (const pos of positions) {
            const sharesVal = pos.shares.toNumber();
            if (Math.abs(sharesVal) < 1e-8) continue; // Safety skip

            const isLong = sharesVal > 0;
            const shares = Math.abs(sharesVal);

            let shouldClose = false;
            let reason = '';

            // Check Take Profit
            if (pos.takeProfit) {
                const tp = pos.takeProfit.toNumber();
                if (isLong) {
                    if (currentPrice >= tp) {
                        shouldClose = true;
                        reason = 'Take Profit (Long)';
                    }
                } else {
                    if (currentPrice <= tp) {
                        shouldClose = true;
                        reason = 'Take Profit (Short)';
                    }
                }
            }

            // Check Stop Loss
            if (!shouldClose && pos.stopLoss) {
                const sl = pos.stopLoss.toNumber();
                if (isLong) {
                    if (currentPrice <= sl) {
                        shouldClose = true;
                        reason = 'Stop Loss (Long)';
                    }
                } else {
                    if (currentPrice >= sl) {
                        shouldClose = true;
                        reason = 'Stop Loss (Short)';
                    }
                }
            }

            if (shouldClose) {
                console.log(`[TargetManager] Triggering ${reason} for user ${pos.userId} on asset ${assetId} at ${currentPrice}`);

                try {
                    if (isLong) {
                        // Close Long = Sell
                        await executeSellAndPublish(pos.userId, assetId, shares);
                    } else {
                        // Close Short = Buy
                        await executeBuyAndPublish(pos.userId, assetId, shares);
                    }

                    // Clear targets on current position (it might be deleted by exchange if shares hit 0, but good to ensure)
                    await db.position.update({
                        where: { id: pos.id },
                        data: { stopLoss: null, takeProfit: null }
                    }).catch(() => { }); // Ignore if deleted

                } catch (err) {
                    console.error(`[TargetManager] Failed to execute target for ${pos.userId}:`, err);
                }
            }
        }
    } catch (error) {
        console.error('[TargetManager] Error checking targets:', error);
    }
}
