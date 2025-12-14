import { db } from '@megatron/database';
import { deriveAddress, derivePrivateKey, isValidAddress, getXpubFromMnemonic } from '@megatron/lib-crypto';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { ethers } from 'ethers';

// Mock Env
process.env.PLATFORM_MNEMONIC = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
// Generate XPUB from mnemonic
const TEST_MNEMONIC = process.env.PLATFORM_MNEMONIC;
const TEST_XPUB = getXpubFromMnemonic(TEST_MNEMONIC);
process.env.PLATFORM_XPUB = TEST_XPUB;

async function main() {
    console.log("Starting Custody Verification...");

    // 1. Crypto Lib Verification
    console.log("1. Verifying Crypto Lib...");
    const idx = 0;
    const addressFromXpub = deriveAddress(TEST_XPUB, idx);
    const privKey = derivePrivateKey(TEST_MNEMONIC, idx);
    // We need to verify privKey corresponds to address
    // import ethers
    // const { ethers } = await import('ethers');
    const wallet = new ethers.Wallet(privKey);

    if (wallet.address !== addressFromXpub) {
        throw new Error(`HD Mismatch! Algo: ${addressFromXpub} vs Wallet: ${wallet.address}`);
    }
    console.log(`✅ HD Derivation Matches: ${wallet.address}`);

    if (!isValidAddress(wallet.address)) throw new Error("Invalid address check failed");

    // 2. Deposit Address Generation (Mocking API logic)
    console.log("2. Verifying Deposit Address Generation...");
    const userId = randomUUID();
    await db.user.create({
        data: {
            id: userId,
            email: `custody-${userId}@test.com`,
            passwordHash: 'hash',
            walletHotBalance: 0
        }
    });

    // Simulate API logic
    const addressIndex = 1; // Force 1
    const generatedAddress = deriveAddress(TEST_XPUB, addressIndex);

    await db.user.update({
        where: { id: userId },
        data: { depositAddress: generatedAddress, addressIndex }
    });

    console.log(`✅ Generated Deposit Index 1: ${generatedAddress}`);

    // 3. Withdrawal Logic
    console.log("3. Verifying Withdrawal Logic...");
    // Fund user
    await db.user.update({
        where: { id: userId },
        data: { walletHotBalance: 100 }
    });

    // Request Withdraw
    const withdrawAmount = 50;
    const toAddress = "0x0000000000000000000000000000000000000001";

    const request = await db.$transaction(async (tx: any) => {
        await tx.user.update({
            where: { id: userId },
            data: { walletHotBalance: { decrement: withdrawAmount } }
        });

        return await tx.withdrawalRequest.create({
            data: {
                userId,
                amount: withdrawAmount,
                toAddress,
                status: 'pending'
            }
        });
    });

    // Check Balance
    const userAfter = await db.user.findUnique({ where: { id: userId } });
    if (userAfter?.walletHotBalance.toNumber() !== 50) {
        throw new Error("Balance did not decrement correctly");
    }
    console.log(`✅ Withdrawal Request Created & Funds Locked. New Balance: ${userAfter?.walletHotBalance}`);

    // 4. Processor Logic (Mock)
    console.log("4. Verifying Processor Logic (State Only)...");
    // We won't send real funds, but we update status
    await db.withdrawalRequest.update({
        where: { id: request.id },
        data: { status: 'completed', txHash: '0xmockhash', processedAt: new Date() }
    });

    console.log("✅ Verification Complete.");
    await db.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
