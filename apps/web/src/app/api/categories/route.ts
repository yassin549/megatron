import { NextResponse } from 'next/server';
import { db } from '@megatron/database';

export const dynamic = 'force-dynamic';

const ALL_CATEGORIES = [
    'AI', 'Startups', 'Venture', 'Technology', 'Innovation', 'Markets', 'Trading',
    'Macro', 'Economics', 'Politics', 'Geopolitics', 'Society', 'Social', 'Culture',
    'Sentiment', 'Crypto', 'Web3', 'Energy', 'Climate', 'Resources', 'Labor',
    'Employment', 'Media', 'Narratives', 'Attention', 'Risk', 'Volatility',
    'Liquidity', 'Regulation', 'Security', 'Defense', 'Health', 'Demographics',
    'Consumer', 'Lifestyle', 'Mobility', 'Education', 'Science'
];

export async function GET() {
    try {
        return NextResponse.json({
            categories: ALL_CATEGORIES
        });
    } catch (error) {
        console.error('[API/categories] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch categories' },
            { status: 500 }
        );
    }
}
