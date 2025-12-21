import { NextResponse } from 'next/server';
import { db } from '@megatron/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { broadcastCustomEmail } from '@/lib/email';

async function isAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return false;

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true }
    });

    return user?.isAdmin === true;
}

export async function POST(request: Request) {
    try {
        if (!await isAdmin()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { subject, content } = await request.json();

        if (!subject || !content) {
            return NextResponse.json({ error: 'Subject and content are required' }, { status: 400 });
        }

        // Fetch all non-blacklisted users
        const users = await db.user.findMany({
            where: { isBlacklisted: false },
            select: { email: true }
        });

        if (users.length === 0) {
            return NextResponse.json({ message: 'No active users found to broadcast to.' });
        }

        // Send broadcast
        const result = await broadcastCustomEmail(users, subject, content);

        if (!result.success) {
            return NextResponse.json({ error: 'Failed to send broadcast' }, { status: 500 });
        }

        return NextResponse.json({
            message: `Successfully broadcasted to ${users.length} users.`,
            results: result.results
        });
    } catch (error) {
        console.error('Broadcast error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
