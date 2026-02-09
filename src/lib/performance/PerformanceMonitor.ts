/**
 * Performance Monitor - Monitoramento de Web Vitals
 *
 * Rastreia métricas de performance Core Web Vitals:
 * - FCP (First Contentful Paint): Tempo até o primeiro conteúdo ser pintado
 * - LCP (Largest Contentful Paint): Tempo até o maior conteúdo ser pintado
 * - FID (First Input Delay): Atraso na primeira interação do usuário
 * - TBT (Total Blocking Time): Tempo total de bloqueio da thread principal
 * - CLS (Cumulative Layout Shift): Mudança de layout cumulativa
 * - TTI (Time to Interactive): Tempo até a página ser interativa
 *
 * @version 1.0.0
 */

import { metricTypes, Metric, onCLS, onFCP, onFID, onLCP, onTTFB } from 'web-vitals';

// Interface para armazenar métricas
export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  navigation?: NavigationTimingEntry;
}

// Limiares para classificação das métricas (baseado no Google Core Web Vitals)
export const THRESHOLDS = {
  FCP: { good: 1800, poor: 3000 }, // ms
  LCP: { good: 2500, poor: 4000 }, // ms
  FID: { good: 100, poor: 300 }, // ms
  TBT: { good: 200, poor: 600 }, // ms
  CLS: { good: 0.1, poor: 0.25 }, // score
  TTFB: { good: 800, poor: 1800 }, // ms
} as const;

// Classificação de rating
function getRating(metricName: keyof typeof THRESHOLDS, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[metricName];
  if (value <= threshold.good) return 'good';
  if (value >= threshold.poor) return 'poor';
  return 'needs-improvement';
}

// Armazenamento de métricas
const metricsStore = new Map<string, PerformanceMetric>();

// Observer para PerformanceObserver API
let perfObserver: PerformanceObserver | null = null;

/**
 * Inicializa o monitoramento de performance
 */
export function initPerformanceMonitoring(onMetricUpdate?: (metric: PerformanceMetric) => void) {
  if (typeof window === 'undefined') return;

  // Função para processar métrica
  const processMetric = (metric: Metric) => {
    const performanceMetric: PerformanceMetric = {
      name: metric.name,
      value: metric.value,
      rating: getRating(metric.name as keyof typeof THRESHOLDS, metric.value),
      timestamp: Date.now(),
    };

    // Armazenar métrica
    metricsStore.set(metric.name, performanceMetric);

    // Log em desenvolvimento
    if (import.meta.env.DEV) {
      console.log(`[Performance] ${metric.name}:`, {
        value: metric.value,
        rating: performanceMetric.rating,
      });
    }

    // Enviar para Analytics/monitoramento
    if (onMetricUpdate) {
      onMetricUpdate(performanceMetric);
    }

    // Enviar para Google Analytics se disponível
    if ((window as any).gtag) {
      (window as any).gtag('event', metric.name, {
        value: Math.round(metric.value),
        metric_rating: performanceMetric.rating,
        custom_map: { metric_name: metric.name },
      });
    }

    // Enviar para Firebase Analytics se disponível
    if ((window as any).firebaseAnalytics) {
      (window as any).firebaseAnalytics().logEvent('web_vital', {
        name: metric.name,
        value: metric.value,
        rating: performanceMetric.rating,
      });
    }
  };

  // Configurar observers do web-vitals
  onCLS(processMetric);
  onFCP(processMetric);
  onFID(processMetric);
  onLCP(processMetric);
  onTTFB(processMetric);

  // Observer para TBT (Total Blocking Time)
  observeTBT(processMetric);

  // Observer para TTI (Time to Interactive)
  observeTTI(processMetric);

  return () => {
    if (perfObserver) {
      perfObserver.disconnect();
    }
  };
}

/**
 * Observa Total Blocking Time (TBT)
 */
function observeTBT(callback: (metric: Metric) => void) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    perfObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry instanceof PerformanceLongTaskTiming)) continue;

        // Calcular TBT
        const longTaskMetrics = metricsStore.get('TBT') || {
          name: 'TBT',
          value: 0,
          rating: 'good' as const,
          timestamp: Date.now(),
        };

        // Long tasks são tarefas > 50ms, contar apenas o tempo excedente
        const blockingTime = entry.duration - 50;
        longTaskMetrics.value += blockingTime;
        longTaskMetrics.rating = getRating('TBT', longTaskMetrics.value);

        metricsStore.set('TBT', longTaskMetrics);

        callback({
          name: 'TBT',
          value: longTaskMetrics.value,
          rating: longTaskMetrics.rating,
        } as Metric);
      }
    });

    perfObserver.observe({ entryTypes: ['longtask'] });
  } catch (e) {
    console.warn('[Performance] TBT observation not supported:', e);
  }
}

