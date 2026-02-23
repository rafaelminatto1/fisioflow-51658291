/**
 * Sentry Error Tracking - Enhanced Configuration
 *
 * Monitora erros e exceções no app com melhores práticas
 * Documentação: https://docs.sentry.io/platforms/javascript/guides/react/
 */

import * as Sentry from '@sentry/react';
import { logger } from '@/lib/errors/logger';
import type { Breadcrumb, BreadcrumbHint } from '@sentry/react';
import type { ComponentProps } from 'react';

/**
 * Environment types for Sentry
 */
type SentryEnvironment = 'development' | 'staging' | 'preview' | 'production';

/**
 * Sampling rates configuration
 */
interface SamplingRates {
  tracesSampleRate: number;
  profilesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
  sessionSampleRate: number;
}

/**
 * Configurações do Sentry
 */
interface SentryConfig {
  dsn: string;
  environment: SentryEnvironment;
  release?: string;
  samplingRates?: Partial<SamplingRates>;
}

/**
 * Sensitive field patterns for data scrubbing
 */
const SENSITIVE_FIELDS = [
  'password', 'pass', 'pwd',
  'creditCard', 'cardNumber', 'cvv', 'cvc',
  'cpf', 'rg', 'cnpj',
  'phone', 'celular', 'telefone', 'mobile',
  'ssn', 'socialSecurity',
  'token', 'secret', 'apiKey', 'api_key',
  'sessionToken', 'refreshToken', 'accessToken',
  'address', 'endereço', 'rua', 'numero',
  'complemento', 'bairro', 'cidade', 'estado',
];

/**
 * Gets the current environment
 */
function getEnvironment(): SentryEnvironment {
  const env = (import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE) as SentryEnvironment;
  return ['development', 'staging', 'preview', 'production'].includes(env) ? env : 'development';
}

/**
 * Gets sampling rates based on environment
 */
function getSamplingRates(env: SentryEnvironment): SamplingRates {
  const isProduction = env === 'production';
  const isDevelopment = env === 'development';

  return {
    // Traces: 100% in dev, 10% in production
    tracesSampleRate: isDevelopment ? 1.0 : 0.1,
    // Profiling: 50% in dev, 5% in production
    profilesSampleRate: isDevelopment ? 0.5 : 0.05,
    // Session Replay: 100% in dev, 1% in production
    replaysSessionSampleRate: isDevelopment ? 1.0 : 0.01,
    // Always capture replay on errors
    replaysOnErrorSampleRate: 1.0,
    // Session tracking
    sessionSampleRate: isDevelopment ? 1.0 : 0.1,
  };
}

/**
 * Scrubs sensitive data from an object recursively
 */
function scrubSensitiveData(obj: any): void {
  if (!obj || typeof obj !== 'object') return;

  for (const key in obj) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
      obj[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object') {
      scrubSensitiveData(obj[key]);
    }
  }
}

/**
 * Sanitizes URL by removing sensitive query parameters
 */
function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const sensitiveParams = ['token', 'password', 'api_key', 'session'];

    sensitiveParams.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    });

    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Hashes an ID for breadcrumbs (anonymization)
 */
function hashId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Scrubs sensitive healthcare data from event
 */
function scrubHealthcareData(event: any): any {
  // Remove sensitive medical terms from messages
  if (event.message) {
    // Keep only sanitized diagnostic codes
    event.message = event.message.replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[CID]');
  }

  // Remove patient names
  if (event.extra?.patientName) {
    event.extra.patientName = '[REDACTED]';
  }

  return event;
}

/**
 * Traces sampler based on transaction characteristics
 */
function tracesSampler(samplingContext: any): number {
  const { name, attributes } = samplingContext;

  // Skip health checks
  if (name?.includes('health') || name?.includes('ping')) {
    return 0;
  }

  // Skip background operations
  if (name?.includes('sync') || name?.includes('background')) {
    return 0.01;
  }

  // Full sampling for critical user flows
  if (name?.includes('auth') || name?.includes('login') || name?.includes('logout')) {
    return 1.0;
  }

  if (name?.includes('checkout') || name?.includes('payment')) {
    return 1.0;
  }

  if (name?.includes('appointment') || name?.includes('booking')) {
    return 0.5;
  }

  // Lower sampling for analytics operations
  if (name?.includes('analytics') || name?.includes('report')) {
    return 0.01;
  }

  // Default sampling
  return getSamplingRates(getEnvironment()).tracesSampleRate;
}

/**
 * Initializes Sentry with enhanced configuration
 */
