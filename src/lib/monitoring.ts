/**
 * Monitoring and Analytics utilities
 *
 * Tracks metrics, errors, and user interactions
 * Uses Google Analytics 4 (GA4) for analytics
 *
 * @see https://developers.google.com/analytics/devguides/collection/ga4
 */

import { logger } from './errors/logger';

// ============================================================================
// GOOGLE ANALYTICS 4 (GA4) SETUP
// ============================================================================

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string,
      config?: Record<string, unknown> | Date
    ) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Initialize Google Analytics 4
 * Call this once when the app loads
 */
export function initGoogleAnalytics(measurementId: string): void {
  if (typeof window === 'undefined') return;

  // Load gtag.js script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer?.push(arguments);
  };

  // Configure GA4
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false, // We'll track page views manually
  });

  logger.info('Google Analytics 4 initialized', { measurementId }, 'Monitoring');
}

/**
 * Track event with Google Analytics 4
 */
function trackGA4Event(eventName: string, parameters?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.gtag) return;

  try {
    if (import.meta.env.PROD) {
      window.gtag('event', eventName, parameters);
    }
  } catch (error) {
    logger.warn('GA4 event tracking failed', error, 'Monitoring');
  }
}

/**
 * Get GA4 measurement ID from environment
 */
function getMeasurementId(): string | undefined {
  return import.meta.env.VITE_GA_MEASUREMENT_ID || import.meta.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
}

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
 * Track a metric with Google Analytics 4 or custom analytics
 */
export const trackMetric = (metric: string, data: number | MetricData) => {
  const value = typeof data === 'number' ? Math.round(data) : Math.round(data.value);
  const metadata = typeof data === 'object' ? data.metadata : undefined;

  // Google Analytics 4 - send custom event
  trackGA4Event(metric, {
    value,
    ...metadata,
  });

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
 * Track page load performance with Google Analytics 4
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

        // Track page load with GA4
        trackGA4Event('page_load_time', {
          value: safeDuration,
          page_title: document.title,
          page_location: window.location.href,
        });

        // Track Web Vitals with GA4
        trackWebVitals();
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
 * Track Core Web Vitals with Google Analytics 4
 */
function trackWebVitals(): void {
  if (typeof window === 'undefined') return;

  // Track Largest Contentful Paint (LCP)
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as { startTime: number };
      trackGA4Event('web_vital_lcp', {
        value: Math.round(lastEntry.startTime),
        page_location: window.location.href,
      });
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Track First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        const fidEntry = entry as { processingStart: number; startTime: number };
        const fid = fidEntry.processingStart - fidEntry.startTime;
        trackGA4Event('web_vital_fid', {
          value: Math.round(fid),
          page_location: window.location.href,
        });
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Track Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const clsEntry = entry as { value: number; startTime: number };
        if (!clsEntry.hadRecentInput) {
          clsValue += clsEntry.value;
        }
      }
      trackGA4Event('web_vital_cls', {
        value: Math.round(clsValue * 1000) / 1000,
        page_location: window.location.href,
      });
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  } catch (error) {
    logger.warn('Web Vitals tracking not supported', error, 'Monitoring');
  }
}

/**
 * Track page view with Google Analytics 4
 */
export const trackPageView = (pagePath?: string, pageTitle?: string): void => {
  if (typeof window === 'undefined' || !window.gtag) return;

  const measurementId = getMeasurementId();
  if (!measurementId) return;

  window.gtag('event', 'page_view', {
    page_path: pagePath || window.location.pathname,
    page_title: pageTitle || document.title,
    page_location: window.location.href,
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
 * Initialize monitoring with Google Analytics 4
 * @returns Cleanup function to remove all event listeners
 */
export const initMonitoring = () => {
  // Initialize Google Analytics 4 if measurement ID is available
  const measurementId = getMeasurementId();
  if (measurementId) {
    initGoogleAnalytics(measurementId);
  }

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

