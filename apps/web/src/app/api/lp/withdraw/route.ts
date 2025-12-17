
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@megatron/database";
import { DEFAULT_CONFIG, MONETARY_CONFIG } from "@megatron/lib-common";
import { Prisma } from "@prisma/client";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { assetId, amount, type } = body; // type: 'instant' | 'queue'

        if (!assetId || !amount || amount <= 0 || !type) {
            return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
        }

        if (type === 'instant') {
            const result = await db.$transaction(async (tx: any) => {
                const asset = await tx.asset.findUnique({
                    where: { id: assetId },
                    include: { pool: true }
                });
                if (!asset || !asset.pool) throw new Error("Asset/Pool not found");

                const lpShare = await tx.lPShare.findUnique({
                    where: { poolId_userId: { poolId: asset.pool.id, userId: session.user.id } },
                    include: { unlockSchedule: true }
                });

                if (!lpShare) throw new Error("LP not found");

                // Calculate Vested
                const schedule = lpShare.unlockSchedule.map((s: any) => ({
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

                const totalContributed = lpShare.contributedUsdc.toNumber();
                const vestedPrincipal = totalContributed * (maxUnlockedPct / 100);
                const instantLimit = vestedPrincipal * MONETARY_CONFIG.MAX_INSTANT_WITHDRAWAL_PCT;

                if (amount > instantLimit) {
                    throw new Error(`Exceeds instant limit (${instantLimit.toFixed(2)} USDC)`);
                }

                // Burn & Send
                const currentLpShares = lpShare.lpShares.toNumber();
                const sharesToBurn = new Prisma.Decimal((amount / totalContributed) * currentLpShares);

                await tx.lPShare.update({
                    where: { id: lpShare.id },
                    data: {
                        lpShares: { decrement: sharesToBurn },
                        contributedUsdc: { decrement: amount }
                    }
                });

                await tx.liquidityPool.update({
                    where: { id: asset.pool.id },
                    data: {
                        totalUsdc: { decrement: amount },
                        totalLPShares: { decrement: sharesToBurn }
                    }
                });

                await tx.user.update({
                    where: { id: session.user.id },
                    data: { walletHotBalance: { increment: amount } }
                });

                await tx.ledger.create({
                    data: {
                        userId: session.user.id,
                        deltaAmount: amount,
                        currency: 'USDC',
                        reason: 'lp_withdraw_instant',
                        refId: lpShare.id
                    }
                });

                return { success: true, withdrawn: amount };
            });
            return NextResponse.json(result);

        } else if (type === 'queue') {
            const result = await db.$transaction(async (tx: any) => {
                const asset = await tx.asset.findUnique({ where: { id: assetId }, include: { pool: true } });
                if (!asset || !asset.pool) throw new Error("Asset not found");

                const lpShare = await tx.lPShare.findUnique({
                    where: { poolId_userId: { poolId: asset.pool.id, userId: session.user.id } },
                    include: { unlockSchedule: true }
                });
                if (!lpShare) throw new Error("LP not found");

                // Calculate Vested
                const schedule = lpShare.unlockSchedule.map((s: any) => ({
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

                const totalContributed = lpShare.contributedUsdc.toNumber();
                const vestedPrincipal = totalContributed * (maxUnlockedPct / 100);

                if (amount > vestedPrincipal) {
                    throw new Error(`Exceeds vested amount (${vestedPrincipal.toFixed(2)} USDC)`);
                }

                // Queue
                await tx.withdrawalQueue.create({
                    data: {
                        lpShareId: lpShare.id,
                        amountUsdc: amount,
                        status: 'pending'
                    }
                });

                return { success: true, queued: true };
            });
            return NextResponse.json(result);
        } else {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }

    } catch (error: any) {
        console.error("Withdrawal failed:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
