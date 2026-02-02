/**
 * useColorScheme Hook Tests
 */

import { renderHook } from '@testing-library/react-native';
import { useColors, useColorScheme as useBaseColorScheme } from './useColorScheme';

jest.mock('react-native', () => ({
  useColorScheme: jest.fn(),
}));

describe('useColors Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return colors object', () => {
    const { result } = renderHook(() => useColors());

    expect(result.current).toBeDefined();
    expect(typeof result.current.primary).toBe('string');
    expect(typeof result.current.background).toBe('string');
  });
});

describe('useColorScheme Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return color scheme', () => {
    const { result } = renderHook(() => useBaseColorScheme());

    expect(result.current).toBeDefined();
  });
});