export function initSentry(config: Partial<SentryConfig> = {}) {
  const dsn = config.dsn || import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    logger.warn('[Sentry] DSN não configurado, Sentry não será inicializado');
    return;
  }

  const environment = config.environment || getEnvironment();
  const samplingRates = { ...getSamplingRates(environment), ...config.samplingRates };

  try {
    Sentry.init({
      dsn,
      environment,
      release: config.release || import.meta.env.VITE_APP_VERSION,

      // DO NOT send default PII
      sendDefaultPii: false,

      // Performance Monitoring
      tracesSampleRate: samplingRates.tracesSampleRate,
      profilesSampleRate: samplingRates.profilesSampleRate,
      tracesSampler,

      // Session Replay
      replaysSessionSampleRate: samplingRates.replaysSessionSampleRate,
      replaysOnErrorSampleRate: samplingRates.replaysOnErrorSampleRate,

      // Integrations
      integrations: [
        // Browser tracing for performance
        Sentry.browserTracingIntegration({
          tracePropagationTargets: [
            'localhost',
            /^\//,
            /^https?:\/\/.*\.fisioflow\.com\.br/,
          ],
        }),

        // Session Replay for debugging
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
          // Selectively unmask safe elements
          unmask: ['.sentry-unmask', '.error-boundary', '.app-version'],
          unblock: ['.sentry-unblock', '.public-content'],
          // Ignore specific elements
          ignore: ['.sentry-ignore', '[data-sentry-ignore]'],
        }),

        // Additional error data
        Sentry.extraErrorDataIntegration(),

        // HTTP client integration
        Sentry.httpClientIntegration(),
      ],

      // Filter errors before sending
      beforeSend(event, hint) {
        // Apply healthcare data scrubbing
        event = scrubHealthcareData(event);

        // Scrub request data
        if (event.request?.data) {
          scrubSensitiveData(event.request.data);
        }

        // Scrub headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-api-key'];
          delete event.request.headers['x-auth-token'];
        }

        // Scrub extra data
        if (event.extra) {
          scrubSensitiveData(event.extra);
        }

        // Scrub user context in production
        if (event.user && environment === 'production') {
          event.user = {
            id: event.user.id,
            email: '[REDACTED]',
          };
        }

        // Filter out common third-party errors
        if (event.exception) {
          const error = hint.originalException;
          if (error instanceof Error) {
            const errorMsg = error.message;

            // Script errors from extensions
            if (errorMsg.includes('Script error')) {
              return null;
            }

            // Non-Error promise rejections
            if (errorMsg.includes('Non-Error promise rejection')) {
              return null;
            }

            // Network errors that are expected
            if (errorMsg.includes('Network request failed')) {
              return null;
            }

            // Chunk loading errors
            if (errorMsg.includes('Loading chunk')) {
              return null;
            }
          }
        }

        // Add custom tags
        event.tags = {
          ...event.tags,
          app: 'fisioflow-web',
          platform: 'web',
        };

        return event;
      },

      // Filter breadcrumbs
      beforeBreadcrumb(breadcrumb: Breadcrumb, hint?: BreadcrumbHint) {
        // Skip console logs in production
        if (environment === 'production' && breadcrumb.category === 'console') {
          return null;
        }

        // Filter out health checks
        if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
          const url = breadcrumb.data?.url as string || '';

          // Don't track analytics requests
          if (url.includes('google-analytics') || url.includes('googletagmanager')) {
            return null;
          }

          // Don't track health checks
          if (url.includes('/health') || url.includes('/ping')) {
            return null;
          }

          // Sanitize URL
          if (breadcrumb.data?.url) {
            breadcrumb.data.url = sanitizeUrl(breadcrumb.data.url);
          }
        }

        return breadcrumb;
      },

      // Enable in production or when explicitly enabled
      enabled: import.meta.env.PROD || import.meta.env.VITE_SENTRY_ENABLED === 'true',

      // Debug only in development
      debug: environment === 'development',
    });

    logger.info('[Sentry] Inicializado com sucesso', { environment });
  } catch (error) {
    logger.error('[Sentry] Erro ao inicializar:', error);
  }
}

/**
 * Captures an error and sends to Sentry
 */
export function captureError(error: Error | unknown, context?: Record<string, any>) {
  logger.error('[Sentry] Capturando erro:', error);

  if (import.meta.env.PROD || import.meta.env.VITE_SENTRY_ENABLED === 'true') {
    Sentry.captureException(error, {
      tags: context,
      extra: context,
    });
  }
}

/**
 * Captures a message and sends to Sentry
 */
export function captureMessage(
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
) {
  logger.log(`[Sentry] ${level}:`, message);

  if (import.meta.env.PROD || import.meta.env.VITE_SENTRY_ENABLED === 'true') {
    Sentry.captureMessage(message, { level, tags: context, extra: context });
  }
}

/**
 * Adds a breadcrumb for event tracking
 */
