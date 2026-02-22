/**
 * Unit tests for PHI Cache Manager
 * 
 * Tests:
 * - Cache registration and unregistration
 * - Clearing all caches
 * - Background timer functionality
 * - Foreground cancellation of timer
 * - Cache statistics
 */

import { vi } from 'vitest';
import { phiCacheManager, type ClearableCache } from '../phiCacheManager';

// Mock cache implementation for testing
class MockCache implements ClearableCache {
  private items: Set<string> = new Set();
  public clearCalled = false;

  add(item: string): void {
    this.items.add(item);
  }

  clear(): void {
    this.clearCalled = true;
    this.items.clear();
  }

  size(): number {
    return this.items.size;
  }

  reset(): void {
    this.clearCalled = false;
    this.items.clear();
  }
}

describe('PHICacheManager', () => {
  let mockCache1: MockCache;
  let mockCache2: MockCache;

  beforeEach(() => {
    mockCache1 = new MockCache();
    mockCache2 = new MockCache();
    
    // Add some items to caches
    mockCache1.add('item1');
    mockCache1.add('item2');
    mockCache2.add('item3');
  });

  afterEach(() => {
    // Unregister all test caches
    phiCacheManager['caches'].clear();
    
    // Clear any timers
    if (phiCacheManager['backgroundTimer']) {
      clearTimeout(phiCacheManager['backgroundTimer']);
      phiCacheManager['backgroundTimer'] = null;
    }
  });

  describe('Cache Registration', () => {
    it('should register a cache', () => {
      phiCacheManager.registerCache('test-cache-1', mockCache1);
      
      const stats = phiCacheManager.getStats();
      expect(stats).toHaveLength(1);
      expect(stats[0].name).toBe('test-cache-1');
      expect(stats[0].size).toBe(2);
    });

    it('should register multiple caches', () => {
      phiCacheManager.registerCache('test-cache-1', mockCache1);
      phiCacheManager.registerCache('test-cache-2', mockCache2);
      
      const stats = phiCacheManager.getStats();
      expect(stats).toHaveLength(2);
      expect(stats.find(s => s.name === 'test-cache-1')?.size).toBe(2);
      expect(stats.find(s => s.name === 'test-cache-2')?.size).toBe(1);
    });

    it('should unregister a cache', () => {
      phiCacheManager.registerCache('test-cache-1', mockCache1);
      phiCacheManager.registerCache('test-cache-2', mockCache2);
      
      phiCacheManager.unregisterCache('test-cache-1');
      
      const stats = phiCacheManager.getStats();
      expect(stats).toHaveLength(1);
      expect(stats[0].name).toBe('test-cache-2');
    });
  });

  describe('Clear All Caches', () => {
    it('should clear all registered caches', () => {
      phiCacheManager.registerCache('test-cache-1', mockCache1);
      phiCacheManager.registerCache('test-cache-2', mockCache2);
      
      phiCacheManager.clearAllCaches();
      
      expect(mockCache1.clearCalled).toBe(true);
      expect(mockCache2.clearCalled).toBe(true);
      expect(mockCache1.size()).toBe(0);
      expect(mockCache2.size()).toBe(0);
    });

    it('should handle empty cache list', () => {
      expect(() => phiCacheManager.clearAllCaches()).not.toThrow();
    });
  });

  describe('Background Timer', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should start timer when app goes to background', () => {
      phiCacheManager.registerCache('test-cache-1', mockCache1);
      
      phiCacheManager.onAppBackground();
      
      // Cache should not be cleared immediately
      expect(mockCache1.clearCalled).toBe(false);
      
      // Fast-forward 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000);
      
      // Cache should now be cleared
      expect(mockCache1.clearCalled).toBe(true);
    });

    it('should cancel timer when app returns to foreground before 5 minutes', () => {
      phiCacheManager.registerCache('test-cache-1', mockCache1);
      
      phiCacheManager.onAppBackground();
      
      // Fast-forward 2 minutes
      vi.advanceTimersByTime(2 * 60 * 1000);
      
      // App returns to foreground
      phiCacheManager.onAppForeground();
      
      // Cache should not be cleared
      expect(mockCache1.clearCalled).toBe(false);
      
      // Fast-forward another 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000);
      
      // Cache should still not be cleared (timer was cancelled)
      expect(mockCache1.clearCalled).toBe(false);
    });

    it('should handle multiple background/foreground cycles', () => {
      phiCacheManager.registerCache('test-cache-1', mockCache1);
      
      // First cycle - background for 2 minutes, then foreground
      phiCacheManager.onAppBackground();
      vi.advanceTimersByTime(2 * 60 * 1000);
      phiCacheManager.onAppForeground();
      
      expect(mockCache1.clearCalled).toBe(false);
      
      // Reset mock
      mockCache1.reset();
      mockCache1.add('item1');
      
      // Second cycle - background for 6 minutes
      phiCacheManager.onAppBackground();
      vi.advanceTimersByTime(6 * 60 * 1000);
      
      // Cache should be cleared this time
      expect(mockCache1.clearCalled).toBe(true);
    });
  });

  describe('Cache Statistics', () => {
    it('should return correct statistics', () => {
      phiCacheManager.registerCache('test-cache-1', mockCache1);
      phiCacheManager.registerCache('test-cache-2', mockCache2);
      
      const stats = phiCacheManager.getStats();
      
      expect(stats).toHaveLength(2);
      expect(stats.find(s => s.name === 'test-cache-1')).toEqual({
        name: 'test-cache-1',
        size: 2,
      });
      expect(stats.find(s => s.name === 'test-cache-2')).toEqual({
        name: 'test-cache-2',
        size: 1,
      });
    });

    it('should detect if any cache has data', () => {
      phiCacheManager.registerCache('test-cache-1', mockCache1);
      
      expect(phiCacheManager.hasData()).toBe(true);
      
      mockCache1.clear();
      
      expect(phiCacheManager.hasData()).toBe(false);
    });

    it('should return empty stats for no caches', () => {
      const stats = phiCacheManager.getStats();
      expect(stats).toEqual([]);
      expect(phiCacheManager.hasData()).toBe(false);
    });
  });

  describe('Integration', () => {
    it('should clear all caches on logout', () => {
      phiCacheManager.registerCache('photos', mockCache1);
      phiCacheManager.registerCache('soap-notes', mockCache2);
      
      // Simulate logout
      phiCacheManager.clearAllCaches();
      
      expect(mockCache1.clearCalled).toBe(true);
      expect(mockCache2.clearCalled).toBe(true);
      expect(phiCacheManager.hasData()).toBe(false);
    });

    it('should clear caches after 5 minutes in background', () => {
      vi.useFakeTimers();
      
      phiCacheManager.registerCache('photos', mockCache1);
      phiCacheManager.registerCache('soap-notes', mockCache2);
      
      // App goes to background
      phiCacheManager.onAppBackground();
      
      // Wait 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000);
      
      // Both caches should be cleared
      expect(mockCache1.clearCalled).toBe(true);
      expect(mockCache2.clearCalled).toBe(true);
      
      vi.useRealTimers();
    });
  });
});
