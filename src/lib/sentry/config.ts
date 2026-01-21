/**
 * Sentry Configuration with Performance Monitoring
 *
 * Features:
 * - Error tracking with context
 * - Performance monitoring (traces, spans)
 * - Session replay for debugging
 * - Web Vitals tracking
 * - Custom instrumentation
 * - User tracking
 */

import * as Sentry from '@sentry/react';
import { logger } from '@/lib/errors/logger';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface PerformanceTransactionOptions {
  name: string;
  op: string;
  description?: string;
  data?: Record<string, unknown>;
}

export interface CustomSpanOptions {
  op: string;
  description: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// SENTRY INITIALIZATION
// ============================================================================

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    logger.warn('Sentry DSN não configurado. Monitoramento desabilitado.', {}, 'Sentry');
    return;
  }

  const isProd = import.meta.env.PROD;
  const isDev = import.meta.env.DEV;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'development',
    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || 'local-dev',

    // Integrations
    integrations: [
      Sentry.browserTracingIntegration({
        // Track navigation and resource loading
        tracingOrigins: ['localhost', 'fisioflow.vercel.app', /^\//],
        // Trace Fetch/XHR requests
        traceFetch: true,
        traceXHR: true,
      }),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.feedbackIntegration({
        // Auto-instrumentation for better feedback
        autoInject: true,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: isProd ? 0.1 : 1.0, // 10% in production, 100% in dev

    // Session Replay
    replaysSessionSampleRate: isProd ? 0.05 : 0.5, // 5% normal sessions in prod
    replaysOnErrorSampleRate: 1.0, // 100% for error sessions

    // BeforeSend filter
    beforeSend(event, hint) {
      return filterEvent(event, hint);
    },

    // BeforeSendTransaction filter for performance
    beforeSendTransaction(transaction) {
      // Filter out low-value transactions
      const transactionName = transaction.name;

      // Skip health check and ping transactions
      if (transactionName.includes('/health') || transactionName.includes('/ping')) {
        return null;
      }

      // Skip very short transactions (< 10ms) - likely no useful info
      if (transaction.endTimestamp && transaction.startTimestamp) {
        const duration = transaction.endTimestamp - transaction.startTimestamp;
        if (duration < 0.01) {
          return null;
        }
      }

      return transaction;
    },

    // Initial scope - set common context
    initialScope: (scope) => {
      return scope
        .setTag('platform', 'web')
        .setTag('app', 'fisioflow');
    },
  });

  // Set up user tracking when authenticated
  setupUserTracking();

  // Set up custom instrumentation
  setupCustomInstrumentation();

  logger.info('Sentry inicializado com Performance Monitoring', {}, 'Sentry');
}

// ============================================================================
// EVENT FILTERING
// ============================================================================

function filterEvent(event: Sentry.Event, hint: Sentry.EventHint) {
  // Filter out unwanted events

  // Filter in development based on error types
  if (import.meta.env.DEV) {
    if (event.exception) {
      const error = hint.originalException;

      if (error instanceof Error) {
        // Ignore network errors when offline
        if (error.message.includes('Failed to fetch') && !navigator.onLine) {
          return null;
        }

        // Ignore CORS errors in development
        if (error.message.includes('CORS')) {
          return null;
        }

        // Ignore ResizeObserver loop errors (browser quirk)
        if (error.message.includes('ResizeObserver loop')) {
          return null;
        }
      }
    }

    // Filter out some console warnings
    if (event.level === 'warning') {
      return null;
    }
  }

  // Don't send events in development unless explicitly enabled
  if (import.meta.env.DEV && !import.meta.env.VITE_SENTRY_DEV_MODE) {
    return null;
  }

  return event;
}

// ============================================================================
// USER TRACKING
// ============================================================================

async function setupUserTracking() {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      Sentry.setUser({
        id: session.user.id,
        email: session.user.email,
        username: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
      });
    }
  } catch (error) {
    logger.error('Erro ao configurar user tracking no Sentry', error, 'Sentry');
  }
}

/**
 * Update Sentry user context
 */
