/**
 * Funções seguras para parsing de JSON
 *
 * Evita erros em runtime quando JSON está malformado ou corrompido.
 */


/**
 * Parse seguro de JSON com fallback
 *
 * @param json - String JSON para parsear
 * @param fallback - Valor a retornar em caso de erro
 * @returns Objeto parseado ou fallback
 */

import { fisioLogger } from '@/lib/errors/logger';

export function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (json === null || json === undefined) {
    return fallback;
  }

  if (typeof json !== 'string') {
    return fallback;
  }

  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Parse seguro de JSON com log de erro
 */
export function safeJsonParseWithLog<T>(
  json: string | null | undefined,
  fallback: T,
  context: string = 'Unknown'
): T {
  if (json === null || json === undefined) {
    return fallback;
  }

  if (typeof json !== 'string') {
    fisioLogger.warn('safeJsonParse: input is not a string', { context }, 'safeJson');
    return fallback;
  }

  try {
    return JSON.parse(json) as T;
  } catch (error) {
    fisioLogger.warn('safeJsonParse: failed to parse JSON', {
      context,
      json: json.substring(0, 100) + (json.length > 100 ? '...' : ''),
      error: error instanceof Error ? error.message : String(error)
    }, 'safeJson');
    return fallback;
  }
}

/**
 * Stringify seguro de JSON com fallback
 */
export function safeJsonStringify(obj: unknown, fallback: string): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return fallback;
  }
}
