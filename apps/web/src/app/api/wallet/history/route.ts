import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    try {
        // 1. Fetch Ledger entries (Confirmed history, excluding raw withdrawal types to avoid duplicates)
        const ledger = await db.ledger.findMany({
            where: {
                userId,
                NOT: { reason: 'withdrawal' }
            },
            orderBy: { createdAt: 'desc' },
            take: 30
        });

        // 2. Fetch Pending Deposits (Incoming)
        const pendingDeposits = await db.pendingDeposit.findMany({
            where: {
                userId,
                status: 'pending'
            },
            orderBy: { createdAt: 'desc' }
        });

        // 3. Fetch ALL Withdrawal Requests (Outgoing - to see status and historical record)
        const withdrawals = await db.withdrawalRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        return NextResponse.json({
            ledger,
            pendingDeposits,
            withdrawals
        });

    } catch (error) {
        console.error("Failed to fetch history:", error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
