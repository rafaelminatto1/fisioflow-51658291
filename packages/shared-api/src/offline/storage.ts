import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@fisioflow:';

// Storage keys
export const STORAGE_KEYS = {
  // Auth
  USER: `${PREFIX}user`,
  AUTH_TOKEN: `${PREFIX}auth_token`,

  // Patients
  PATIENTS: `${PREFIX}patients`,
  PATIENT_CACHE: (id: string) => `${PREFIX}patient:${id}`,

  // Appointments
  APPOINTMENTS: `${PREFIX}appointments`,
  APPOINTMENT_CACHE: (id: string) => `${PREFIX}appointment:${id}`,
  APPOINTMENTS_DATE: (date: string) => `${PREFIX}appointments:${date}`,

  // Exercises
  EXERCISES: `${PREFIX}exercises`,
  EXERCISE_PROGRESS: (id: string) => `${PREFIX}exercise_progress:${id}`,
  TODAY_EXERCISES: `${PREFIX}today_exercises`,

  // Progress
  PROGRESS_STATS: `${PREFIX}progress_stats`,
  PAIN_LOGS: `${PREFIX}pain_logs`,
  ACHIEVEMENTS: `${PREFIX}achievements`,

  // Sync
  PENDING_OPERATIONS: `${PREFIX}pending_ops`,
  LAST_SYNC: `${PREFIX}last_sync`,
  SYNC_QUEUE: `${PREFIX}sync_queue`,

  // Settings
  NOTIFICATIONS_ENABLED: `${PREFIX}notifications_enabled`,
  DARK_MODE: `${PREFIX}dark_mode`,
  LANGUAGE: `${PREFIX}language`,
};

/**
 * Generic storage operations with error handling
 */
class StorageService {
  /**
   * Get an item from storage
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`StorageService.get error for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Set an item in storage
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`StorageService.set error for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Remove an item from storage
   */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`StorageService.remove error for key "${key}":`, error);
    }
  }

  /**
   * Clear all items with the FisioFlow prefix
   */
  async clear(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const fisioflowKeys = allKeys.filter(key => key.startsWith(PREFIX));
      await AsyncStorage.multiRemove(fisioflowKeys);
    } catch (error) {
      console.error('StorageService.clear error:', error);
    }
  }

  /**
   * Get multiple items
   */
  async getMultiple<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await AsyncStorage.multiGet(keys);
      return values.map(([_, value]) => {
        if (value === null) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      console.error('StorageService.getMultiple error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple items
   */
  async setMultiple<T>(items: Array<{ key: string; value: T }>): Promise<void> {
    try {
      const keyValuePairs = items.map(({ key, value }) => [
        key,
        JSON.stringify(value),
      ]);
      await AsyncStorage.multiSet(keyValuePairs as Array<[string, string]>);
    } catch (error) {
      console.error('StorageService.setMultiple error:', error);
      throw error;
    }
  }

  /**
   * Get storage size information
   */
  async getStorageInfo(): Promise<{ size: number; keys: string[] }> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const fisioflowKeys = allKeys.filter(key => key.startsWith(PREFIX));

      let totalSize = 0;
      for (const key of fisioflowKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }

      return {
        size: totalSize,
        keys: fisioflowKeys,
      };
    } catch (error) {
      console.error('StorageService.getStorageInfo error:', error);
      return { size: 0, keys: [] };
    }
  }

  /**
   * Get all cached data for a specific collection
   */
  async getCollection<T>(collectionKey: string): Promise<T[]> {
    try {
      const data = await this.get<T[]>(collectionKey);
      return data || [];
    } catch (error) {
      console.error(`StorageService.getCollection error for "${collectionKey}":`, error);
      return [];
    }
  }

  /**
   * Update a single item in a cached collection
   */
  async updateCollectionItem<T>(
    collectionKey: string,
    itemId: string,
    item: T
  ): Promise<void> {
    try {
      const collection = await this.getCollection<T>(collectionKey);
      const index = collection.findIndex((i: any) => i.id === itemId);

      if (index >= 0) {
        collection[index] = item;
      } else {
        collection.push(item);
      }

      await this.set(collectionKey, collection);
    } catch (error) {
      console.error('StorageService.updateCollectionItem error:', error);
      throw error;
    }
  }

  /**
   * Remove an item from a cached collection
   */
  async removeCollectionItem(
    collectionKey: string,
    itemId: string
  ): Promise<void> {
    try {
      const collection = await this.getCollection(collectionKey);
      const filtered = (collection as any[]).filter(item => item.id !== itemId);
      await this.set(collectionKey, filtered);
    } catch (error) {
      console.error('StorageService.removeCollectionItem error:', error);
      throw error;
    }
  }
}

export const storage = new StorageService();

/**
 * Helper functions for common storage operations
 */

// User data
export async function getUser(): Promise<any> {
  return storage.get(STORAGE_KEYS.USER);
}

export async function setUser(user: any): Promise<void> {
  return storage.set(STORAGE_KEYS.USER, user);
}

export async function clearUser(): Promise<void> {
  return storage.remove(STORAGE_KEYS.USER);
}

