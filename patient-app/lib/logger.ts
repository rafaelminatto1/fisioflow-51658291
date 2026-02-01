/**
 * Logger Utility
 * Centralized logging with different log levels and dev/prod handling
 */

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = __DEV__;
    this.level = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(level: string, tag: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${tag}] ${message}`;
  }

  debug(tag: string, message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', tag, message), ...args);
    }
  }

  info(tag: string, message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', tag, message), ...args);
    }
  }

  warn(tag: string, message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', tag, message), ...args);
    }
  }

  error(tag: string, message: string, error?: Error | unknown, ...args: any[]) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', tag, message), error, ...args);
    }
  }

  /**
   * Log user actions for analytics
   */
  track(action: string, properties?: Record<string, any>) {
    if (this.isDevelopment) {
      this.info('ANALYTICS', `Action: ${action}`, properties);
    }
    // TODO: Send to analytics service (e.g., Firebase Analytics, Mixpanel)
  }

  /**
   * Log screen views for analytics
   */
  screenView(screenName: string, properties?: Record<string, any>) {
    if (this.isDevelopment) {
      this.info('ANALYTICS', `Screen View: ${screenName}`, properties);
    }
    // TODO: Send to analytics service
  }

  /**
   * Log errors to error reporting service
   */
  captureException(error: Error, context?: Record<string, any>) {
    this.error('CRASH', 'Unhandled exception', error, context);
    // TODO: Send to error reporting service (e.g., Sentry, Crashlytics)
  }

  /**
   * Log API requests/responses
   */
  apiRequest(method: string, url: string, data?: any) {
    this.debug('API', `${method} ${url}`, data);
  }

  apiResponse(method: string, url: string, status: number, data?: any) {
    this.debug('API', `${method} ${url} - ${status}`, data);
  }

  /**
   * Log Firebase operations
   */
  firebase(operation: string, collection: string, docId?: string) {
    this.debug('FIRESTORE', `${operation} ${collection}${docId ? `/${docId}` : ''}`);
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: 'debug' | 'info' | 'warn' | 'error' | 'none') {
    switch (level) {
      case 'debug':
        this.level = LogLevel.DEBUG;
        break;
      case 'info':
        this.level = LogLevel.INFO;
        break;
      case 'warn':
        this.level = LogLevel.WARN;
        break;
      case 'error':
        this.level = LogLevel.ERROR;
        break;
      case 'none':
        this.level = LogLevel.NONE;
        break;
    }
  }
}

// Singleton instance
export const logger = new Logger();

// Convenience exports
export const log = {
  debug: (tag: string, message: string, ...args: any[]) => logger.debug(tag, message, ...args),
  info: (tag: string, message: string, ...args: any[]) => logger.info(tag, message, ...args),
  warn: (tag: string, message: string, ...args: any[]) => logger.warn(tag, message, ...args),
  error: (tag: string, message: string, error?: Error | unknown, ...args: any[]) =>
    logger.error(tag, message, error, ...args),
  track: (action: string, properties?: Record<string, any>) => logger.track(action, properties),
  screenView: (screenName: string, properties?: Record<string, any>) =>
    logger.screenView(screenName, properties),
  captureException: (error: Error, context?: Record<string, any>) =>
    logger.captureException(error, context),
  apiRequest: (method: string, url: string, data?: any) => logger.apiRequest(method, url, data),
  apiResponse: (method: string, url: string, status: number, data?: any) =>
    logger.apiResponse(method, url, status, data),
  firebase: (operation: string, collection: string, docId?: string) =>
    logger.firebase(operation, collection, docId),
};

export default logger;
