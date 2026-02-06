/**
 * Monitor de Performance para Desenvolvimento
 * Fornece métricas em tempo real durante o desenvolvimento
 */


// Só ativo em desenvolvimento

import { useEffect, useRef } from 'react';
import { fisioLogger as logger } from '@/lib/errors/logger';

const IS_DEV = process.env.NODE_ENV === 'development';

interface MetricEntry {
  name: string;
  duration: number;
  timestamp: number;
  type: 'render' | 'effect' | 'query' | 'navigation';
}

class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private entries: MetricEntry[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (IS_DEV && typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // Observer para medir tempo de navegação
    try {
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            const loadTime = navEntry.loadEventEnd - navEntry.fetchStart;

            logger.debug('🚀 Performance: Navigation', {
              domContentLoaded: `${(navEntry.domContentLoadedEventEnd - navEntry.fetchStart).toFixed(0)}ms`,
              loadComplete: `${loadTime.toFixed(0)}ms`,
              domComplete: `${(navEntry.domComplete - navEntry.fetchStart).toFixed(0)}ms`
            }, 'PerformanceMonitor');
          }
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);
    } catch (e) {
      // Navigation timing might not be available
    }

    // Observer para medir tempo de pintura
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            logger.debug(`🎨 ${entry.name}`, { duration: `${(entry as PerformancePaintTiming).startTime.toFixed(0)}ms` }, 'PerformanceMonitor');
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);
    } catch (e) {
      // Paint timing might not be available
    }

    // Observer para long tasks
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask') {
            logger.debug(`⚠️ Long Task detected: ${entry.duration.toFixed(0)}ms`, { entry }, 'PerformanceMonitor');
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);
    } catch (e) {
      // Long task observer might not be available
    }

    // Medir initial load
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.reportSummary();
      }, 1000);
    });
  }

  /**
   * Marca o início de uma operação
   */
  markStart(name: string) {
    if (!IS_DEV) return;
    const key = `perf-${name}`;
    performance.mark(`${key}-start`);
  }

  /**
   * Marca o fim de uma operação e calcula a duração
   */
  markEnd(name: string, type: MetricEntry['type'] = 'render') {
    if (!IS_DEV) return;
    const key = `perf-${name}`;
    performance.mark(`${key}-end`);

    try {
      performance.measure(name, `${key}-start`, `${key}-end`);
      const measure = performance.getEntriesByName(name, 'measure')[0] as PerformanceMeasure;

      if (measure) {
        this.recordMetric(name, measure.duration, type);
        this.cleanup(name);

        // Log se for muito lento
        if (measure.duration > 16) {
          logger.debug(
            `🐌 Performance: ${name} levou ${measure.duration.toFixed(2)}ms (>16ms = 60fps threshold)`,
            undefined,
            'PerformanceMonitor'
          );
        } else if (measure.duration > 8) {
          logger.debug(`⏱️ Performance: ${name}`, { duration: `${measure.duration.toFixed(2)}ms` }, 'PerformanceMonitor');
        }
      }
    } catch (e) {
      // Might fail if marks don't exist
    }
  }

  /**
   * Registra uma métrica
   */
  private recordMetric(name: string, duration: number, type: MetricEntry['type']) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);

    this.entries.push({
      name,
      duration,
      timestamp: Date.now(),
      type,
    });

    // Manter apenas as últimas 100 entradas
    if (this.entries.length > 100) {
      this.entries = this.entries.slice(-100);
    }
  }

  /**
   * Limpa marks e measures
   */
  private cleanup(name: string) {
    const key = `perf-${name}`;
    performance.clearMarks(`${key}-start`);
    performance.clearMarks(`${key}-end`);
    performance.clearMeasures(name);
  }

  /**
   * Retorna estatísticas de uma métrica
   */
  getStats(name: string) {
    const durations = this.metrics.get(name);
    if (!durations || durations.length === 0) {
      return null;
    }

    const sorted = [...durations].sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      count: durations.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / durations.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
    };
  }

  /**
   * Relatório resumido das métricas
   */
  reportSummary() {
    if (!IS_DEV) return;

    const metrics: Array<{ name: string; avg: string; max: string; count: number; emoji: string }> = [];

    // Reportar métricas coletadas
    for (const [name, durations] of this.metrics.entries()) {
      const stats = this.getStats(name);
      if (stats) {
        const { avg, max, count } = stats;
        const emoji = avg > 50 ? '🔴' : avg > 16 ? '🟡' : '🟢';
        metrics.push({ name, avg: avg.toFixed(2), max: max.toFixed(2), count, emoji });
      }
    }

    // Log summary (debug only to reduce console noise)
    logger.debug('📊 Performance Summary', { metrics }, 'PerformanceMonitor');

    // Métricas de navegação
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      const loadTime = navigation.loadEventEnd - navigation.fetchStart;
      logger.debug(`⚡ Page Load`, { loadTime: `${loadTime.toFixed(0)}ms` }, 'PerformanceMonitor');
    }

    // Contagem de long tasks
    const longTasks = performance.getEntriesByType('longtask');
    if (longTasks.length > 0) {
      logger.debug(`⚠️ ${longTasks.length} long tasks detected (blocking main thread)`, { count: longTasks.length }, 'PerformanceMonitor');
    }
  }

  /**
   * Limpa todos os observers
   */
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
    this.entries = [];
  }
}

