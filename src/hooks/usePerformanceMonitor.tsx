import { useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/errors/logger';

interface PerformanceMetrics {
  renderTime: number;
  componentName: string;
  timestamp: number;
}

/**
 * Hook para monitorar performance de renderização de componentes
 *
 * @example
 * const PerfMonitor = usePerformanceMonitor('MyComponent');
 * return <PerfMonitor><MyComponent /></PerfMonitor>;
 */
export function usePerformanceMonitor(componentName: string, enabled = process.env.NODE_ENV === 'development') {
  const renderStartTime = useRef<number>(0);
  const metricsRef = useRef<PerformanceMetrics[]>([]);

  useEffect(() => {
    if (!enabled) return;

    renderStartTime.current = performance.now();

    return () => {
      const renderEndTime = performance.now();
      const renderTime = renderEndTime - renderStartTime.current;

      // Armazenar métricas
      const metric: PerformanceMetrics = {
        renderTime,
        componentName,
        timestamp: Date.now(),
      };

      metricsRef.current.push(metric);

      // Log se renderização for lenta (> 16ms = 60fps)
      if (renderTime > 16) {
        logger.warn(
          `[Performance] ${componentName} levou ${renderTime.toFixed(2)}ms para renderizar`,
          metric,
          'usePerformanceMonitor'
        );
      }

      // Manter apenas as últimas 100 métricas
      if (metricsRef.current.length > 100) {
        metricsRef.current = metricsRef.current.slice(-100);
      }
    };
  }, [componentName, enabled]);

  const ComponentWrapper = useCallback(
    ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>;
    },
    []
  );

  return {
    metrics: metricsRef.current,
    getAverageRenderTime: () => {
      if (metricsRef.current.length === 0) return 0;
      const sum = metricsRef.current.reduce((acc, m) => acc + m.renderTime, 0);
      return sum / metricsRef.current.length;
    },
    getSlowestRender: () => {
      if (metricsRef.current.length === 0) return null;
      return metricsRef.current.reduce((slowest, current) =>
        current.renderTime > slowest.renderTime ? current : slowest
      );
    },
    clearMetrics: () => {
      metricsRef.current = [];
    },
    ComponentWrapper,
  };
}

/**
 * Hook para medir tempo de execução de funções assíncronas
 */
export function useAsyncPerformance() {
  const measureAsync = useCallback(async <T,>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    try {
      const result = await fn();
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (duration > 100) {
        logger.warn(`[Async Performance] ${name} levou ${duration.toFixed(2)}ms`, undefined, 'usePerformanceMonitor');
      }

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      logger.error(`[Async Performance] ${name} falhou após ${duration.toFixed(2)}ms`, error, 'usePerformanceMonitor');
      throw error;
    }
  }, []);

  return { measureAsync };
}

/**
 * Hook para detectar renders desnecessários
 */
export function useRenderDetect(componentName: string) {
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);

  useEffect(() => {
    renderCount.current += 1;
    const now = performance.now();
    renderTimes.current.push(now);

    // Limpar registros antigos (mais de 10 segundos)
    const cutoff = now - 10000;
    renderTimes.current = renderTimes.current.filter(t => t > cutoff);

    if (renderCount.current > 10 && renderTimes.current.length > 5) {
      // Detectar múltiplos renders em curto período
      const recentRenders = renderTimes.current.slice(-5);
      const timeSpan = recentRenders[4] - recentRenders[0];

      if (timeSpan < 100) {
        logger.warn(
          `[Render Detect] ${componentName} renderizou ${renderCount.current} vezes recentemente. ` +
          `Possível loop de re-render! Últimos 5 renders em ${timeSpan.toFixed(2)}ms`,
          undefined,
          'usePerformanceMonitor'
        );
      }
    }
  });

  return {
    renderCount: renderCount.current,
  };
}

/**
 * Hook para monitorar uso de memória (quando disponível)
 */
export function useMemoryMonitor(enabled = process.env.NODE_ENV === 'development') {
  useEffect(() => {
    if (!enabled || !('memory' in performance)) return;

    const checkMemory = () => {
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      if (!memory) return;

      const usedMB = (memory.usedJSHeapSize / 1048576).toFixed(2);
      const totalMB = (memory.totalJSHeapSize / 1048576).toFixed(2);
      const limitMB = (memory.jsHeapSizeLimit / 1048576).toFixed(2);
      const percentage = ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2);

      if (parseFloat(percentage) > 80) {
        logger.warn(
          `[Memory] Alto uso de memória detectado: ${usedMB}MB / ${limitMB}MB (${percentage}%)`,
          undefined,
          'usePerformanceMonitor'
        );
      }
    };

    const interval = setInterval(checkMemory, 30000); // Verificar a cada 30s

    return () => clearInterval(interval);
  }, [enabled]);
}

/**
 * Medidor de performance para operações específicas
 */
export class PerformanceTimer {
  private startTime: number;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.startTime = performance.now();
  }

  end(): number {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    logger.debug(`[Timer] ${this.name}: ${duration.toFixed(2)}ms`, undefined, 'usePerformanceMonitor');
    return duration;
  }

  static measure<T>(name: string, fn: () => T): T {
    const timer = new PerformanceTimer(name);
    try {
      return fn();
    } finally {
      timer.end();
    }
  }

  static async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const timer = new PerformanceTimer(name);
    try {
      return await fn();
    } finally {
      timer.end();
    }
  }
}

/**
 * Hook para medir tempo de interações do usuário
 */
export function useInteractionTiming() {
  const measureInteraction = useCallback(async (name: string, fn: () => void | Promise<void>) => {
    // Marca antes da interação
    performance.mark(`${name}-start`);

    try {
      await fn();
    } finally {
      // Marca depois da interação
      performance.mark(`${name}-end`);

      // Medir a duração
      performance.measure(name, `${name}-start`, `${name}-end`);

      // Obter a medição
      const entries = performance.getEntriesByName(name, 'measure');
      if (entries.length > 0) {
        const entry = entries[0] as PerformanceMeasure;
        const duration = entry.duration;

        if (duration > 100) {
          logger.warn(`[Interaction] ${name} levou ${duration.toFixed(2)}ms (acima de 100ms)`, undefined, 'usePerformanceMonitor');
        }

        // Limpar marcas
        performance.clearMarks(`${name}-start`);
        performance.clearMarks(`${name}-end`);
        performance.clearMeasures(name);
      }
    }
  }, []);

  return { measureInteraction };
}
