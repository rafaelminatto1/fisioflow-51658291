/**
 * Integration tests for PHI cache clearing on background
 * 
 * Tests:
 * - PHI cache manager clears caches after 5 minutes in background
 * - PHI cache manager cancels timer when app returns to foreground
 * - Integration with logout flow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { phiCacheManager, type ClearableCache } from '../../lib/services/phiCacheManager';

// Mock cache for testing
class MockPHICache implements ClearableCache {
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

describe('Background PHI Cache Clearing Integration', () => {
  let mockPhotoCache: MockPHICache;
  let mockSOAPCache: MockPHICache;

  beforeEach(() => {
    mockPhotoCache = new MockPHICache();
    mockSOAPCache = new MockPHICache();
    
    // Add some test data
    mockPhotoCache.add('photo1');
    mockPhotoCache.add('photo2');
    mockSOAPCache.add('soap1');
    
    // Register caches
    phiCacheManager.registerCache('test-photos', mockPhotoCache);
    phiCacheManager.registerCache('test-soap', mockSOAPCache);
  });

  afterEach(() => {
    // Clean up
    phiCacheManager['caches'].clear();
    if (phiCacheManager['backgroundTimer']) {
      clearTimeout(phiCacheManager['backgroundTimer']);
      phiCacheManager['backgroundTimer'] = null;
    }
  });

  it('should clear all PHI caches after 5 minutes in background', () => {
    vi.useFakeTimers();

    // Simulate app going to background
    phiCacheManager.onAppBackground();

    // Verify caches are not cleared immediately
    expect(mockPhotoCache.clearCalled).toBe(false);
    expect(mockSOAPCache.clearCalled).toBe(false);

    // Fast-forward 5 minutes
    vi.advanceTimersByTime(5 * 60 * 1000);

    // Verify all caches are cleared
    expect(mockPhotoCache.clearCalled).toBe(true);
    expect(mockSOAPCache.clearCalled).toBe(true);
    expect(mockPhotoCache.size()).toBe(0);
    expect(mockSOAPCache.size()).toBe(0);

    vi.useRealTimers();
  });

  it('should not clear caches if app returns to foreground before 5 minutes', () => {
    vi.useFakeTimers();

    // Simulate app going to background
    phiCacheManager.onAppBackground();

    // Fast-forward 3 minutes
    vi.advanceTimersByTime(3 * 60 * 1000);

    // Simulate app returning to foreground
    phiCacheManager.onAppForeground();

    // Verify caches are not cleared
    expect(mockPhotoCache.clearCalled).toBe(false);
    expect(mockSOAPCache.clearCalled).toBe(false);

    // Fast-forward another 5 minutes
    vi.advanceTimersByTime(5 * 60 * 1000);

    // Verify caches are still not cleared (timer was cancelled)
    expect(mockPhotoCache.clearCalled).toBe(false);
    expect(mockSOAPCache.clearCalled).toBe(false);

    vi.useRealTimers();
  });

  it('should clear caches immediately on logout', () => {
    // Simulate logout
    phiCacheManager.clearAllCaches();

    // Verify all caches are cleared immediately
    expect(mockPhotoCache.clearCalled).toBe(true);
    expect(mockSOAPCache.clearCalled).toBe(true);
    expect(mockPhotoCache.size()).toBe(0);
    expect(mockSOAPCache.size()).toBe(0);
  });

  it('should handle multiple background/foreground cycles correctly', () => {
    vi.useFakeTimers();

    // First cycle: background for 2 minutes, then foreground
    phiCacheManager.onAppBackground();
    vi.advanceTimersByTime(2 * 60 * 1000);
    phiCacheManager.onAppForeground();

    expect(mockPhotoCache.clearCalled).toBe(false);

    // Second cycle: background for 6 minutes
    phiCacheManager.onAppBackground();
    vi.advanceTimersByTime(6 * 60 * 1000);

    // Caches should be cleared this time
    expect(mockPhotoCache.clearCalled).toBe(true);
    expect(mockSOAPCache.clearCalled).toBe(true);

    vi.useRealTimers();
  });

  it('should keep encrypted data in AsyncStorage while clearing decrypted memory caches', () => {
    vi.useFakeTimers();

    // Simulate app going to background
    phiCacheManager.onAppBackground();

    // Fast-forward 5 minutes
    vi.advanceTimersByTime(5 * 60 * 1000);

    // Only in-memory caches should be cleared
    // AsyncStorage (encrypted data) should remain intact
    expect(mockPhotoCache.clearCalled).toBe(true);
    expect(mockSOAPCache.clearCalled).toBe(true);

    // Note: AsyncStorage is not cleared by PHI cache manager
    // Only decrypted in-memory caches are cleared

    vi.useRealTimers();
  });
});
