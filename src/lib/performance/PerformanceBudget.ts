/**
 * PerformanceBudget - Monitoramento e controle de budget de performance
 *
 * Performance: Define e monitora limites de performance
 * - Budget de carregamento
 * - Budget de JavaScript
 * - Budget de imagens
 * - Budget de renderização
 * - Alertas de violação
 */

// ============================================================================
// CONFIGURAÇÕES DE BUDGET
// ============================================================================

export interface PerformanceBudgetConfig {
  // Orçamentos de carregamento
  loadTime: {
    warning: number; // ms
    critical: number; // ms
  };

  // Orçamento de JavaScript (bundle size)
  js: {
    warning: number; // KB
    critical: number; // KB
  };

  // Orçamento de CSS
  css: {
    warning: number; // KB
    critical: number; // KB
  };

  // Orçamento de imagens
  images: {
    warning: number; // KB por imagem
    critical: number; // KB por imagem
  };

  // Orçamento de renderização
  render: {
    fpsWarning: number; // FPS mínimo
    fpsCritical: number; // FPS mínimo
    longTaskWarning: number; // ms
    longTaskCritical: number; // ms
  };

  // Orçamento de memória
  memory: {
    warning: number; // MB
    critical: number; // MB
  };
}

export const DEFAULT_BUDGET: PerformanceBudgetConfig = {
  loadTime: {
    warning: 3000,  // 3 segundos
    critical: 5000, // 5 segundos
  },
  js: {
    warning: 200,   // 200 KB gzipped
    critical: 400,  // 400 KB gzipped
  },
  css: {
    warning: 50,    // 50 KB gzipped
    critical: 100,  // 100 KB gzipped
  },
  images: {
    warning: 100,   // 100 KB por imagem
    critical: 250,  // 250 KB por imagem
  },
  render: {
    fpsWarning: 50,    // 50 FPS mínimo
    fpsCritical: 30,   // 30 FPS crítico
    longTaskWarning: 50,   // 50 ms
    longTaskCritical: 100,  // 100 ms
  },
  memory: {
    warning: 100,  // 100 MB
    critical: 200,  // 200 MB
  },
};

// ============================================================================
// MÉTRICAS DE PERFORMANCE
// ============================================================================

export interface PerformanceMetrics {
  // Métricas de carregamento
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;

  // Métricas de bundle
  jsSize: number;
  cssSize: number;
  imageSize: number;

  // Métricas de renderização
  fps: number;
  longTasks: number;
  longestTask: number;

  // Métricas de memória
  memoryUsed: number;
  memoryLimit: number;

  // Timestamp
  timestamp: number;
}

export interface BudgetViolation {
  metric: keyof PerformanceBudgetConfig;
  value: number;
  limit: number;
  severity: 'warning' | 'critical';
  timestamp: number;
}

// ============================================================================
// MONITOR DE PERFORMANCE BUDGET
// ============================================================================

export class PerformanceBudgetMonitor {
  private config: PerformanceBudgetConfig;
  private violations: BudgetViolation[] = [];
  private metrics: PerformanceMetrics[] = [];
  private performanceObserver?: PerformanceObserver;
  private longTaskObserver?: PerformanceObserver;
  private rafId?: number;
  private frameCount = 0;
  private lastFrameTime = performance.now();
  private fpsValues: number[] = [];

  constructor(config: Partial<PerformanceBudgetConfig> = {}) {
    this.config = { ...DEFAULT_BUDGET, ...config };
    this.init();
  }

  private init() {
    // Observar métricas Web Vitals
    this.observeWebVitals();

    // Observar long tasks
    this.observeLongTasks();

    // Monitorar FPS
    this.startFPSMonitoring();

    // Capturar métricas de carregamento inicial
    this.captureLoadMetrics();
  }

