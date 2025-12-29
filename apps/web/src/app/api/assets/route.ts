import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';
import { enrichAssets } from '@/lib/assets';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

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

        // Fetch assets with filtering if query is provided
        const assets = await db.asset.findMany({
            where: query ? {
                name: {
                    contains: query,
                    mode: 'insensitive'
                }
                // Removed status filter to show all matching assets
            } : {},
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
            take: query ? 10 : undefined, // Limit results for search
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
