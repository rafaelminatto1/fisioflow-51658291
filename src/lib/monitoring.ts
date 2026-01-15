/**
 * Monitoring and Analytics utilities
 * 
 * Tracks metrics, errors, and user interactions
 */

import { logger } from './errors/logger';
import { track } from '@vercel/analytics';

export interface MetricData {
  value: number;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

export const METRICS = {
  PAGE_LOAD: 'page_load_time',
  API_RESPONSE: 'api_response_time',
  ERROR_RATE: 'error_rate',
  USER_ENGAGEMENT: 'user_engagement',
  CONVERSION: 'conversion_rate',
  PWA_INSTALL: 'pwa_install',
  OFFLINE_USAGE: 'offline_usage',
} as const;

/**
 * Track a metric with Vercel Analytics or custom analytics
 */
export const trackMetric = (metric: string, data: number | MetricData) => {
  const value = typeof data === 'number' ? Math.round(data) : Math.round(data.value);
  const metadata = typeof data === 'object' ? data.metadata : undefined;

  // Vercel Analytics - use official track() function
  try {
    if (import.meta.env.PROD) {
      track(metric, { value, ...metadata });
    }
  } catch {
    // Silently ignore analytics errors to prevent app crashes
  }

  // Log in development
  if (import.meta.env.DEV) {
    logger.info(`Métrica: ${metric}`, { value, ...metadata }, 'Monitoring');
  }

  // Custom analytics endpoint (opcional)
  if (import.meta.env.VITE_ANALYTICS_ENDPOINT) {
    const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
    const isProduction = import.meta.env.PROD;
    const isLocalhost = endpoint.includes('localhost') || endpoint.includes('127.0.0.1');

    if (isProduction && isLocalhost) {
      logger.warn('Endpoint de analytics ignorado em produção por ser localhost', { endpoint }, 'Monitoring');
      return;
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric,
        value,
        metadata,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
    }).catch((error) => {
      logger.error('Erro ao enviar métrica para endpoint', error, 'Monitoring');
    });
  }
};

/**
 * Track page load performance
 */
export const trackPageLoad = () => {
  if (typeof window === 'undefined') return;

  const loadHandler = () => {
    // Ensure all timing data is available
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (perfData && perfData.loadEventEnd > 0) {
        const duration = perfData.loadEventEnd - perfData.fetchStart;

        // Sanitize value to avoid negative numbers
        const safeDuration = Math.max(0, Math.round(duration));

        // Limit properties to avoid 400 errors (Vercel Hobby limit: 2 properties)
        trackMetric(METRICS.PAGE_LOAD, {
          value: safeDuration
          // Removed extra metadata to comply with Vercel limits
        });
      }
    }, 0);
  };

  window.addEventListener('load', loadHandler);

  // Retorna função de cleanup para remover o listener
  return () => {
    window.removeEventListener('load', loadHandler);
  };
};

/**
 * Track API response time
 */
export const trackApiCall = (endpoint: string, startTime: number) => {
  const duration = performance.now() - startTime;

  trackMetric(METRICS.API_RESPONSE, {
    value: duration,
    metadata: {
      endpoint,
      status: 'success',
    },
  });
};

/**
 * Track errors
 */
export const trackError = (error: Error, context?: Record<string, unknown>) => {
  trackMetric(METRICS.ERROR_RATE, {
    value: 1,
    metadata: {
      message: error.message,
      stack: error.stack,
      ...context,
    },
  });

  // Log error
  logger.error('Erro rastreado', error, 'Monitoring');
};

/**
 * Track user engagement events
 */
export const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
  trackMetric(METRICS.USER_ENGAGEMENT, {
    value: 1,
    metadata: {
      event: eventName,
      ...properties,
    },
  });
};

/**
 * Track PWA install
 */
export const trackPWAInstall = () => {
  trackMetric(METRICS.PWA_INSTALL, 1);
};

/**
 * Track offline usage
 */
export const trackOfflineUsage = (action: string) => {
  trackMetric(METRICS.OFFLINE_USAGE, {
    value: 1,
    metadata: { action },
  });
};

/**
 * Initialize monitoring com cleanup adequado
 * @returns Função de cleanup para remover todos os event listeners
 */
export const initMonitoring = () => {
  // Track page load
  const cleanupPageLoad = trackPageLoad();

  // Track unhandled errors
  const errorHandler = (event: ErrorEvent) => {
    trackError(new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  };

  // Track unhandled promise rejections
  const rejectionHandler = (event: PromiseRejectionEvent) => {
    trackError(new Error(String(event.reason)), {
      type: 'unhandledRejection',
    });
  };

  // Track PWA install
  const appInstalledHandler = () => {
    trackPWAInstall();
  };

  // Track online/offline
  const onlineHandler = () => {
    trackEvent('connection_restored');
  };

  const offlineHandler = () => {
    trackEvent('connection_lost');
  };

  // Adicionar todos os listeners
  window.addEventListener('error', errorHandler);
  window.addEventListener('unhandledrejection', rejectionHandler);
  window.addEventListener('appinstalled', appInstalledHandler);
  window.addEventListener('online', onlineHandler);
  window.addEventListener('offline', offlineHandler);

  // Retornar função de cleanup
  return () => {
    cleanupPageLoad?.();
    window.removeEventListener('error', errorHandler);
    window.removeEventListener('unhandledrejection', rejectionHandler);
    window.removeEventListener('appinstalled', appInstalledHandler);
    window.removeEventListener('online', onlineHandler);
    window.removeEventListener('offline', offlineHandler);
  };
};

