import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { assetId, stopLoss, takeProfit } = await req.json();

        if (!assetId) {
            return NextResponse.json({ error: 'Asset ID required' }, { status: 400 });
        }

        const position = await db.position.update({
            where: {
                userId_assetId: {
                    userId: session.user.id,
                    assetId,
                },
            },
            data: {
                stopLoss: stopLoss !== undefined ? stopLoss : undefined,
                takeProfit: takeProfit !== undefined ? takeProfit : undefined,
            },
        });

        return NextResponse.json({ success: true, position });
    } catch (error: any) {
        console.error('Failed to update position targets:', error);
        return NextResponse.json({ error: error.message || 'Update failed' }, { status: 500 });
    }
}
