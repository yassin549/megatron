import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';

// Temporary endpoint to grant admin access to the current logged-in user
export async function POST() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Not logged in' },
                { status: 401 }
            );
        }

        // Grant admin access to current user
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
        return NextResponse.json(
            { error: 'Failed to grant admin access' },
            { status: 500 }
        );
    }
}
