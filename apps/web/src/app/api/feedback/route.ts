import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { type, title, description } = body;

        if (!title || !description) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // We use suggestedQueries to store the type metadata
        // type: 'market' | 'feature'
        const typeTag = type === 'feature' ? 'TYPE:FEATURE' : 'TYPE:MARKET';

        const assetRequest = await db.assetRequest.create({
            data: {
                userId: session.user.id,
                variableName: title,
                description: description,
                // Store type in suggestedQueries as a convention since we reusing the table
                suggestedQueries: [typeTag],
                initialLPContribution: 0, // Default for simple feedback
                status: 'submitted'
            }
        });

        return NextResponse.json({ success: true, id: assetRequest.id });
    } catch (error) {
        console.error('Feedback submission error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