export function setSentryUser(user: {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  organizationId?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });

  Sentry.setTags({
    userRole: user.role || 'unknown',
    organizationId: user.organizationId || 'unknown',
  });
}

/**
 * Clear Sentry user context
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

// ============================================================================
// CUSTOM INSTRUMENTATION
// ============================================================================

function setupCustomInstrumentation() {
  // Track route changes
  if (import.meta.env.VITE_SENTRY_TRACK_ROUTES !== 'false') {
    instrumentRouteChanges();
  }

  // Track API calls
  if (import.meta.env.VITE_SENTRY_TRACK_API !== 'false') {
    instrumentAPICalls();
  }

  // Track Web Vitals
  instrumentWebVitals();
}

/**
 * Instrument route changes for performance tracking
 */
function instrumentRouteChanges() {
  // This will be handled by React Router instrumentation
  // But we can add custom tracking for specific routes
}

/**
 * Instrument API calls
 */
function instrumentAPICalls() {
  // Wrap fetch to track Supabase API calls
  const originalFetch = window.fetch;

  window.fetch = async function fetchWithSentry(...args) {
    const [url, options] = args;
    const urlStr = typeof url === 'string' ? url : url?.toString() || 'unknown';

    // Only track Supabase API calls
    if (urlStr.includes('supabase')) {
      // Start a transaction for this API call
      return Sentry.startSpan(
        {
          op: 'http.client',
          description: `API Call: ${urlStr}`,
        },
        async (span) => {
          try {
            const response = await originalFetch(...args);

            // Set span data
            span?.setData({
              'url': urlStr,
              'method': options?.method || (Array.isArray(args[1]) ? args[1][0]?.method : 'GET'),
              'status': response.status,
            });

            return response;
          } catch (error) {
            span?.setStatus('internal_error');
            throw error;
          }
        }
      );
    }

    // Default fetch behavior
    return originalFetch(...args);
  };
}

/**
 * Instrument Web Vitals
 */
function instrumentWebVitals() {
  // Track Core Web Vitals
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        switch (entry.entryType) {
          case 'navigation':
            const navEntry = entry as PerformanceNavigationTiming;
            Sentry.metrics.setMetric('page_load_time', navEntry.loadEventEnd - navEntry.fetchStart);
            Sentry.metrics.setMetric('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.fetchStart);
            break;

          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              Sentry.metrics.setMetric('first_contentful_paint', entry.startTime);
            } else if (entry.name === 'largest-contentful-paint') {
              Sentry.metrics.setMetric('largest_contentful_paint', entry.startTime);
            }
            break;

          case 'resource':
            // Track slow resources
            if (entry.duration > 1000) {
              Sentry.addBreadcrumb({
                category: 'performance',
                message: `Slow resource: ${(entry as PerformanceResourceTiming).name}`,
                level: 'warning',
                data: {
                  duration: entry.duration,
                  size: (entry as PerformanceResourceTiming).transferSize,
                },
              });
            }
            break;
        }
      }
    });

    observer.observe({ entryTypes: ['navigation', 'paint', 'resource'] });
  }
}

// ============================================================================
// CUSTOM TRANSACTIONS
// ============================================================================

/**
 * Start a custom performance transaction
 */
export function startTransaction(options: PerformanceTransactionOptions) {
  const transaction = Sentry.startTransaction({
    name: options.name,
    op: options.op,
    data: options.data,
  });

  if (options.description) {
    transaction.setDescription?.(options.description);
  }

  return transaction;
}

/**
 * Wrap an async function with performance tracking
 */
