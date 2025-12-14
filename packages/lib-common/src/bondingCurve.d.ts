/**
 * Bonding Curve Module
 * Implements linear bonding curve pricing: M(S) = P0 + k*S
 * See masterplan.txt Section 6 for mathematical foundations
 */
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
export declare function solveDeltaShares(P0: number, k: number, S: number, A: number): number;
/**
 * Calculate current marginal price at supply S
 * M(S) = P0 + k*S
 *
 * @param P0 - Base price
 * @param k - Slope
 * @param S - Current supply
 * @returns Marginal price
 */
export declare function marginalPrice(P0: number, k: number, S: number): number;
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
export declare function calculateSellRevenue(P0: number, k: number, S: number, deltaS: number): number;
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
export declare function calculateBuyCost(P0: number, k: number, S: number, deltaS: number): number;
/**
 * Validate bonding curve parameters
 * @param P0 - Base price (must be > 0)
 * @param k - Slope (must be >= 0)
 * @throws Error if parameters invalid
 */
export declare function validateParams(P0: number, k: number): void;
//# sourceMappingURL=bondingCurve.d.ts.map