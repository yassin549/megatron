// Load environment FIRST - before any other imports
import './preload';

import { Worker } from 'bullmq';
import { db } from '@megatron/database';
import { checkDeposits, confirmPendingDeposits } from './modules/blockchain-monitor';
import { processUserWithdrawals } from './jobs/withdrawal-processor';
import { processWithdrawalQueue, checkFundingDeadlines } from './jobs/lp-jobs';
import { runSweeper } from './jobs/sweeper';
import { startLlmScheduler } from './modules/llm-pipeline';
import { startPriceEngine } from './modules/price-engine';
import { processGradualExits } from './modules/exits-processor';

import { getRedisClient } from '@megatron/lib-integrations';

console.log('Starting Megatron Worker...');

async function sendHeartbeat() {
    try {
        const redis = getRedisClient();
        await redis.set('worker_heartbeat', Date.now().toString(), 'EX', 60);
    } catch (err) {
        console.error('Failed to send heartbeat:', err);
    }
}

async function startWorker() {
    console.log('Worker started successfully');

    // 0. Analytics & Pricing modules
    startLlmScheduler();
    startPriceEngine().catch(err => console.error('Price engine failed to start:', err));

    // 1. Blockchain Monitor (Every 15s)
    setInterval(() => {
        checkDeposits().catch(err => console.error('Deposit check error:', err));
    }, 15000);

    // 1b. Confirm Pending Deposits (Every 30s) - Two-phase confirmation
    setInterval(() => {
        confirmPendingDeposits().catch(err => console.error('Deposit confirmation error:', err));
    }, 30000);

    // 2. Withdrawal Processor (Every 30s)
    setInterval(() => {
        processUserWithdrawals().catch(err => console.error('Withdrawal process error:', err));
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
        runSweeper().catch(err => console.error('Sweeper error:', err));
    }, 10 * 60 * 1000);

    // 5. Gradual Exits (Every 1 minute)
    setInterval(() => {
        processGradualExits().catch(err => console.error('Gradual exit process error:', err));
    }, 60 * 1000);

    // 6. Heartbeat (Every 30s)
    setInterval(sendHeartbeat, 30000);

    // Initial run
    sendHeartbeat().catch(console.error);
    checkDeposits().catch(console.error);
    confirmPendingDeposits().catch(console.error);
    processWithdrawalQueue().catch(console.error);

    // Keep process alive
    process.on('SIGTERM', async () => {
        console.log('Shutting down worker...');
        await db.$disconnect();
        process.exit(0);
    });
}

import http from 'http';

// Create a simple server for Render health checks
const server = http.createServer((req, res) => {
    if (req.url === '/healthz' || req.url === '/') {
        res.writeHead(200);
        res.end('OK');
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

const port = process.env.PORT || 10000;
server.listen(port, async () => {
    console.log(`Health check server listening on port ${port}`);
    try {
        await startWorker();
    } catch (error) {
        console.error('Worker startup failed, but keeping process alive:', error);
        // Keep the health check server running even if worker fails
        // This prevents deployment timeout and allows debugging
    }
});
