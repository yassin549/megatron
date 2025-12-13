import {
  applyEMA,
  calculateMarketWeight,
  combinePrice,
  updateFundamental
} from '../src/priceEngine';

describe('priceEngine', () => {
  describe('applyEMA', () => {
    it('applies exponential moving average', () => {
      const result = applyEMA(10, 12, 0.2);
      // 0.2*12 + 0.8*10 = 2.4 + 8 = 10.4
      expect(result).toBeCloseTo(10.4, 2);
    });
    
    it('handles beta=0 (no change)', () => {
      expect(applyEMA(10, 20, 0)).toBe(10);
    });
    
    it('handles beta=1 (full replacement)', () => {
      expect(applyEMA(10, 20, 1)).toBe(20);
    });
    
    it('throws on invalid beta', () => {
      expect(() => applyEMA(10, 12, -0.1)).toThrow();
      expect(() => applyEMA(10, 12, 1.5)).toThrow();
    });
  });
  
  describe( 'calculateMarketWeight', () => {
    it('returns 0.2 for zero volume', () => {
      expect(calculateMarketWeight(0, 1000)).toBe(0.2);
    });
    
    it('returns 0.95 for very high volume', () => {
      expect(calculateMarketWeight(100000, 1000)).toBeCloseTo(0.95, 2);
    });
    
    it('calculates mid-range weights', () => {
      const weight = calculateMarketWeight(1000, 1000);
      // 0.5 + 0.5*(1000/2000) = 0.5 + 0.25 = 0.75
      expect(weight).toBeCloseTo(0.75, 2);
    });
    
    it('throws on negative volume', () => {
      expect(() => calculateMarketWeight(-100, 1000)).toThrow();
    });
  });
  
  describe('combinePrice', () => {
    it('combines prices with correct weighting', () => {
      const result = combinePrice(12, 10, 5000, 1000);
      // weight ≈ 0.95
      // display ≈ 0.95*12 + 0.05*10 = 11.4 + 0.5 = 11.9
      expect(result.marketWeight).toBeCloseTo(0.917, 2);
      expect(result.displayPrice).toBeCloseTo(11.83, 1);
    });
    
    it('favors fundamental at low volume', () => {
      const result = combinePrice(12, 10, 0, 1000);
      expect(result.marketWeight).toBe(0.2);
      expect(result.displayPrice).toBeCloseTo(10.4, 1); // 0.2*12 + 0.8*10
    });
  });
  
  describe('updateFundamental', () => {
    it('updates with positive delta', () => {
      const newF = updateFundamental(10, 5, 0.2);
      // new = 10 * 1.05 = 10.5
      // smoothed = 0.2*10.5 + 0.8*10 = 2.1 + 8 = 10.1
      expect(newF).toBeCloseTo(10.1, 2);
    });
    
    it('updates with negative delta', () => {
      const newF = updateFundamental(10, -10, 0.2);
      // new = 10 * 0.9 = 9
      // smoothed = 0.2*9 + 0.8*10 = 1.8 + 8 = 9.8
      expect(newF).toBeCloseTo(9.8, 2);
    });
    
    it('clamps extreme deltas to ±30%', () => {
      const newFHigh = updateFundamental(10, 50, 0.2);
      const newFLow = updateFundamental(10, -50, 0.2);
      
      // Clamped to +30%: 10*1.3 = 13, smoothed = 0.2*13 + 0.8*10 = 10.6
      expect(newFHigh).toBeCloseTo(10.6, 1);
      
      // Clamped to -30%: 10*0.7 = 7, smoothed = 0.2*7 + 0.8*10 = 9.4
      expect(newFLow).toBeCloseTo(9.4, 1);
    });
  });
});
