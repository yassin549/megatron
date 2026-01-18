import { NextResponse } from 'next/server';
import { db } from '@megatron/database';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const assetCount = await db.asset.count();

        return NextResponse.json({
            assetCount,
            variablesProcessed: assetCount * 240 // Marketing math: ~240 variables/asset
        });
    } catch (error) {
        console.error('Failed to fetch system stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}
