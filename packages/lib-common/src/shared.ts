
// --- TYPES ---

export interface PricingParams {
    P0: number; // Base price
    k: number;  // Slope
}

export interface VestingSchedule {
    days: number;
    percentage: number;
}

export interface TradeEvent {
    type: 'trade';
    assetId: string;
    tradeId: string;
    price: number;
    quantity: number;
    buyerId: string;
    timestamp: number;
    volume5m: number;
}

// --- CONSTANTS ---

export const DEFAULT_CONFIG = {
    // Legacy config, keeping for compatibility if utilized elsewhere
    MAX_INSTANT_WITHDRAWAL_PCT: 0.25,
};

export const MONETARY_CONFIG = {
    SWAP_FEE: 0.005,         // 0.5%
    LP_SHARE: 0.9,           // 90% of fee goes to LPs
    PLATFORM_SHARE: 0.1,     // 10% of fee goes to Platform Treasury
    MAX_INSTANT_WITHDRAWAL_PCT: 0.25, // 25% of vested amount can be withdrawn instantly
};

export const VESTING_MILESTONES: VestingSchedule[] = [
    { days: 0, percentage: 10 },
    { days: 30, percentage: 25 },
    { days: 90, percentage: 50 },
    { days: 180, percentage: 100 }
];
