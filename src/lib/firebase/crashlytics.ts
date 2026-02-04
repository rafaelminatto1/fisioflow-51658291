/**
 * Firebase Crashlytics - Frontend Integration
 *
 * Crash reporting for web and mobile apps
 *
 * @module lib/firebase/crashlytics
 */

import { getApp } from 'firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface CrashContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  organizationId?: string;
  [key: string]: unknown;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CRASHLYTICS_ENABLED = import.meta.env.VITE_CRASHLYTICS_ENABLED === 'true';

// ============================================================================
// INITIALIZATION
// ============================================================================

let initialized = false;

/**
 * Initialize Firebase Crashlytics
 */
export async function initCrashlytics(): Promise<void> {
  if (initialized) {
    return;
  }

  if (!CRASHLYTICS_ENABLED) {
    logger.debug('Crashlytics disabled via VITE_CRASHLYTICS_ENABLED');
    initialized = true;
    return;
  }

  try {
    // Dynamically import Crashlytics to avoid errors if not available
    const { getCrashlytics } = await import('@firebase/crashlytics');
    const app = getApp();
    const crashlytics = getCrashlytics(app);

    // Enable Crashlytics
    await crashlytics.setCrashlyticsCollectionEnabled(true);

    logger.debug('Firebase Crashlytics initialized');
    initialized = true;
  } catch (error) {
    logger.error('Failed to initialize Crashlytics:', error);
    initialized = true; // Prevent retries
  }
}

/**
 * Check if Crashlytics is enabled
 */
export function isCrashlyticsEnabled(): boolean {
  return CRASHLYTICS_ENABLED;
}

// ============================================================================
// ERROR RECORDING
// ============================================================================

/**
 * Record a non-fatal error
 */
export async function recordError(
  error: Error | string,
  context?: CrashContext
): Promise<void> {
  if (!CRASHLYTICS_ENABLED) {
    return;
  }

  try {
    const { getCrashlytics } = await import('@firebase/crashlytics');
    const app = getApp();
    const crashlytics = getCrashlytics(app);

    // Log locally first
    const errorMessage = typeof error === 'string' ? error : error.message;
    logger.error(`[Crashlytics] Recording error: ${errorMessage}`, {
      stack: typeof error === 'string' ? undefined : error.stack,
      ...context,
    });

    // Record to Crashlytics
    await crashlytics.recordError({
      message: errorMessage,
      name: typeof error === 'string' ? 'Error' : error.name,
    });

    // Add custom keys if context provided
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        await crashlytics.setCustomKey(key, String(value));
      }
    }
  } catch (err) {
    logger.error('Failed to record error to Crashlytics:', err);
  }
}

// ============================================================================
// USER CONTEXT
// ============================================================================

/**
 * Set user ID for Crashlytics
 */
export async function setUserId(userId: string): Promise<void> {
  if (!CRASHLYTICS_ENABLED) {
    return;
  }

  try {
    const { getCrashlytics } = await import('@firebase/crashlytics');
    const app = getApp();
    const crashlytics = getCrashlytics(app);

    await crashlytics.setUserId(userId);
    logger.debug(`Crashlytics user ID set: ${userId}`);
  } catch (err) {
    logger.error('Failed to set Crashlytics user ID:', err);
  }
}

/**
 * Set user context for Crashlytics
 */
export async function setUserContext(context: CrashContext): Promise<void> {
  if (!CRASHLYTICS_ENABLED) {
    return;
  }

  try {
    const { getCrashlytics } = await import('@firebase/crashlytics');
    const app = getApp();
    const crashlytics = getCrashlytics(app);

    // Set user ID if provided
    if (context.userId) {
      await crashlytics.setUserId(context.userId);
    }

    // Set custom keys
    for (const [key, value] of Object.entries(context)) {
      if (key !== 'userId') {
        await crashlytics.setCustomKey(key, String(value));
      }
    }

    logger.debug('Crashlytics user context set');
  } catch (err) {
    logger.error('Failed to set Crashlytics user context:', err);
  }
}

/**
 * Clear user context
 */
export async function clearUserContext(): Promise<void> {
  if (!CRASHLYTICS_ENABLED) {
    return;
  }

  try {
    const { getCrashlytics } = await import('@firebase/crashlytics');
    const app = getApp();
    const crashlytics = getCrashlytics(app);

    await crashlytics.setUserId('');
    logger.debug('Crashlytics user context cleared');
  } catch (err) {
    logger.error('Failed to clear Crashlytics user context:', err);
  }
}

// ============================================================================
// CUSTOM KEYS
// ============================================================================

/**
 * Set a custom key
 */
export async function setCustomKey(
  key: string,
  value: string | number | boolean
): Promise<void> {
  if (!CRASHLYTICS_ENABLED) {
    return;
  }

  try {
    const { getCrashlytics } = await import('@firebase/crashlytics');
    const app = getApp();
    const crashlytics = getCrashlytics(app);

    await crashlytics.setCustomKey(key, String(value));
  } catch (err) {
    logger.error(`Failed to set Crashlytics custom key ${key}:`, err);
  }
}

// ============================================================================
// LOGGING
// ============================================================================

/**
 * Log a message to Crashlytics
 */
export async function log(message: string): Promise<void> {
  if (!CRASHLYTICS_ENABLED) {
    return;
  }

  try {
    const { getCrashlytics } = await import('@firebase/crashlytics');
    const app = getApp();
    const crashlytics = getCrashlytics(app);

    await crashlytics.log(message);
  } catch (err) {
    logger.error('Failed to log to Crashlytics:', err);
  }
}

// ============================================================================
// CRASHLYTICS LOGGER
// ============================================================================

/**
 * Create a logger that sends errors to Crashlytics
 */
export class CrashlyticsLogger {
  private readonly context?: CrashContext;

  constructor(context?: CrashContext) {
    this.context = context;
  }

  /**
   * Log an error to both local logger and Crashlytics
   */
  async error(error: Error | string, additionalContext?: CrashContext): Promise<void> {
    const mergedContext = { ...this.context, ...additionalContext };

    // Log locally
    if (typeof error === 'string') {
      logger.error(error, mergedContext);
    } else {
      logger.error(error.message, { stack: error.stack, ...mergedContext });
    }

    // Send to Crashlytics
    await recordError(error, mergedContext);
  }

  /**
   * Log with context
   */
  withContext(context: CrashContext): CrashlyticsLogger {
    return new CrashlyticsLogger({ ...this.context, ...context });
  }

  /**
   * Set user ID for this logger
   */
  async setUserId(userId: string): Promise<void> {
    await setUserId(userId);
    return this.withContext({ userId });
  }
}

/**
 * Create a new CrashlyticsLogger
 */
export function createCrashlyticsLogger(
  context?: CrashContext
): CrashlyticsLogger {
  return new CrashlyticsLogger(context);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Wrap a function with Crashlytics error recording
 */
export function withCrashlyticsErrorRecording<T extends (...args: unknown[]) => ReturnType<T>>(
  fn: T,
  context?: CrashContext
): T {
  return ((...args: unknown[]) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.catch(async (error) => {
          await recordError(error, context);
          throw error;
        });
      }
      return result;
    } catch (error) {
      recordError(error as Error, context).catch(() => {});
      throw error;
    }
  }) as T;
}
