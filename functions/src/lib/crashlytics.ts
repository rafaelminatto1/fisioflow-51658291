/**
 * Firebase Crashlytics Integration
 *
 * Provides crash reporting capabilities for Cloud Functions
 * Complements Sentry with Firebase-native crash reporting
 *
 * @module lib/crashlytics
 */

import * as crashlytics from '@firebase/crashlytics';
import { getLogger, LogLevel } from './logger';

const logger = getLogger('crashlytics');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CRASHLYTICS_ENABLED = process.env.CRASHLYTICS_ENABLED === 'true';

// ============================================================================
// TYPES
// ============================================================================

export interface CrashContext {
  userId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

let initialized = false;

/**
 * Initialize Firebase Crashlytics
 *
 * Note: Crashlytics is primarily for mobile apps. For Cloud Functions,
 * this provides non-fatal error recording that syncs with mobile apps.
 */
export function initCrashlytics(): void {
  if (initialized) {
    return;
  }

  if (!CRASHLYTICS_ENABLED) {
    logger.info('Crashlytics disabled via CRASHLYTICS_ENABLED');
    initialized = true;
    return;
  }

  try {
    // Crashlytics is automatically initialized with Firebase Admin
    logger.info('Firebase Crashlytics initialized');
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
 * Record a non-fatal error to Crashlytics
 *
 * @param error - Error to record
 * @param context - Additional context for the error
 */
export async function recordError(
  error: Error | string,
  context?: CrashContext
): Promise<void> {
  if (!CRASHLYTICS_ENABLED) {
    return;
  }

  try {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;

    // Log locally first
    logger.error(`[Crashlytics] Recording error: ${errorMessage}`, {
      stack: errorStack,
      ...context,
    });

    // Record to Crashlytics
    await crashlytics.logError(errorMessage);

    // Add custom keys if context provided
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        await crashlytics.setCrashlyticsCustomKey(key, String(value));
      }
    }
  } catch (err) {
    logger.error('Failed to record error to Crashlytics:', err);
  }
}

/**
 * Record a non-fatal error with exception details
 *
 * @param name - Exception name
 * @param message - Error message
 * @param stack - Stack trace
 * @param context - Additional context
 */
export async function recordException(
  name: string,
  message: string,
  stack?: string,
  context?: CrashContext
): Promise<void> {
  if (!CRASHLYTICS_ENABLED) {
    return;
  }

  try {
    const error = new Error(message);
    error.name = name;
    if (stack) {
      error.stack = stack;
    }

    await recordError(error, context);
  } catch (err) {
    logger.error('Failed to record exception to Crashlytics:', err);
  }
}

// ============================================================================
// USER CONTEXT
// ============================================================================

/**
 * Set user ID for Crashlytics
 *
 * @param userId - User identifier
 */
export async function setUserId(userId: string): Promise<void> {
  if (!CRASHLYTICS_ENABLED) {
    return;
  }

  try {
    await crashlytics.setCrashlyticsUserId(userId);
    logger.debug(`Crashlytics user ID set: ${userId}`);
  } catch (err) {
    logger.error('Failed to set Crashlytics user ID:', err);
  }
}

/**
 * Clear user ID from Crashlytics
 */
export async function clearUserId(): Promise<void> {
  if (!CRASHLYTICS_ENABLED) {
    return;
  }

  try {
    await crashlytics.setCrashlyticsUserId('');
    logger.debug('Crashlytics user ID cleared');
  } catch (err) {
    logger.error('Failed to clear Crashlytics user ID:', err);
  }
}

/**
 * Set custom keys for Crashlytics
 *
 * @param keys - Object with key-value pairs
 */
export async function setCustomKeys(
  keys: Record<string, string | number | boolean>
): Promise<void> {
  if (!CRASHLYTICS_ENABLED) {
    return;
  }

  try {
    for (const [key, value] of Object.entries(keys)) {
      await crashlytics.setCrashlyticsCustomKey(key, String(value));
    }
    logger.debug(`Crashlytics custom keys set: ${Object.keys(keys).join(', ')}`);
  } catch (err) {
    logger.error('Failed to set Crashlytics custom keys:', err);
  }
}

/**
 * Set a single custom key
 *
 * @param key - Key name
 * @param value - Key value
 */
export async function setCustomKey(
  key: string,
  value: string | number | boolean
): Promise<void> {
  if (!CRASHLYTICS_ENABLED) {
    return;
  }

  try {
    await crashlytics.setCrashlyticsCustomKey(key, String(value));
    logger.debug(`Crashlytics custom key set: ${key}`);
  } catch (err) {
    logger.error(`Failed to set Crashlytics custom key ${key}:`, err);
  }
}

// ============================================================================
// LOGGING
// ============================================================================

/**
 * Log a message to Crashlytics
 *
 * @param message - Message to log
 */
export async function log(message: string): Promise<void> {
  if (!CRASHLYTICS_ENABLED) {
    return;
  }

  try {
    await crashlytics.log(message);
  } catch (err) {
    logger.error('Failed to log to Crashlytics:', err);
  }
}

/**
 * Log multiple messages to Crashlytics
 *
 * @param messages - Messages to log
 */
export async function logMessages(...messages: string[]): Promise<void> {
  if (!CRASHLYTICS_ENABLED) {
    return;
  }

  try {
    for (const message of messages) {
      await crashlytics.log(message);
    }
  } catch (err) {
    logger.error('Failed to log messages to Crashlytics:', err);
  }
}

// ============================================================================
// CRASHLYTICS LOGGER INTEGRATION
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
 *
 * @param fn - Function to wrap
 * @returns Wrapped function that records errors
 */
export function withCrashlyticsErrorRecording<T extends (...args: unknown[]) => ReturnType<T>>(
  fn: T,
  context?: CrashContext
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      await recordError(error as Error, context);
      throw error; // Re-throw for proper error handling
    }
  }) as T;
}

/**
 * Wrap an async function with Crashlytics error recording
 */
export function withCrashlyticsAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: CrashContext
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      await recordError(error as Error, context);
      throw error;
    }
  }) as T;
}
