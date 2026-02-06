/**
 * Storage Utilities
 * Helper functions for AsyncStorage with better error handling and typing
 */


/**
 * Storage utility with typed operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from './logger';
import { STORAGE_KEYS } from './constants';

export const Storage = {
  /**
   * Get a value from storage
   */
  async get<T = string>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) {
        return null;
      }
      // Try to parse as JSON, fall back to string
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      log.error('STORAGE', `Failed to get key: ${key}`, error);
      return null;
    }
  },

  /**
   * Set a value in storage
   */
  async set<T>(key: string, value: T): Promise<boolean> {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      await AsyncStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      log.error('STORAGE', `Failed to set key: ${key}`, error);
      return false;
    }
  },

  /**
   * Remove a value from storage
   */
  async remove(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      log.error('STORAGE', `Failed to remove key: ${key}`, error);
      return false;
    }
  },

  /**
   * Clear all values from storage
   */
  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      log.error('STORAGE', 'Failed to clear storage', error);
      return false;
    }
  },

  /**
   * Get all keys from storage
   */
  async getAllKeys(): Promise<string[]> {
    try {
      return [...(await AsyncStorage.getAllKeys())];
    } catch (error) {
      log.error('STORAGE', 'Failed to get all keys', error);
      return [];
    }
  },

  /**
   * Get multiple values from storage
   */
  async getMultiple<T = any>(keys: string[]): Promise<Record<string, T | null>> {
    try {
      const values = await AsyncStorage.multiGet(keys);
      const result: Record<string, T | null> = {};

      for (const [key, value] of values) {
        if (value === null) {
          result[key] = null;
        } else {
          try {
            result[key] = JSON.parse(value) as T;
          } catch {
            result[key] = value as T;
          }
        }
      }

      return result;
    } catch (error) {
      log.error('STORAGE', `Failed to get multiple keys: ${keys.join(', ')}`, error);
      return {};
    }
  },

  /**
   * Set multiple values in storage
   */
  async setMultiple<T>(entries: Array<[string, T]>): Promise<boolean> {
    try {
      const serializedEntries = entries.map(([key, value]) => [
        key,
        typeof value === 'string' ? value : JSON.stringify(value),
      ] as [string, string]);
      await AsyncStorage.multiSet(serializedEntries);
      return true;
    } catch (error) {
      log.error('STORAGE', 'Failed to set multiple values', error);
      return false;
    }
  },

  /**
   * Remove multiple values from storage
   */
  async removeMultiple(keys: string[]): Promise<boolean> {
    try {
      await AsyncStorage.multiRemove(keys);
      return true;
    } catch (error) {
      log.error('STORAGE', `Failed to remove multiple keys: ${keys.join(', ')}`, error);
      return false;
    }
  },

  /**
   * Check if a key exists in storage
   */
  async has(key: string): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value !== null;
    } catch (error) {
      log.error('STORAGE', `Failed to check key: ${key}`, error);
      return false;
    }
  },
};

/**
 * Typed storage helpers for common app data
 */
