import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';
import { isValidAddress } from '@megatron/lib-crypto';
import { Prisma } from '@prisma/client';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { amount, toAddress } = await req.json();

    // 1. Validation
    if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    if (!toAddress || !isValidAddress(toAddress)) {
        return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    try {
        const result = await db.$transaction(async (tx) => {
            // 2. Check Balance
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user) throw new Error("User not found");

            const amountDec = new Prisma.Decimal(amount);
            if (user.walletHotBalance.lessThan(amountDec)) {
                throw new Error("Insufficient funds");
            }

            // 3. Update Balance
            await tx.user.update({
                where: { id: userId },
                data: { walletHotBalance: { decrement: amountDec } }
            });

            // 4. Create Request
            const request = await tx.withdrawalRequest.create({
                data: {
                    userId,
                    amount: amountDec,
                    toAddress,
                    status: 'pending'
                }
            });

            // 5. Create Ledger
            await tx.ledger.create({
                data: {
                    userId,
                    deltaAmount: amountDec.negated(),
                    currency: 'USDC',
                    reason: 'withdrawal',
                    refId: request.id
                }
            });

            return request;
        });

        return NextResponse.json({ success: true, requestId: result.id });

    } catch (error: any) {
        if (error.message === "Insufficient funds") {
            return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
        }
        console.error("Withdrawal failed:", error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
