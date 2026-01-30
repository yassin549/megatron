import { NextResponse } from 'next/server';
import Ably from 'ably';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const ABLY_API_KEY = process.env.ABLY_API_KEY || process.env.REALTIME_PROVIDER_KEY;

        if (!ABLY_API_KEY || ABLY_API_KEY.includes('vercel_blob')) {
            console.error('Ably API Key is invalid or missing');
            return NextResponse.json({ error: 'Ably misconfigured' }, { status: 500 });
        }

        // Initialize with explicit key object
        const client = new Ably.Rest({
            key: ABLY_API_KEY,
            // Ensure we're using the right environment if needed, but usually default is fine
        });

        // Ably Token Request
        const tokenRequestData = await client.auth.createTokenRequest({
            clientId: 'megatron-user-' + Math.random().toString(36).substring(7)
        });

        return NextResponse.json(tokenRequestData);
    } catch (error: any) {
        console.error('Ably Token Generation Error:', error);
        return NextResponse.json({
            error: 'Failed to generate token',
            message: error?.message || 'Unknown error'
        }, { status: 500 });
    }
}