  private observeWebVitals() {
    if (!window.PerformanceObserver) return;

    // Observar LCP (Largest Contentful Paint)
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            this.recordMetric('largestContentfulPaint', entry.startTime);
          }
        }
      });
      this.performanceObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('Failed to observe LCP:', e);
    }

    // Observar FID (First Input Delay)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'first-input') {
            this.recordMetric('firstInputDelay', entry.processingStart - entry.startTime);
          }
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('Failed to observe FID:', e);
    }

    // Observar CLS (Cumulative Layout Shift)
    try {
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.recordMetric('cumulativeLayoutShift', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('Failed to observe CLS:', e);
    }
  }

  private observeLongTasks() {
    if (!window.PerformanceObserver) return;

    try {
      this.longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const duration = entry.duration;
          this.currentMetrics.longTasks++;
          this.currentMetrics.longestTask = Math.max(
            this.currentMetrics.longestTask,
            duration
          );

          // Verificar violação de long task
          if (duration > this.config.render.longTaskWarning) {
            this.recordViolation({
              metric: 'render',
              value: duration,
              limit: this.config.render.longTaskWarning,
              severity: duration > this.config.render.longTaskCritical ? 'critical' : 'warning',
            });
          }
        }
      });
      this.longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      console.warn('Failed to observe long tasks:', e);
    }
  }

  private startFPSMonitoring() {
    const measureFPS = () => {
      const now = performance.now();
      const delta = now - this.lastFrameTime;
      this.lastFrameTime = now;

      const fps = 1000 / delta;
      this.fpsValues.push(fps);

      // Manter apenas últimos 60 frames
      if (this.fpsValues.length > 60) {
        this.fpsValues.shift();
      }

      // Calcular FPS médio
      const avgFps = this.fpsValues.reduce((a, b) => a + b, 0) / this.fpsValues.length;
      this.currentMetrics.fps = Math.round(avgFps);

      // Verificar violação de FPS
      if (avgFps < this.config.render.fpsCritical) {
        this.recordViolation({
          metric: 'render',
          value: avgFps,
          limit: this.config.render.fpsCritical,
          severity: 'critical',
        });
      } else if (avgFps < this.config.render.fpsWarning) {
        this.recordViolation({
          metric: 'render',
          value: avgFps,
          limit: this.config.render.fpsWarning,
          severity: 'warning',
        });
      }

      this.frameCount++;
      this.rafId = requestAnimationFrame(measureFPS);
    };

    this.rafId = requestAnimationFrame(measureFPS);
  }

  private captureLoadMetrics() {
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const navigationStart = timing.navigationStart;

      const loadTime = timing.loadEventEnd - navigationStart;
      const domContentLoaded = timing.domContentLoadedEventEnd - navigationStart;

      this.currentMetrics.loadTime = loadTime;
      this.currentMetrics.domContentLoaded = domContentLoaded;

      // Verificar violação de load time
      if (loadTime > this.config.loadTime.critical) {
        this.recordViolation({
          metric: 'loadTime',
          value: loadTime,
          limit: this.config.loadTime.critical,
          severity: 'critical',
        });
      } else if (loadTime > this.config.loadTime.warning) {
        this.recordViolation({
          metric: 'loadTime',
          value: loadTime,
          limit: this.config.loadTime.warning,
          severity: 'warning',
        });
      }
    }

    // Capturar FCP
    if (window.PerformancePaintTiming) {
      const paintTimings = performance.getEntriesByType('paint');
      const fcp = paintTimings.find((entry: any) => entry.name === 'first-contentful-paint');
      if (fcp) {
        this.currentMetrics.firstContentfulPaint = fcp.startTime;
      }
    }
  }

  private currentMetrics: Partial<PerformanceMetrics> = {
    loadTime: 0,
    domContentLoaded: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    timeToInteractive: 0,
    cumulativeLayoutShift: 0,
    firstInputDelay: 0,
    jsSize: 0,
    cssSize: 0,
    imageSize: 0,
    fps: 60,
    longTasks: 0,
    longestTask: 0,
    memoryUsed: 0,
    memoryLimit: 0,
    timestamp: Date.now(),
  };

  private recordMetric<K extends keyof PerformanceMetrics>(
    key: K,
    value: PerformanceMetrics[K]
  ) {
    (this.currentMetrics as any)[key] = value;
  }

  private recordViolation(violation: BudgetViolation) {
    this.violations.push(violation);

    // Emitir evento customizado
    window.dispatchEvent(
      new CustomEvent('performance-violation', {
        detail: violation,
      })
    );

    console.warn('Performance budget violation:', violation);
  }

  // Métodos públicos
  public recordImageSize(size: number) {
    this.currentMetrics.imageSize += size;

    if (size > this.config.images.critical * 1024) {
      this.recordViolation({
        metric: 'images',
        value: size,
        limit: this.config.images.critical * 1024,
        severity: 'critical',
      });
    } else if (size > this.config.images.warning * 1024) {
      this.recordViolation({
        metric: 'images',
        value: size,
        limit: this.config.images.warning * 1024,
        severity: 'warning',
      });
    }
  }

  public recordBundleSize(jsSize: number, cssSize: number) {
    this.currentMetrics.jsSize = jsSize;
    this.currentMetrics.cssSize = cssSize;

    if (jsSize > this.config.js.critical * 1024) {
      this.recordViolation({
        metric: 'js',
        value: jsSize,
        limit: this.config.js.critical * 1024,
        severity: 'critical',
      });
    }

    if (cssSize > this.config.css.critical * 1024) {
      this.recordViolation({
        metric: 'css',
        value: cssSize,
        limit: this.config.css.critical * 1024,
        severity: 'critical',
      });
    }
  }

  public checkMemory() {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / (1024 * 1024);
      const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);

      this.currentMetrics.memoryUsed = usedMB;
      this.currentMetrics.memoryLimit = limitMB;

      if (usedMB > this.config.memory.critical) {
        this.recordViolation({
          metric: 'memory',
          value: usedMB,
          limit: this.config.memory.critical,
          severity: 'critical',
        });
      } else if (usedMB > this.config.memory.warning) {
        this.recordViolation({
          metric: 'memory',
          value: usedMB,
          limit: this.config.memory.warning,
          severity: 'warning',
        });
      }
    }
  }

  public getMetrics(): PerformanceMetrics {
    return {
      ...this.currentMetrics,
      timestamp: Date.now(),
    } as PerformanceMetrics;
  }

  public getViolations(): BudgetViolation[] {
    return [...this.violations];
  }

  public clearViolations() {
    this.violations = [];
  }

  public getReport(): {
    metrics: PerformanceMetrics;
    violations: BudgetViolation[];
    score: number; // 0-100
  } {
    const metrics = this.getMetrics();
    const violations = this.getViolations();

    // Calcular score baseado em violações
    let score = 100;
    violations.forEach((v) => {
      if (v.severity === 'critical') {
        score -= 20;
      } else {
        score -= 10;
      }
    });
    score = Math.max(0, score);

    return { metrics, violations, score };
  }

  public destroy() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    if (this.longTaskObserver) {
      this.longTaskObserver.disconnect();
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}

