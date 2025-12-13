import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';

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

        const body = await request.json();
        const { name, type, description, softCap, hardCap, imageUrl } = body;

        // Validation
        if (!name || !type || !softCap || !hardCap) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create Asset + Pool + Initial Price logic could go here
        // For simplicity, just creating Asset and Pool
        const asset = await db.asset.create({
            data: {
                name,
                type,
                description,
                softCap,
                hardCap,
                imageUrl,
                status: 'funding',
                oracleQueries: [], // Default empty queries
                pricingParams: { P0: 10, k: 0.1 }, // Defaults
                pool: {
                    create: {
                        totalUsdc: 0,
                        totalLPShares: 0,
                        status: 'funding'
                    }
                }
            }
        });

        return NextResponse.json({ asset });
    } catch (error) {
        console.error('Failed to create asset:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        if (!await isAdmin()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, name, type, description, softCap, hardCap, imageUrl } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing asset ID' }, { status: 400 });
        }

        const updatedAsset = await db.asset.update({
            where: { id },
            data: {
                name,
                type,
                description,
                softCap,
                hardCap,
                imageUrl
            }
        });

        return NextResponse.json({ asset: updatedAsset });
    } catch (error) {
        console.error('Failed to update asset:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        if (!await isAdmin()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        }

        // We probably shouldn't fully delete if there are trades, but for now we can just mark as cancelled
        // Or if it's very fresh, delete. Let's do a safe "mark as cancelled" logic if trades exist.

        const tradesCount = await db.trade.count({ where: { assetId: id } });

        if (tradesCount > 0) {
            await db.asset.update({
                where: { id },
                data: { status: 'cancelled' }
            });
            return NextResponse.json({ success: true, message: 'Asset marked as cancelled (has trades)' });
        } else {
            // Safe to fully delete relational data in transaction
            await db.$transaction(async (tx) => {
                // Delete related records first to avoid foreign key constraints (bookmarks, etc)
                await tx.bookmark.deleteMany({ where: { assetId: id } });
                await tx.liquidityPool.delete({ where: { assetId: id } });
                await tx.asset.delete({ where: { id } });
            });
            return NextResponse.json({ success: true, message: 'Asset deleted permanently' });
        }

    } catch (error) {
        console.error('Failed to delete asset:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
