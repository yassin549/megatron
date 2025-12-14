
import { db } from '@megatron/database';
import { contributeToPool, claimFees, withdrawLiquidityInstant } from '../modules/lp-manager';
import { executeBuyAndPublish } from '../modules/exchange';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@megatron/database';

async function main() {
    try {
        console.log('Starting LP Lifecycle Verification...');

        // 1. Setup Data
        const userA = randomUUID();
        const userB = randomUUID();
        const assetId = randomUUID();
        const poolId = randomUUID();

        console.log(`Creating test data...`);

        // Create Users
        await db.user.createMany({
            data: [
                { id: userA, email: `lp-a-${userA}@test.com`, passwordHash: 'hash', walletHotBalance: 5000 },
                { id: userB, email: `lp-b-${userB}@test.com`, passwordHash: 'hash', walletHotBalance: 5000 }
            ]
        });

        // Create Asset in Funding State
        const softCap = 2000;
        await db.asset.create({
            data: {
                id: assetId,
                name: 'LP Test Asset',
                type: 'test',
                oracleQueries: [],
                pricingParams: { P0: 1, k: 0.1 },
                softCap: softCap,
                hardCap: 10000,
                status: 'funding',
                totalSupply: 0,
                fundingDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            }
        });

        // Create Pool
        await db.liquidityPool.create({
            data: {
                id: poolId,
                assetId: assetId,
                totalUsdc: 0,
                totalLPShares: 0,
                status: 'funding'
            }
        });

        console.log('Initial state created (Status: funding).');

        // 2. User A Contributes 1000 (Half Soft Cap)
        console.log('User A contributing 1000 USDC...');
        const resA = await contributeToPool(userA, assetId, 1000);
        console.log('Result A:', resA);

        const assetPhase1 = await db.asset.findUnique({ where: { id: assetId } });
        console.log(`Asset Status (Example: funding): ${assetPhase1?.status}`);

        // 3. User B Contributes 1000 (Hits Soft Cap -> Activate)
        console.log('User B contributing 1000 USDC...');
        const resB = await contributeToPool(userB, assetId, 1000);
        console.log('Result B:', resB);

        const assetPhase2 = await db.asset.findUnique({ where: { id: assetId } });
        console.log(`Asset Status (Expected: active): ${assetPhase2?.status}`);

        if (assetPhase2?.status !== 'active') {
            console.error('❌ Failed to activate asset on soft cap!');
            process.exit(1);
        }

        // 4. Generate Fees (User A Buys)
        // Wait, User A needs more money if balance low? 
        // User A had 5000, spent 1000. Balance 4000.
        console.log('Executing Buy to generate fees...');
        await executeBuyAndPublish(userA, assetId, 100);
        // Fee = 0.5% of 100 = 0.5 USDC.
        // LP Portion = 90% = 0.45 USDC.
        // Total LP Shares = 2000 (1000 + 1000).
        // User A has 1000 shares (50%). Reward = 0.225.

        const lpShareA = await db.lPShare.findFirst({ where: { userId: userA, poolId } });
        console.log('User A Unclaimed Rewards (Expected ~0.225):', lpShareA?.unclaimedRewards.toString());

        // 5. Claim Fees
        console.log('User A Claiming Fees...');
        const claimed = await claimFees(userA, assetId);
        console.log('Claimed:', claimed.toString());

        const userA_final = await db.user.findUnique({ where: { id: userA } });
        // Initial 5000 - 1000 (LP) - 100 (Buy) + 0.225 (Claim) = 3900.225.
        console.log('User A Final Balance:', userA_final?.walletHotBalance.toString());

        // 6. Test Withdrawal Constraints
        console.log('Testing Instant Withdrawal...');
        try {
            // Try to withdraw 500 (50% of 1000 principal). Should FAIL (Max 25% of vested).
            // Vested now = 0 (Time 0).
            // Wait, our mock time is "now". Vested is 0.
            await withdrawLiquidityInstant(userA, assetId, 10);
            console.error('❌ Should have failed (Vested is 0)!');
        } catch (e: any) {
            console.log('✅ Correctly failed instant withdraw (0 vested):', e.message);
        }

        console.log('Verification Complete.');

    } catch (error: any) {
        console.error("VERIFICATION FAILED:", error);
    } finally {
        await db.$disconnect();
        process.exit(0);
    }
}

main();
