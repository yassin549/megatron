
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db as prisma } from '@megatron/database';
import { authOptions } from '@/lib/auth'; // Ensure this path is correct

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                positions: {
                    include: {
                        asset: {
                            select: {
                                name: true,
                                lastMarketPrice: true
                            }
                        }
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const positions = user.positions.map(pos => {
            const shares = Number(pos.shares);
            const avgPrice = Number(pos.avgPrice);
            const currentPrice = Number(pos.asset.lastMarketPrice || avgPrice); // Fallback
            const value = shares * currentPrice;
            const costBasis = shares * avgPrice;
            const returnAbs = value - costBasis;
            const returnPercent = costBasis > 0 ? (returnAbs / costBasis) * 100 : 0;

            return {
                assetId: pos.assetId,
                assetName: pos.asset.name,
                shares,
                avgPrice,
                currentPrice,
                value,
                returnPercent,
                returnAbs
            };
        });

        // Calculate Totals
        const cashBalance = Number(user.walletHotBalance);
        const totalInvested = positions.reduce((acc, p) => acc + p.value, 0);
        const totalValue = cashBalance + totalInvested;
        const totalReturnAbs = positions.reduce((acc, p) => acc + p.returnAbs, 0);

        // Total return percent based on invested amount (not total portfolio including cash, usually)
        // Or we can simple sum returnAbs.
        // Let's do a weighted average or sum of returns relative to total cost basis.
        const totalCostBasis = positions.reduce((acc, p) => acc + (p.shares * p.avgPrice), 0);
        const totalReturnPercent = totalCostBasis > 0 ? (totalReturnAbs / totalCostBasis) * 100 : 0;

        return NextResponse.json({
            totalValue,
            cashBalance,
            totalInvested,
            totalReturnAbs,
            totalReturnPercent,
            positions
        });

    } catch (error) {
        console.error('Portfolio API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
