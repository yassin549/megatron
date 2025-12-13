/**
 * Shared type definitions and interfaces
 */

export interface PricingParams {
    P0: number;  // Base price
    k: number;   // Slope
}

export interface TradeEvent {
    type: 'trade';
    assetId: string;
    tradeId: string;
    price: number;
    quantity: number;
    buyerId: string;
    sellerId?: string;
    timestamp: number;
    volume5m: number;
}

export interface OracleEvent {
    type: 'oracle';
    assetId: string;
    deltaPercent?: number;
    suggestedPrice?: number;
    confidence: number;
    summary: string;
    sourceUrls: string[];
    timestamp: number;
}

export interface LLMOutput {
    delta_percent: number;
    confidence: number;
    summary: string;
    source_urls: string[];
}

export type AssetStatus = 'funding' | 'active' | 'paused' | 'cancelled';
export type LPPoolStatus = 'funding' | 'active' | 'failed';
export type WithdrawalStatus = 'pending' | 'processed' | 'cancelled';

export interface VestingSchedule {
    days: number;
    percentage: number;
}

export const VESTING_MILESTONES: VestingSchedule[] = [
    { days: 7, percentage: 25 },
    { days: 30, percentage: 50 },
    { days: 90, percentage: 75 },
    { days: 180, percentage: 100 },
];

export const DEFAULT_CONFIG = {
    SWAP_FEE: 0.005,
    LP_FEE_SHARE: 0.9,
    PLATFORM_FEE_SHARE: 0.1,
    DEFAULT_P0: 1,
    DEFAULT_K: 0.01,
    EMA_BETA: 0.2,
    V0: 1000,
    SOFT_CAP: 2500,
    HARD_CAP: 25000,
    FUNDING_DEADLINE_DAYS: 7,
    LLM_CONFIDENCE_MIN: 0.4,
    LLM_DELTA_MAX: 30,
    RESERVE_RATIO_TARGET: 0.1,
    MAX_INSTANT_WITHDRAWAL_PCT: 0.25,
    DAILY_POOL_WITHDRAWAL_PCT: 0.1,
    CIRCUIT_BREAKER_PCT: 0.15,
    CIRCUIT_BREAKER_DURATION_SEC: 300,
} as const;
