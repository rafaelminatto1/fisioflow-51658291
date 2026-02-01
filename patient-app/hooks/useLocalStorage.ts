/**
 * useLocalStorage Hook
 * Sync state with AsyncStorage
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  // Load from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(key).then((value) => {
      if (value !== null) {
        try {
          setStoredValue(JSON.parse(value));
        } catch {
          setStoredValue(value as T);
        }
      }
      setIsLoading(false);
    });
  }, [key]);

  // Return a wrapped version of useState's setter function that
  // persists the new value to AsyncStorage.
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        AsyncStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error saving to localStorage for key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from localStorage for key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * Synced local storage - syncs with a remote source (like Firestore)
 */
export function useSyncedLocalStorage<T>(
  key: string,
  initialValue: T,
  remoteSource: () => Promise<T>
): [T, (value: T) => void, boolean, () => void] {
  const [localValue, setLocalValue] = useState<T>(initialValue);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load from storage on mount
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const value = await AsyncStorage.getItem(key);
        if (value !== null) {
          setLocalValue(JSON.parse(value));
        } else {
          // No local value, fetch from remote
          const remoteValue = await remoteSource();
          setLocalValue(remoteValue);
          await AsyncStorage.setItem(key, JSON.stringify(remoteValue));
        }
      } catch (error) {
        console.error(`Error loading from localStorage for key "${key}":`, error);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [key]);

  const setValue = async (value: T) => {
    setLocalValue(value);
    setIsSyncing(true);

    try {
      // Save locally first
      await AsyncStorage.setItem(key, JSON.stringify(value));

      // Then sync to remote (in background)
      // This would be implemented based on your sync strategy
    } catch (error) {
      console.error(`Error saving to localStorage for key "${key}":`, error);
    } finally {
      setIsSyncing(false);
    }
  };

  const reSync = async () => {
    setIsSyncing(true);
    try {
      const remoteValue = await remoteSource();
      setLocalValue(remoteValue);
      await AsyncStorage.setItem(key, JSON.stringify(remoteValue));
    } catch (error) {
      console.error(`Error resyncing for key "${key}":`, error);
    } finally {
      setIsSyncing(false);
    }
  };

  return [localValue, setValue, isLoading || isSyncing, reSync];
}
