import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@megatron/database';
import { enrichAssets } from '@/lib/assets';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ bookmarks: [] }, { status: 401 });
    }

    try {
        const bookmarks = await prisma.bookmark.findMany({
            where: {
                userId: session.user.id,
            },
            include: {
                asset: {
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
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const assets = bookmarks
            .filter(b => b.asset !== null)
            .map(b => b.asset);

        const enrichedAssets = await enrichAssets(assets, new Set(assets.map(a => a.id)));

        return NextResponse.json({ bookmarks: enrichedAssets });
    } catch (error) {
        console.error('Error fetching bookmarks:', error);
        return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { assetId } = await req.json();

        if (!assetId) {
            return NextResponse.json({ error: 'Asset ID required' }, { status: 400 });
        }

        // Check availability
        const existing = await prisma.bookmark.findUnique({
            where: {
                userId_assetId: {
                    userId: session.user.id,
                    assetId,
                }
            }
        });

        if (existing) {
            // Remove
            await prisma.bookmark.delete({
                where: {
                    userId_assetId: {
                        userId: session.user.id,
                        assetId,
                    }
                }
            });
            return NextResponse.json({ bookmarked: false });
        } else {
            // Add
            await prisma.bookmark.create({
                data: {
                    userId: session.user.id,
                    assetId,
                }
            });
            return NextResponse.json({ bookmarked: true });
        }

    } catch (error) {
        console.error('Error toggling bookmark:', error);
        return NextResponse.json({ error: 'Failed to toggle bookmark' }, { status: 500 });
    }
}
