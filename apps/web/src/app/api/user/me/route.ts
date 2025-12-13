import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';

export async function GET() {
    try {
        console.log('[API/user/me] Getting session...');
        const session = await getServerSession(authOptions);
        console.log('[API/user/me] Session:', session ? `User ID: ${session?.user?.id}` : 'NO SESSION');

        if (!session?.user?.id) {
            console.log('[API/user/me] Unauthorized - no session or user ID');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.log('[API/user/me] Fetching user:', session.user.id);

        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                email: true,
                walletHotBalance: true,
                walletColdBalance: true,
                depositAddress: true,
                isAdmin: true,
                isBlacklisted: true,
                createdAt: true,
                positions: {
                    where: { shares: { gt: 0 } },
                    include: {
                        asset: {
                            select: {
                                lastMarketPrice: true
                            }
                        }
                    }
                }
            },
        });

        console.log('[API/user/me] User found:', user ? 'YES' : 'NO');

        if (!user) {
            console.log('[API/user/me] Returning 404 - User not found');
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        if (user.isBlacklisted) {
            console.log('[API/user/me] Returning 403 - User blacklisted');
            return NextResponse.json(
                { error: 'Account has been suspended' },
                { status: 403 }
            );
        }

        // Calculate Portfolio Value: Hot Balance + (Shares * Current Price)
        let positionsValue = 0;
        for (const pos of user.positions) {
            const price = pos.asset.lastMarketPrice?.toNumber() || 0;
            positionsValue += pos.shares.toNumber() * price;
        }

        const hotBalance = user.walletHotBalance.toNumber();
        const lpBalance = user.walletColdBalance.toNumber();
        const totalPortfolioValue = hotBalance + lpBalance + positionsValue;

        const response = {
            id: user.id,
            email: user.email,
            walletHotBalance: user.walletHotBalance.toString(),
            walletColdBalance: user.walletColdBalance.toString(),
            portfolioValue: totalPortfolioValue.toFixed(2), // New field for Navbar
            depositAddress: user.depositAddress,
            isAdmin: user.isAdmin,
            createdAt: user.createdAt.toISOString(),
            positionsCount: user.positions.length
        };

        console.log('[API/user/me] Returning 200 - Success');
        return NextResponse.json(response);
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json(
            { error: 'An error occurred' },
            { status: 500 }
        );
    }
}
