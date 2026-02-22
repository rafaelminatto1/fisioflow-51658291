/**
 * IndexedDB Cache Tests - Testes para o sistema de cache
 */

import { describe, beforeEach, afterEach, beforeAll, afterAll, expect, it, jest } from '@jest/globals';
import * as IDB from 'fake-indexeddb';

import {
  setCache,
  getCache,
  getMultipleCache,
  deleteCache,
  clearCache,
  clearByTags,
  setMultipleCache,
  getCacheSize,
  getCacheStats,
  CACHE_TAGS,
} from '../cache/IndexedDBCache';

// Mock IDB for Node.js environment
class MockIDBFactory {
  static open() {
    return new MockIDBDatabase();
  }
}

class MockIDBDatabase {
  stores: Map<string, MockIDBObjectStore> = new Map();
  transaction(storeName: string) {
    return new MockIDBTransaction(this.stores.get(storeName));
  }
}

class MockIDBTransaction {
  store: Map<string, any>;
  operations: (() => void)[] = [];

  constructor(store: Map<string, any>) {
    this.store = store;
  }

  objectStore(name: string) {
    return this;
  }

  get(key: string) {
    return {
      onsuccess: (callback) => {
        const value = this.store.get(key);
        callback({ result: value, target: { result: value } });
      },
      onerror: () => {
        const error = { error: 'IDB error' };
        const callback = this.operations.shift()!;
        callback({ error } as any, target: { result: undefined } });
      },
    };
  }

  put(data: any) {
    return {
      onsuccess: (callback) => {
        this.store.set(data.key, { ...data, timestamp: Date.now(), ttl: 300000 });
        callback({ result: undefined, target: { result: undefined } });
        this.operations.push(() => callback());
      },
      onerror: () => {
        const callback = this.operations.shift()!;
        callback({ error } as any, target: { result: undefined } });
      },
    };
  }

  delete(key: string) {
    return {
      onsuccess: (callback) => {
        this.store.delete(key);
        callback({ result: undefined, target: { result: undefined } });
      },
      onerror: () => {
        const callback = this.operations.shift()!;
        callback({ error } as any, target: { result: undefined } });
      },
    };
  }

  count() {
    const count = this.store.size;
    return {
      onsuccess: (callback) => {
        callback({ result: count });
      },
      onerror: () => {
        const callback = this.operations.shift()!;
        callback({ error } as any, target: { result: 0 } });
      },
    };
  }

  index(name: string) {
    return {
      openCursor: () => ({
        onsuccess: (callback) => {
          callback({ result: [] });
        },
        onerror: () => {
          const callback = this.operations.shift()!;
          callback({ error } as any, target: { result: [] });
        },
      }),
      continue: () => {},
      close: () => {},
    };
    };
  }
}

// Setup mocks before all tests
beforeAll(() => {
  if (typeof indexedDB === 'undefined') {
    (IDB as any).default = MockIDBFactory;
  }
});

