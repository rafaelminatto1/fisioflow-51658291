/**
 * Service for caching exercise protocols data offline.
 */

import { fisioLogger as logger } from '@/lib/errors/logger';

interface CacheMetadata {
    lastUpdated: string;
}

interface CacheResult<T> {
    data: T[];
    isStale: boolean;
    metadata: CacheMetadata | null;
    source: 'indexeddb' | 'localstorage' | 'memory';
}

class ProtocolsCacheService {
    private readonly CACHE_KEY = 'protocols_cache';
    private readonly CACHE_TIMESTAMP_KEY = 'protocols_cache_timestamp';
    private readonly CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour (protocols change infrequently)

    /**
     * Check if cached data is still valid (not expired)
     */
    async isCacheValid(): Promise<boolean> {
        const timestamp = localStorage.getItem(this.CACHE_TIMESTAMP_KEY);
        if (!timestamp) return false;

        const cacheTime = parseInt(timestamp, 10);
        return Date.now() - cacheTime < this.CACHE_DURATION_MS;
    }

    /**
     * Get cached protocols
     */
    async getFromCache<T>(): Promise<CacheResult<T>> {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (!cached) {
                return { data: [], isStale: false, metadata: null, source: 'memory' };
            }

            const isValid = await this.isCacheValid();
            const timestamp = localStorage.getItem(this.CACHE_TIMESTAMP_KEY);

            return {
                data: JSON.parse(cached) as T[],
                isStale: !isValid,
                metadata: timestamp ? { lastUpdated: new Date(parseInt(timestamp, 10)).toISOString() } : null,
                source: 'localstorage'
            };
        } catch (error) {
            logger.error('Error reading protocols cache', error, 'ProtocolsCacheService');
            return { data: [], isStale: false, metadata: null, source: 'memory' };
        }
    }

    /**
     * Save protocols to cache
     */
    async saveToCache<T>(data: T[]): Promise<void> {
        try {
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(this.CACHE_TIMESTAMP_KEY, Date.now().toString());
        } catch (error) {
            logger.error('Error caching protocols', error, 'ProtocolsCacheService');
        }
    }

    /**
     * Clear the protocols cache
     */
    async clearCache(): Promise<void> {
        try {
            localStorage.removeItem(this.CACHE_KEY);
            localStorage.removeItem(this.CACHE_TIMESTAMP_KEY);
        } catch (error) {
            logger.error('Error clearing protocols cache', error, 'ProtocolsCacheService');
        }
    }

    /**
     * Get cache age in minutes
     */
    getCacheAgeMinutes(): number {
        const timestamp = localStorage.getItem(this.CACHE_TIMESTAMP_KEY);
        if (!timestamp) return Infinity;
        return Math.round((Date.now() - parseInt(timestamp, 10)) / 60000);
    }
}

export const protocolsCacheService = new ProtocolsCacheService();
