/**
 * Firebase Performance Monitoring
 *
 * Rastreia performance de operações críticas no app
 */

import { trace } from 'firebase/performance';
import { getPerformance } from 'firebase/performance';
import { app as firebaseApp } from '@/integrations/firebase/app';
import { logger } from '@/lib/errors/logger';

let perfInstance: ReturnType<typeof getPerformance> | null = null;

/**
 * Inicializa o Performance Monitoring
 */
export function initPerformanceMonitoring() {
  try {
    if (perfInstance) return perfInstance;

    perfInstance = getPerformance(firebaseApp);
    logger.info('[Performance] Monitoring inicializado');
    return perfInstance;
  } catch (error) {
    logger.error('[Performance] Erro ao inicializar:', error);
    return null;
  }
}

/**
 * Wrapper para medir performance de uma função assíncrona
 *
 * @param name Nome do trace
 * @param fn Função a ser executada
 * @returns Resultado da função
 */
export async function withPerformanceTrace<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const perf = initPerformanceMonitoring();
  if (!perf) {
    return fn();
  }

  const t = trace(perf, name);
  await t.start();

  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    logger.debug(`[Performance] ${name}: ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[Performance] ${name} falhou após ${duration}ms:`, error);
    throw error;
  } finally {
    await t.stop();
  }
}

/**
 * Wrapper para medir performance de uma função síncrona
 *
 * @param name Nome do trace
 * @param fn Função a ser executada
 * @returns Resultado da função
 */
export function withPerformanceTraceSync<T>(
  name: string,
  fn: () => T
): T {
  const perf = initPerformanceMonitoring();
  if (!perf) {
    return fn();
  }

  const startTime = Date.now();

  try {
    const result = fn();
    const duration = Date.now() - startTime;
    logger.debug(`[Performance] ${name}: ${duration}ms`);

    // Adicionar métrica customizada
    const t = trace(perf, name);
    t.putMetric('duration', duration);
    t.record();

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[Performance] ${name} falhou após ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Mede tempo de uma operação manualmente
 *
 * @param name Nome da métrica
 * @returns Função para finalizar a medição
 */
export function startTimer(name: string) {
  const startTime = Date.now();

  return {
    end: (customAttributes?: Record<string, string>) => {
      const duration = Date.now() - startTime;
      const perf = initPerformanceMonitoring();

      if (perf) {
        const t = trace(perf, name);
        t.putMetric('duration', duration);

        if (customAttributes) {
          Object.entries(customAttributes).forEach(([key, value]) => {
            t.putAttribute(key, value);
          });
        }

        t.record();
      }

      logger.debug(`[Performance] ${name}: ${duration}ms`);
      return duration;
    }
  };
}

/**
 * Rastreia performance de network request
 */
export async function traceNetworkRequest<T>(
  url: string,
  fn: () => Promise<T>
): Promise<T> {
  return withPerformanceTrace(`network_request_${url}`, fn);
}

/**
 * Rastreia performance de query do Firestore
 */
export async function traceFirestoreQuery<T>(
  collection: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return withPerformanceTrace(`firestore_${collection}_${operation}`, fn);
}

/**
 * Rastreia performance de operação AI
 */
export async function traceAIOperation<T>(
  model: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return withPerformanceTrace(`ai_${model}_${operation}`, fn);
}
