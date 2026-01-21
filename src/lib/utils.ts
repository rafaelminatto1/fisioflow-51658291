import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn - className utility compatível com web e NativeWind
 *
 * Web: usa clsx + tailwind-merge
 * Native: usa clsx (tailwind-merge não é necessário no NativeWind)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const calculateAge = (birthDate?: string | null): number => {
  if (!birthDate) return 0;
  try {
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  } catch {
    return 0;
  }
};

export const exportToCSV = (data: Record<string, unknown>[], filename: string, headers: string[]) => {
  try {
    const csvContent = [
      headers.join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    return true;
  } catch (error) {
    console.error('Export error:', error);
    return false;
  }
};

/**
 * Platform-safe utilities
 * Detecta se está no navegador/React Native antes de usar APIs específicas
 */

/**
 * Verifica se está no ambiente web (não React Native)
 */
export const isWeb = () => {
  try {
    return typeof window !== 'undefined' &&
           typeof document !== 'undefined' &&
           !navigator.userAgent.includes('ReactNative');
  } catch {
    return false;
  }
};

/**
 * Verifica se está no React Native
 */
export const isNative = () => {
  return !isWeb();
};

/**
 * Copy to clipboard (cross-platform)
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (isWeb()) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // React Native: usar @react-native-clipboard/clipboard
      const Clipboard = await import('@react-native-clipboard/clipboard').then(m => m.default);
      Clipboard.setString(text);
      return true;
    }
  } catch (error) {
    console.error('Copy to clipboard error:', error);
    return false;
  }
};

/**
 * Download file (web-only)
 * Para native, usar FileSystem do React Native
 */
export const downloadFile = (filename: string, content: string, mimeType: string = 'text/csv') => {
  if (isWeb()) {
    try {
      const blob = new Blob([content], { type: mimeType });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      return true;
    } catch (error) {
      console.error('Download error:', error);
      return false;
    }
  }
  // Native: usar expo-file-system ou similar
  console.warn('downloadFile not implemented for native platform');
  return false;
};

/**
 * Delay utility para promises
 */
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Debounce function
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Format date with locale
 */
export const formatDate = (date: Date | string, format: 'short' | 'long' | 'time' = 'short') => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const locale = 'pt-BR';

  const formats = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' } as const,
    long: { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' } as const,
    time: { hour: '2-digit', minute: '2-digit' } as const,
  };

  return new Intl.DateTimeFormat(locale, formats[format]).format(d);
};

/**
 * Format number with thousands separator
 */
export const formatNumber = (value: number, decimals: number = 0) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text: string, maxLength: number = 50) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Generate unique ID
 */
export const generateId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

/**
 * Sleep alias para delay
 */
export const sleep = delay;