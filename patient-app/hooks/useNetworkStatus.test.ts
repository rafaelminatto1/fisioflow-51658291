/**
 * useNetworkStatus Hook Tests
 */


// Mock NetInfo

import { useNetworkStatus } from './useNetworkStatus';

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

describe('useNetworkStatus Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export useNetworkStatus function', () => {
    expect(typeof useNetworkStatus).toBe('function');
  });

  it('should have no parameters', () => {
    expect(useNetworkStatus.length).toBe(0);
  });
});
