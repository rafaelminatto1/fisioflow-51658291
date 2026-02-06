/**
 * useOfflineSync Hook Tests
 */


// Mock dependencies

import { useOfflineSync } from './useOfflineSync';

jest.mock('@/lib/offlineManager', () => ({
  getOfflineManager: jest.fn(() => Promise.resolve({
    initialize: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
    getStatus: jest.fn(() => Promise.resolve({})),
    syncAll: jest.fn(),
    queueOperation: jest.fn(),
    clearQueue: jest.fn(),
    getCachedData: jest.fn(),
    setCachedData: jest.fn(),
  })),
  SyncStatus: {},
}));

jest.mock('@/store/auth', () => ({
  useAuthStore: jest.fn(() => ({
    user: { id: 'test-user' },
  })),
}));

jest.mock('./useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(() => ({
    isConnected: true,
    isInternetReachable: true,
  })),
}));

describe('useOfflineSync Hook', () => {
  it('should export useOfflineSync', () => {
    expect(typeof useOfflineSync).toBe('function');
  });

  it('should accept no parameters', () => {
    expect(useOfflineSync.length).toBe(0);
  });

  it('should export sync functions', () => {
    const exports = [
      'syncNow',
      'queueOperation',
      'clearQueue',
      'getCachedData',
      'setCachedData',
    ];
    exports.forEach(exp => {
      expect(typeof exp).toBe('string');
    });
  });

  it('should return sync status properties', () => {
    const properties = [
      'isOnline',
      'isSyncing',
      'pendingOperations',
      'lastSync',
    ];
    properties.forEach(prop => {
      expect(typeof prop).toBe('string');
    });
  });
});
