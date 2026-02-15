import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';

export async function POST(req: Request) {
    try {
        if (process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const grantToken = process.env.ADMIN_GRANT_TOKEN;
        const headerToken = req.headers.get('X-Admin-Grant-Token');

        if (!grantToken || !headerToken || headerToken !== grantToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
        }

        const updatedUser = await db.user.update({
            where: { id: session.user.id },
            data: { isAdmin: true }
        });

        return NextResponse.json({
            success: true,
            message: `Admin access granted to ${updatedUser.email}`,
            email: updatedUser.email
        });
    } catch (error) {
        console.error('Error granting admin:', error);
        return NextResponse.json({ error: 'Failed to grant admin access' }, { status: 500 });
    }
}
