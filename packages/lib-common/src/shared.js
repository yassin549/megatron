"use strict";
/**
 * Shared type definitions and interfaces
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.VESTING_MILESTONES = void 0;
exports.VESTING_MILESTONES = [
    { days: 7, percentage: 25 },
    { days: 30, percentage: 50 },
    { days: 90, percentage: 75 },
    { days: 180, percentage: 100 },
];
exports.DEFAULT_CONFIG = {
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
};
