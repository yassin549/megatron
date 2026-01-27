import { db, Prisma } from '@megatron/database';
import { Redis } from 'ioredis';
import { TradeEvent, MONETARY_CONFIG } from '@megatron/lib-common';
import { publishEvent as publishAblyEvent } from '@megatron/lib-integrations';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function matchOrder(orderId: string, tx: any) {
    const order = await tx.limitOrder.findUnique({
        where: { id: orderId },
        include: { asset: true, user: true }
    });

    if (!order || order.status !== 'open') return;

    const isBuy = order.side === 'buy';
    const oppositeSide = isBuy ? 'sell' : 'buy';

    // Find matching orders
    // If buy: find sells with price <= order.price, order by price ASC, createdAt ASC
    // If sell: find buys with price >= order.price, order by price DESC, createdAt ASC
    const matchingOrders = await tx.limitOrder.findMany({
        where: {
            assetId: order.assetId,
            side: oppositeSide,
            status: 'open',
            price: isBuy ? { lte: order.price } : { gte: order.price },
            userId: { not: order.userId } // Prevent self-matching
        },
        orderBy: [
            { price: isBuy ? 'asc' : 'desc' },
            { createdAt: 'asc' }
        ]
    });

    let remainingQty = order.remainingQuantity.toNumber();

    for (const match of matchingOrders) {
        if (remainingQty <= 0) break;

        const matchQty = match.remainingQuantity.toNumber();
        const executeQty = Math.min(remainingQty, matchQty);
        const executePrice = match.price.toNumber(); // Use the existing order's price (price improvement for the taker)

        // Execute Trade
        const totalAmount = executeQty * executePrice;
        const fee = totalAmount * MONETARY_CONFIG.SWAP_FEE;
        const netAmount = totalAmount - fee;

        // 1. Create Trade Record
        const trade = await tx.trade.create({
            data: {
                assetId: order.assetId,
                buyerId: isBuy ? order.userId : match.userId,
                sellerId: isBuy ? match.userId : order.userId,
                price: executePrice,
                quantity: executeQty,
                fee: fee,
                side: isBuy ? 'buy' : 'sell'
            }
        });

        // 2. Update Positions
        // Buyer Position (Buy order user if isBuy, else match user)
        const buyerId = isBuy ? order.userId : match.userId;
        const sellerId = isBuy ? match.userId : order.userId;

        await updatePosition(tx, buyerId, order.assetId, executeQty, executePrice, 'buy');
        await updatePosition(tx, sellerId, order.assetId, executeQty, executePrice, 'sell');

        // 3. Update User Balances
        // Buyer: Funds already locked at order creation. No action needed here.
        // (Wait, if the trade happens at a BETTER price than the limit order, we need to REFUND the difference to the Buyer!)

        let buyerRefund = 0;
        if (isBuy) {
            // Buyer locked `order.price` * quantity.
            // Executed at `executePrice`.
            // If executePrice < order.price, refund (order.price - executePrice) * executeQty
            const priceDiff = order.price.toNumber() - executePrice;
            if (priceDiff > 0.000001) {
                buyerRefund = priceDiff * executeQty;
            }
        }
        // Note: For the matching order (Maker), if it was a Buy, they locked their price.
        // If we (Taker) are Selling to them, we sell at THEIR price (Maker Price).
        // Usually Match Price = Maker Price.
        // So refund is 0 for Maker.
        // For Taker (if Buy), we execute at Maker Price (which is <= our Limit).
        // If Taker Limit > Maker Price, we get a refund.

        if (buyerRefund > 0) {
            await tx.user.update({
                where: { id: buyerId },
                data: { walletHotBalance: { increment: buyerRefund } }
            });
        }

        // Seller receives net USDC
        await tx.user.update({
            where: { id: sellerId },
            data: { walletHotBalance: { increment: netUsdc(totalAmount) } }
        });

        // 4. Update Orders
        await tx.limitOrder.update({
            where: { id: match.id },
            data: {
                remainingQuantity: { decrement: executeQty },
                status: matchQty - executeQty <= 0.000001 ? 'filled' : 'open'
            }
        });

        remainingQty -= executeQty;

        // 5. Publish Event
        const event: TradeEvent = {
            type: 'trade',
            assetId: order.assetId,
            tradeId: trade.id,
            price: executePrice,
            quantity: executeQty,
            buyerId: buyerId,
            timestamp: Date.now(),
            volume5m: 0
        };
        redis.publish('megatron:events', JSON.stringify(event)).catch(console.error);

        // Also publish to Ably for the frontend
        publishAblyEvent(`prices:${order.assetId}`, 'price_tick', {
            assetId: order.assetId,
            priceDisplay: executePrice,
            timestamp: new Date().toISOString(),
        }).catch(console.error);
    }

    // Final update for the original order
    await tx.limitOrder.update({
        where: { id: order.id },
        data: {
            remainingQuantity: remainingQty,
            status: remainingQty <= 0.000001 ? 'filled' : 'open'
        }
    });

    // Notify orderbook update
    publishAblyEvent(`assets:${order.assetId}`, 'orderbook_update', {
        assetId: order.assetId,
        timestamp: new Date().toISOString()
    }).catch(console.error);
}

function netUsdc(amount: number) {
    return amount * (1 - MONETARY_CONFIG.SWAP_FEE);
}

async function updatePosition(tx: any, userId: string, assetId: string, deltaShares: number, price: number, side: 'buy' | 'sell') {
    const position = await tx.position.findUnique({
        where: { userId_assetId: { userId, assetId } }
    });

    if (side === 'buy') {
        if (position) {
            const oldShares = position.shares.toNumber();
            const oldTotalCost = oldShares * position.avgPrice.toNumber();
            const newTotalCost = oldTotalCost + (deltaShares * price);
            const newTotalShares = oldShares + deltaShares;
            await tx.position.update({
                where: { userId_assetId: { userId, assetId } },
                data: {
                    shares: newTotalShares,
                    avgPrice: newTotalCost / newTotalShares
                }
            });
        } else {
            await tx.position.create({
                data: {
                    userId,
                    assetId,
                    shares: deltaShares,
                    avgPrice: price
                }
            });
        }
    } else {
        // Sell logic: Shares were already locked/deducted at order creation. 
        // No modification to Position needed during match.
    }
}
