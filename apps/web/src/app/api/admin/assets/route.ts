import { NextResponse } from 'next/server';
import { db } from '@megatron/database';
import { isAdmin } from '@/lib/admin';

export async function POST(request: Request) {
    try {
        if (!await isAdmin(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, type, description, softCap, hardCap, imageUrl } = body;

        // Validation
        if (!name || !type || !softCap || !hardCap) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const finalQueries = Array.isArray(body.oracleQueries) && body.oracleQueries.length > 0
            ? body.oracleQueries
            : [
                `${name} latest developments and news`,
                `${name} market sentiment and analysis`,
                `${name} ecosystem growth and indicators`
            ];

        const asset = await db.asset.create({
            data: {
                name,
                type,
                description,
                softCap,
                hardCap,
                imageUrl,
                status: 'funding',
                oracleQueries: finalQueries,
                pricingParams: { P0: 18, k: 1e-10 },
                lastDisplayPrice: 18,
                lastMarketPrice: 18,
                lastFundamental: 18,
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
        if (!await isAdmin(request)) {
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
        if (!await isAdmin(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        }

        const tradesCount = await db.trade.count({ where: { assetId: id } });

        if (tradesCount > 0) {
            await db.asset.update({
                where: { id },
                data: { status: 'cancelled' }
            });
            return NextResponse.json({ success: true, message: 'Asset marked as cancelled (has trades)' });
        } else {
            await db.$transaction(async (tx: any) => {
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
