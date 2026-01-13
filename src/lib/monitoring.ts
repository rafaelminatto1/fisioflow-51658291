/**
 * Monitoring and Analytics utilities
 * 
 * Tracks metrics, errors, and user interactions
 */

import { logger } from './errors/logger';

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
  const value = typeof data === 'number' ? data : data.value;
  const metadata = typeof data === 'object' ? data.metadata : undefined;

  // Vercel Analytics
  if (window.va) {
    window.va('track', metric, { value, ...metadata });
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

  window.addEventListener('load', () => {
    // Performance metrics
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (perfData) {
      trackMetric(METRICS.PAGE_LOAD, {
        value: perfData.loadEventEnd - perfData.fetchStart,
        metadata: {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
          domInteractive: perfData.domInteractive - perfData.fetchStart,
          transferSize: perfData.transferSize,
        },
      });
    }
  });
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
export const trackError = (error: Error, context?: Record<string, any>) => {
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
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
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
 * Initialize monitoring
 */
export const initMonitoring = () => {
  // Track page load
  trackPageLoad();

  // Track unhandled errors
  window.addEventListener('error', (event) => {
    trackError(new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    trackError(new Error(event.reason), {
      type: 'unhandledRejection',
    });
  });

  // Track PWA install
  window.addEventListener('appinstalled', () => {
    trackPWAInstall();
  });

  // Track online/offline
  window.addEventListener('online', () => {
    trackEvent('connection_restored');
  });

  window.addEventListener('offline', () => {
    trackEvent('connection_lost');
  });
};

// TypeScript declaration for window.va
declare global {
  interface Window {
    va?: (event: string, name: string, data: Record<string, any>) => void;
  }
}