// Instância singleton
let monitorInstance: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor();
  }
  return monitorInstance;
}

/**
 * Hook para medir performance de componentes
 */
export function useComponentPerformance(componentName: string, enabled = IS_DEV) {
  const renderCount = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    renderCount.current++;

    if (renderCount.current > 10) {
      logger.debug(
        `🔄 Component "${componentName}" re-rendered ${renderCount.current} times. Consider using React.memo or useMemo/useCallback.`,
        { componentName, renderCount: renderCount.current },
        'PerformanceMonitor'
      );
    }
  });

  useEffect(() => {
    if (!enabled) return;

    getPerformanceMonitor().markStart(`component-${componentName}`);

    return () => {
      getPerformanceMonitor().markEnd(`component-${componentName}`, 'render');
    };
  }, [componentName, enabled]);
}

/**
 * Hook para medir performance de queries
 */
export function useQueryPerformance(queryKey: string, enabled = IS_DEV) {
  useEffect(() => {
    if (!enabled) return;

    return () => {
      // Query performance é medida automaticamente pelo React Query DevTools
      // Este hook pode ser expandido para logging customizado
    };
  }, [queryKey, enabled]);
}

/**
 * Decorador para medir performance de funções
 */
export function measurePerformance<T extends (...args: unknown[]) => unknown>(
  name: string,
  fn: T,
  enabled = IS_DEV
): T {
  if (!enabled) return fn;

  return ((...args: unknown[]) => {
    getPerformanceMonitor().markStart(name);
    try {
      const result = fn(...args);
      // Se for promise, marcar o fim quando resolver
      if (result && typeof result.then === 'function') {
        return result.finally(() => {
          getPerformanceMonitor().markEnd(name, 'query');
        });
      }
      getPerformanceMonitor().markEnd(name, 'query');
      return result;
    } catch (error) {
      getPerformanceMonitor().markEnd(name, 'query');
      throw error;
    }
  }) as T;
}

/**
 * Expor monitor globalmente em desenvolvimento
 */
// Extend Window interface globally
declare global {
  interface Window {
    __perfMonitor?: PerformanceMonitor;
  }
}

if (IS_DEV && typeof window !== 'undefined') {
  window.__perfMonitor = getPerformanceMonitor();
  logger.debug('💡 Performance Monitor disponível em window.__perfMonitor', undefined, 'PerformanceMonitor');
  logger.debug('   - __perfMonitor.markStart(name)', undefined, 'PerformanceMonitor');
  logger.debug('   - __perfMonitor.markEnd(name)', undefined, 'PerformanceMonitor');
  logger.debug('   - __perfMonitor.getStats(name)', undefined, 'PerformanceMonitor');
  logger.debug('   - __perfMonitor.reportSummary()', undefined, 'PerformanceMonitor');
}
