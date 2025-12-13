
import { db } from '@megatron/database';
import { executeBuyAndPublish } from '../modules/exchange';
import { randomUUID } from 'node:crypto';

async function main() {
    console.log('Starting verification...');

    // 1. Setup Data
    const userId = randomUUID();
    const assetId = randomUUID();
    const poolId = randomUUID();
    const lpUserId = randomUUID();

    console.log(`Creating test data...`);

    // Create User
    await db.user.create({
        data: {
            id: userId,
            email: `test-${userId}@example.com`,
            passwordHash: 'hash',
            walletHotBalance: 1000,
        }
    });

    // Create Asset
    await db.asset.create({
        data: {
            id: assetId,
            name: 'Test Asset',
            type: 'test',
            oracleQueries: [],
            pricingParams: { P0: 1, k: 0.1 },
            softCap: 1000,
            hardCap: 10000,
            status: 'active',
            totalSupply: 100,
        }
    });

    // Create Pool
    await db.liquidityPool.create({
        data: {
            id: poolId,
            assetId: assetId,
            totalUsdc: 1000,
            totalLPShares: 1000,
            status: 'active'
        }
    });

    // Create LP User & Share
    await db.user.create({
        data: { id: lpUserId, email: `lp-${lpUserId}@test.com`, passwordHash: 'hash' }
    });

    await db.lPShare.create({
        data: {
            poolId,
            userId: lpUserId,
            lpShares: 100, // 10% of pool
            contributedUsdc: 100,
        }
    });

    console.log('Initial state created.');

    // 2. Execute Buy
    const amountToSpend = 100;
    console.log(`Executing buy for ${amountToSpend} USDC...`);

    try {
        const result = await executeBuyAndPublish(userId, assetId, amountToSpend);
        console.log('✅ Buy successful!', result);

        // 3. Verify
        const updatedUser = await db.user.findUnique({ where: { id: userId } });
        console.log('User New Balance (Expected 900):', updatedUser?.walletHotBalance.toString());

        const updatedAsset = await db.asset.findUnique({ where: { id: assetId } });
        console.log('Asset New Supply:', updatedAsset?.totalSupply.toString());

        const treasury = await db.platformTreasury.findUnique({ where: { id: 'treasury' } });
        console.log('Treasury Balance (Expected > 0):', treasury?.balance.toString());

        const lpShare = await db.lPShare.findFirst({ where: { userId: lpUserId } });
        console.log('LP Unclaimed Rewards:', lpShare?.unclaimedRewards.toString());

    } catch (e) {
        console.error('❌ Buy failed:', e);
    } finally {
        // Cleanup?
        await db.$disconnect();
        // Assuming redis disconnect is handled or script exits
        process.exit(0);
    }
}

main();
