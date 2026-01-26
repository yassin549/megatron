import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';
import { createSubOrganization, createWallet } from '@/lib/turnkey';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { id: session.user.id }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.turnkeyWalletId && user.depositAddress) {
            return NextResponse.json({
                success: true,
                message: 'Wallet already exists',
                walletId: user.turnkeyWalletId,
                address: user.depositAddress
            });
        }

        // 1. Create Sub-Org
        const subOrgId = await createSubOrganization(user.id);
        if (!subOrgId) throw new Error('Failed to create Turnkey Sub-Organization');

        // 2. Create Wallet
        const walletResult = await createWallet(subOrgId);
        if (!walletResult?.walletId || !walletResult?.address) throw new Error('Failed to create Turnkey Wallet');

        // 3. Update User
        await db.user.update({
            where: { id: user.id },
            data: {
                turnkeySubOrgId: subOrgId,
                turnkeyWalletId: walletResult.walletId,
                depositAddress: walletResult.address
            }
        });

        return NextResponse.json({
            success: true,
            walletId: walletResult.walletId,
            address: walletResult.address
        });

    } catch (error: any) {
        console.error('Wallet creation failed:', error);
        return NextResponse.json({ error: error.message || 'Failed to create wallet' }, { status: 500 });
    }
}