describe('IndexedDB Cache', () => {
  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    clearCache();
  });

  describe('Basic Operations', () => {
    it('should set and get cache', async () => {
      const testData = { foo: 'bar' };
      await setCache('test-key', testData);
      const result = await getCache<{ foo: string }>('test-key');
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent key', async () => {
      const result = await getCache('non-existent');
      expect(result).toBeNull();
    });

    it('should handle TTL expiration', async () => {
      // Mock Date.now to test expiration
      const originalNow = Date.now;
      jest.spyOn(Date, 'now').mockReturnValue(originalNow);

      await setCache('expiring-key', { value: 'test' }, { ttl: 100 });

      // Fast-forward time beyond TTL
      jest.spyOn(Date, 'now').mockReturnValue(originalNow + 200);

      const result = await getCache('expiring-key');
      expect(result).toBeNull();

      jest.restoreAllMocks();
    }, 10000);

    it('should delete cache entry', async () => {
      await setCache('delete-key', { value: 'test' });
      await deleteCache('delete-key');
      const result = await getCache('delete-key');
      expect(result).toBeNull();
    });

    it('should clear all cache', async () => {
      await setCache('key1', { value: 'test1' });
      await setCache('key2', { value: 'test2' });
      await clearCache();

      const result1 = await getCache('key1');
      const result2 = await getCache('key2');
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('Batch Operations', () => {
    it('should set multiple items', async () => {
      const entries = [
        { key: 'multi-1', data: { value: 'test1' } },
        { key: 'multi-2', data: { value: 'test2' } },
      ];
      await setMultipleCache(entries);

      const results = await getMultipleCache<{ value: string }>(['multi-1', 'multi-2']);
      expect(results.get('multi-1')?.data).toEqual({ value: 'test1' });
      expect(results.get('multi-2')?.data).toEqual({ value: 'test2' });
    });

    it('should get multiple non-existent keys', async () => {
      const results = await getMultipleCache(['non-1', 'non-2']);
      expect(results.get('non-1')).toBeNull();
      expect(results.get('non-2')).toBeNull();
    });
  });

  describe('Tag System', () => {
    it('should clear by tags', async () => {
      await setCache('tagged-1', { value: 'test1' }, { tags: ['tag1'] });
      await setCache('tagged-2', { value: 'test2' }, { tags: ['tag1', 'tag2'] });
      await setCache('untagged', { value: 'test3' });

      await clearByTags(['tag1']);

      const result1 = await getCache('tagged-1');
      const result2 = await getCache('tagged-2');
      const result3 = await getCache('untagged');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).not.toBeNull();
    });

    it('should invalidate with tags on set', async () => {
      await setCache('key1', { value: 'test1' }, { tags: ['tag1'] });
      await setCache('key2', { value: 'test2' }, { invalidateWithTags: ['tag1'] });

      const result1 = await getCache('key1');
      const result2 = await getCache('key2');

      expect(result1).toBeNull();
      expect(result2).not.toBeNull();
    });
  });

  describe('Cache Stats', () => {
    it('should return correct stats', async () => {
      await setCache('stat-key', { value: 'test' });
      await setCache('another-key', { value: 'test' });

      const stats = await getCacheStats();
      expect(stats.entryCount).toBe(2);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should return empty stats when cache is clear', async () => {
      const stats = await getCacheStats();
      expect(stats.entryCount).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('Prefetch Pattern', () => {
    it('should not fetch if cached', async () => {
      const fetcher = jest.fn().mockResolvedValue('fetched-data');
      await setCache('prefetch-key', { value: 'cached-data' });

      const spy = jest.spyOn(Date, 'now');
      spy.mockReturnValue(Date.now());

      await prefetchCache('prefetch-key', fetcher);

      expect(fetcher).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should fetch if cache miss', async () => {
      const fetcher = jest.fn().mockResolvedValue('fresh-data');
      await setCache('prefetch-key', { value: 'old-data' });
      await clearCache();

      const result = await getCacheWithFallback('prefetch-key', fetcher);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual('fresh-data');
      expect(result.fromCache).toBe(false);
    });
  });

  describe('getCacheWithFallback', () => {
    it('should return cached data with fromCache true', async () => {
      await setCache('fallback-key', { value: 'cached-value' });

      const fetcher = jest.fn().mockResolvedValue('fetched-data');

      const result = await getCacheWithFallback('fallback-key', fetcher);

      expect(result.data).toEqual('cached-value');
      expect(result.fromCache).toBe(true);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should fetch and cache on miss', async () => {
      const fetcher = jest.fn().mockResolvedValue('fetched-data');
      await clearCache();

      const result = await getCacheWithFallback('miss-key', fetcher);

      expect(result.data).toEqual('fetched-data');
      expect(result.fromCache).toBe(false);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch errors gracefully', async () => {
      const fetcher = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await getCacheWithFallback('error-key', fetcher);

      expect(result.data).toBeNull();
      expect(result.fromCache).toBe(false);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });
});
