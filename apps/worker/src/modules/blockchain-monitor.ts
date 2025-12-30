import { db } from '@megatron/database';
import { USDC_ABI } from '@megatron/lib-crypto';
import { ethers } from 'ethers';
import { Prisma } from '@megatron/database';

// Configuration
const REQUIRED_CONFIRMATIONS = process.env.REQUIRED_CONFIRMATIONS ? parseInt(process.env.REQUIRED_CONFIRMATIONS) : 12;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// Helper to get env vars at runtime (after dotenv has loaded)
function getEnvVars() {
    return {
        RPC_URL: process.env.ARBITRUM_RPC_URL,
        USDC_ADDRESS: process.env.USDC_CONTRACT_ADDRESS,
    };
}

// Helper: Retry wrapper for RPC calls (Fix #3)
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
    let lastError: Error | null = null;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;
            console.warn(`Retry ${i + 1}/${retries} failed:`, err.message);
            if (i < retries - 1) {
                await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (i + 1)));
            }
        }
    }
    throw lastError;
}

export async function checkDeposits() {
    const { RPC_URL, USDC_ADDRESS } = getEnvVars();

    if (!RPC_URL || !USDC_ADDRESS) {
        console.warn("[DEPOSIT_MONITOR] Missing ARBITRUM_RPC_URL or USDC_CONTRACT_ADDRESS");
        return;
    }

    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const latestBlock = await withRetry(() => provider.getBlockNumber());

        // 1. Get Last Processed Block
        let config = await db.platformConfig.findUnique({
            where: { key: 'last_processed_block' }
        });

        let fromBlock = config ? parseInt(config.value) + 1 : latestBlock - 5; // Start 5 blocks back if no config

        if (fromBlock > latestBlock) return;

        // Alchemy Free tier allows max 10 blocks per eth_getLogs request
        const toBlock = Math.min(fromBlock + 9, latestBlock);

        console.log(`[DEPOSIT_MONITOR] Scanning blocks ${fromBlock} to ${toBlock}...`);

        const contract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
        const filter = contract.filters.Transfer();

        // Retry for event fetching
        const events = await withRetry(() => contract.queryFilter(filter, fromBlock, toBlock));

        // Map events to potential deposits
        const deposits: { to: string; value: bigint; txHash: string; blockNumber: number }[] = [];
        for (const event of events) {
            if (event instanceof ethers.EventLog) {
                const { to, value } = event.args;
                deposits.push({
                    to: to.toLowerCase(), // Fix #4: Normalize to lowercase
                    value,
                    txHash: event.transactionHash,
                    blockNumber: event.blockNumber
                });
            }
        }

        if (deposits.length > 0) {
            // Fix #4: Normalize addresses to lowercase for DB query
            const addresses = deposits.map(d => d.to);
            const users = await db.user.findMany({
                where: {
                    depositAddress: {
                        in: addresses
                    }
                },
                select: { id: true, depositAddress: true }
            });

            const userMap = new Map(users.map((u: { depositAddress: string | null; id: string }) => [u.depositAddress?.toLowerCase(), u.id]));

            for (const deposit of deposits) {
                const userId = userMap.get(deposit.to);
                if (userId && typeof userId === 'string') {
                    // Create pending deposit (Fix #1: Two-phase confirmation)
                    await createPendingDeposit(userId, deposit.value, deposit.txHash, deposit.blockNumber);
                }
            }
        }

        // Update Config
        await db.platformConfig.upsert({
            where: { key: 'last_processed_block' },
            create: { key: 'last_processed_block', value: toBlock.toString() },
            update: { value: toBlock.toString() }
        });

    } catch (error) {
        console.error("[DEPOSIT_MONITOR] Deposit check failed:", error);
    }
}

// Fix #1: Track pending deposits instead of immediate credit
async function createPendingDeposit(userId: string, amountBigInt: bigint, txHash: string, blockNumber: number) {
    const amount = ethers.formatUnits(amountBigInt, 6);
    const amountDec = new Prisma.Decimal(amount);

    // Check if already tracked
    const existing = await db.pendingDeposit.findUnique({
        where: { txHash }
    });

    if (existing) {
        console.log(`[DEPOSIT_MONITOR] Skipping already tracked deposit ${txHash}`);
        return;
    }

    console.log(`[DEPOSIT_MONITOR] Tracking pending deposit ${amount} USDC for user ${userId} (tx: ${txHash})`);

    await db.pendingDeposit.create({
        data: {
            userId,
            txHash,
            amount: amountDec,
            blockNumber,
            confirmations: 0,
            status: 'pending'
        }
    });
}

// Fix #1: Confirm deposits that have enough confirmations
export async function confirmPendingDeposits() {
    const { RPC_URL } = getEnvVars();

    if (!RPC_URL) {
        return; // Silent return - will be logged by checkDeposits already
    }

    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const latestBlock = await withRetry(() => provider.getBlockNumber());

        // Fetch pending deposits
        const pending = await db.pendingDeposit.findMany({
            where: { status: 'pending' },
            take: 50
        });

        if (pending.length === 0) return;

        console.log(`[DEPOSIT_MONITOR] Checking ${pending.length} pending deposits for confirmation...`);

        for (const deposit of pending) {
            const confirmations = latestBlock - deposit.blockNumber;

            if (confirmations >= REQUIRED_CONFIRMATIONS) {
                // Confirmed! Credit the user
                console.log(`[DEPOSIT_MONITOR] Confirming deposit ${deposit.txHash} (${confirmations} confirmations)`);

                await db.$transaction([
                    db.user.update({
                        where: { id: deposit.userId },
                        data: { walletHotBalance: { increment: deposit.amount } }
                    }),
                    db.ledger.create({
                        data: {
                            userId: deposit.userId,
                            deltaAmount: deposit.amount,
                            currency: 'USDC',
                            reason: 'deposit',
                            refId: deposit.txHash,
                            metadata: { confirmations }
                        }
                    }),
                    db.pendingDeposit.update({
                        where: { id: deposit.id },
                        data: {
                            status: 'confirmed',
                            confirmations,
                            confirmedAt: new Date()
                        }
                    })
                ]);
            } else {
                // Update confirmation count
                await db.pendingDeposit.update({
                    where: { id: deposit.id },
                    data: { confirmations }
                });
            }
        }

    } catch (error) {
        console.error("[DEPOSIT_MONITOR] Confirmation check failed:", error);
    }
}