// Patients
export async function getCachedPatients(): Promise<any[]> {
  return storage.getCollection(STORAGE_KEYS.PATIENTS);
}

export async function setCachedPatients(patients: any[]): Promise<void> {
  return storage.set(STORAGE_KEYS.PATIENTS, patients);
}

export async function getCachedPatient(id: string): Promise<any> {
  return storage.get(STORAGE_KEYS.PATIENT_CACHE(id));
}

export async function setCachedPatient(id: string, patient: any): Promise<void> {
  return storage.set(STORAGE_KEYS.PATIENT_CACHE(id), patient);
}

// Appointments
export async function getCachedAppointments(): Promise<any[]> {
  return storage.getCollection(STORAGE_KEYS.APPOINTMENTS);
}

export async function setCachedAppointments(appointments: any[]): Promise<void> {
  return storage.set(STORAGE_KEYS.APPOINTMENTS, appointments);
}

export async function getCachedAppointmentsForDate(date: string): Promise<any[]> {
  return storage.get(STORAGE_KEYS.APPOINTMENTS_DATE(date)) || [];
}

export async function setCachedAppointmentsForDate(
  date: string,
  appointments: any[]
): Promise<void> {
  return storage.set(STORAGE_KEYS.APPOINTMENTS_DATE(date), appointments);
}

// Exercises
export async function getCachedExercises(): Promise<any[]> {
  return storage.getCollection(STORAGE_KEYS.EXERCISES);
}

export async function setCachedExercises(exercises: any[]): Promise<void> {
  return storage.set(STORAGE_KEYS.EXERCISES, exercises);
}

export async function getExerciseProgress(exerciseId: string): Promise<any> {
  return storage.get(STORAGE_KEYS.EXERCISE_PROGRESS(exerciseId));
}

export async function setExerciseProgress(
  exerciseId: string,
  progress: any
): Promise<void> {
  return storage.set(STORAGE_KEYS.EXERCISE_PROGRESS(exerciseId), progress);
}

export async function getTodayExercises(): Promise<any[]> {
  return storage.get(STORAGE_KEYS.TODAY_EXERCISES) || [];
}

export async function setTodayExercises(exercises: any[]): Promise<void> {
  return storage.set(STORAGE_KEYS.TODAY_EXERCISES, exercises);
}

// Progress
export async function getProgressStats(): Promise<any> {
  return storage.get(STORAGE_KEYS.PROGRESS_STATS);
}

export async function setProgressStats(stats: any): Promise<void> {
  return storage.set(STORAGE_KEYS.PROGRESS_STATS, stats);
}

export async function getPainLogs(): Promise<any[]> {
  return storage.getCollection(STORAGE_KEYS.PAIN_LOGS);
}

export async function setPainLogs(logs: any[]): Promise<void> {
  return storage.set(STORAGE_KEYS.PAIN_LOGS, logs);
}

export async function addPainLog(log: any): Promise<void> {
  const logs = await getPainLogs();
  logs.push(log);
  return storage.set(STORAGE_KEYS.PAIN_LOGS, logs);
}

export async function getAchievements(): Promise<any[]> {
  return storage.getCollection(STORAGE_KEYS.ACHIEVEMENTS);
}

export async function setAchievements(achievements: any[]): Promise<void> {
  return storage.set(STORAGE_KEYS.ACHIEVEMENTS, achievements);
}

// Sync
export async function getLastSync(): Promise<number | null> {
  return storage.get<number>(STORAGE_KEYS.LAST_SYNC);
}

export async function setLastSync(timestamp: number): Promise<void> {
  return storage.set(STORAGE_KEYS.LAST_SYNC, timestamp);
}

export async function getPendingOperations(): Promise<any[]> {
  return storage.getCollection(STORAGE_KEYS.PENDING_OPERATIONS);
}

export async function addPendingOperation(operation: any): Promise<void> {
  const ops = await getPendingOperations();
  ops.push(operation);
  return storage.set(STORAGE_KEYS.PENDING_OPERATIONS, ops);
}

export async function removePendingOperation(opId: string): Promise<void> {
  return storage.removeCollectionItem(STORAGE_KEYS.PENDING_OPERATIONS, opId);
}

export async function clearPendingOperations(): Promise<void> {
  return storage.remove(STORAGE_KEYS.PENDING_OPERATIONS);
}

// Settings
export async function getNotificationsEnabled(): Promise<boolean> {
  return storage.get<boolean>(STORAGE_KEYS.NOTIFICATIONS_ENABLED) ?? true;
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  return storage.set(STORAGE_KEYS.NOTIFICATIONS_ENABLED, enabled);
}

export async function getDarkMode(): Promise<boolean> {
  return storage.get<boolean>(STORAGE_KEYS.DARK_MODE) ?? false;
}

export async function setDarkMode(enabled: boolean): Promise<void> {
  return storage.set(STORAGE_KEYS.DARK_MODE, enabled);
}

export async function getLanguage(): Promise<string> {
  return storage.get<string>(STORAGE_KEYS.LANGUAGE) ?? 'pt-BR';
}

export async function setLanguage(language: string): Promise<void> {
  return storage.set(STORAGE_KEYS.LANGUAGE, language);
}
