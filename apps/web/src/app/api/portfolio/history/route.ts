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
        const [user, trades, ledgerEntries] = await Promise.all([
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
            })
        ]);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 2. Define time range (last 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const startDate = user.createdAt > thirtyDaysAgo ? user.createdAt : thirtyDaysAgo;

        // 3. Simulation Logic
        // We want to return a daily snapshot of the portfolio
        const history = [];
        const dailyPoints = 30;
        const interval = (now.getTime() - startDate.getTime()) / dailyPoints;

        // Current state for simulation
        let currentCash = 0;
        let positions: Record<string, number> = {}; // assetId -> shares
        let totalRealizedPnL = 0;

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
                        // Realized PnL calculation would require cost basis tracking
                        // For simplicity in simulation, we'll estimate realized PnL as net cash flow minus deposits
                    }
                }
                eventIdx++;
            }

            // Fetch prices for current positions at snapshotDate
            // Since we don't have perfect historical lookup for every second, 
            // we'll use the latest PriceTick before snapshotDate for each asset.
            let portfolioValue = currentCash;
            const positionValues = [];

            for (const [assetId, shares] of Object.entries(positions)) {
                if (shares <= 0) continue;

                // Find the closest price tick before or at snapshotDate
                const tick = await db.priceTick.findFirst({
                    where: {
                        assetId,
                        timestamp: { lte: snapshotDate }
                    },
                    orderBy: { timestamp: 'desc' },
                    select: { priceDisplay: true }
                });

                const price = tick ? Number(tick.priceDisplay) : 0;
                const value = shares * price;
                portfolioValue += value;
                positionValues.push({ assetId, value });
            }

            // Calculate estimated realized PnL
            // Total PnL = Portfolio Value - Total Deposited
            const totalDeposited = ledgerEntries
                .filter(l => l.createdAt <= snapshotDate && l.reason === 'deposit')
                .reduce((sum, l) => sum + Number(l.deltaAmount), 0);

            const totalProfit = portfolioValue - totalDeposited;

            history.push({
                time: Math.floor(snapshotDate.getTime() / 1000),
                value: portfolioValue,
                profit: totalProfit,
                cash: currentCash
            });
        }

        return NextResponse.json({ history });

    } catch (error) {
        console.error('Portfolio History Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