// ============================================================================
// HOOK REACT
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export const usePerformanceBudget = (
  config?: Partial<PerformanceBudgetConfig>
) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [violations, setViolations] = useState<BudgetViolation[]>([]);
  const [score, setScore] = useState(100);

  useEffect(() => {
    const monitor = new PerformanceBudgetMonitor(config);

    // Atualizar métricas periodicamente
    const interval = setInterval(() => {
      setMetrics(monitor.getMetrics());
      setViolations(monitor.getViolations());
      const report = monitor.getReport();
      setScore(report.score);
    }, 1000);

    // Escutar violações
    const handleViolation = (e: Event) => {
      const violation = (e as CustomEvent).detail as BudgetViolation;
      setViolations((prev) => [...prev, violation]);
    };
    window.addEventListener('performance-violation', handleViolation);

    return () => {
      clearInterval(interval);
      window.removeEventListener('performance-violation', handleViolation);
      monitor.destroy();
    };
  }, [config]);

  const recordImageSize = useCallback((size: number) => {
    // Implementar se necessário
  }, []);

  return {
    metrics,
    violations,
    score,
    isHealthy: score >= 80,
    hasWarnings: violations.some((v) => v.severity === 'warning'),
    hasCritical: violations.some((v) => v.severity === 'critical'),
    recordImageSize,
  };
};
