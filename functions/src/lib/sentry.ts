/**
 * Sentry Backend Integration
 * Error tracking for Cloud Functions backend
 */

import * as Sentry from '@sentry/node';
import { HttpsError } from 'firebase-functions/v2/https';
import { AuthContext } from '../middleware/auth';
import { getLogger } from './logger';

const logger = getLogger('sentry');

/**
 * Sentry configuration
 */
interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
}

/**
 * Current Sentry configuration
 */
let sentryConfig: SentryConfig | null = null;
let sentryInitialized = false;

/**
 * Checks if Sentry is configured
 */
export function isSentryConfigured(): boolean {
  return !!process.env.SENTRY_DSN && sentryInitialized;
}

/**
 * Initializes Sentry for error tracking
 */
export function initSentry(config?: Partial<SentryConfig>): void {
  const dsn = config?.dsn || process.env.SENTRY_DSN;

  if (!dsn) {
    logger.warn('Sentry DSN not configured, error tracking disabled');
    return;
  }

  sentryConfig = {
    dsn,
    environment: config?.environment || process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: config?.release || process.env.SENTRY_RELEASE,
    tracesSampleRate: config?.tracesSampleRate || 0.1,
    profilesSampleRate: config?.profilesSampleRate || 0.1,
  };

  logger.info('Initializing Sentry', {
    dsn: maskDsn(dsn),
    environment: sentryConfig.environment,
    release: sentryConfig.release,
  });

  Sentry.init({
    dsn: sentryConfig.dsn,
    environment: sentryConfig.environment,
    release: sentryConfig.release,
    tracesSampleRate: sentryConfig.tracesSampleRate,
    profilesSampleRate: sentryConfig.profilesSampleRate,

    // Filter out known errors
    beforeSend(event: any, hint: any) {
      return filterErrorEvent(event, hint);
    },

    // Set context tags
    initialScope: {
      tags: {
        platform: 'cloud-functions',
        runtime: 'nodejs',
      },
    },
  });

  sentryInitialized = true;
  logger.info('Sentry initialized successfully');
}

/**
 * Masks DSN for logging (hides the secret part)
 */
function maskDsn(dsn: string): string {
  if (!dsn) return 'not-configured';
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const host = url.host;
    return `https://${publicKey}@${host}`;
  } catch {
    return dsn.substring(0, 20) + '...';
  }
}

/**
 * Sets user context for Sentry
 */
export function setSentryUser(auth: AuthContext): void {
  if (!isSentryConfigured()) return;

  logger.debug('Setting Sentry user context', {
    userId: auth.userId,
    organizationId: auth.organizationId,
    role: auth.role,
  });

  Sentry.setUser({
    id: auth.userId,
    email: auth.email,
    segment: auth.role,
    // Custom data
    organizationId: auth.organizationId,
    profileId: auth.profileId,
  });
}

/**
 * Clears user context
 */
export function clearSentryUser(): void {
  if (!isSentryConfigured()) return;

  logger.debug('Clearing Sentry user context');
  Sentry.setUser(null);
}

/**
 * Sets custom tags for the current scope
 */
export function setSentryTags(tags: Record<string, string>): void {
  if (!isSentryConfigured()) return;

  logger.debug('Setting Sentry tags', tags);
  Sentry.setTags(tags);
}

/**
 * Sets custom context (extra data)
 */
export function setSentryContext(key: string, context: Record<string, any>): void {
  if (!isSentryConfigured()) return;

  logger.debug(`Setting Sentry context: ${key}`);
  Sentry.setContext(key, context);
}

/**
 * Captures an exception in Sentry
 */
