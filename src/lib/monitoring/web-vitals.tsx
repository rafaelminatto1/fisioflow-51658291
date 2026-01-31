/**
 * Core Web Vitals Monitor
 * Monitora as métricas de performance do Web Vitals em produção
 * Envia dados para analytics (Vercel Analytics, Sentry, etc.)
 *
 * Métricas monitoradas:
 * - FCP (First Contentful Paint): Tempo até o primeiro conteúdo ser pintado
 * - LCP (Largest Contentful Paint): Tempo até o maior conteúdo ser pintado
 * - FID (First Input Delay): Atraso na primeira interação do usuário
 * - INP (Interaction to Next Paint): Substituto moderno do FID
 * - CLS (Cumulative Layout Shift): Mudança de layout cumulativa
 * - TTFB (Time to First Byte): Tempo até o primeiro byte do servidor
 */

import { useState, useEffect } from 'react';
import type { Metric } from 'web-vitals';
import { fisioLogger as logger } from '@/lib/errors/logger';

// Extend Window interface for analytics globals
declare global {
  interface Window {
    va?: (event: string, payload: Record<string, unknown>) => void;
    gtag?: (event: string, action: string, payload: Record<string, unknown>) => void;
    Sentry?: {
      addBreadcrumb: (breadcrumb: { category: string; message: string; level: string; data?: Record<string, unknown> }) => void;
      captureMessage: (message: string, options: { level: string; extra?: Record<string, unknown> }) => void;
    };
  }
}

// Tipos para as métricas
export interface WebVitalsMetrics {
  fcp?: Metric;
  lcp?: Metric;
  fid?: Metric;
  inp?: Metric; // INP substitui FID em navegadores modernos
  cls?: Metric;
  ttfb?: Metric;
  url: string;
  userAgent: string;
}

// Tipos para ratings
export type Rating = 'good' | 'needs-improvement' | 'poor';

