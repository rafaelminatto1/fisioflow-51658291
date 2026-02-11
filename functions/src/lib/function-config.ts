import { CORS_ORIGINS } from '../init';

/**
 * Firebase Functions Optimization Configuration
 *
 * Presets otimizados para diferentes tipos de funções
 * Baseado em testes de carga e padrões de uso
 */

// Tipo para opções de função (regional) - usando `as any` para compatibilidade
export type FunctionOptions = any;

// ============================================================================
// CONFIGURAÇÕES GLOBAIS (usadas no setGlobalOptions)
// ============================================================================

export const GLOBAL_OPTIONS = {
  region: 'southamerica-east1' as const,
  // Aumentado para permitir mais instâncias concorrentes
  maxInstances: 10,
  // Memória suficiente para operações normais
  memory: '256MiB' as const,
  // CPU balanceado para custo/benefício
  cpu: 0.5 as const,
  timeoutSeconds: 60,
  concurrency: 10, // Permite até 10 requisições por instância
  minInstances: 0,
};

// ============================================================================
// PRESETS POR TIPO DE FUNÇÃO
// ============================================================================

/**
 * Funções simples (CRUD básico)
 * Baixa CPU, memória baixa, escalam rapidamente
 */
export const SIMPLE_FUNCTION: FunctionOptions = {
  region: 'southamerica-east1',
  memory: '128MiB',
  maxInstances: 50,
  cpu: 0.1,
  timeoutSeconds: 30,
  concurrency: 20,
};

/**
 * Funções padrão de API
 * Memória moderada, CPU moderada
 * Nota: concurrency > 1 requer cpu >= 1
 */
export const STANDARD_FUNCTION: FunctionOptions = {
  region: 'southamerica-east1',
  memory: '256MiB',
  maxInstances: 20,
  cpu: 1,
  timeoutSeconds: 60,
  concurrency: 10,
};

/**
 * Funções com queries de banco complexas
 * Mais memória para processar resultados
 * Nota: concurrency > 1 requer cpu >= 1
 */
export const DATABASE_FUNCTION: FunctionOptions = {
  region: 'southamerica-east1',
  memory: '512MiB',
  maxInstances: 10,
  cpu: 1,
  timeoutSeconds: 120,
  concurrency: 1, // Mantém 1 para operações pesadas de DB
};

/**
 * Funções de IA (processamento pesado)
 * Máxima CPU e memória para processamento
 */
export const AI_FUNCTION: FunctionOptions = {
  region: 'southamerica-east1',
  memory: '1GiB',
  maxInstances: 3, // Limitado para controlar custos de GPU/API
  cpu: 2,
  timeoutSeconds: 300, // 5 minutos para operações de IA
  concurrency: 1,
};

/**
 * Funções de IA críticas (prioritárias)
 * Com minInstances para reduzir cold start
 */
export const AI_FUNCTION_CRITICAL: FunctionOptions = {
  region: 'southamerica-east1',
  memory: '1GiB',
  maxInstances: 3,
  cpu: 2,
  timeoutSeconds: 540, // 9 minutos (máximo)
  concurrency: 1,
  minInstances: 1, // Mantém 1 instância sempre quente
};

/**
 * Funções de longa duração (migrations, reports)
 * Muito tempo de processamento
 */
export const LONG_RUNNING_FUNCTION: FunctionOptions = {
  region: 'southamerica-east1',
  memory: '1GiB',
  maxInstances: 2,
  cpu: 1,
  timeoutSeconds: 540, // 9 minutos
  concurrency: 1,
};

/**
 * Funções de webhook (precisam responder rápido)
 * Baixa latência, processamento rápido
 */
export const WEBHOOK_FUNCTION: FunctionOptions = {
  region: 'southamerica-east1',
  memory: '256MiB',
  maxInstances: 30,
  cpu: 0.5,
  timeoutSeconds: 30,
  concurrency: 20,
};

export const EVOLUTION_HTTP_OPTS = withCors(DATABASE_FUNCTION, CORS_ORIGINS);

/**
 * Funções com CORS HTTP
 * Para chamadas diretas do navegador
 */
export function withCors(opts: FunctionOptions, corsOrigins: string[] | boolean): FunctionOptions {
  return {
    ...opts,
    cors: corsOrigins,
    invoker: 'public' as const,
  };
}

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

/**
 * Cache em memória para reduzir chamadas repetitivas
 */
export class SimpleCache<T> {
  private cache = new Map<string, { value: T; expires: number }>();
  private ttl: number;

  constructor(ttlMs: number = 60000) {
    this.ttl = ttlMs;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + this.ttl,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove entradas expiradas
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Cache global para organization ID (reduz queries repetidas)
 */
export const organizationCache = new SimpleCache<string>(300000); // 5 minutos

/**
 * Cache para resultados de queries frequentes
 */
export const queryCache = new SimpleCache<any>(60000); // 1 minuto

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Wrapper para função com retry automático
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError;
}

/**
 * Mede tempo de execução de uma função
 */
export async function measureTime<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    console.log(`[Performance] ${label}: ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[Performance] ${label}: FAILED after ${duration}ms`);
    throw error;
  }
}

/**
 * Limita taxa de execução (rate limiting por chave)
 */
export class RateLimiter {
  private requests = new Map<string, number[]>();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  check(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove requisições antigas
    const validRequests = requests.filter(t => now - t < this.windowMs);
    this.requests.set(key, validRequests);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(t => now - t < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

/**
 * Rate limiter global para funções (100 requisições/minuto por IP)
 */
export const globalRateLimiter = new RateLimiter(60000, 100);
