// Load environment FIRST - before any other imports
import './preload';

import http from 'http';
const port = process.env.PORT || 3001;

// Create health check server IMMEDIATELY to avoid Render timeouts
const server = http.createServer((req, res) => {
    if (req.url === '/healthz' || req.url === '/') {
        res.writeHead(200);
        res.end('OK');
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(Number(port), '0.0.0.0', () => {
    console.log(`[BOOT] Health check server listening on 0.0.0.0:${port}`);
});

import { db } from '@megatron/database';
import { checkDeposits, confirmPendingDeposits } from './modules/blockchain-monitor';
import { processUserWithdrawals } from './jobs/withdrawal-processor';
import { processWithdrawalQueue, checkFundingDeadlines } from './jobs/lp-jobs';
import { runSweeper } from './jobs/sweeper';
import { startLlmScheduler } from './modules/llm-pipeline';
import { startPriceEngine } from './modules/price-engine';
import { getRedisClient } from '@megatron/lib-integrations';

console.log('[BOOT] Starting Megatron Worker modules...');

async function sendHeartbeat() {
    try {
        const redis = getRedisClient();
        await redis.set('worker_heartbeat', Date.now().toString(), 'EX', 60);
    } catch (err) {
        console.error('[HEARTBEAT] Failed:', err);
    }
}

async function startWorker() {
    console.log('[BOOT] Initializing background jobs...');

    // 0. Analytics & Pricing modules
    startLlmScheduler();
    startPriceEngine().catch(err => console.error('[BOOT] Price engine failure:', err));

    // 1. Blockchain Monitor (Every 15s)
    setInterval(() => {
        checkDeposits().catch(err => console.error('[MONITOR] Deposit check error:', err));
    }, 15000);

    // 1b. Confirm Pending Deposits (Every 30s)
    setInterval(() => {
        confirmPendingDeposits().catch(err => console.error('[MONITOR] Confirmation error:', err));
    }, 30000);

    // 2. Withdrawal Processor (Every 30s)
    setInterval(() => {
        processUserWithdrawals().catch(err => console.error('[JOBS] Withdrawal error:', err));
    }, 30000);

    // 3. LP Jobs - Withdrawal Queue (Daily)
    setInterval(() => {
        processWithdrawalQueue().catch(console.error);
    }, 24 * 60 * 60 * 1000);

    // Funding Deadlines (Hourly)
    setInterval(() => {
        checkFundingDeadlines().catch(console.error);
    }, 60 * 60 * 1000);

    // 4. Sweeper (Every 10 minutes)
    setInterval(() => {
        runSweeper().catch(err => console.error('[JOBS] Sweeper error:', err));
    }, 10 * 60 * 1000);

    // 5. Heartbeat (Every 30s)
    setInterval(sendHeartbeat, 30000);

    // Initial runs
    await sendHeartbeat().catch(console.error);
    checkDeposits().catch(console.error);
    confirmPendingDeposits().catch(console.error);
    processWithdrawalQueue().catch(console.error);

    console.log('[BOOT] All modules initialized and running');
}

// Keep process alive
process.on('SIGTERM', async () => {
    console.log('Shutting down worker...');
    await db.$disconnect();
    process.exit(0);
});

// Start the worker logic after the server is listening
startWorker().catch(err => {
    console.error('[FATAL] Worker failed to start:', err);
    process.exit(1);
});
