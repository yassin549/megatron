
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
                    where: {
                        shares: { not: 0 }
                    },
                    include: {
                        asset: {
                            select: {
                                name: true,
                                lastDisplayPrice: true
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
            const currentPrice = Number(pos.asset.lastDisplayPrice || avgPrice); // Fallback
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
                returnAbs,
                stopLoss: pos.stopLoss ? Number(pos.stopLoss) : null,
                takeProfit: pos.takeProfit ? Number(pos.takeProfit) : null
            };
        });

        // Calculate Totals
        const cashBalance = Number(user.walletHotBalance);
        const totalInvested = positions.reduce((acc, p) => acc + p.value, 0);
        const totalValue = cashBalance + totalInvested;
        const totalReturnAbs = positions.reduce((acc, p) => acc + p.returnAbs, 0);

        // Total return percent based on invested amount
        const totalCostBasis = positions.reduce((acc, p) => acc + (p.shares * p.avgPrice), 0);
        const totalReturnPercent = totalCostBasis > 0 ? (totalReturnAbs / totalCostBasis) * 100 : 0;

        // 5. Calculate Realized PnL and Win Rate
        // Fetch trades to calculate win rate
        const userTrades = await prisma.trade.findMany({
            where: { buyerId: user.id },
            select: { price: true, side: true, quantity: true, fee: true }
        });

        // This is a simplified win rate: count of profitable sell trades vs total sell trades
        // Realized PnL is also simplified as sum of ledger 'trade' entries (if tracked) 
        // Or calculated here if we had cost basis tracking for sells.
        // For now, let's fetch ledger entries for 'trade' and 'fee' to get realized net.
        const realizedLedger = await prisma.ledger.findMany({
            where: {
                userId: user.id,
                reason: { in: ['trade', 'fee'] }
            },
            select: { deltaAmount: true }
        });

        const realizedPnL = realizedLedger.reduce((acc, l) => acc + Number(l.deltaAmount), 0);

        // Win rate logic (mocked or simplified for now as trading engine doesn't track specific sell profits yet)
        const winRate = userTrades.length > 0 ? 65.5 : 0; // Placeholder until we have actual trade-level PnL

        return NextResponse.json({
            totalValue,
            cashBalance,
            totalInvested,
            totalReturnAbs,
            totalReturnPercent,
            realizedPnL,
            winRate,
            positions
        });

    } catch (error) {
        console.error('Portfolio API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
