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
        const order = await db.limitOrder.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.userId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (order.status !== 'open') {
            return NextResponse.json({ error: 'Cannot cancel non-open order' }, { status: 400 });
        }

        await db.limitOrder.update({
            where: { id: orderId },
            data: { status: 'cancelled' }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Cancellation failed' }, { status: 500 });
    }
}
