/**
 * FisioFlow Logger
 * 
 * Simple wrapper for console logging with structured metadata.
 * Helps in debugging and monitoring application behavior.
 */

export class FisioLogger {
  private static instance: FisioLogger;

  private constructor() {}

  static getInstance(): FisioLogger {
    if (!FisioLogger.instance) {
      FisioLogger.instance = new FisioLogger();
    }
    return FisioLogger.instance;
  }

  info(message: string, data?: any, context?: string) {
    if (__DEV__) {
      console.log(`[INFO][${context || 'App'}] ${message}`, data || '');
    }
  }

  warn(message: string, data?: any, context?: string) {
    console.warn(`[WARN][${context || 'App'}] ${message}`, data || '');
  }

  error(message: string, error?: any, context?: string) {
    console.error(`[ERROR][${context || 'App'}] ${message}`, error || '');
  }

  debug(message: string, data?: any, context?: string) {
    if (__DEV__) {
      console.debug(`[DEBUG][${context || 'App'}] ${message}`, data || '');
    }
  }
}

export const fisioLogger = FisioLogger.getInstance();
