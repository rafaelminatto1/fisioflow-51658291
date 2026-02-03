/**
 * Funções seguras para localStorage e sessionStorage
 */

function isLocalStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  if (!isLocalStorageAvailable()) return fallback;

  try {
    const item = localStorage.getItem(key);
    if (item === null) return fallback;
    try {
      return JSON.parse(item) as T;
    } catch {
      return item as unknown as T;
    }
  } catch {
    return fallback;
  }
}

export function safeLocalStorageSet(key: string, value: unknown): boolean {
  if (!isLocalStorageAvailable()) return false;

  try {
    const item = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, item);
    return true;
  } catch {
    return false;
  }
}

export function safeLocalStorageRemove(key: string): boolean {
  if (!isLocalStorageAvailable()) return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
