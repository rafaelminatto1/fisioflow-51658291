/**
 * Core Web Vitals Monitor
 * Monitora as métricas de performance do Web Vitals em produção
 * Envia dados para analytics (Vercel Analytics, Sentry, etc.)
 *
 * Métricas monitoradas:
 * - FCP (First Contentful Paint): Tempo até o primeiro conteúdo ser pintado
 * - LCP (Largest Contentful Paint): Tempo até o maior conteúdo ser pintado
 * - FID (First Input Delay): Atraso na primeira interação do usuário
 * - CLS (Cumulative Layout Shift): Mudança de layout cumulativa
 * - TTFB (Time to First Byte): Tempo até o primeiro byte do servidor
 * - FMP (First Meaningful Paint): Primeira pintura significativa
 */

import { useState, useEffect } from 'react';
import type { Metric } from 'web-vitals';

// Tipos para as métricas
export interface WebVitalsMetrics {
  fcp?: Metric;
  lcp?: Metric;
  fid?: Metric;
  cls?: Metric;
  ttfb?: Metric;
  fmp?: number;
  url: string;
  userAgent: string;
}

// Tipos para ratings
export type Rating = 'good' | 'needs-improvement' | 'poor';

// Thresholds para cada métrica
const THRESHOLDS = {
  fcp: { good: 1800, poor: 3000 }, // ms
  lcp: { good: 2500, poor: 4000 }, // ms
  fid: { good: 100, poor: 300 }, // ms
  cls: { good: 0.1, poor: 0.25 }, // score
  ttfb: { good: 800, poor: 1800 }, // ms
} as const;

/**
 * Obtém o rating de uma métrica
 */
export function getRating(
  metricName: keyof typeof THRESHOLDS,
  value: number
): Rating {
  const threshold = THRESHOLDS[metricName];

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Obtém a cor baseada no rating
 */
export function getRatingColor(rating: Rating): string {
  switch (rating) {
    case 'good':
      return '#10b981'; // green-500
    case 'needs-improvement':
      return '#f59e0b'; // orange-500
    case 'poor':
      return '#ef4444'; // red-500
  }
}

/**
 * Envia métricas para analytics
 */
export function sendToAnalytics(metrics: WebVitalsMetrics) {
  // Enviar para Vercel Analytics
  if (typeof window !== 'undefined' && (window as any).va) {
    (window as any).va('event', 'web-vitals', {
      event_category: 'Web Vitals',
      event_label: metrics.lcp?.name || 'LCP',
      value: Math.round(metrics.lcp?.value || 0),
      non_interaction: true,
    });
  }

  // Enviar para Google Analytics 4
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'web_vitals', {
      event_category: 'Web Vitals',
      event_label: metrics.lcp?.name || 'LCP',
      value: Math.round(metrics.lcp?.value || 0),
      non_interaction: true,
    });
  }

  // Enviar para console em development
  if (process.env.NODE_ENV === 'development') {
    console.table({
      'FCP': metrics.fcp?.value,
      'LCP': metrics.lcp?.value,
      'FID': metrics.fid?.value,
      'CLS': metrics.cls?.value,
      'TTFB': metrics.ttfb?.value,
    });
  }
}

/**
 * Reporta métricas para Sentry
 */
export function reportWebVitalsToSentry(metrics: WebVitalsMetrics) {
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    const Sentry = (window as any).Sentry;

    // Criar breadcrumb com as métricas
    Sentry.addBreadcrumb({
      category: 'web-vitals',
      message: 'Core Web Vitals measured',
      level: 'info',
      data: {
        fcp: metrics.fcp?.value,
        lcp: metrics.lcp?.value,
        fid: metrics.fid?.value,
        cls: metrics.cls?.value,
        ttfb: metrics.ttfb?.value,
      },
    });

    // Se alguma métrica estiver "poor", enviar como warning
    const hasPoorMetric =
      (metrics.fcp && getRating('fcp', metrics.fcp.value) === 'poor') ||
      (metrics.lcp && getRating('lcp', metrics.lcp.value) === 'poor') ||
      (metrics.fid && getRating('fid', metrics.fid.value) === 'poor') ||
      (metrics.cls && getRating('cls', metrics.cls.value) === 'poor');

    if (hasPoorMetric) {
      Sentry.captureMessage('Poor Web Vitals detected', {
        level: 'warning',
        extra: metrics,
      });
    }
  }
}

