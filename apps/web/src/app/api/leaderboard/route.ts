import { NextResponse } from 'next/server';
import { db as prisma } from '@megatron/database';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Fetch all users with their positions and deposit history
        const users = await prisma.user.findMany({
            where: {
                isBlacklisted: false,
                isAdmin: false // Exclude admins from leaderboard
            },
            select: {
                id: true,
                email: true,
                walletHotBalance: true,
                positions: {
                    select: {
                        shares: true,
                        asset: {
                            select: {
                                lastMarketPrice: true
                            }
                        }
                    }
                },
                ledgerEntries: {
                    where: {
                        reason: 'deposit'
                    },
                    select: {
                        deltaAmount: true
                    }
                }
            }
        });

        // 2. Calculate Return % for each user
        const leaderboard = users.map(user => {
            // A. Calculate Portfolio Value
            const cash = user.walletHotBalance.toNumber();
            const investments = user.positions.reduce((acc, pos) => {
                const price = pos.asset.lastMarketPrice?.toNumber() ?? 0;
                return acc + (pos.shares.toNumber() * price);
            }, 0);
            const totalValue = cash + investments;

            // B. Calculate Total Deposited
            const totalDeposited = user.ledgerEntries.reduce((acc, entry) => {
                return acc + entry.deltaAmount.toNumber();
            }, 0);

            // C. Calculate Return %
            // If no deposits, but has value (airdrop?), return 0 or calculate differently. 
            // If totalDeposited is 0, return 0 to avoid division by zero.
            let returnPercent = 0;
            if (totalDeposited > 0) {
                returnPercent = ((totalValue - totalDeposited) / totalDeposited) * 100;
            }

            return {
                id: user.id,
                email: user.email, // We will mask this in the UI
                totalValue,
                totalDeposited,
                returnPercent
            };
        });

        // 3. Sort by Return % DESC
        leaderboard.sort((a, b) => b.returnPercent - a.returnPercent);

        return NextResponse.json({
            leaderboard: leaderboard.slice(0, 50) // Top 50
        });

    } catch (error) {
        console.error('Leaderboard error:', error);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}
