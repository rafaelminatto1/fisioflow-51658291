/**
 * useColorScheme Hook Tests
 */

import { useColors, useColorScheme as useBaseColorScheme } from './useColorScheme';
import { useColorScheme as useRNColorScheme } from 'react-native';

jest.mock('react-native', () => ({
  useColorScheme: jest.fn(),
}));

describe('useColors Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return colors object', () => {
    (useRNColorScheme as jest.Mock).mockReturnValue('dark');
    const result = useColors();

    expect(result).toBeDefined();
    expect(typeof result.primary).toBe('string');
    expect(typeof result.background).toBe('string');
  });
});

describe('useColorScheme Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return color scheme', () => {
    (useRNColorScheme as jest.Mock).mockReturnValue('dark');
    const result = useBaseColorScheme();

    expect(result).toBe('dark');
  });

  it('should fallback to light for unspecified schemes', () => {
    (useRNColorScheme as jest.Mock).mockReturnValue('unspecified');

    expect(useBaseColorScheme()).toBe('light');
  });
});
