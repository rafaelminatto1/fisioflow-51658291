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

  debug(tagOrMessage: string, messageOrData?: any, ...args: any[]) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      if (typeof messageOrData === "string") {
        console.log(this.formatMessage("DEBUG", tagOrMessage, messageOrData), ...args);
      } else {
        console.log(this.formatMessage("DEBUG", "APP", tagOrMessage), messageOrData, ...args);
      }
    }
  }

  info(tagOrMessage: string, messageOrData?: any, ...args: any[]) {
    if (this.shouldLog(LogLevel.INFO)) {
      if (typeof messageOrData === "string") {
        console.info(this.formatMessage("INFO", tagOrMessage, messageOrData), ...args);
      } else {
        console.info(this.formatMessage("INFO", "APP", tagOrMessage), messageOrData, ...args);
      }
    }
  }

  warn(tagOrMessage: string, messageOrData?: any, ...args: any[]) {
    if (this.shouldLog(LogLevel.WARN)) {
      if (typeof messageOrData === "string") {
        console.warn(this.formatMessage("WARN", tagOrMessage, messageOrData), ...args);
      } else {
        console.warn(this.formatMessage("WARN", "APP", tagOrMessage), messageOrData, ...args);
      }
    }
  }

  error(tagOrMessage: string, messageOrError?: any, errorOrArg?: any, ...args: any[]) {
    if (this.shouldLog(LogLevel.ERROR)) {
      if (typeof messageOrError === "string") {
        console.error(
          this.formatMessage("ERROR", tagOrMessage, messageOrError),
          errorOrArg,
          ...args,
        );
      } else {
        console.error(
          this.formatMessage("ERROR", "APP", tagOrMessage),
          messageOrError,
          errorOrArg,
          ...args,
        );
      }
    }
  }

  /**
   * Log user actions for analytics
   */
  track(action: string, properties?: Record<string, any>) {
    if (this.isDevelopment) {
      this.info("ANALYTICS", `Action: ${action}`, properties);
    }
    // TODO: Send to analytics service (e.g., PostHog, Mixpanel)
  }

  /**
   * Log screen views for analytics
   */
  screenView(screenName: string, properties?: Record<string, any>) {
    if (this.isDevelopment) {
      this.info("ANALYTICS", `Screen View: ${screenName}`, properties);
    }
    // TODO: Send to analytics service
  }

  /**
   * Log errors to error reporting service
   */
  captureException(error: Error, context?: Record<string, any>) {
    this.error("CRASH", "Unhandled exception", error, context);
    // TODO: Send to error reporting service (e.g., Sentry, Crashlytics)
  }

  /**
   * Log API requests/responses
   */
  apiRequest(method: string, url: string, data?: any) {
    this.debug("API", `${method} ${url}`, data);
  }

  apiResponse(method: string, url: string, status: number, data?: any) {
    this.debug("API", `${method} ${url} - ${status}`, data);
  }

  /**
   * Log backend data operations
   */
  dataOperation(operation: string, collection: string, docId?: string) {
    this.debug("DATA", `${operation} ${collection}${docId ? `/${docId}` : ""}`);
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: "debug" | "info" | "warn" | "error" | "none") {
    switch (level) {
      case "debug":
        this.level = LogLevel.DEBUG;
        break;
      case "info":
        this.level = LogLevel.INFO;
        break;
      case "warn":
        this.level = LogLevel.WARN;
        break;
      case "error":
        this.level = LogLevel.ERROR;
        break;
      case "none":
        this.level = LogLevel.NONE;
        break;
    }
  }
}

// Singleton instance
export const logger = new Logger();

// Convenience exports
export const log = {
  debug: (tagOrMessage: string, messageOrData?: any, ...args: any[]) =>
    logger.debug(tagOrMessage, messageOrData, ...args),
  info: (tagOrMessage: string, messageOrData?: any, ...args: any[]) =>
    logger.info(tagOrMessage, messageOrData, ...args),
  warn: (tagOrMessage: string, messageOrData?: any, ...args: any[]) =>
    logger.warn(tagOrMessage, messageOrData, ...args),
  error: (tagOrMessage: string, messageOrError?: any, errorOrArg?: any, ...args: any[]) =>
    logger.error(tagOrMessage, messageOrError, errorOrArg, ...args),
  track: (action: string, properties?: Record<string, any>) => logger.track(action, properties),
  screenView: (screenName: string, properties?: Record<string, any>) =>
    logger.screenView(screenName, properties),
  captureException: (error: Error, context?: Record<string, any>) =>
    logger.captureException(error, context),
  apiRequest: (method: string, url: string, data?: any) => logger.apiRequest(method, url, data),
  apiResponse: (method: string, url: string, status: number, data?: any) =>
    logger.apiResponse(method, url, status, data),
  dataOperation: (operation: string, collection: string, docId?: string) =>
    logger.dataOperation(operation, collection, docId),
};

export default logger;
