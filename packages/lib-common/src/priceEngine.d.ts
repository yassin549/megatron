/**
 * Price Engine Module
 * Implements dual-price system: Display = w*Market + (1-w)*Fundamental
 * See masterplan.txt Section 6 for pricing model details
 */
/**
 * Apply Exponential Moving Average smoothing
 * F_t = β*F_new + (1-β)*F_prev
 *
 * @param current - Current value
 * @param newValue - New value to incorporate
 * @param beta - Smoothing factor (0-1, default 0.2)
 * @returns Smoothed value
 */
export declare function applyEMA(current: number, newValue: number, beta?: number): number;
/**
 * Calculate adaptive weight for market price
 * w_market = clamp(0.5 + 0.5*(vol/(vol+V0)), 0.2, 0.95)
 *
 * @param volRecent - Recent trading volume (USDC)
 * @param V0 - Tuning constant (default 1000)
 * @returns Market weight (0.2 to 0.95)
 */
export declare function calculateMarketWeight(volRecent: number, V0?: number): number;
/**
 * Combine market and fundamental prices into display price
 * D = w*M + (1-w)*F
 *
 * @param marketPrice - Price from bonding curve
 * @param fundamentalPrice - Price from LLM analysis
 * @param volRecent - Recent trading volume
 * @param V0 - Tuning constant
 * @returns Display price and weight used
 */
export declare function combinePrice(marketPrice: number, fundamentalPrice: number, volRecent: number, V0?: number): {
    displayPrice: number;
    marketWeight: number;
};
/**
 * Update fundamental price using delta percentage from LLM
 * F_new = F_prev * (1 + delta/100)
 * Then apply EMA smoothing
 *
 * @param currentF - Current fundamental price
 * @param deltaPercent - LLM suggested delta (-30 to +30)
 * @param beta - EMA smoothing factor
 * @returns New smoothed fundamental price
 */
export declare function updateFundamental(currentF: number, deltaPercent: number, beta?: number): number;
//# sourceMappingURL=priceEngine.d.ts.map