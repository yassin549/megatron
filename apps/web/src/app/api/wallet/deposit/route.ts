import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';
import { deriveAddress } from '@megatron/lib-crypto';

export async function GET(req: Request) {
    console.log('[DEPOSIT API] Request received');
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        console.log('[DEPOSIT API] Unauthorized - no session');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const xpub = process.env.PLATFORM_XPUB;
    console.log('[DEPOSIT API] User ID:', userId);
    console.log('[DEPOSIT API] XPUB:', xpub ? 'SET' : 'NOT SET');

    if (!xpub) {
        console.error("[DEPOSIT API] Missing PLATFORM_XPUB env var");
        return NextResponse.json({ error: 'System configuration error' }, { status: 500 });
    }

    // 1. Check existing address
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { depositAddress: true, addressIndex: true }
    });

    if (user?.depositAddress) {
        return NextResponse.json({ address: user.depositAddress });
    }

    // 2. Assign new address
    try {
        const address = await db.$transaction(async (tx) => {
            // Get next index
            // We use PlatformConfig to track the counter. Key: 'next_address_index'
            let config = await tx.platformConfig.findUnique({
                where: { key: 'next_address_index' }
            });

            let index: number;
            if (!config) {
                // Initialize if missing
                index = 1;
                await tx.platformConfig.create({
                    data: { key: 'next_address_index', value: '2' } // Start next at 1
                });
            } else {
                index = parseInt(config.value);
                await tx.platformConfig.update({
                    where: { key: 'next_address_index' },
                    data: { value: (index + 1).toString() }
                });
            }

            // Derive
            const newAddress = deriveAddress(xpub, index);

            // Save to User
            await tx.user.update({
                where: { id: userId },
                data: {
                    depositAddress: newAddress,
                    addressIndex: index
                }
            });

            return newAddress;
        });

        return NextResponse.json({ address });
    } catch (error) {
        console.error("Failed to generate address:", error);
        return NextResponse.json({ error: 'Failed to generate address' }, { status: 500 });
    }
}
