/**
 * Firebase Crashlytics Integration (stub for Cloud Functions)
 *
 * Crashlytics is primarily for mobile apps. In Cloud Functions we log locally.
 * Install @firebase/crashlytics in functions/package.json if runtime integration is needed.
 *
 * @module lib/crashlytics
 */

import { getLogger } from './logger';

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

export function initCrashlytics(): void {
  if (initialized) return;
  if (!CRASHLYTICS_ENABLED) {
    logger.info('Crashlytics disabled via CRASHLYTICS_ENABLED');
  }
  initialized = true;
}

export function isCrashlyticsEnabled(): boolean {
  return CRASHLYTICS_ENABLED;
}

// ============================================================================
// ERROR RECORDING (log only - no @firebase/crashlytics in functions)
// ============================================================================

export async function recordError(
  error: Error | string,
  context?: CrashContext
): Promise<void> {
  const message = typeof error === 'string' ? error : error.message;
  logger.error(`[Crashlytics] ${message}`, { stack: (error as Error).stack, ...context });
}

export async function recordException(
  name: string,
  message: string,
  stack?: string,
  context?: CrashContext
): Promise<void> {
  logger.error(`[Crashlytics] ${name}: ${message}`, { stack, ...context });
}

export async function setUserId(userId: string): Promise<void> {
  logger.debug(`Crashlytics user ID set: ${userId}`);
}

export async function clearUserId(): Promise<void> {
  logger.debug('Crashlytics user ID cleared');
}

export async function setCustomKeys(
  keys: Record<string, string | number | boolean>
): Promise<void> {
  logger.debug(`Crashlytics custom keys: ${Object.keys(keys).join(', ')}`);
}

export async function setCustomKey(
  key: string,
  value: string | number | boolean
): Promise<void> {
  logger.debug(`Crashlytics custom key: ${key}`);
}

export async function log(message: string): Promise<void> {
  logger.info(`[Crashlytics] ${message}`);
}

export async function logMessages(...messages: string[]): Promise<void> {
  for (const m of messages) logger.info(`[Crashlytics] ${m}`);
}

// ============================================================================
// CRASHLYTICS LOGGER
// ============================================================================

export class CrashlyticsLogger {
  private readonly context?: CrashContext;

  constructor(context?: CrashContext) {
    this.context = context;
  }

  async error(error: Error | string, additionalContext?: CrashContext): Promise<void> {
    const merged = { ...this.context, ...additionalContext };
    if (typeof error === 'string') {
      logger.error(error, merged);
    } else {
      logger.error(error.message, { stack: error.stack, ...merged });
    }
    await recordError(error, merged);
  }

  withContext(context: CrashContext): CrashlyticsLogger {
    return new CrashlyticsLogger({ ...this.context, ...context });
  }

  async setUserId(userId: string): Promise<CrashlyticsLogger> {
    logger.debug(`Crashlytics user ID set: ${userId}`);
    return this.withContext({ userId });
  }
}

export function createCrashlyticsLogger(context?: CrashContext): CrashlyticsLogger {
  return new CrashlyticsLogger(context);
}

export function withCrashlyticsErrorRecording<T extends (...args: unknown[]) => ReturnType<T>>(
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
