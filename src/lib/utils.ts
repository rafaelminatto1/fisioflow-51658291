import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper seguro para formatação de data
export const safeFormat = (date: Date | string | number | undefined | null, formatStr: string, options?: { locale?: typeof ptBR }) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (!isValid(d)) return 'Data inválida';
  return format(d, formatStr, options || { locale: ptBR });
};

export const formatCurrency = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatDate = (
  date: Date | string,
  pattern: string = 'dd/MM/yyyy'
): string => {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Invalid Date';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return pattern
      .replace('dd', day)
      .replace('MM', month)
      .replace('yyyy', String(year));
  } catch {
    return 'Invalid Date';
  }
};

export const formatPhone = (phone: string): string => {
  if (!phone || phone === 'invalid') return phone;

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length < 10) return phone;

  if (cleaned.length === 10) {
    // Telefone fixo: (11) 2345-6789
    const ddd = cleaned.slice(0, 2);
    const first = cleaned.slice(2, 6);
    const second = cleaned.slice(6);
    return `(${ddd}) ${first}-${second}`;
  }

  if (cleaned.length === 11) {
    // Celular: (11) 98765-4321
    const ddd = cleaned.slice(0, 2);
    const first = cleaned.slice(2, 7);
    const second = cleaned.slice(7);
    return `(${ddd}) ${first}-${second}`;
  }

  if (cleaned.length === 12) {
    // Com código do país + telefone fixo
    const ddd = cleaned.slice(2, 4);
    const first = cleaned.slice(4, 8);
    const second = cleaned.slice(8);
    return `(${ddd}) ${first}-${second}`;
  }

  if (cleaned.length === 13) {
    // Com código do país + celular de 9 dígitos
    const ddd = cleaned.slice(2, 4);
    const first = cleaned.slice(4, 9);
    const second = cleaned.slice(9);
    return `(${ddd}) ${first}-${second}`;
  }

  return phone;
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
    logger.error('Export error', error, 'utils');
    return false;
  }
};

/**
 * Funções utilitárias para mascarar dados sensíveis em logs (LGPD)
 * Estas funções garantem que informações sensíveis não sejam expostas em logs
 */

/**
 * Mascarar email mantendo apenas o primeiro caractere do usuário e o domínio
 * Exemplo: joao.silva@empresa.com -> j***@empresa.com
 */
export function maskEmail(email?: string | null): string {
  if (!email) return '***';
  try {
    const [username, domain] = email.split('@');
    if (!domain) return '***';
    const maskedUsername = username.substring(0, 3) + '***';
    return `${maskedUsername}@${domain}`;
  } catch {
    return '***';
  }
}

/**
 * Mascarar CPF mantendo apenas os primeiros 3 dígitos
 * Exemplo: 123.456.789-00 -> 123.***.***-**
 */
export function maskCPF(cpf?: string | null): string {
  if (!cpf) return '***.***.***-**';
  try {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length < 3) return '***.***.***-**';
    const firstThree = cleaned.substring(0, 3);
    return `${firstThree}.***.***-**`;
  } catch {
    return '***.***.***-**';
  }
}

/**
 * Mascarar telefone mantendo apenas os últimos 4 dígitos
 * Exemplo: (11) 98765-4321 -> (...)-4321
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return '(...) ****-****';
  try {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 4) return '(...) ****-****';
    const lastFour = cleaned.substring(cleaned.length - 4);
    return `(...)-${lastFour}`;
  } catch {
    return '(...) ****-****';
  }
}

/**
 * Mascarar nome mantendo apenas o primeiro nome
 * Exemplo: João Silva Santos -> João
 */
export function maskName(name?: string | null): string {
  if (!name) return '***';
  try {
    const firstName = name.trim().split(' ')[0];
    return firstName;
  } catch {
    return '***';
  }
}

/**
 * Mascarar token/ID mantendo apenas os primeiros 8 caracteres
 * Exemplo: abc123def456 -> abc123de...
 */
export function maskToken(token?: string | null): string {
  if (!token) return '***';
  try {
    if (token.length <= 8) return token.substring(0, 4) + '...';
    return token.substring(0, 8) + '...';
  } catch {
    return '***';
  }
}

/**
 * Mascarar UID mantendo apenas os primeiros 8 caracteres
 */
export function maskUID(uid?: string | null): string {
  return maskToken(uid);
}

// ============================================================================
// PERFORMANCE UTILITIES - Debounce, Throttle, Memoization
// ============================================================================

/**
 * Creates a debounced function that delays invoking `func` until after `wait` milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * Creates a throttled function that only invokes `func` at most once per every `wait` milliseconds.
 *
 * @param func - The function to throttle
 * @param wait - The number of milliseconds to throttle invocations to
 * @returns A throttled version of the function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function throttled(...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - lastTime);

    if (remaining <= 0) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastTime = now;
      func(...args);
    } else if (timeoutId === null) {
      timeoutId = setTimeout(() => {
        lastTime = Date.now();
        timeoutId = null;
        func(...args);
      }, remaining);
    }
  };
}

/**
 * Simple cache with TTL support for memoizing expensive computations
 */
export class SimpleCache<K, V> {
  private cache = new Map<K, { value: V; expiresAt: number }>();
  private readonly defaultTTL: number;

  constructor(defaultTTL: number = 5000) {
    this.defaultTTL = defaultTTL;
  }

  set(key: K, value: V, ttl?: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this.defaultTTL),
    });
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  purge(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}