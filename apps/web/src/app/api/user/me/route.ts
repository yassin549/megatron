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
                },
                lpShares: {
                    include: {
                        pool: {
                            select: {
                                totalLPShares: true,
                                totalUsdc: true
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

        // Calculate Trading Positions Value
        let positionsValue = 0;
        for (const pos of user.positions) {
            const price = pos.asset.lastMarketPrice?.toNumber() || 0;
            positionsValue += pos.shares.toNumber() * price;
        }

        // Calculate LP Positions Value
        let lpPositionsValue = 0;
        for (const share of user.lpShares) {
            const totalShares = share.pool.totalLPShares.toNumber();
            const totalUsdc = share.pool.totalUsdc.toNumber();
            const userShares = share.lpShares.toNumber();

            if (totalShares > 0) {
                lpPositionsValue += (userShares / totalShares) * totalUsdc;
            } else {
                lpPositionsValue += share.contributedUsdc.toNumber();
            }
        }

        const hotBalance = user.walletHotBalance.toNumber();
        const totalPortfolioValue = hotBalance + positionsValue + lpPositionsValue;

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
