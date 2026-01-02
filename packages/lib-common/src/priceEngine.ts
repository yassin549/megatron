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
export function applyEMA(
    current: number,
    newValue: number,
    beta: number = 0.2
): number {
    if (beta < 0 || beta > 1) {
        throw new Error('Beta must be between 0 and 1');
    }

    return beta * newValue + (1 - beta) * current;
}

/**
 * Calculate adaptive weight for market price
 * w_market = clamp(0.5 + 0.5*(vol/(vol+V0)), 0.2, 0.95)
 * 
 * @param volRecent - Recent trading volume (USDC)
 * @param V0 - Tuning constant (default 1000)
 * @returns Market weight (0.2 to 0.95)
 */
export function calculateMarketWeight(
    volRecent: number,
    V0: number = 1000
): number {
    if (volRecent < 0) {
        throw new Error('Volume cannot be negative');
    }

    // Base weight 0.2 (20%), max 0.8 (80%) on volume
    let weight = 0.2 + 0.6 * (volRecent / (volRecent + V0));

    // Clamp to [0.2, 0.85] - Allow market to have a significant say
    weight = Math.max(0.2, Math.min(0.85, weight));

    return weight;
}

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
export function combinePrice(
    marketPrice: number,
    fundamentalPrice: number,
    volRecent: number,
    V0: number = 1000
): { displayPrice: number; marketWeight: number } {
    const marketWeight = calculateMarketWeight(volRecent, V0);
    const displayPrice = marketWeight * marketPrice + (1 - marketWeight) * fundamentalPrice;

    return {
        displayPrice,
        marketWeight
    };
}

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
export function updateFundamental(
    currentF: number,
    deltaPercent: number,
    beta: number = 0.2
): number {
    // Clamp delta to ±30%
    const clampedDelta = Math.max(-30, Math.min(30, deltaPercent));

    // Calculate new raw fundamental
    const newF = currentF * (1 + clampedDelta / 100);

    // Apply EMA smoothing
    return applyEMA(currentF, newF, beta);
}
