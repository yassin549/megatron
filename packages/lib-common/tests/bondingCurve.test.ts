import {
  solveDeltaShares,
  marginalPrice,
  calculateSellRevenue,
  calculateBuyCost,
  validateParams
} from '../src/bondingCurve';

describe('bondingCurve', () => {
  describe('solveDeltaShares', () => {
    it('calculates shares for known input', () => {
      const P0 = 1, k = 0.01, S = 1000, A = 100;
      const shares = solveDeltaShares(P0, k, S, A);
      expect(shares).toBeCloseTo(9.0537, 4);
    });
    
    it('handles edge case k=0 (linear pricing)', () => {
      const P0 = 5, k = 0, S = 0, A = 100;
      const shares = solveDeltaShares(P0, k, S, A);
      expect(shares).toBe(20); // 100 / 5
    });
    
    it('handles zero supply', () => {
      const P0 = 1, k = 0.01, S = 0, A = 50;
      const shares = solveDeltaShares(P0, k, S, A);
      expect(shares).toBeGreaterThan(0);
    });
    
    it('throws on invalid amount', () => {
      expect(() => solveDeltaShares(1, 0.01, 1000, -10)).toThrow();
    });
  });
  
  describe('marginalPrice', () => {
    it('returns P0 when supply is 0', () => {
      expect(marginalPrice(1, 0.01, 0)).toBe(1);
    });
    
    it('increases linearly with supply', () => {
      expect(marginalPrice(1, 0.01, 1000)).toBe(11);
      expect(marginalPrice(1, 0.01, 2000)).toBe(21);
    });
    
    it('handles k=0', () => {
      expect(marginalPrice(5, 0, 1000)).toBe(5);
    });
  });
  
  describe('calculateSellRevenue', () => {
    it('calculates revenue correctly', () => {
      const P0 = 1, k = 0.01, S = 1000, deltaS = 5;
      const revenue = calculateSellRevenue(P0, k, S, deltaS);
      // avgPrice = 1 + 0.01*(1000 - 2.5) = 10.975
      // revenue = 10.975 * 5 = 54.875
      expect(revenue).toBeCloseTo(54.875, 3);
    });
    
    it('throws when selling more than supply', () => {
      expect(() => calculateSellRevenue(1, 0.01, 100, 200)).toThrow('more shares than supply');
    });
    
    it('throws on negative shares', () => {
      expect(() => calculateSellRevenue(1, 0.01, 1000, -5)).toThrow();
    });
  });
  
  describe('calculateBuyCost', () => {
    it('matches solveDeltaShares inverse', () => {
      const P0 = 1, k = 0.01, S = 1000;
      const shares = solveDeltaShares(P0, k, S, 100);
      const cost = calculateBuyCost(P0, k, S, shares);
      expect(cost).toBeCloseTo(100, 2);
    });
    
    it('throws on non-positive shares', () => {
      expect(() => calculateBuyCost(1, 0.01, 1000, 0)).toThrow();
      expect(() => calculateBuyCost(1, 0.01, 1000, -5)).toThrow();
    });
  });
  
  describe('validateParams', () => {
    it('accepts valid params', () => {
      expect(() => validateParams(1, 0.01)).not.toThrow();
      expect(() => validateParams(5, 0)).not.toThrow();
    });
    
    it('rejects invalid P0', () => {
      expect(() => validateParams(0, 0.01)).toThrow('P0 must be positive');
      expect(() => validateParams(-1, 0.01)).toThrow();
    });
    
    it('rejects negative k', () => {
      expect(() => validateParams(1, -0.01)).toThrow('k must be non-negative');
    });
  });
});
