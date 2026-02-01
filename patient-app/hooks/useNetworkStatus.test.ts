/**
 * useNetworkStatus Hook Tests
 */

import { renderHook } from '@testing-library/react-native';
import { useNetworkStatus } from './useNetworkStatus';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

describe('useNetworkStatus Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return network status', async () => {
    (require('@react-native-community/netinfo').fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isInternetReachable).toBe(true);
    expect(result.current.type).toBe('wifi');
  });

  it('should return offline status when not connected', async () => {
    (require('@react-native-community/netinfo').fetch as jest.Mock).mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    });

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isInternetReachable).toBe(false);
  });

  it('should return isWifi true when on wifi', async () => {
    (require('@react-native-community/netinfo').fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isWifi).toBe(true);
  });

  it('should return isCellular true when on cellular', async () => {
    (require('@react-native-community/netinfo').fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'cellular',
    });

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isCellular).toBe(true);
    expect(result.current.isWifi).toBe(false);
  });
});
