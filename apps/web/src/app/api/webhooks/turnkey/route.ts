import { NextResponse } from 'next/server';
import { db } from '@megatron/database';
import { TURNKEY_CONFIG } from '@/lib/turnkey';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // 1. Signature Verification (Simplified for MVP - ideally check X-Turnkey-Signature)
        // In production, use crypto.verify with Turnkey's public key

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