export async function withPerformanceTracking<T>(
  options: PerformanceTransactionOptions,
  fn: () => Promise<T>
): Promise<T> {
  const transaction = startTransaction(options);

  try {
    const result = await fn();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
}

/**
 * Create a custom span within a transaction
 */
export function createSpan(options: CustomSpanOptions) {
  return Sentry.startSpan({
    op: options.op,
    description: options.description,
    data: options.data,
  });
}

// ============================================================================
// SPECIFIC INSTRUMENTATION HELPERS
// ============================================================================

/**
 * Track appointment booking performance
 */
export async function trackAppointmentBooking(bookingFn: () => Promise<void>) {
  return withPerformanceTracking(
    {
      name: 'Appointment Booking',
      op: 'appointment.booking',
      description: 'Process of booking a new appointment',
    },
    bookingFn
  );
}

/**
 * Track patient search performance
 */
export async function trackPatientSearch(searchFn: () => Promise<unknown>) {
  return withPerformanceTracking(
    {
      name: 'Patient Search',
      op: 'patient.search',
      description: 'Search for a patient',
    },
    searchFn
  );
}

/**
 * Track exercise search performance
 */
export async function trackExerciseSearch(searchFn: () => Promise<unknown>) {
  return withPerformanceTracking(
    {
      name: 'Exercise Search',
      op: 'exercise.search',
      description: 'Search for exercises',
    },
    searchFn
  );
}

/**
 * Track report generation performance
 */
export async function trackReportGeneration(reportFn: () => Promise<void>) {
  return withPerformanceTracking(
    {
      name: 'Report Generation',
      op: 'report.generate',
      description: 'Generate a report',
    },
    reportFn
  );
}

/**
 * Track payment processing performance
 */
export async function trackPaymentProcessing(paymentFn: () => Promise<void>) {
  return withPerformanceTracking(
    {
      name: 'Payment Processing',
      op: 'payment.process',
      description: 'Process a payment',
    },
    paymentFn
  );
}

/**
 * Track AI operation performance
 */
export async function trackAIOperation<T>(
  operation: string,
  aiFn: () => Promise<T>
): Promise<T> {
  return withPerformanceTracking(
    {
      name: `AI Operation: ${operation}`,
      op: 'ai.operation',
      description: operation,
    },
    aiFn
  );
}

// ============================================================================
// BREADCRUMBS
// ============================================================================

/**
 * Add performance breadcrumb
 */
export function addPerformanceBreadcrumb(
  message: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    category: 'performance',
    message,
    level: 'info',
    data,
  });
}

/**
 * Add user action breadcrumb
 */
export function addUserActionBreadcrumb(
  action: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    category: 'user',
    message: action,
    level: 'info',
    data,
  });
}

/**
 * Add navigation breadcrumb
 */
export function addNavigationBreadcrumb(
  from: string,
  to: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Navigate from ${from} to ${to}`,
    level: 'info',
    data: { from, to, ...data },
  });
}

// ============================================================================
// ERROR CONTEXT
// ============================================================================

/**
 * Add error context with user information
 */
export function addErrorContext(context: {
  component?: string;
  action?: string;
  route?: string;
  [key: string]: unknown;
}) {
  Sentry.setContext('error_context', context);
}

/**
 * Add feature flag context
 */
export function addFeatureFlagContext(flags: Record<string, boolean>) {
  Sentry.setContext('feature_flags', { flags });
}

// ============================================================================
// PERFORMANCE MARKS
// ============================================================================

/**
 * Mark a performance milestone
 */
export function markPerformanceMilestone(name: string) {
  const mark = `fisioflow-${name}-${Date.now()}`;
  performance.mark(mark);

  Sentry.addBreadcrumb({
    category: 'performance',
    message: `Milestone: ${name}`,
    data: { timestamp: Date.now() },
  });
}

/**
 * Measure time between two milestones
 */
export function measurePerformance(name: string, startMark: string, endMark: string) {
  try {
    performance.measure(name, startMark, endMark);

    const measure = performance.getEntriesByName(name)[0];
    if (measure) {
      Sentry.metrics.setMetric(`custom.${name}`, measure.duration);

      addPerformanceBreadcrumb(name, {
        duration: measure.duration,
      });
    }
  } catch (error) {
    logger.error('Error measuring performance', error, 'Sentry');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { Sentry };

// Convenience re-exports
export const {
  captureException,
  captureMessage,
  captureEvent,
  setTag,
  setTags,
  setContext,
  setExtra,
  addBreadcrumb,
  withScope,
  configureScope,
} = Sentry;
