
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Need to check where authOptions is exported
import { NextResponse } from "next/server";
// In a real microservices setup, this would be a gRPC/HTTP call to Worker or Queue message.
// For this monorepo MVP, we import the logic directly if build permits, OR we replicate/share logic.
// Problem: apps/worker is a separate package. importing from it in apps/web might fail build if not in dependencies or different env.
// CORRECT APPROACH: Shared logic should be in `packages/lib-modules` or similar.
// BUT, I put lp-manager in apps/worker.
// I should move `lp-manager.ts` to `packages/lib-modules` OR `packages/lib-common` (if no DB deps).
// It has DB deps. So `packages/database` or new `packages/core`.
// Given constraints, I will DUPLICATE the logic here temporarily or fix the architecture.
// Wait, I can't easily move files and refactor imports safely without risk.
// PLAN: I will assume I can import it if I add path alias or just try relative import. 
// If it fails, I will move logic to `packages/backend-logic`.
// ACTUALLY, simpler: The API route will just write a "pending" record to DB, and Worker process picks it up?
// No, user needs instant feedback for "Contribute Phase".
// I will move `lp-manager.ts` to `packages/backend-logic` (new package)? No that's too much.
// I will TRY to import from relative path. If typescript complains, I will suppress or fix tsconfig.
// Apps in monorepo often can't import each other.
// I will REWRITE the logic in `apps/web/src/lib/lp.ts` reusing the SAME database client.
// It's effectively the same code running in a different process (Next.js server vs Worker).
// This is acceptable for MVP.
// So I'll create `apps/web/src/lib/lp-manager.ts` mirroring the worker one. 

// WAIT, duplication is bad.
// Implementation Plan said: "Shared lib: Add Vesting Schedule logic to lib-common".
// I did that.
// But the `contributeToPool` function is in `apps/worker`.
// I will create `apps/web/src/lib/lp-manager.ts` and copy the code there, adapted for Web context if needed.

// Actually, I can just write the API route to implement the logic directly using `db`.
// It's cleaner than a phantom import.

import { db, Prisma } from "@megatron/database";
import { VESTING_MILESTONES } from "@megatron/lib-common";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { assetId, amount } = body;

        if (!assetId || !amount || amount <= 0) {
            return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
        }

        // --- REUSE LOGIC FROM LP MANAGER (Web Version) ---
        // (Ideally this is in a shared package)
        const result = await db.$transaction(async (tx) => {
            // 1. Fetch Asset & Pool
            const asset = await tx.asset.findUnique({
                where: { id: assetId },
                include: { pool: true }
            });

            if (!asset) throw new Error('Asset not found');
            if (asset.status !== 'funding' && asset.status !== 'active') {
                throw new Error(`Asset not in funding or active state`);
            }

            // Auto-create pool if missing? (Should be created on asset creation)
            const pool = asset.pool;
            if (!pool) throw new Error('Liquidity Pool not initialized');

            // 2. Validate User Balance
            const user = await tx.user.findUnique({ where: { id: session.user.id } });
            if (!user) throw new Error('User not found');
            if (user.walletHotBalance.lessThan(amount)) {
                throw new Error('Insufficient funds');
            }

            // 3. Calculate Shares
            let newShares: Prisma.Decimal;
            const totalUsdc = pool.totalUsdc.toNumber();
            const totalLpShares = pool.totalLPShares.toNumber();

            if (totalUsdc === 0 || totalLpShares === 0) {
                newShares = new Prisma.Decimal(amount);
            } else {
                newShares = new Prisma.Decimal((amount / totalUsdc) * totalLpShares);
            }

            // 4. Update Balances
            await tx.user.update({
                where: { id: session.user.id },
                data: { walletHotBalance: { decrement: amount } }
            });

            await tx.liquidityPool.update({
                where: { id: pool.id },
                data: {
                    totalUsdc: { increment: amount },
                    totalLPShares: { increment: newShares }
                }
            });

            // 5. Upsert LP Share
            const existingLp = await tx.lPShare.findUnique({
                where: { poolId_userId: { poolId: pool.id, userId: session.user.id } }
            });

            let lpShareId = existingLp?.id;
            const now = new Date();

            if (existingLp) {
                await tx.lPShare.update({
                    where: { id: existingLp.id },
                    data: {
                        lpShares: { increment: newShares },
                        contributedUsdc: { increment: amount }
                    }
                });
            } else {
                const newLp = await tx.lPShare.create({
                    data: {
                        poolId: pool.id,
                        userId: session.user.id,
                        lpShares: newShares,
                        contributedUsdc: amount,
                    }
                });
                lpShareId = newLp.id;
            }

            // 6. Create Vesting Schedule
            for (const milestone of VESTING_MILESTONES) {
                const unlockDate = new Date(now.getTime() + (milestone.days * 24 * 60 * 60 * 1000));
                await tx.lPUnlockSchedule.create({
                    data: {
                        lpShareId: lpShareId!,
                        unlockDate,
                        unlockPercentage: new Prisma.Decimal(milestone.percentage),
                        unlocked: false
                    }
                });
            }

            // 7. Write Ledger
            await tx.ledger.create({
                data: {
                    userId: session.user.id,
                    deltaAmount: -amount,
                    currency: 'USDC',
                    reason: 'lp_contribution',
                    refId: pool.id,
                    metadata: { assetId, shares: newShares.toNumber() }
                }
            });

            // 8. Activation Check
            const finalPoolUsdc = totalUsdc + amount;
            const softCap = asset.softCap.toNumber();
            let activated = false;

            if (asset.status === 'funding' && finalPoolUsdc >= softCap) {
                await tx.asset.update({
                    where: { id: assetId },
                    data: { status: 'active', activatedAt: now }
                });
                await tx.liquidityPool.update({
                    where: { id: pool.id },
                    data: { status: 'active' }
                });
                activated = true;
            }

            return { success: true, newShares, activated };

        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Contribution failed:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
