import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@megatron/database';

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
                    select: {
                        id: true,
                        name: true,
                        lastDisplayPrice: true,
                        oracleLogs: {
                            take: 1,
                            orderBy: { createdAt: 'desc' },
                            select: { deltaPercent: true }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Format for frontend - filter out bookmarks with deleted assets
        const formatted = bookmarks
            .filter(b => b.asset !== null)
            .map(b => ({
                id: b.asset.id,
                name: b.asset.name,
                price: Number(b.asset.lastDisplayPrice || 0),
                change: Number(b.asset.oracleLogs?.[0]?.deltaPercent || 0)
            }));

        return NextResponse.json({ bookmarks: formatted });
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
