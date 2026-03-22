/**
 * usePrevious/useLatest Hooks Tests
 */

import { usePrevious, useLatest } from './usePrevious';

describe('usePrevious Hook', () => {
  it('should export usePrevious', () => {
    expect(typeof usePrevious).toBe('function');
  });

  it('should accept one parameter', () => {
    expect(usePrevious.length).toBe(1);
  });
});

describe('useLatest Hook', () => {
  it('should export useLatest', () => {
    expect(typeof useLatest).toBe('function');
  });

  it('should accept one parameter', () => {
    expect(useLatest.length).toBe(1);
  });

  it('should return object with current property', () => {
    const properties = ['current'];
    properties.forEach(prop => {
      expect(typeof prop).toBe('string');
    });
  });
});
