import { NextResponse } from 'next/server';
import { db } from '@megatron/database';
import crypto from 'crypto';

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
    if (!signatureHeader) return false;

    const normalized = signatureHeader.replace(/^sha256=/i, '').trim();
    const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest();
    const hmacHex = hmac.toString('hex');
    const hmacBase64 = hmac.toString('base64');

    const compare = (a: string, b: string) => {
        const aBuf = Buffer.from(a);
        const bBuf = Buffer.from(b);
        if (aBuf.length !== bBuf.length) return false;
        return crypto.timingSafeEqual(aBuf, bBuf);
    };

    return compare(normalized, hmacHex) || compare(normalized, hmacBase64);
}

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const secret = process.env.TURNKEY_WEBHOOK_SECRET;

        if (!secret) {
            console.error('Turnkey webhook secret is not configured');
            return NextResponse.json({ error: 'Webhook misconfigured' }, { status: 500 });
        }

        const signatureHeader = req.headers.get('x-turnkey-signature');
        if (!verifySignature(rawBody, signatureHeader, secret)) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const body = JSON.parse(rawBody);

        const { activity } = body;
        if (!activity || activity.type !== 'ACTIVITY_TYPE_CREATE_TRANSACTION') {
            // We are interested in incoming transactions usually, 
            // but Turnkey might send specific event types for deposits if configured.
            // For standard setup, we might poll or listen to "Transaction" events.
            // Let's assume we receive a 'ACTIVITY_STATUS_COMPLETED' for a transaction.
            return NextResponse.json({ message: 'Ignored event type' });
        }

        if (activity.status !== 'ACTIVITY_STATUS_COMPLETED') {
            return NextResponse.json({ message: 'Ignored non-completed status' });
        }

        const params = activity.parameters;
        // Parse deposit info. This depends on Turnkey's exact payload structure.
        // Assuming params contains `amount` and `destinationAddress`.

        const destinationAddress = params.destinationAddress; // Hypothetical field
        const amount = params.amount; // Raw amount (e.g. Wei/Atomic units)

        if (!destinationAddress || !amount) {
            return NextResponse.json({ message: 'Missing fields' });
        }

        // 2. Find User
        const user = await db.user.findUnique({
            where: { depositAddress: destinationAddress }
        });

        if (!user) {
            console.error(`Received deposit for unknown address: ${destinationAddress}`);
            return NextResponse.json({ message: 'Unknown User' }, { status: 404 });
        }

        // 3. Credit Balance
        // Convert atomic units (e.g. 6 decimals for USDC) to valid Decimal
        // Assuming USDC standard (6 decimals)
        const amountDecimal = Number(amount) / 1_000_000;

        await db.$transaction(async (tx) => {
            // Check if already processed (Idempotency)
            const existing = await tx.ledger.findFirst({
                where: { refId: activity.id, reason: 'deposit' }
            });
            if (existing) return;

            // Credit
            await tx.user.update({
                where: { id: user.id },
                data: { walletHotBalance: { increment: amountDecimal } }
            });

            // Log
            await tx.ledger.create({
                data: {
                    userId: user.id,
                    deltaAmount: amountDecimal,
                    currency: 'USDC',
                    reason: 'deposit',
                    refId: activity.id, // Turnkey Activity ID
                    metadata: activity
                }
            });
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Webhook processing failed:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
