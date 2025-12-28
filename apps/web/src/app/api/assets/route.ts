import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';
import { enrichAssets } from '@/lib/assets';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
    try {
        const session = await getServerSession(authOptions);
        let userBookmarks = new Set<string>();

        if (session?.user?.id) {
            const bookmarks = await db.bookmark.findMany({
                where: { userId: session.user.id },
                select: { assetId: true }
            });
            userBookmarks = new Set(bookmarks.map(b => b.assetId));
        }

        // Fetch all assets with their pools and latest AI data
        const assets = await db.asset.findMany({
            include: {
                pool: {
                    select: {
                        totalUsdc: true,
                        totalLPShares: true,
                    },
                },
                oracleLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        confidence: true,
                        summary: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        const enrichedAssets = await enrichAssets(assets, userBookmarks);

        return NextResponse.json({ assets: enrichedAssets });
    } catch (error) {
        console.error('[API/assets] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch assets' },
            { status: 500 }
        );
    }
}
