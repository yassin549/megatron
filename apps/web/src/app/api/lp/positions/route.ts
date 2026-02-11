import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';
import { MONETARY_CONFIG } from '@megatron/lib-common';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Fetch user LP shares with pool and asset data
        const lpShares = await db.lPShare.findMany({
            where: { userId: session.user.id },
            include: {
                pool: {
                    include: {
                        asset: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                unlockSchedule: {
                    orderBy: { unlockDate: 'asc' },
                },
                withdrawalQueue: {
                    where: { status: 'pending' },
                    orderBy: { requestedAt: 'desc' }
                }
            },
        });

        // Calculate earnings and vesting info
        const enrichedPositions = lpShares.map((share: any) => {
            const contributed = share.contributedUsdc.toNumber();
            const poolTotalUsdc = share.pool.totalUsdc.toNumber();
            const poolTotalShares = share.pool.totalLPShares.toNumber();
            const userShares = share.lpShares.toNumber();

            // Calculate current value proportional to pool USDC
            const currentValue = poolTotalShares > 0
                ? (userShares / poolTotalShares) * poolTotalUsdc
                : contributed;

            const earnings = currentValue - contributed;
            const apy = contributed > 0
                ? (earnings / contributed) * 100 * 12 // Rough annualized (assuming ~1 month)
                : 0;

            // Find next unlock date
            const schedule = share.unlockSchedule.map((s: any) => ({
                percentage: s.unlockPercentage.toNumber(),
                unlockDate: s.unlockDate
            }));
            const now = new Date();
            let maxUnlockedPct = 0;
            for (const s of schedule) {
                if (now >= s.unlockDate) {
                    maxUnlockedPct = Math.max(maxUnlockedPct, s.percentage);
                }
            }

            const vestedPrincipal = contributed * (maxUnlockedPct / 100);
            const instantLimit = vestedPrincipal * MONETARY_CONFIG.MAX_INSTANT_WITHDRAWAL_PCT;

            const nextUnlock = share.unlockSchedule.find((s: any) => !s.unlocked);
            const vestingEnd = nextUnlock?.unlockDate.toISOString().split('T')[0] ?? 'Fully vested';

            return {
                id: share.id,
                assetId: share.pool.asset.id,
                assetName: share.pool.asset.name,
                contributed,
                currentValue,
                lpTokens: userShares,
                earnings,
                apy: Math.round(apy * 10) / 10,
                vestingEnd,
                vestedPrincipal,
                instantLimit,
                unclaimedRewards: share.unclaimedRewards.toNumber(),
                pendingWithdrawals: share.withdrawalQueue.map((w: any) => ({
                    id: w.id,
                    amount: w.amountUsdc.toNumber(),
                    status: w.status,
                    requestedAt: w.requestedAt
                }))
            };
        });

        // Calculate totals
        const totalContributed = enrichedPositions.reduce((sum, p) => sum + p.contributed, 0);
        const totalValue = enrichedPositions.reduce((sum, p) => sum + p.currentValue, 0);
        const totalEarnings = enrichedPositions.reduce((sum, p) => sum + p.earnings, 0);

        return NextResponse.json({
            positions: enrichedPositions,
            summary: {
                totalContributed,
                totalValue,
                totalEarnings,
                poolCount: enrichedPositions.length,
            },
        });
    } catch (error) {
        console.error('[API/lp/positions] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch LP positions' },
            { status: 500 }
        );
    }
}
