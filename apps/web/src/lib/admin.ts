import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { db } from '@megatron/database';

export async function isAdmin(req?: Request) {
    const session = await getServerSession(authOptions);

    // 1. Check Session & Database
    if (session?.user?.id) {
        const user = await db.user.findUnique({
            where: { id: (session.user as any).id },
            select: { id: true, email: true, isAdmin: true }
        });

        // Grant access if DB flag is on OR if email matches ADMIN_EMAIL config
        if (user?.isAdmin) return true;
        if (user?.email && process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL) {
            return true;
        }
    }

    // 2. Check Password Header (Admin Dashboard Specific)
    if (req) {
        const adminPassword = process.env.ADMIN_PASSWORD;
        const headerPassword = req.headers.get('X-Admin-Password');
        if (adminPassword && headerPassword === adminPassword) {
            return true;
        }
    }

    return false;
}
