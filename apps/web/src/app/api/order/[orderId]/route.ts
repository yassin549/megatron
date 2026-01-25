import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';

export async function DELETE(
    req: Request,
    { params }: { params: { orderId: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = params;

    try {
        await db.$transaction(async (tx) => {
            // Get order inside transaction to ensure lock
            const order = await tx.limitOrder.findUnique({ where: { id: orderId } });

            if (!order || order.status !== 'open') throw new Error('Order not found or not open');
            if (order.userId !== session.user.id) throw new Error('Forbidden');

            // 1. Refund Funds/Assets
            const remainingQty = order.remainingQuantity.toNumber();

            if (order.side === 'buy') {
                // Refund USDC
                const refundAmount = remainingQty * order.price.toNumber();
                await tx.user.update({
                    where: { id: order.userId },
                    data: { walletHotBalance: { increment: refundAmount } }
                });
            } else {
                // Refund Shares - Need to handle Position upsert
                await tx.position.upsert({
                    where: { userId_assetId: { userId: order.userId, assetId: order.assetId } },
                    create: {
                        userId: order.userId,
                        assetId: order.assetId,
                        shares: remainingQty,
                        avgPrice: 0 // If recreating, avgPrice logic is tricky. Simplest is 0 or keep historical? 
                        // Actually, if they sold ALL shares, position might be gone. 
                        // When refunding, we just add shares back. 
                        // Ideally we should have kept the position with 0 shares to preserve avgPrice.
                        // For now, if recreating, avgPrice 0 is safe-ish or use order price?
                        // Let's use order.price as a distinct proxy if needed, but 0 prevents weird PnL.
                    },
                    update: {
                        shares: { increment: remainingQty }
                    }
                });
            }

            // 2. Mark Cancelled
            await tx.limitOrder.update({
                where: { id: orderId },
                data: { status: 'cancelled' }
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Cancellation failed' }, { status: 500 });
    }
}
