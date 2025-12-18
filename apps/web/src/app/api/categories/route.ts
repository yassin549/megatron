import { NextResponse } from 'next/server';
import { db } from '@megatron/database';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Fetch unique types from the Asset table
        const types = await db.asset.findMany({
            select: { type: true },
            distinct: ['type'],
        });

        const categoryList = types.map(t => t.type);

        // Map internal types to display names and ensure basic defaults exist
        // This allows the UI to handle categories elegantly
        return NextResponse.json({
            categories: categoryList
        });
    } catch (error) {
        console.error('[API/categories] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch categories' },
            { status: 500 }
        );
    }
}
