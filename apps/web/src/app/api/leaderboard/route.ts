import { NextResponse } from 'next/server';
import { prisma } from '@megatron/database';

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
                                price: true, // Use lastMarketPrice from view/logic if available, but for now we assume this field exists or we mapped it. 
                                // schema says Asset has lastMarketPrice. But typical Prisma query might need to be specific.
                                // Actually Asset model in schema has `lastMarketPrice`.
                                // Wait, the schema I read had `lastMarketPrice`.
                                // Let's check schema again? Yes: lastMarketPrice Decimal?
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
            const cash = Number(user.walletHotBalance);
            const investments = user.positions.reduce((acc, pos) => {
                const price = Number(pos.asset.lastMarketPrice || 0); // specific fallback
                return acc + (Number(pos.shares) * price);
            }, 0);
            const totalValue = cash + investments;

            // B. Calculate Total Deposited
            const totalDeposited = user.ledgerEntries.reduce((acc, entry) => {
                return acc + Number(entry.deltaAmount);
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
