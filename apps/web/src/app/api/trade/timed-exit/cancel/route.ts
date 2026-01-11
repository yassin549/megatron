
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { timedExitId } = await req.json();
        if (!timedExitId) {
            return NextResponse.json({ error: 'TimedExit ID required' }, { status: 400 });
        }

        const timedExit = await db.timedExit.findUnique({
            where: { id: timedExitId }
        });

        if (!timedExit || timedExit.userId !== session.user.id) {
            return NextResponse.json({ error: 'TimedExit not found' }, { status: 404 });
        }

        if (timedExit.status !== 'active') {
            return NextResponse.json({ error: 'Only active timed exits can be cancelled' }, { status: 400 });
        }

        await db.timedExit.update({
            where: { id: timedExitId },
            data: { status: 'cancelled' }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to cancel timed exit:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
