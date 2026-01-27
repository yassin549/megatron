import { NextResponse } from 'next/server';
import Ably from 'ably';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const ABLY_API_KEY = process.env.ABLY_API_KEY;
        if (!ABLY_API_KEY) {
            console.error('ABLY_API_KEY is not defined');
            return NextResponse.json({ error: 'Ably not configured' }, { status: 500 });
        }

        const client = new Ably.Rest(ABLY_API_KEY);
        const tokenRequestData = await client.auth.createTokenRequest({
            clientId: 'megatron-user'
        });

        return NextResponse.json(tokenRequestData);
    } catch (error) {
        console.error('Failed to create Ably token request:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
