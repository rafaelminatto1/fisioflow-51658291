/**
 * PHI Cache Manager Service
 * 
 * Manages in-memory caches of decrypted PHI data.
 * Provides centralized clearing of sensitive data when app goes to background.
 * 
 * Features:
 * - Tracks all in-memory PHI caches
 * - Clears decrypted data after 5 minutes in background
 * - Keeps encrypted data for offline access
 * - Logs operations without exposing PHI
 * 
 * Requirements: 2.11
 */

/**
 * Interface for cache instances that can be cleared
 */
export interface ClearableCache {
  clear(): void;
  size(): number;
}

/**
 * PHI Cache Manager
 * Singleton service to manage all PHI caches in the app
 */
class PHICacheManager {
  private static instance: PHICacheManager;
  private caches: Map<string, ClearableCache> = new Map();
  private backgroundTimer: NodeJS.Timeout | null = null;
  private backgroundTimestamp: number | null = null;

  private constructor() {
    console.log('[PHICacheManager] Initialized');
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PHICacheManager {
    if (!PHICacheManager.instance) {
      PHICacheManager.instance = new PHICacheManager();
    }
    return PHICacheManager.instance;
  }

  /**
   * Register a cache to be managed
   * 
   * @param name - Unique name for the cache (e.g., 'photos', 'soap-notes')
   * @param cache - Cache instance with clear() method
   */
  registerCache(name: string, cache: ClearableCache): void {
    this.caches.set(name, cache);
    console.log(`[PHICacheManager] Registered cache: ${name}`);
  }

  /**
   * Unregister a cache
   * 
   * @param name - Cache name to unregister
   */
  unregisterCache(name: string): void {
    this.caches.delete(name);
    console.log(`[PHICacheManager] Unregistered cache: ${name}`);
  }

  /**
   * Clear all registered PHI caches
   * Called when app goes to background for 5+ minutes or on logout
   */
  clearAllCaches(): void {
    console.log('[PHICacheManager] Clearing all PHI caches');
    
    let totalCleared = 0;
    this.caches.forEach((cache, name) => {
      const size = cache.size();
      cache.clear();
      totalCleared += size;
      console.log(`[PHICacheManager] Cleared cache: ${name} (${size} items)`);
    });

    console.log(`[PHICacheManager] Total items cleared: ${totalCleared}`);
  }

  /**
   * Handle app going to background
   * Starts a 5-minute timer to clear caches
   */
  onAppBackground(): void {
    this.backgroundTimestamp = Date.now();
    console.log('[PHICacheManager] App backgrounded, starting 5-minute timer');

    // Clear any existing timer
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
    }

    // Set 5-minute timer to clear caches
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    this.backgroundTimer = setTimeout(() => {
      console.log('[PHICacheManager] 5 minutes elapsed in background, clearing caches');
      this.clearAllCaches();
      this.backgroundTimer = null;
    }, FIVE_MINUTES_MS);
  }

  /**
   * Handle app returning to foreground
   * Cancels the background timer if app returns before 5 minutes
   */
  onAppForeground(): void {
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
      this.backgroundTimer = null;
      
      const timeInBackground = this.backgroundTimestamp 
        ? Date.now() - this.backgroundTimestamp 
        : 0;
      const seconds = Math.floor(timeInBackground / 1000);
      
      console.log(`[PHICacheManager] App foregrounded after ${seconds}s, timer cancelled`);
    }
    
    this.backgroundTimestamp = null;
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): { name: string; size: number }[] {
    const stats: { name: string; size: number }[] = [];
    
    this.caches.forEach((cache, name) => {
      stats.push({
        name,
        size: cache.size(),
      });
    });

    return stats;
  }

  /**
   * Check if any caches have data
   */
  hasData(): boolean {
    for (const cache of this.caches.values()) {
      if (cache.size() > 0) {
        return true;
      }
    }
    return false;
  }
}

// Export singleton instance
export const phiCacheManager = PHICacheManager.getInstance();