/**
 * Carrega o web-vitals de forma dinâmica
 */
export async function loadWebVitals(): Promise<typeof import('web-vitals')> {
  return import('web-vitals');
}

/**
 * Inicializa o monitoramento de Web Vitals
 */
export async function initWebVitalsMonitoring() {
  try {
    const { onCLS, onFID, onFCP, onLCP, onTTFB } = await loadWebVitals();

    const metrics: WebVitalsMetrics = {
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // CLS - Cumulative Layout Shift
    onCLS((metric) => {
      metrics.cls = metric;
      sendToAnalytics(metrics);
    });

    // FID - First Input Delay
    onFID((metric) => {
      metrics.fid = metric;
      sendToAnalytics(metrics);
    });

    // FCP - First Contentful Paint
    onFCP((metric) => {
      metrics.fcp = metric;
      sendToAnalytics(metrics);
    });

    // LCP - Largest Contentful Paint
    onLCP((metric) => {
      metrics.lcp = metric;
      sendToAnalytics(metrics);
      reportWebVitalsToSentry(metrics);
    });

    // TTFB - Time to First Byte
    onTTFB((metric) => {
      metrics.ttfb = metric;
      sendToAnalytics(metrics);
    });

    return metrics;
  } catch (error) {
    console.error('Failed to initialize web vitals monitoring:', error);
  }
}

/**
 * Hook React para medir Web Vitals
 */
export function useWebVitals() {
  const [metrics, setMetrics] = useState<WebVitalsMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    let mounted = true;

    initWebVitalsMonitoring().then((measuredMetrics) => {
      if (mounted && measuredMetrics) {
        setMetrics(measuredMetrics);
        setIsMonitoring(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return { metrics, isMonitoring };
}

/**
 * Componente para exibir Web Vitals em development
 */
export function WebVitalsIndicator() {
  const { metrics, isMonitoring } = useWebVitals();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!metrics || !isMonitoring) {
    return (
      <div className="fixed bottom-4 left-4 bg-background border rounded-lg p-3 shadow-lg z-50">
        <div className="flex items-center gap-2 text-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
          <span>Carregando métricas...</span>
        </div>
      </div>
    );
  }

  const vitals = [
    { name: 'LCP', value: metrics.lcp, threshold: THRESHOLDS.lcp },
    { name: 'FID', value: metrics.fid, threshold: THRESHOLDS.fid },
    { name: 'CLS', value: metrics.cls, threshold: THRESHOLDS.cls, format: 'decimal' },
    { name: 'FCP', value: metrics.fcp, threshold: THRESHOLDS.fcp },
    { name: 'TTFB', value: metrics.ttfb, threshold: THRESHOLDS.ttfb },
  ];

  return (
    <div className="fixed bottom-4 left-4 bg-background border rounded-lg p-3 shadow-lg z-50">
      <div className="text-xs font-semibold mb-2">Core Web Vitals</div>
      <div className="space-y-1">
        {vitals.map((vital) => {
          if (!vital.value) return null;

          const rating = getRating(
            vital.name.toLowerCase() as keyof typeof THRESHOLDS,
            vital.value.value
          );
          const color = getRatingColor(rating);

          return (
            <div key={vital.name} className="flex items-center justify-between gap-4 text-xs">
              <span>{vital.name}</span>
              <span className="font-mono" style={{ color }}>
                {vital.format === 'decimal'
                  ? vital.value.value.toFixed(3)
                  : Math.round(vital.value.value)}
              </span>
              <span
                className="px-1 rounded text-white"
                style={{ backgroundColor: color }}
              >
                {rating === 'good' ? '✓' : rating === 'needs-improvement' ? '⚠' : '✗'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
