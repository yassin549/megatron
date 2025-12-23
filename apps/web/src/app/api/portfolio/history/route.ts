import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@megatron/database';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // 1. Fetch all necessary data for simulation
        const [user, trades, ledgerEntries, lpShares] = await Promise.all([
            db.user.findUnique({
                where: { id: userId },
                select: { createdAt: true, walletHotBalance: true }
            }),
            db.trade.findMany({
                where: { buyerId: userId },
                orderBy: { timestamp: 'asc' },
                include: { asset: { select: { id: true, name: true } } }
            }),
            db.ledger.findMany({
                where: { userId },
                orderBy: { createdAt: 'asc' }
            }),
            db.lPShare.findMany({
                where: { userId },
                include: {
                    pool: { select: { totalLPShares: true, totalUsdc: true } }
                }
            })
        ]);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 2. Define time range (last 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const startDate = user.createdAt > thirtyDaysAgo ? user.createdAt : thirtyDaysAgo;

        // 3. Calculate current LP value
        let currentLpValue = 0;
        for (const share of lpShares) {
            if (share.pool && Number(share.pool.totalLPShares) > 0) {
                const shareOfPool = Number(share.lpShares) / Number(share.pool.totalLPShares);
                currentLpValue += shareOfPool * Number(share.pool.totalUsdc);
            }
        }

        // 4. Simulation Logic - always generate 30 data points
        const history = [];
        const dailyPoints = 30;
        const interval = (now.getTime() - startDate.getTime()) / dailyPoints;

        // Current state for simulation
        let currentCash = 0;
        let positions: Record<string, number> = {}; // assetId -> shares

        // Sort all events by time
        const events = [
            ...ledgerEntries.map(l => ({ type: 'ledger', date: l.createdAt, data: l })),
            ...trades.map(t => ({ type: 'trade', date: t.timestamp, data: t }))
        ].sort((a, b) => a.date.getTime() - b.date.getTime());

        let eventIdx = 0;

        for (let i = 0; i <= dailyPoints; i++) {
            const snapshotDate = new Date(startDate.getTime() + i * interval);

            // Process all events up to this snapshot date
            while (eventIdx < events.length && events[eventIdx].date <= snapshotDate) {
                const event = events[eventIdx];
                if (event.type === 'ledger') {
                    const l = event.data as any;
                    currentCash += Number(l.deltaAmount);
                } else if (event.type === 'trade') {
                    const t = event.data as any;
                    const side = t.side;
                    const quantity = Number(t.quantity);
                    const price = Number(t.price);
                    const fee = Number(t.fee);

                    if (side === 'buy') {
                        const totalCost = (quantity * price) + fee;
                        currentCash -= totalCost;
                        positions[t.assetId] = (positions[t.assetId] || 0) + quantity;
                    } else {
                        const totalProceeds = (quantity * price) - fee;
                        currentCash += totalProceeds;
                        positions[t.assetId] = (positions[t.assetId] || 0) - quantity;
                    }
                }
                eventIdx++;
            }

            // Calculate portfolio value at this point
            let portfolioValue = Math.max(0, currentCash);

            // Add position values (fetch latest price)
            for (const [assetId, shares] of Object.entries(positions)) {
                if (shares <= 0) continue;

                const tick = await db.priceTick.findFirst({
                    where: {
                        assetId,
                        timestamp: { lte: snapshotDate }
                    },
                    orderBy: { timestamp: 'desc' },
                    select: { priceDisplay: true }
                });

                const price = tick ? Number(tick.priceDisplay) : 0;
                portfolioValue += shares * price;
            }

            // Add LP value (simplified: use current LP value for all points)
            // In a more sophisticated implementation, we'd track LP contributions over time
            const lpValueAtSnapshot = (i / dailyPoints) * currentLpValue;
            portfolioValue += lpValueAtSnapshot;

            // Calculate profit
            const totalDeposited = ledgerEntries
                .filter(l => l.createdAt <= snapshotDate && l.reason === 'deposit')
                .reduce((sum, l) => sum + Number(l.deltaAmount), 0);

            const totalProfit = portfolioValue - totalDeposited;

            history.push({
                time: Math.floor(snapshotDate.getTime() / 1000),
                value: portfolioValue,
                profit: totalProfit,
                cash: Math.max(0, currentCash)
            });
        }

        // Always return at least the history array, even if all values are 0
        return NextResponse.json({ history });

    } catch (error) {
        console.error('Portfolio History Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

