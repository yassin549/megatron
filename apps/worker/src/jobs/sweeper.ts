
import { db } from '@megatron/database';
import {
    derivePrivateKey,
    getUsdcBalance,
    getEthBalance,
    sendEth,
    sendUsdc,
    deriveAddress
} from '@megatron/lib-crypto';
import { ethers } from 'ethers';

// Configuration
const SWEEP_THRESHOLD_USDC = 10; // Minimum USDC to sweep
const GAS_TOPUP_ETH = "0.0005"; // Amount to send for gas (~$1.50 at $3000 ETH)
const MIN_GAS_THRESHOLD = ethers.parseEther("0.0002"); // If user has > this, skip topup
const HOT_WALLET_INDEX = 0;

// Env helper
function getEnvVars() {
    return {
        RPC_URL: process.env.ARBITRUM_RPC_URL,
        USDC_ADDRESS: process.env.USDC_CONTRACT_ADDRESS,
        PLATFORM_MNEMONIC: process.env.PLATFORM_MNEMONIC,
        XPUB: process.env.PLATFORM_XPUB
    };
}

export async function runSweeper() {
    console.log("[SWEEPER] Starting sweep cycle...");
    const { RPC_URL, USDC_ADDRESS, PLATFORM_MNEMONIC } = getEnvVars();

    if (!RPC_URL || !USDC_ADDRESS || !PLATFORM_MNEMONIC) {
        console.warn("[SWEEPER] Missing env vars. Skipping.");
        return;
    }

    // 1. Get Hot Wallet Address (Destination)
    // We derive it dynamically to be safe, or use the known address
    const hotWalletPrivKey = derivePrivateKey(PLATFORM_MNEMONIC, HOT_WALLET_INDEX);
    const hotWallet = new ethers.Wallet(hotWalletPrivKey);
    const hotWalletAddress = hotWallet.address;

    console.log(`[SWEEPER] Destination: ${hotWalletAddress}`);

    // 2. Find Candidates (Users with deposit addresses)
    // Optimization: In production we should filter by 'lastDeposit > lastSweep'?
    // For now, we scan all active users with deposit addresses.
    // Iterating all might be slow if 10k users.
    // Better: We rely on 'PendingDeposit' confirmations?
    // Or just scan the DB for users who received deposits recently?
    // Let's scan ALL users with a depositAddress for now (MVP).

    // Pagination needed if many users. Taking 50 for now.
    const users = await db.user.findMany({
        where: { depositAddress: { not: null } },
        take: 50 // process batch of 50
    });

    console.log(`[SWEEPER] Scanning ${users.length} candidate wallets...`);

    for (const user of users) {
        if (!user.depositAddress || !user.addressIndex) continue;

        try {
            // Check USDC Balance
            const balanceStr = await getUsdcBalance(user.depositAddress, RPC_URL, USDC_ADDRESS);
            const balance = parseFloat(balanceStr);

            if (balance < SWEEP_THRESHOLD_USDC) {
                // Too small, skip
                continue;
            }

            console.log(`[SWEEPER] Found ${balance} USDC in ${user.depositAddress} (User: ${user.id})`);

            // Check Gas (ETH)
            const ethBalance = await getEthBalance(user.depositAddress, RPC_URL);

            // Step 1: Fuel (if needed)
            if (ethBalance < MIN_GAS_THRESHOLD) {
                console.log(`[SWEEPER] Top-up Gas for ${user.depositAddress}...`);
                const fuelTx = await sendEth(hotWalletPrivKey, user.depositAddress, GAS_TOPUP_ETH, RPC_URL);
                console.log(`[SWEEPER] Fuel Sent: ${fuelTx}. Waiting for confirmation...`);
                // Consider double-checking or relying on internal nonce mgmt?
                // 'sendEth' waits for 1 conf.
            }

            // Step 2: Sweep
            const userPrivKey = derivePrivateKey(PLATFORM_MNEMONIC, user.addressIndex);

            // Re-check ETH after top-up? sendEth waits, so it should be there.

            console.log(`[SWEEPER] Sweeping ${balance} USDC to Hot Wallet...`);
            const sweepTx = await sendUsdc(
                userPrivKey,
                hotWalletAddress,
                balanceStr, // Clean sweep? Warning: USDC usually doesn't have dust issues on transfer, but 'balanceStr' is exact.
                RPC_URL,
                USDC_ADDRESS
            );

            console.log(`[SWEEPER] Sweep Success: ${sweepTx}`);

            // Optional: Record this in Ledger?
            // "Internal Transfer" reason? 
            // The User's "Wallet Balance" in DB does NOT change. 
            // We are just moving the backing funds. 
            // So NO Ledger entry needed for User. 
            // Maybe a System Log? 

        } catch (error: any) {
            console.error(`[SWEEPER] Failed to sweep ${user.depositAddress}:`, error.message);
        }
    }
    console.log("[SWEEPER] Cycle complete.");
}
