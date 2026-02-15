import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';
import { matchOrder } from '@/lib/orderMatching';
import { publishEvent as publishAblyEvent } from '@megatron/lib-integrations';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { assetId, side, price, quantity } = body;

    if (!assetId || !side || !price || !quantity) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (!['buy', 'sell'].includes(side)) {
        return NextResponse.json({ error: 'Invalid side' }, { status: 400 });
    }

    const priceNum = parseFloat(price);
    const quantityNum = parseFloat(quantity);

    if (isNaN(priceNum) || priceNum <= 0 || isNaN(quantityNum) || quantityNum <= 0) {
        return NextResponse.json({ error: 'Invalid price or quantity' }, { status: 400 });
    }

    try {
        const result = await db.$transaction(async (tx) => {
            // 1. Lock funds/assets immediately
            if (side === 'buy') {
                const totalCost = priceNum * quantityNum;

                // Decrement wallet balance (Lock funds)
                // Prisma will throw if balance goes negative due to db constraints, 
                // but we check explicitly first for better error message.
                const user = await tx.user.findUnique({ where: { id: userId } });
                if (!user || user.walletHotBalance.toNumber() < totalCost) {
                    throw new Error('Insufficient balance to place buy order (funds are locked on order)');
                }

                await tx.user.update({
                    where: { id: userId },
                    data: { walletHotBalance: { decrement: totalCost } }
                });

            } else {
                // Sell Side - Lock Shares
                const position = await tx.position.findUnique({
                    where: { userId_assetId: { userId, assetId } }
                });

                if (!position || position.shares.toNumber() < quantityNum) {
                    throw new Error('Insufficient shares to place sell order (shares are locked on order)');
                }

                await tx.position.update({
                    where: { userId_assetId: { userId, assetId } },
                    data: { shares: { decrement: quantityNum } }
                });
            }

            // 2. Create Order
            const order = await tx.limitOrder.create({
                data: {
                    userId,
                    assetId,
                    side,
                    price: priceNum,
                    initialQuantity: quantityNum,
                    remainingQuantity: quantityNum,
                    status: 'open'
                }
            });

            // 3. Trigger Matching Engine
            await matchOrder(order.id, tx);

            return order;
        });

        // Notify orderbook update
        publishAblyEvent(`assets:${assetId}`, 'orderbook_update', {
            assetId,
            timestamp: new Date().toISOString()
        }).catch(console.error);

        return NextResponse.json({ success: true, orderId: result.id });
    } catch (error: any) {
        console.error('Order placement failed:', error);
        return NextResponse.json({ error: error.message || 'Order failed' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get('assetId');

    if (!assetId) {
        return NextResponse.json({ error: 'Asset ID required' }, { status: 400 });
    }

    try {
        const [bids, asks] = await Promise.all([
            db.limitOrder.groupBy({
                by: ['price'],
                where: { assetId, status: 'open', side: 'buy' },
                _sum: { remainingQuantity: true },
                orderBy: { price: 'desc' }
            }),
            db.limitOrder.groupBy({
                by: ['price'],
                where: { assetId, status: 'open', side: 'sell' },
                _sum: { remainingQuantity: true },
                orderBy: { price: 'asc' }
            })
        ]);

        const bidsFormatted = bids.map((b: any) => ({
            price: Number(b.price),
            amount: Number(b._sum.remainingQuantity || 0)
        }));

        const asksFormatted = asks.map((a: any) => ({
            price: Number(a.price),
            amount: Number(a._sum.remainingQuantity || 0)
        }));

        return NextResponse.json({ bids: bidsFormatted, asks: asksFormatted });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch orderbook' }, { status: 500 });
    }
}
