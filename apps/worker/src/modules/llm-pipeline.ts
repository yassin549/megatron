import { db } from '@megatron/database';
import { DEFAULT_CONFIG, type LLMOutput, type OracleEvent } from '@megatron/lib-common';
import { querySerper, analyzeLLM } from '@megatron/lib-integrations';
import { Prisma } from '@megatron/database';
import { publishOracleEvent } from '../lib/redis';

const DEFAULT_CADENCE_MS = (() => {
    const value = process.env.LLM_CADENCE_MS;
    if (!value) return 600000;
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 600000;
    return parsed;
})();

function isLlmEnabled(): boolean {
    const mode = process.env.LLM_MODE || 'enabled';
    return mode === 'enabled';
}

function validateSignal(signal: LLMOutput): boolean {
    if (!signal) return false;
    if (typeof signal.delta_percent !== 'number') return false;
    if (typeof signal.confidence !== 'number') return false;
    if (signal.confidence < DEFAULT_CONFIG.LLM_CONFIDENCE_MIN) return false;
    if (Math.abs(signal.delta_percent) > DEFAULT_CONFIG.LLM_DELTA_MAX) return false;
    if (typeof signal.summary !== 'string') return false;
    if (!Array.isArray(signal.source_urls)) return false;
    return true;
}

export async function runLlmCycleForAsset(assetId: string): Promise<void> {
    if (!isLlmEnabled()) return;

    const asset = await db.asset.findUnique({
        where: { id: assetId },
        select: {
            id: true,
            status: true,
            oracleQueries: true,
        },
    });

    if (!asset) return;
    if (asset.status !== 'active' && asset.status !== 'funding') return;

    // FIX #13: Source Diversity - Append randomized suffixes to queries
    const variations = [
        'latest news',
        'market analysis',
        'breaking news today',
        'financial outlook',
        'investment sentiment',
        'regulatory updates',
        'technology trends',
        'future predictions'
    ];

    // Pick a random variation
    const suffix = variations[Math.floor(Math.random() * variations.length)];

    const queries = Array.isArray(asset.oracleQueries)
        ? (asset.oracleQueries as unknown as string[]).map(q => `${q} ${suffix}`) // Append suffix
        : [];

    if (!queries.length) return;

    const searchResults = await querySerper(queries);
    if (!searchResults.length) return;

    const output = await analyzeLLM(searchResults);
    if (!validateSignal(output)) return;

    const delta = new Prisma.Decimal(output.delta_percent);
    const confidence = new Prisma.Decimal(output.confidence);

    await db.oracleLog.create({
        data: {
            assetId: asset.id,
            deltaPercent: delta,
            confidence,
            summary: output.summary,
            sourceUrls: output.source_urls,
            llmResponse: output as any,
        },
    });

    const event: OracleEvent = {
        type: 'oracle',
        assetId: asset.id,
        deltaPercent: output.delta_percent,
        suggestedPrice: undefined,
        confidence: output.confidence,
        summary: output.summary,
        sourceUrls: output.source_urls,
        timestamp: Date.now(),
    };

    await publishOracleEvent(event);
}

// FIX #9: Mutex to prevent overlapping scheduler runs
let isSchedulerRunning = false;

export function startLlmScheduler(): void {
    if (!isLlmEnabled()) return;

    const tick = async () => {
        if (!isLlmEnabled()) return;

        // FIX #9: Skip if previous tick is still running
        if (isSchedulerRunning) {
            console.log('[LLM_PIPELINE] Skipping tick - previous cycle still running');
            return;
        }

        isSchedulerRunning = true;
        try {
            const now = Date.now();
            const assets = await db.asset.findMany({
                where: {
                    status: { in: ['active', 'funding'] }
                },
                select: {
                    id: true,
                    oracleIntervalMs: true,
                },
            });

            for (const asset of assets) {
                const interval = asset.oracleIntervalMs ?? DEFAULT_CADENCE_MS;

                const last = await db.oracleLog.findFirst({
                    where: { assetId: asset.id },
                    orderBy: { createdAt: 'desc' },
                    select: { createdAt: true },
                });

                if (last && now - last.createdAt.getTime() < interval) {
                    continue;
                }

                try {
                    await runLlmCycleForAsset(asset.id);
                } catch (error) {
                    console.error('[LLM_PIPELINE] Error for asset', asset.id, error);
                }
            }
        } finally {
            isSchedulerRunning = false;
        }
    };

    void tick();

    setInterval(() => {
        void tick();
    }, DEFAULT_CADENCE_MS);

    console.log('[LLM_PIPELINE] Scheduler started with cadence', DEFAULT_CADENCE_MS, 'ms');
}
