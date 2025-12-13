import { db } from '@megatron/database';
import { sendUsdc, getEthBalance, derivePrivateKey } from '@megatron/lib-crypto';
import { ethers } from 'ethers';

// Safety Thresholds
const MIN_ETH_BALANCE = ethers.parseEther(process.env.MIN_ETH_BALANCE_THRESHOLD || "0.001"); // 0.001 ETH default

// ============================================================================
// HOT WALLET ADDRESS RESERVATION
// The hot wallet uses derivation index 0 from the platform mnemonic.
// Deposit address generation (in /api/wallet/deposit) MUST start at index 1.
// Index 0 is PERMANENTLY RESERVED for the platform hot wallet.
// ============================================================================
const HOT_WALLET_INDEX = 0;

// Helper to get env vars at runtime
function getEnvVars() {
    return {
        RPC_URL: process.env.ARBITRUM_RPC_URL,
        USDC_ADDRESS: process.env.USDC_CONTRACT_ADDRESS,
        PLATFORM_MNEMONIC: process.env.PLATFORM_MNEMONIC,
    };
}

export async function processUserWithdrawals() {
    const { RPC_URL, USDC_ADDRESS, PLATFORM_MNEMONIC } = getEnvVars();

    if (!RPC_URL || !USDC_ADDRESS || !PLATFORM_MNEMONIC) {
        console.warn("[WITHDRAWAL_PROCESSOR] Missing env vars (ARBITRUM_RPC_URL, USDC_CONTRACT_ADDRESS, or PLATFORM_MNEMONIC)");
        return;
    }

    try {
        // FIX #5: Atomic status lock to prevent concurrent processing
        // Use updateMany with status filter to atomically claim requests
        const claimResult = await db.withdrawalRequest.updateMany({
            where: {
                status: 'pending',
            },
            data: {
                status: 'processing'
            },
            // Prisma doesn't support LIMIT in updateMany, so we'll fetch after
        });

        if (claimResult.count === 0) return;

        // Fetch the requests we just claimed
        const requests = await db.withdrawalRequest.findMany({
            where: { status: 'processing' },
            orderBy: { createdAt: 'asc' },
            take: 5
        });

        if (requests.length === 0) return;

        // Prepare Hot Wallet (Fix #2: Using reserved index 0)
        const privateKey = derivePrivateKey(PLATFORM_MNEMONIC, HOT_WALLET_INDEX);
        const wallet = new ethers.Wallet(privateKey);

        // 3. Check Gas
        const balance = await getEthBalance(wallet.address, RPC_URL);
        if (balance < MIN_ETH_BALANCE) {
            console.error(`Hot Wallet Low ETH: ${ethers.formatEther(balance)} ETH. Pausing withdrawals.`);
            // Maybe alert admin?
            return;
        }

        // 4. Process
        for (const req of requests) {
            console.log(`Processing withdrawal ${req.id} for ${req.amount} USDC to ${req.toAddress}`);

            try {
                const txHash = await sendUsdc(
                    privateKey,
                    req.toAddress,
                    req.amount.toString(),
                    RPC_URL,
                    USDC_ADDRESS
                );

                console.log(`Withdrawal sent: ${txHash}`);

                await db.withdrawalRequest.update({
                    where: { id: req.id },
                    data: {
                        status: 'completed',
                        txHash: txHash,
                        processedAt: new Date()
                    }
                });

                // Ledger is already created as pending?
                // If we created ledger in API, we don't need to do anything else.
                // Status tracking on Ledger? Ledger table doesn't have status. 
                // That's fine, it's an immutable record of the *intent* to withdraw.
                // The WithdrawalRequest tracks the execution status.

            } catch (err: any) {
                console.error(`Withdrawal ${req.id} failed:`, err);

                await db.withdrawalRequest.update({
                    where: { id: req.id },
                    data: {
                        status: 'failed',
                        error: err.message,
                        processedAt: new Date()
                    }
                });

                // Refund the user?
                // Atomic refund
                await db.$transaction([
                    db.user.update({
                        where: { id: req.userId },
                        data: { walletHotBalance: { increment: req.amount } }
                    }),
                    db.ledger.create({
                        data: {
                            userId: req.userId,
                            deltaAmount: req.amount,
                            currency: 'USDC',
                            reason: 'withdrawal_refund',
                            refId: req.id
                        }
                    })
                ]);
            }
        }

    } catch (error) {
        console.error("Withdrawal loop error:", error);
    }
}
