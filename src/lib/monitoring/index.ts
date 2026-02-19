/**
 * Monitoring & Analytics Configuration
 *
 * Sistema completo de monitoramento com Sentry, métricas customizadas
 * e analytics para rastreamento de KPIs
 *
 * @module lib/monitoring
 */


// Tipos de eventos customizados

import * as Sentry from '@sentry/react';
import { fisioLogger as logger } from '@/lib/errors/logger';

// Removed conflicting global declaration

export enum MetricType {
  // Performance
  PAGE_LOAD = 'page_load',
  API_CALL = 'api_call',
  DATABASE_QUERY = 'database_query',

  // Business
  APPOINTMENT_CREATED = 'appointment_created',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  PATIENT_REGISTERED = 'patient_registered',
  EXERCISE_COMPLETED = 'exercise_completed',

  // User Engagement
  FEATURE_USED = 'feature_used',
  SEARCH_PERFORMED = 'search_performed',
  REPORT_GENERATED = 'report_generated',

  // Errors
  API_ERROR = 'api_error',
  VALIDATION_ERROR = 'validation_error',
}

/**
 * Configuração do Sentry com métricas customizadas
 */
export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    logger.debug('Sentry DSN não configurado');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.captureConsoleIntegration({
        levels: ['error', 'warn'],
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    replaysSessionSampleRate: import.meta.env.PROD ? 0.15 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    release: import.meta.env.VITE_APP_VERSION || 'latest',
    beforeSend(event, hint) {
      // Filtrar erros não críticos
      if (event.exception) {
        const error = hint.originalException;
        if (error instanceof Error) {
          // Ignorar erros de rede quando offline
          if (error.message.includes('Failed to fetch') && !navigator.onLine) {
            return null;
          }
          // Ignorar erros de abort (navegação cancelada)
          if (error.name === 'AbortError') {
            return null;
          }
        }
      }
      return event;
    },
    // Contexto do usuário
    initialScope: (scope) => {
      scope.setTag('platform', 'web');
      return scope;
    },
  });

  // Configurar Performance API para medição customizada
  if (import.meta.env.PROD) {
    setupPerformanceMonitoring();
  }
}

/**
 * Configura monitoring de performance
 */
function setupPerformanceMonitoring() {
  // Observar métricas de carregamento de página
  if ('PerformanceObserver' in window) {
    try {
      // Time to First Byte (TTFB)
      const perfObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            trackMetric(MetricType.PAGE_LOAD, {
              ttfb: navEntry.responseStart - navEntry.requestStart,
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.fetchStart,
              loadComplete: navEntry.loadEventEnd - navEntry.fetchStart,
            });
          }
        }
      });

      perfObserver.observe({ entryTypes: ['navigation'] });

      // Resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resEntry = entry as PerformanceResourceTiming;
            trackMetric(MetricType.PAGE_LOAD, {
              resource: resEntry.name,
              duration: resEntry.duration,
              size: resEntry.transferSize,
            });
          }
        }
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (_error) {
      logger.debug('PerformanceObserver não suportado');
    }
  }
}

/**
 * Rastreia métrica customizada
 */
export function trackMetric(
  type: MetricType,
  data: Record<string, unknown>,
  value?: number
) {
  const timestamp = Date.now();
  const userId = getUserId();

  // Enviar para Sentry
  Sentry.addBreadcrumb({
    category: 'metric',
    message: `${type}: ${JSON.stringify(data)}`,
    level: 'info',
    data: { ...data, timestamp, userId },
  });

  // Enviar para analytics (PostHog ou similar)
  if ((window as any).analytics) {
    (window as any).analytics.track(type, {
      ...data,
      timestamp,
      userId,
      value,
    });
  }

  // Para analytics interno (Firebase Analytics)
  if ((window as any).gtag) {
    (window as any).gtag('event', type, {
      ...data,
      event_label: JSON.stringify(data),
      value,
      custom_map: {
        metric_type: type,
      },
    });
  }
}

/**
 * Rastreia erro customizado com contexto
 */
export function trackError(
  error: Error,
  context?: Record<string, unknown>,
  level: 'error' | 'warning' | 'info' = 'error'
) {
  const userId = getUserId();
  const url = window.location.href;

  Sentry.captureException(error, {
    level,
    tags: {
      userId,
      url,
      ...context,
    },
    extra: {
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    },
  });

  // Log local
  // logger.error signature: (message: string, error?: unknown, context?: string)
  // We combine context and component into the 3rd argument string or object depending on logger impl
  // Based on error: Expected 1-3 arguments, but got 4.
  const contextStr = context ? JSON.stringify(context) : undefined;
  logger.error(`[${level.toUpperCase()}] ${error.message}`, error, contextStr);
}

/**
 * Rastreia performance de chamada de API
 */
export function trackApiCall(
  endpoint: string,
  method: string,
  duration: number,
  success: boolean,
  statusCode?: number
) {
  trackMetric(MetricType.API_CALL, {
    endpoint,
    method,
    duration,
    success,
    statusCode,
  });

  if (!success) {
    Sentry.captureMessage(`API Error: ${method} ${endpoint}`, {
      level: 'warning',
      tags: {
        endpoint,
        method,
        statusCode,
      },
      extra: {
        duration,
      },
    });
  }
}

/**
 * Rastreia Query de Banco de Dados
 */
