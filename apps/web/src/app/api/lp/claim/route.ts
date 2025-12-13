
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@megatron/database";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { assetId } = body;

        if (!assetId) {
            return NextResponse.json({ error: "Asset ID required" }, { status: 400 });
        }

        const result = await db.$transaction(async (tx) => {
            const asset = await tx.asset.findUnique({
                where: { id: assetId },
                include: { pool: true }
            });

            if (!asset || !asset.pool) throw new Error("Asset or pool not found");

            const lpShare = await tx.lPShare.findUnique({
                where: { poolId_userId: { poolId: asset.pool.id, userId: session.user.id } }
            });

            if (!lpShare) throw new Error("No LP position found");

            const rewards = lpShare.unclaimedRewards;
            if (rewards.lessThanOrEqualTo(0)) throw new Error("No rewards to claim");

            // Credit User
            await tx.user.update({
                where: { id: session.user.id },
                data: { walletHotBalance: { increment: rewards } }
            });

            // Reset LP Rewards
            await tx.lPShare.update({
                where: { id: lpShare.id },
                data: { unclaimedRewards: 0 }
            });

            // Ledger
            await tx.ledger.create({
                data: {
                    userId: session.user.id,
                    deltaAmount: rewards.toNumber(), // Ensure number
                    currency: 'USDC',
                    reason: 'lp_fee_claim',
                    refId: lpShare.id,
                    metadata: { assetId }
                }
            });

            return { success: true, claimed: rewards };
        });

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Claim failed:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
