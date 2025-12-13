import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';

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
            },
        });

        // Calculate earnings and vesting info
        const enrichedPositions = lpShares.map((share) => {
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
            const nextUnlock = share.unlockSchedule.find(s => !s.unlocked);
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
                unclaimedRewards: share.unclaimedRewards.toNumber(),
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
