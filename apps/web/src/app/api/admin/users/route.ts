import { NextResponse } from 'next/server';
import { db } from '@megatron/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        if (!await isAdmin(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const users = await db.user.findMany({
            select: {
                id: true,
                email: true,
                isAdmin: true,
                isBlacklisted: true,
                createdAt: true,
                walletHotBalance: true,
                walletColdBalance: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const formattedUsers = users.map(user => ({
            ...user,
            balance: Number(user.walletHotBalance) + Number(user.walletColdBalance),
            createdAt: user.createdAt.toISOString().split('T')[0],
        }));

        return NextResponse.json({ users: formattedUsers });
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        if (!await isAdmin(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, isBlacklisted } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        const user = await db.user.update({
            where: { id: userId },
            data: { isBlacklisted },
            select: { id: true, isBlacklisted: true }
        });

        const session = await getServerSession(authOptions);
        await db.adminAction.create({
            data: {
                adminEmail: session?.user?.email || 'unknown',
                action: 'toggle_blacklist',
                targetId: userId,
                reason: isBlacklisted ? 'Manual blacklist' : 'Manual unblacklist',
                metadata: { isBlacklisted }
            }
        });

        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error('Failed to update user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