// Thresholds para cada métrica (baseados no Google Core Web Vitals)
const THRESHOLDS = {
  fcp: { good: 1800, poor: 3000 }, // ms
  lcp: { good: 2500, poor: 4000 }, // ms
  fid: { good: 100, poor: 300 }, // ms (legado)
  inp: { good: 200, poor: 500 }, // ms (substitui FID)
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
 * Obtém a cor baseada no rating (WCAG AA compliant - 4.5:1 contrast with white)
 */
export function getRatingColor(rating: Rating): string {
  switch (rating) {
    case 'good':
      return '#047857'; // emerald-700 (contrast 7.1:1 with white)
    case 'needs-improvement':
      return '#b45309'; // amber-700 (contrast 4.7:1 with white)
    case 'poor':
      return '#b91c1c'; // red-600 (contrast 4.5:1 with white)
  }
}

/**
 * Envia métricas para analytics com error handling
 * Silenciosamente falha se analytics não estiver disponível
 */
export function sendToAnalytics(metrics: WebVitalsMetrics) {
  try {
    // Enviar para Vercel Analytics (apenas em produção ou se explicitamente habilitado)
    if (import.meta.env.PROD && typeof window !== 'undefined' && window.va) {
      try {
        window.va('event', 'web-vitals', {
          event_category: 'Web Vitals',
          event_label: metrics.lcp?.name || 'LCP',
          value: Math.round(metrics.lcp?.value || 0),
          non_interaction: true,
        });
      } catch (e) {
        // Silenciosamente ignorar erros do Vercel Analytics
        logger.debug('[WebVitals] Vercel Analytics error', e, 'web-vitals');
      }
    }

    // Enviar para Google Analytics 4
    if (typeof window !== 'undefined' && window.gtag) {
      try {
        window.gtag('event', 'web_vitals', {
          event_category: 'Web Vitals',
          event_label: metrics.lcp?.name || 'LCP',
          value: Math.round(metrics.lcp?.value || 0),
          non_interaction: true,
          custom_map: {
            fcp: metrics.fcp?.value,
            lcp: metrics.lcp?.value,
            fid: metrics.fid?.value,
            inp: metrics.inp?.value,
            cls: metrics.cls?.value,
            ttfb: metrics.ttfb?.value,
          },
        });
      } catch (e) {
        logger.debug('[WebVitals] GA4 error', e, 'web-vitals');
      }
    }

    // Enviar para console em development
    if (process.env.NODE_ENV === 'development') {
      console.table({
        'FCP': metrics.fcp?.value,
        'LCP': metrics.lcp?.value,
        'FID': metrics.fid?.value,
        'INP': metrics.inp?.value,
        'CLS': metrics.cls?.value,
        'TTFB': metrics.ttfb?.value,
      });
    }
  } catch (error) {
    // Nunca lançar erro de analytics para não quebrar a aplicação
    logger.debug('[WebVitals] Analytics send failed', error, 'web-vitals');
  }
}

/**
 * Reporta métricas para Sentry
 */
export function reportWebVitalsToSentry(metrics: WebVitalsMetrics) {
  if (typeof window !== 'undefined' && window.Sentry) {
    const Sentry = window.Sentry;

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
 * Inicializa o monitoramento de Web Vitals com error handling robusto
 * Retorna Promise<WebVitalsMetrics | null> para indicar sucesso/falha
 */
export async function initWebVitalsMonitoring(): Promise<WebVitalsMetrics | null> {
  try {
    const vitalsModule = await loadWebVitals();

    // Verificar se temos as funções necessárias
    if (!vitalsModule) {
      throw new Error('Web vitals module not loaded');
    }

    const { onCLS, onFID, onFCP, onLCP, onTTFB, onINP } = vitalsModule;

    const metrics: WebVitalsMetrics = {
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };

    // Wrapper safe para cada callback
    const safeCallback = (metricName: string) => (metric: Metric) => {
      try {
        (metrics as Record<string, Metric>)[metricName.toLowerCase()] = metric;
        sendToAnalytics(metrics);
      } catch (e) {
        logger.debug(`[WebVitals] Error in ${metricName} callback`, e, 'web-vitals');
      }
    };

    // CLS - Cumulative Layout Shift (sempre disponível)
    if (onCLS) {
      try {
        onCLS(safeCallback('CLS'));
      } catch (e) {
        logger.debug('[WebVitals] Error setting up CLS', e, 'web-vitals');
      }
    }

    // FID - First Input Delay (não disponível em todos os browsers)
    if (onFID) {
      try {
        onFID(safeCallback('FID'));
      } catch (e) {
        logger.debug('[WebVitals] Error setting up FID', e, 'web-vitals');
      }
    }

    // INP - Interaction to Next Paint (substitui FID em browsers modernos)
    if (onINP) {
      try {
        onINP(safeCallback('INP'));
      } catch (e) {
        logger.debug('[WebVitals] Error setting up INP', e, 'web-vitals');
      }
    }

    // FCP - First Contentful Paint (sempre disponível)
    if (onFCP) {
      try {
        onFCP(safeCallback('FCP'));
      } catch (e) {
        logger.debug('[WebVitals] Error setting up FCP', e, 'web-vitals');
      }
    }

    // LCP - Largest Contentful Paint (sempre disponível)
    if (onLCP) {
      try {
        onLCP((metric: Metric) => {
          try {
            metrics.lcp = metric;
            sendToAnalytics(metrics);
            reportWebVitalsToSentry(metrics);
          } catch (e) {
            logger.debug('[WebVitals] Error in LCP callback', e, 'web-vitals');
          }
        });
      } catch (e) {
        logger.debug('[WebVitals] Error setting up LCP', e, 'web-vitals');
      }
    }

    // TTFB - Time to First Byte (sempre disponível)
    if (onTTFB) {
      try {
        onTTFB(safeCallback('TTFB'));
      } catch (e) {
        logger.debug('[WebVitals] Error setting up TTFB', e, 'web-vitals');
      }
    }

    return metrics;
  } catch (error) {
    logger.error('[WebVitals] Failed to initialize monitoring', error, 'web-vitals');
    return null;
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
    { name: 'INP', value: metrics.inp, threshold: THRESHOLDS.inp }, // INP tem prioridade sobre FID
    { name: 'FID', value: !metrics.inp ? metrics.fid : undefined, threshold: THRESHOLDS.fid }, // Só mostra FID se não tiver INP
    { name: 'CLS', value: metrics.cls, threshold: THRESHOLDS.cls, format: 'decimal' },
    { name: 'FCP', value: metrics.fcp, threshold: THRESHOLDS.fcp },
    { name: 'TTFB', value: metrics.ttfb, threshold: THRESHOLDS.ttfb },
  ].filter(v => v.value !== undefined); // Filtra métricas não disponíveis

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
