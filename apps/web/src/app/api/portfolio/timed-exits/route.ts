
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const timedExits = await db.timedExit.findMany({
            where: {
                userId: session.user.id,
                status: 'active'
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({ timedExits });
    } catch (error) {
        console.error('Failed to fetch timed exits:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