export function trackDatabaseQuery(
  table: string,
  operation: 'read' | 'write' | 'delete',
  duration: number,
  recordCount?: number
) {
  trackMetric(MetricType.DATABASE_QUERY, {
    table,
    operation,
    duration,
    recordCount,
  });
}

/**
 * Rastreia evento de negócio
 */
export function trackBusinessEvent(
  event: string,
  data: Record<string, unknown>
) {
  trackMetric(event as MetricType, data);

  // Firebase Analytics
  if ((window as any).gtag) {
    (window as any).gtag('event', event, {
      ...data,
      send_to: import.meta.env.VITE_GA_MEASUREMENT_ID,
    });
  }
}

/**
 * Rastreia uso de feature (Feature Flag)
 */
export function trackFeatureUsage(
  featureName: string,
  data?: Record<string, unknown>
) {
  trackMetric(MetricType.FEATURE_USED, {
    feature: featureName,
    ...data,
  });
}

/**
 * Rastreia busca realizada
 */
export function trackSearch(
  category: string,
  query: string,
  resultCount?: number
) {
  trackMetric(MetricType.SEARCH_PERFORMED, {
    category,
    query,
    resultCount,
  });
}

/**
 * Obtém ID do usuário atual para tracking
 */
function getUserId(): string | null {
  // Buscar do localStorage, Firebase Auth, ou gerar temporário
  try {
    // Tentar obter do Firebase Auth
    const firebaseUser = window.localStorage.getItem('firebaseUser');
    if (firebaseUser) {
      return JSON.parse(firebaseUser)?.uid;
    }

    // Tentar obter do contexto
    const authContext = window.localStorage.getItem('authUser');
    if (authContext) {
      return JSON.parse(authContext)?.uid;
    }

    // Gerar ID temporário se não houver usuário logado
    let tempId = window.localStorage.getItem('tempUserId');
    if (!tempId) {
      tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      window.localStorage.setItem('tempUserId', tempId);
    }

    return tempId;
  } catch {
    return null;
  }
}

/**
 * Configura User Context para Sentry
 */
export function setUserContext(user: {
  id?: string;
  email?: string;
  role?: string;
  organizationId?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.email,
    segment: user.role,
  });

  Sentry.setTag('organizationId', user.organizationId);
}

/**
 * Limpa contexto do usuário (logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Mede Core Web Vitals
 */
export function measureCoreWebVitals() {
  if ('PerformanceObserver' in window) {
    try {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          trackMetric(MetricType.PAGE_LOAD, {
            metric: 'LCP',
            value: entry.startTime,
          });
        }
      });

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as any; // Cast to any as FID types might be missing in older libs
          trackMetric(MetricType.PAGE_LOAD, {
            metric: 'FID',
            value: fidEntry.processingStart - fidEntry.startTime,
          });
        }
      });

      // Cumulative Layout Shift (CLS)
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const clsEntry = entry as any;
          trackMetric(MetricType.PAGE_LOAD, {
            metric: 'CLS',
            value: clsEntry.value,
          });
        }
      });

      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      fidObserver.observe({ entryTypes: ['first-input'] });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      logger.warn('Core Web Vitals measurement failed:', error);
    }
  }
}

/**
 * Performance API Profiling (não usar em produção)
 */
export function startProfiling(sessionName: string) {
  if (import.meta.env.DEV && 'performance' in window && 'mark' in performance) {
    performance.mark(`${sessionName}-start`);
  }
}

export function endProfiling(sessionName: string) {
  if (import.meta.env.DEV && 'performance' in window && 'mark' in performance) {
    performance.mark(`${sessionName}-end`);
    performance.measure(sessionName, `${sessionName}-start`, `${sessionName}-end`);

    const measures = performance.getEntriesByName(sessionName);
    measures.forEach(measure => {
      trackMetric(MetricType.PAGE_LOAD, {
        metric: 'custom_profile',
        name: sessionName,
        duration: measure.duration,
      });
    });
  }
}

/**
 * Cria transaction para performance
 */
export function startPerformanceTransaction(name: string, operation: string) {
  // Sentry v8+ replacement for startTransaction
  return Sentry.startInactiveSpan({
    name,
    op: operation,
  });
}

/**
 * Helper para medir tempo de execução de função assíncrona
 */
export function measureAsync<T>(
  metricType: MetricType,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();

  return fn().finally(() => {
    const duration = performance.now() - start;
    trackMetric(metricType, {
      operation,
      duration,
    });
  });
}

/**
 * Debounce para tracking frequente (ex: scroll events)
 */
export function createDebouncedTrack(
  metricType: MetricType,
  delay: number = 1000
) {
  let timeoutId: number | null = null;

  return (data: Record<string, unknown>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      trackMetric(metricType, data);
      timeoutId = null;
    }, delay);
  };
}

// Exportar Sentry para uso direto se necessário
export { Sentry };

// Export new monitoring utilities
export * from './coreWebVitals';
export * from './queryPerformance';
export * from './devWarnings';
export * from './metricsCollector';
export * from './schedulePerformance';
export { ProfilerWrapper, withProfiler, useRenderPerformance, measureSync } from './ReactProfiler';

// Inicializar monitoring automaticamente
if (import.meta.env.PROD || import.meta.env.VITE_SENTRY_DSN) {
  initMonitoring();
}
