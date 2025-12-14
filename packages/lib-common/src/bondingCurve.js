"use strict";
/**
 * Bonding Curve Module
 * Implements linear bonding curve pricing: M(S) = P0 + k*S
 * See masterplan.txt Section 6 for mathematical foundations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.solveDeltaShares = solveDeltaShares;
exports.marginalPrice = marginalPrice;
exports.calculateSellRevenue = calculateSellRevenue;
exports.calculateBuyCost = calculateBuyCost;
exports.validateParams = validateParams;
/**
 * Calculate shares received for given USDC amount
 * Solves: P0*ΔS + k*S*ΔS + ½*k*ΔS² = A
 * Using quadratic formula: ΔS = (-b + √(b² - 4ac)) / 2a
 *
 * @param P0 - Base price (default 1 USDC)
 * @param k - Slope (default 0.01)
 * @param S - Current total supply
 * @param A - Amount to spend (USDC)
 * @returns Delta shares to mint
 */
function solveDeltaShares(P0, k, S, A) {
    // Edge case: linear pricing (k=0)
    if (k === 0) {
        return A / P0;
    }
    // Quadratic formula coefficients
    const a = k / 2;
    const b = P0 + k * S;
    const c = -A;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) {
        throw new Error('Invalid parameters: negative discriminant');
    }
    // Take positive root
    const deltaS = (-b + Math.sqrt(discriminant)) / (2 * a);
    if (deltaS <= 0) {
        throw new Error('Invalid result: non-positive shares');
    }
    return deltaS;
}
/**
 * Calculate current marginal price at supply S
 * M(S) = P0 + k*S
 *
 * @param P0 - Base price
 * @param k - Slope
 * @param S - Current supply
 * @returns Marginal price
 */
function marginalPrice(P0, k, S) {
    return P0 + k * S;
}
/**
 * Calculate USDC revenue from selling shares
 * Revenue = avgPrice * ΔS where avgPrice = P0 + k*(S - ΔS/2)
 *
 * @param P0 - Base price
 * @param k - Slope
 * @param S - Current supply
 * @param deltaS - Shares to sell
 * @returns USDC revenue
 */
function calculateSellRevenue(P0, k, S, deltaS) {
    if (deltaS > S) {
        throw new Error('Cannot sell more shares than supply');
    }
    if (deltaS < 0) {
        throw new Error('Cannot sell negative shares');
    }
    // Average price over the range [S-ΔS, S]
    const avgPrice = P0 + k * (S - deltaS / 2);
    return avgPrice * deltaS;
}
/**
 * Calculate cost to buy exact number of shares
 * Cost = P0*ΔS + k*S*ΔS + ½*k*ΔS²
 *
 * @param P0 - Base price
 * @param k - Slope
 * @param S - Current supply
 * @param deltaS - Shares to buy
 * @returns USDC cost
 */
function calculateBuyCost(P0, k, S, deltaS) {
    if (deltaS <= 0) {
        throw new Error('Must buy positive shares');
    }
    return P0 * deltaS + k * S * deltaS + 0.5 * k * deltaS * deltaS;
}
/**
 * Validate bonding curve parameters
 * @param P0 - Base price (must be > 0)
 * @param k - Slope (must be >= 0)
 * @throws Error if parameters invalid
 */
function validateParams(P0, k) {
    if (P0 <= 0) {
        throw new Error('P0 must be positive');
    }
    if (k < 0) {
        throw new Error('k must be non-negative');
    }
}