/**
 * Observa Time to Interactive (TTI)
 */
function observeTTI(callback: (metric: Metric) => void) {
  if (typeof window === 'undefined') return;

  // TTI não tem API nativa, usar técnica de estimativa
  // TTI é quando o FCP terminou + há janela de 5s sem long tasks

  let fcpTime = 0;
  let ttiCandidate = 0;
  let ttiTimeout: number | null = null;

  const checkTTI = (timestamp: number) => {
    // Verificar se houve long task nos últimos 5s
    const longTasks = performance.getEntriesByType('longtask') as PerformanceLongTaskTiming[];
    const recentLongTasks = longTasks.filter(
      task => task.startTime + task.duration > timestamp - 5000
    );

    if (recentLongTasks.length === 0 && fcpTime > 0) {
      // Janela de 5s sem long tasks após FCP
      ttiCandidate = timestamp - fcpTime;

      const ttiMetric: Metric = {
        name: 'TTI',
        value: ttiCandidate,
        rating: getRating('TTI', ttiCandidate),
      } as Metric;

      metricsStore.set('TTI', ttiMetric);
      callback(ttiMetric);

      // Parar observação
      if (ttiTimeout) {
        clearTimeout(ttiTimeout);
      }
    } else {
      // Tentar novamente em 1s
      ttiTimeout = window.setTimeout(() => checkTTI(Date.now()), 1000);
    }
  };

  // Observar FCP primeiro
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          fcpTime = entry.startTime;
          fcpObserver.disconnect();

          // Começar a verificar TTI após FCP
          ttiTimeout = window.setTimeout(() => checkTTI(Date.now()), 5000);
        }
      }
    });

    fcpObserver.observe({ entryTypes: ['paint'] });
  } catch (e) {
    console.warn('[Performance] TTI observation failed:', e);
  }
}

/**
 * Obtém todas as métricas coletadas
 */
export function getAllMetrics(): PerformanceMetric[] {
  return Array.from(metricsStore.values());
}

/**
 * Obtém uma métrica específica
 */
export function getMetric(name: string): PerformanceMetric | undefined {
  return metricsStore.get(name);
}

/**
 * Calcula score geral de performance (0-100)
 */
export function getOverallScore(): number {
  const metrics = getAllMetrics();
  if (metrics.length === 0) return 100;

  // Pontuação baseada nos ratings
  let score = 100;
  metrics.forEach(metric => {
    if (metric.rating === 'poor') score -= 25;
    else if (metric.rating === 'needs-improvement') score -= 10;
  });

  return Math.max(0, score);
}

/**
 * Gera relatório de performance
 */
export function generatePerformanceReport() {
  const metrics = getAllMetrics();
  const score = getOverallScore();

  return {
    score,
    metrics: metrics.map(m => ({
      name: m.name,
      value: m.value,
      rating: m.rating,
      threshold: THRESHOLDS[m.name as keyof typeof THRESHOLDS],
    })),
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  };
}

/**
 * Envia relatório para endpoint de análise
 */
export async function sendPerformanceReport(endpoint?: string) {
  const report = generatePerformanceReport();

  // Enviar para endpoint customizado
  if (endpoint) {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
    } catch (e) {
      console.warn('[Performance] Failed to send report:', e);
    }
  }

  // Log em desenvolvimento
  if (import.meta.env.DEV) {
    console.table(report.metrics);
    console.log(`[Performance] Overall Score: ${report.score}/100`);
  }

  return report;
}

/**
 * Marca uma navigation timing para medir performance de uma página
 */
export function markNavigationStart(pageName: string) {
  if (typeof window === 'undefined') return;
  performance.mark(`nav-${pageName}-start`);
}

/**
 * Marca o fim de uma navigation timing
 */
export function markNavigationEnd(pageName: string) {
  if (typeof window === 'undefined') return;
  performance.mark(`nav-${pageName}-end`);
  performance.measure(`nav-${pageName}`, `nav-${pageName}-start`, `nav-${pageName}-end`);

  const measure = performance.getEntriesByName(`nav-${pageName}`)[0] as PerformanceMeasure;
  if (measure) {
    console.log(`[Navigation] ${pageName}: ${measure.duration.toFixed(0)}ms`);
  }
}

/**
 * Wrapper para medir performance de funções assíncronas
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  if (typeof window === 'undefined') return fn();

  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);

    // Armazenar como custom metric
    metricsStore.set(`custom-${name}`, {
      name: `custom-${name}`,
      value: duration,
      rating: duration < 1000 ? 'good' : duration < 3000 ? 'needs-improvement' : 'poor',
      timestamp: Date.now(),
    });
  }
}
