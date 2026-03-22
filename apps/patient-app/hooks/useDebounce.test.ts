/**
 * useDebounce Hook Tests
 */

import { useDebounce, useDebouncedCallback } from './useDebounce';

describe('useDebounce Hook', () => {
  it('should export useDebounce', () => {
    expect(typeof useDebounce).toBe('function');
  });

  it('should accept value and delay parameters', () => {
    expect(useDebounce.length).toBeGreaterThanOrEqual(1);
  });

  it('should export useDebouncedCallback', () => {
    expect(typeof useDebouncedCallback).toBe('function');
  });

  it('should accept callback and delay parameters', () => {
    expect(useDebouncedCallback.length).toBeGreaterThanOrEqual(1);
  });
});