export function addBreadcrumb(
  message: string,
  category: string = 'custom',
  level: 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

/**
 * Sets the current user in Sentry
 */
export function setUser(user: {
  id: string;
  email?: string;
  name?: string;
  role?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
    role: user.role,
  });

  // Set additional context
  Sentry.setContext('user_role', {
    role: user.role,
  });
}

/**
 * Clears the current user
 */
export function clearUser() {
  Sentry.setUser(null);
  Sentry.setContext('user_role', null);
}

/**
 * Sets a custom context
 */
export function setContext(key: string, context: Record<string, any>) {
  Sentry.setContext(key, context);
}

/**
 * Starts a performance span
 */
export function startTransaction(name: string, op: string = 'custom') {
  return Sentry.startInactiveSpan({ name, op });
}

/**
 * Adds attachment to an event
 */
export function addAttachment(filename: string, data: string | Blob, contentType?: string) {
  if (import.meta.env.PROD || import.meta.env.VITE_SENTRY_ENABLED === 'true') {
    const scope = Sentry.getCurrentScope();
    scope.addAttachment({ filename, data, contentType });
  }
}

/**
 * Tracked error class with context
 */
export class TrackedError extends Error {
  public context: Record<string, any>;
  public level: 'info' | 'warning' | 'error';

  constructor(
    message: string,
    context: Record<string, any> = {},
    level: 'info' | 'warning' | 'error' = 'error'
  ) {
    super(message);
    this.name = 'TrackedError';
    this.context = context;
    this.level = level;

    captureError(this, { ...context, level });
  }
}

/**
 * Decorator for error handling in async functions
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  context?: {
    name?: string;
    onError?: (error: Error) => void;
  }
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      const functionName = context?.name || fn.name || 'anonymous';

      if (error instanceof Error) {
        captureError(error, {
          function: functionName,
          args: JSON.stringify(args),
        });
      } else {
        captureMessage(
          `Erro em ${functionName}: ${String(error)}`,
          'error',
          { args: JSON.stringify(args) }
        );
      }

      if (context?.onError) {
        context.onError(error as Error);
      }

      throw error;
    }
  }) as T;
}

/**
 * React hook for using Sentry
 */
export function useSentry() {
  return {
    captureError,
    captureMessage,
    addBreadcrumb,
    setUser,
    clearUser,
    setContext,
  };
}

/**
 * Error Boundary component with Sentry
 */
const ErrorBoundaryComponent = Sentry.ErrorBoundary;
export { ErrorBoundaryComponent as ErrorBoundary };
export type ErrorBoundaryProps = ComponentProps<typeof Sentry.ErrorBoundary>;

/**
 * Healthcare-specific breadcrumb for tracking patient data access
 */
export function addHealthcareBreadcrumb(
  type: 'patient_data' | 'prescription' | 'diagnosis' | 'appointment',
  action: string,
  metadata?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    category: 'healthcare',
    message: `${type}: ${action}`,
    level: 'info',
    data: {
      type,
      action,
      // Anonymize patient IDs for privacy
      anonymizedPatientId: metadata?.patientId ? hashId(metadata.patientId) : undefined,
      timestamp: Date.now(),
      ...metadata,
    },
  });
}

/**
 * Business event breadcrumb for tracking key user actions
 */
export function addBusinessBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    category: `business_${category}`,
    message,
    level: 'info',
    data,
  });
}

/**
 * FisioFlow specific utilities
 */
export const fisioflowSentry = {
  /**
   * Tracks API error
   */
  trackAPIError: (
    endpoint: string,
    method: string,
    error: Error | unknown,
    statusCode?: number
  ) => {
    captureError(error, {
      category: 'api_error',
      endpoint,
      method,
      status_code: statusCode,
    });
  },

  /**
   * Tracks validation error
   */
  trackValidationError: (
    field: string,
    value: any,
    message: string
  ) => {
    captureMessage(message, 'warning', {
      category: 'validation_error',
      field,
      // Don't log the actual value in production
      value: import.meta.env.PROD ? '[REDACTED]' : JSON.stringify(value),
    });
  },

  /**
   * Tracks AI error
   */
  trackAIError: (
    model: string,
    operation: string,
    error: Error | unknown
  ) => {
    captureError(error, {
      category: 'ai_error',
      model,
      operation,
    });
  },

  /**
   * Tracks Firestore error
   */
  trackFirestoreError: (
    collection: string,
    operation: string,
    error: Error | unknown
  ) => {
    captureError(error, {
      category: 'firestore_error',
      collection,
      operation,
    });
  },

  /**
   * Tracks auth error
   */
  trackAuthError: (
    operation: string,
    error: Error | unknown
  ) => {
    captureError(error, {
      category: 'auth_error',
      operation,
    });
  },
};
