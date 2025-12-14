/**
 * Shared type definitions and interfaces
 */
export interface PricingParams {
    P0: number;
    k: number;
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
export declare const VESTING_MILESTONES: VestingSchedule[];
export declare const DEFAULT_CONFIG: {
    readonly SWAP_FEE: 0.005;
    readonly LP_FEE_SHARE: 0.9;
    readonly PLATFORM_FEE_SHARE: 0.1;
    readonly DEFAULT_P0: 1;
    readonly DEFAULT_K: 0.01;
    readonly EMA_BETA: 0.2;
    readonly V0: 1000;
    readonly SOFT_CAP: 2500;
    readonly HARD_CAP: 25000;
    readonly FUNDING_DEADLINE_DAYS: 7;
    readonly LLM_CONFIDENCE_MIN: 0.4;
    readonly LLM_DELTA_MAX: 30;
    readonly RESERVE_RATIO_TARGET: 0.1;
    readonly MAX_INSTANT_WITHDRAWAL_PCT: 0.25;
    readonly DAILY_POOL_WITHDRAWAL_PCT: 0.1;
    readonly CIRCUIT_BREAKER_PCT: 0.15;
    readonly CIRCUIT_BREAKER_DURATION_SEC: 300;
};
//# sourceMappingURL=shared.d.ts.map