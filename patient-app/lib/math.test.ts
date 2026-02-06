/**
 * Math Utilities Tests
 */

import {
  clamp,
  lerp,
  mapRange,
  roundTo,
  approxEqual,
  random,
  randomId,
  percentage,
  percentageFormatted,
  average,
  sum,
  max,
  min,
  currencyBRL,
  formatNumber,
  formatDistance,
  formatWeight,
  formatDuration,
  calculateBMI,
  getBMICategory,
  getIdealWeightRange,
} from './math';

describe('Math Utilities', () => {
  describe('clamp', () => {
    it('should clamp values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('lerp', () => {
    it('should interpolate between values', () => {
      expect(lerp(0, 100, 0.5)).toBe(50);
      expect(lerp(0, 100, 0.25)).toBe(25);
      expect(lerp(0, 100, 1)).toBe(100);
    });
  });

  describe('mapRange', () => {
    it('should map values from one range to another', () => {
      expect(mapRange(50, 0, 100, 0, 1)).toBe(0.5);
      expect(mapRange(0, 0, 100, 0, 10)).toBe(0);
      expect(mapRange(100, 0, 100, 0, 10)).toBe(10);
    });
  });

  describe('roundTo', () => {
    it('should round to specified decimals', () => {
      expect(roundTo(3.14159, 2)).toBe(3.14);
      expect(roundTo(3.14159, 4)).toBe(3.1416);
      expect(roundTo(3.5, 0)).toBe(4);
    });
  });

  describe('approxEqual', () => {
    it('should check approximate equality', () => {
      expect(approxEqual(1.0, 1.0001)).toBe(true);
      expect(approxEqual(1.0, 1.01)).toBe(false);
    });
  });

  describe('randomId', () => {
    it('should generate random ID of specified length', () => {
      const id = randomId(8);
      expect(id).toHaveLength(8);
      expect(id).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('percentage', () => {
    it('should calculate percentage correctly', () => {
      expect(percentage(50, 100)).toBe(50);
      expect(percentage(25, 200)).toBe(12.5);
      expect(percentage(0, 100)).toBe(0);
    });

    it('should handle division by zero', () => {
      expect(percentage(50, 0)).toBe(0);
    });
  });

  describe('percentageFormatted', () => {
    it('should format percentage as string', () => {
      expect(percentageFormatted(50, 100)).toBe('50.0%');
      expect(percentageFormatted(33.33, 100, 2)).toBe('33.33%');
    });
  });

  describe('average', () => {
    it('should calculate average of numbers', () => {
      expect(average([1, 2, 3, 4, 5])).toBe(3);
      expect(average([10, 20, 30])).toBeCloseTo(20);
    });

    it('should handle empty array', () => {
      expect(average([])).toBe(0);
    });
  });

  describe('sum', () => {
    it('should sum array of numbers', () => {
      expect(sum([1, 2, 3, 4, 5])).toBe(15);
      expect(sum([10, -5, 5])).toBe(10);
    });
  });

  describe('max', () => {
    it('should find maximum value', () => {
      expect(max([1, 5, 3, 9, 2])).toBe(9);
      expect(max([-5, -1, -10])).toBe(-1);
    });

    it('should return undefined for empty array', () => {
      expect(max([])).toBeUndefined();
    });
  });

  describe('min', () => {
    it('should find minimum value', () => {
      expect(min([1, 5, 3, 9, 2])).toBe(1);
      expect(min([-5, -1, -10])).toBe(-10);
    });

    it('should return undefined for empty array', () => {
      expect(min([])).toBeUndefined();
    });
  });

  describe('currencyBRL', () => {
    it('should format currency as BRL', () => {
      expect(currencyBRL(1234.56)).toContain('R$');
      expect(currencyBRL(100)).toBe('R$ 100,00');
    });
  });

  describe('formatNumber', () => {
    it('should format number with Brazilian locale', () => {
      expect(formatNumber(1234.56)).toBe('1.234,56');
      expect(formatNumber(1000000)).toBe('1.000.000');
    });
  });

  describe('formatDuration', () => {
    it('should format duration in seconds', () => {
      expect(formatDuration(30)).toBe('30s');
      expect(formatDuration(90)).toBe('1min 30s');
      expect(formatDuration(3600)).toBe('1h');
      expect(formatDuration(3661)).toBe('1h 1min');
    });
  });

  describe('calculateBMI', () => {
    it('should calculate BMI correctly', () => {
      expect(calculateBMI(70, 1.75)).toBeCloseTo(22.86, 2);
      expect(calculateBMI(100, 2)).toBe(25);
    });
  });

  describe('getBMICategory', () => {
    it('should return correct BMI category', () => {
      expect(getBMICategory(17)).toBe('Abaixo do peso');
      expect(getBMICategory(22)).toBe('Peso normal');
      expect(getBMICategory(27)).toBe('Sobrepeso');
      expect(getBMICategory(32)).toBe('Obesidade grau I');
      expect(getBMICategory(37)).toBe('Obesidade grau II');
      expect(getBMICategory(42)).toBe('Obesidade grau III');
    });
  });

  describe('getIdealWeightRange', () => {
    it('should calculate ideal weight range', () => {
      const range = getIdealWeightRange(1.75);
      expect(range.min).toBeCloseTo(56.7, 0);
      expect(range.max).toBeCloseTo(76.3, 0);
    });
  });

  describe('formatDistance', () => {
    it('should format distance in meters', () => {
      expect(formatDistance(50)).toBe('50m');
      expect(formatDistance(500)).toBe('500m');
      expect(formatDistance(1000)).toBe('1km');
      expect(formatDistance(1500)).toBe('1.5km');
    });
  });

  describe('formatWeight', () => {
    it('should format weight in kg', () => {
      expect(formatWeight(70)).toBe('70kg');
      expect(formatWeight(70.5)).toBe('70.5kg');
      // Note: formatWeight only shows tons for 1000kg+
      expect(formatWeight(5000)).toBe('5t');
    });
  });
});
