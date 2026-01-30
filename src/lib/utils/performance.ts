/**
 * Performance Monitoring Utilities
 *
 * Utilitários para monitoramento e medição de performance
 * Core Web Vitals, tempo de renderização, e métricas customizadas
 */

import { logger } from '@/lib/errors/logger';
import { useEffect, useRef, useCallback } from 'react';

/**
 * Métricas de performance coletadas
 */
export interface PerformanceMetrics {
  /** Tempo até o primeiro byte (TTFB) */
  ttfb?: number;
  /** Tempo até o primeiro conteúdo pintado (FCP) */
  fcp?: number;
  /** Tempo até o maior conteúdo pintado (LCP) */
  lcp?: number;
  /** Tempo até a primeira entrada (FID) */
  fid?: number;
  /** Cumulative Layout Shift (CLS) */
  cls?: number;
  /** Tempo de Interatividade (TTI) */
  tti?: number;
  /** Tempo total de carregamento */
  loadTime?: number;
  /** Tempo de renderização do componente */
  renderTime?: number;
}

/**
 * Registra métricas de performance
 */
export function logPerformanceMetrics(metrics: PerformanceMetrics, context?: string) {
  logger.info('Performance Metrics', { ...metrics, context }, 'Performance');
}

/**
 * Mede o tempo de execução de uma função assíncrona
 */
export async function measureAsync<T>(
  fn: () => Promise<T>,
  metricName: string,
  context?: string
): Promise<T> {
  const startTime = performance.now();
  const startMark = `${metricName}-start`;
  const endMark = `${metricName}-end`;

  performance.mark(startMark);

  try {
    const result = await fn();
    return result;
  } finally {
    performance.mark(endMark);
    performance.measure(metricName, startMark, endMark);

    const measure = performance.getEntriesByName(metricName)[0] as PerformanceMeasure;
    const duration = measure?.duration || 0;

    logger.info(
      `Async operation completed: ${metricName}`,
      { duration, context },
      'Performance'
    );

    // Limpar marks
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(metricName);
  }
}

/**
 * Mede o tempo de execução de uma função síncrona
 */
export function measureSync<T>(
  fn: () => T,
  metricName: string,
  context?: string
): T {
  const startTime = performance.now();
  const startMark = `${metricName}-start`;
  const endMark = `${metricName}-end`;

  performance.mark(startMark);

  try {
    return fn();
  } finally {
    performance.mark(endMark);
    performance.measure(metricName, startMark, endMark);

    const measure = performance.getEntriesByName(metricName)[0] as PerformanceMeasure;
    const duration = measure?.duration || 0;

    logger.info(
      `Sync operation completed: ${metricName}`,
      { duration, context },
      'Performance'
    );

    // Limpar marks
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(metricName);
  }
}

/**
 * Hook para medir o tempo de renderização de um componente
 */
export function useRenderTime(componentName: string) {
  const renderStartTime = useRef<number>();
  const renderCount = useRef(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
    renderCount.current += 1;
  });

  useEffect(() => {
    if (renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current;

      if (renderCount.current > 1) { // Não logar o primeiro mount
        logger.debug(
          `Render time: ${componentName}`,
          { renderTime, renderCount: renderCount.current },
          'Performance'
        );
      }
    }
  });
}

/**
 * Hook para medir o tempo de uma operação assíncrona
 */
export function useAsyncMetric() {
  const measureAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    return measureAsync(operation, operationName);
  }, []);

  return { measureAsync: measureAsyncOperation };
}

/**
 * Coleta Core Web Vitals
 */
export function getCoreWebVitals(): Promise<PerformanceMetrics> {
  return new Promise((resolve) => {
    if (!('PerformanceObserver' in window)) {
      resolve({});
      return;
    }

    const metrics: PerformanceMetrics = {};

    // Observar Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        if (lastEntry) {
          metrics.lcp = lastEntry.startTime;
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // LCP não suportado
    }

    // Observar First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          metrics.fid = entry.processingStart - entry.startTime;
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      // FID não suportado
    }

    // Observar Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            metrics.cls = clsValue;
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // CLS não suportado
    }

    // Esperar um pouco para coletar as métricas
    setTimeout(() => resolve(metrics), 1000);
  });
}

/**
 * Hook para monitorar Core Web Vitals
 */
export function useCoreWebVitals() {
  useEffect(() => {
    let mounted = true;

    const collectVitals = async () => {
      if (!mounted) return;

      const vitals = await getCoreWebVitals();

      // Log se houver métricas significativas
      if (vitals.lcp || vitals.cls || vitals.fid) {
        logger.info('Core Web Vitals collected', vitals, 'Performance');
      }
    };

    collectVitals();

    return () => {
      mounted = false;
    };
  }, []);
}

/**
 * Cria um debounce de performance
 */
export function performanceDebounce<T extends ...args: unknown[]>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime = 0;

  return function debounced(...args: Parameters<T>) {
    const now = performance.now();
    const timeSinceLastCall = now - lastCallTime;

    const execute = () => {
      lastCallTime = performance.now();
      fn(...args);
    };

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (timeSinceLastCall >= delay) {
      execute();
    } else {
      timeoutId = setTimeout(execute, delay - timeSinceLastCall);
    }
  };
}

/**
 * Cria um throttle de performance
 */
export function performanceThrottle<T extends ...args: unknown[]>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastResult: ReturnType<T>;

  return function throttled(...args: Parameters<T>) {
    if (!inThrottle) {
      inThrottle = true;
      lastResult = fn(...args);
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
    return lastResult;
  };
}

/**
 * Mede o tempo de carregamento da página
 */
export function measurePageLoadTime(): number {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (navigation) {
    return navigation.loadEventEnd - navigation.fetchStart;
  }

  // Fallback para navegadores que não suportam Navigation Timing
  const timing = performance.timing;
  if (timing) {
    return timing.loadEventEnd - timing.navigationStart;
  }

  return 0;
}

/**
 * Obtém estatísticas de Resource Timing
 */
export function getResourceTimingStats(): {
  count: number;
  totalSize: number;
  slowResources: Array<{ name: string; duration: number; size: number }>;
} {
  const resources = performance.getEntriesByType('resource');

  let totalSize = 0;
  const slowResources: Array<{ name: string; duration: number; size: number }> = [];

  resources.forEach((resource: PerformanceResourceTiming) => {
    const duration = resource.responseEnd - resource.requestStart;
    const size = resource.transferSize || 0;

    totalSize += size;

    if (duration > 1000) { // Recursos que levam mais de 1 segundo
      slowResources.push({
        name: resource.name,
        duration,
        size,
      });
    }
  });

  return {
    count: resources.length,
    totalSize,
    slowResources,
  };
}

/**
 * Verifica se a página está em modo de baixa performance
 */
export function isLowPerformanceMode(): boolean {
  return (
    !navigator.onLine ||
    ('hardwareConcurrency' in navigator && navigator.hardwareConcurrency < 4) ||
    ('deviceMemory' in navigator && (navigator as Navigator & { deviceMemory?: number }).deviceMemory < 4)
  );
}
