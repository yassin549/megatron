
import { db } from '@megatron/database';
import { executeSellAndPublish } from './exchange';
import { Prisma } from '@megatron/database';

export async function processGradualExits() {
    // Find active timed exits that are due for execution
    const now = new Date();
    const exits = await db.timedExit.findMany({
        where: {
            status: 'active',
            nextExecutionAt: { lte: now }
        },
        include: {
            asset: true
        }
    });

    if (exits.length === 0) return;

    console.log(`Processing ${exits.length} gradual exits...`);

    for (const exit of exits) {
        try {
            await db.$transaction(async (tx: Prisma.TransactionClient) => {
                // Double check status inside transaction
                const currentExit = await tx.timedExit.findUnique({
                    where: { id: exit.id }
                });

                // Check if asset is active - if not (e.g. 'funding', 'paused'), skip this cycle but don't error
                if (exit.asset.status !== 'active') {
                    console.log(`Skipping exit ${exit.id} - asset ${exit.asset.name} is ${exit.asset.status}`);
                    return;
                }

                if (!currentExit || currentExit.status !== 'active') return;

                const remainingChunks = currentExit.chunksTotal - currentExit.chunksCompleted;
                const remainingShares = currentExit.totalShares.toNumber() - currentExit.sharesExited.toNumber();

                if (remainingChunks <= 0 || remainingShares <= 0) {
                    await tx.timedExit.update({
                        where: { id: exit.id },
                        data: { status: 'completed' }
                    });
                    return;
                }

                // Calculate chunk size
                // If it's the last chunk, take everything remaining
                const chunkSize = remainingChunks === 1
                    ? remainingShares
                    : remainingShares / remainingChunks;

                console.log(`Executing chunk for exit ${exit.id}: ${chunkSize} shares of ${exit.assetId}`);

                // Execute Sell
                // Note: We use executeSellAndPublish but we must be careful about transactions.
                // Actually, executeSell has its own transaction. 
                // To keep it simple and robust, we'll execute the trade OUTSIDE this transaction 
                // but update the TimedExit record based on the trade result.
            });

            // If we skipped because of asset status, we continue to next exit
            if (exit.asset.status !== 'active') continue;

            // Re-fetch to ensure we have latest state
            const currentExit = await db.timedExit.findUnique({ where: { id: exit.id } });
            if (!currentExit || currentExit.status !== 'active') continue;

            const remainingChunks = currentExit.chunksTotal - currentExit.chunksCompleted;
            const remainingShares = currentExit.totalShares.toNumber() - currentExit.sharesExited.toNumber();
            const chunkSize = remainingChunks === 1 ? remainingShares : remainingShares / remainingChunks;

            // Execute the sell
            const trade = await executeSellAndPublish(currentExit.userId, currentExit.assetId, chunkSize);

            // Update record
            const isLastChunk = remainingChunks === 1;
            await db.timedExit.update({
                where: { id: exit.id },
                data: {
                    chunksCompleted: { increment: 1 },
                    sharesExited: { increment: chunkSize },
                    nextExecutionAt: new Date(Date.now() + currentExit.intervalMs),
                    status: isLastChunk ? 'completed' : 'active'
                }
            });

        } catch (error: any) {
            console.error(`Failed to process gradual exit chunk for ${exit.id}:`, error);
            await db.timedExit.update({
                where: { id: exit.id },
                data: {
                    lastError: error.message,
                    // If it fails, we might want to retry later or mark as failed
                    // For now, we'll just push the next execution back a bit
                    nextExecutionAt: new Date(Date.now() + 60000) // Retry in 1 min
                }
            });
        }
    }
}