export function captureSentryException(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    user?: AuthContext;
  }
): string | undefined {
  if (!isSentryConfigured()) {
    logger.debug('Sentry not configured, would capture exception', {
      error: error.message,
      context,
    });
    return undefined;
  }

  logger.info('Capturing exception in Sentry', {
    error: error.message,
    errorName: error.name,
    context,
  });

  // Set user if provided
  if (context?.user) {
    setSentryUser(context.user);
  }

  // Set tags
  if (context?.tags) {
    setSentryTags(context.tags);
  }

  // Set extra context
  if (context?.extra) {
    setSentryContext('error_context', context.extra);
  }

  // Capture the exception
  return Sentry.captureException(error);
}

/**
 * Captures a message in Sentry
 */
export function captureSentryMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): string | undefined {
  if (!isSentryConfigured()) {
    logger.debug('Sentry not configured, would capture message', { message });
    return undefined;
  }

  logger.info(`Capturing message in Sentry (${level})`, { message });
  return Sentry.captureMessage(message, level);
}

/**
 * Filters error events before sending to Sentry
 */
function filterErrorEvent(event: any, hint: any): any | null {
  // Skip known errors that don't need tracking

  // Skip unauthenticated errors (expected behavior)
  if (event.tags?.['firebase.error.code'] === 'unauthenticated') {
    logger.debug('Skipping unauthenticated error in Sentry');
    return null;
  }

  // Skip permission denied errors (expected behavior)
  if (event.tags?.['firebase.error.code'] === 'permission-denied') {
    logger.debug('Skipping permission-denied error in Sentry');
    return null;
  }

  // Skip validation errors
  if (event.tags?.['firebase.error.code'] === 'invalid-argument') {
    logger.debug('Skipping validation error in Sentry');
    return null;
  }

  // Skip not-found errors
  if (event.tags?.['firebase.error.code'] === 'not-found') {
    logger.debug('Skipping not-found error in Sentry');
    return null;
  }

  // Skip already-exists errors (duplicate key violations)
  if (event.tags?.['firebase.error.code'] === 'already-exists') {
    logger.debug('Skipping already-exists error in Sentry');
    return null;
  }

  return event;
}

/**
 * Converts HttpsError to Sentry exception
 */
export function httpsErrorToSentry(error: HttpsError): Error {
  const sentryError = new Error(error.message);
  sentryError.name = `HttpsError[${error.code}]`;
  (sentryError as any).code = error.code;
  (sentryError as any).details = error.details;

  // Add stack trace if available
  if (error.stack) {
    sentryError.stack = error.stack;
  }

  return sentryError;
}

/**
 * Wraps a function with Sentry error tracking
 */
export function withSentryTracking<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: {
    functionName?: string;
    operation?: string;
    getAuth?: (...args: T) => AuthContext | undefined;
  }
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    if (!isSentryConfigured()) {
      return fn(...args);
    }

    const auth = context?.getAuth?.(...args);

    // Set user context if available
    if (auth) {
      setSentryUser(auth);
    }

    // Set function context
    if (context?.functionName) {
      setSentryContext('cloud_function', {
        name: context.functionName,
        operation: context?.operation,
      });
    }

    try {
      return await fn(...args);
    } catch (error) {
      // Convert HttpsError to Sentry-friendly error
      const sentryError = error instanceof HttpsError
        ? httpsErrorToSentry(error)
        : error instanceof Error
        ? error
        : new Error(String(error));

      // Capture exception
      captureSentryException(sentryError as Error, {
        user: auth,
        tags: {
          function: context?.functionName || 'unknown',
          operation: context?.operation || 'unknown',
        },
        extra: {
          args: JSON.stringify(args),
        },
      });

      throw error;
    } finally {
      // Clear user context
      clearSentryUser();
    }
  };
}

/**
 * Flushes pending Sentry events
 */
export async function flushSentry(timeout: number = 2000): Promise<void> {
  if (!isSentryConfigured()) {
    return;
  }

  logger.debug('Flushing Sentry events');
  await Sentry.flush(timeout);
}

// Initialize Sentry on module load
try {
  initSentry();
} catch (error) {
  logger.error('Failed to initialize Sentry', { error });
}