export const AppStorage = {
  // Onboarding
  async setOnboardingCompleted(): Promise<boolean> {
    return Storage.set(STORAGE_KEYS.ONBOARDING_COMPLETED, true);
  },
  async isOnboardingCompleted(): Promise<boolean> {
    return (await Storage.get<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETED)) || false;
  },

  // Notification prompt
  async setNotificationPromptShown(): Promise<boolean> {
    return Storage.set(STORAGE_KEYS.NOTIFICATION_PROMPT_SHOWN, true);
  },
  async wasNotificationPromptShown(): Promise<boolean> {
    return (await Storage.get<boolean>(STORAGE_KEYS.NOTIFICATION_PROMPT_SHOWN)) || false;
  },

  // Settings
  async getSettings(): Promise<Record<string, boolean>> {
    const keys = [
      STORAGE_KEYS.SETTINGS_NOTIFICATIONS,
      STORAGE_KEYS.SETTINGS_EXERCISE_REMINDERS,
      STORAGE_KEYS.SETTINGS_APPOINTMENT_REMINDERS,
      STORAGE_KEYS.SETTINGS_AUTO_PLAY_VIDEOS,
      STORAGE_KEYS.SETTINGS_HAPTIC_FEEDBACK,
    ];
    const values = await Storage.getMultiple<boolean>(keys);
    return {
      notifications: values[keys[0]] ?? true,
      exerciseReminders: values[keys[1]] ?? true,
      appointmentReminders: values[keys[2]] ?? true,
      autoPlayVideos: values[keys[3]] ?? false,
      hapticFeedback: values[keys[4]] ?? true,
    };
  },
  async setSetting(key: string, value: boolean): Promise<boolean> {
    return Storage.set(key, value);
  },

  // Cache
  async setCachedData<T>(key: string, data: T, ttl?: number): Promise<boolean> {
    const cacheKey = `${STORAGE_KEYS.CACHED_DATA_PREFIX}${key}`;
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    return Storage.set(cacheKey, cacheEntry);
  },
  async getCachedData<T>(key: string): Promise<T | null> {
    const cacheKey = `${STORAGE_KEYS.CACHED_DATA_PREFIX}${key}`;
    const entry = await Storage.get<{ data: T; timestamp: number; ttl?: number }>(cacheKey);

    if (!entry) {
      return null;
    }

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      await Storage.remove(cacheKey);
      return null;
    }

    return entry.data;
  },
  async clearCache(): Promise<boolean> {
    const allKeys = await Storage.getAllKeys();
    const cacheKeys = allKeys.filter(key => key.startsWith(STORAGE_KEYS.CACHED_DATA_PREFIX));
    if (cacheKeys.length === 0) {
      return true;
    }
    return Storage.removeMultiple(cacheKeys);
  },

  // Offline queue
  async getOfflineQueue(): Promise<any[]> {
    const queue = await Storage.get<any[]>(STORAGE_KEYS.OFFLINE_QUEUE);
    return queue || [];
  },
  async setOfflineQueue(queue: any[]): Promise<boolean> {
    return Storage.set(STORAGE_KEYS.OFFLINE_QUEUE, queue);
  },
  async clearOfflineQueue(): Promise<boolean> {
    return Storage.remove(STORAGE_KEYS.OFFLINE_QUEUE);
  },
};

/**
 * Storage size utilities
 */
export const StorageSize = {
  /**
   * Get approximate size of all stored data
   */
  async getSize(): Promise<number> {
    try {
      const keys = await Storage.getAllKeys();
      const values = await AsyncStorage.multiGet(keys);
      let totalSize = 0;

      for (const [, value] of values) {
        if (value) {
          totalSize += value.length * 2; // UTF-16 uses 2 bytes per character
        }
      }

      return totalSize;
    } catch (error) {
      log.error('STORAGE', 'Failed to calculate storage size', error);
      return 0;
    }
  },

  /**
   * Get human-readable storage size
   */
  async getReadableSize(): Promise<string> {
    const bytes = await StorageSize.getSize();

    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  },

  /**
   * Get count of stored items
   */
  async getItemCount(): Promise<number> {
    try {
      const keys = await Storage.getAllKeys();
      return keys.length;
    } catch (error) {
      log.error('STORAGE', 'Failed to get item count', error);
      return 0;
    }
  },
};

/**
 * Debug utilities for storage
 */
export const StorageDebug = {
  /**
   * Log all stored keys and values (development only)
   */
  async logAll(): Promise<void> {
    if (!__DEV__) return;

    try {
      const keys = await Storage.getAllKeys();
      const values = await AsyncStorage.multiGet(keys);

      log.info('STORAGE_DEBUG', `Total items: ${keys.length}`);

      for (const [key, value] of values) {
        const preview = value ? (value.length > 100 ? `${value.slice(0, 100)}...` : value) : 'null';
        log.debug('STORAGE_DEBUG', `${key}: ${preview}`);
      }
    } catch (error) {
      log.error('STORAGE_DEBUG', 'Failed to log all items', error);
    }
  },

  /**
   * Clear all stored data (development only)
   */
  async clearAll(): Promise<boolean> {
    if (!__DEV__) {
      log.warn('STORAGE_DEBUG', 'clearAll is only available in development');
      return false;
    }

    log.warn('STORAGE_DEBUG', 'Clearing all storage data');
    return Storage.clear();
  },
};
