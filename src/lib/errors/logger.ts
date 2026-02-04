// Enhanced logging system with performance monitoring
const LOG_LEVEL_ORDER = { debug: 0, info: 1, warn: 2, error: 3, performance: 1 } as const;
type LogLevel = keyof typeof LOG_LEVEL_ORDER;

interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug' | 'performance';
  message: string;
  data?: unknown;
  component?: string;
  userId?: string;
  sessionId: string;
}

function getMinLogLevel(): LogLevel {
  const env = (import.meta as ImportMeta & { env: { VITE_LOG_LEVEL?: string } }).env;
  const v = env.VITE_LOG_LEVEL?.toLowerCase();
  if (v === 'error' || v === 'warn' || v === 'info' || v === 'debug') return v as LogLevel;
  return 'info';
}

function shouldLogLongTasks(): boolean {
  if (typeof window === 'undefined') return false;
  return getMinLogLevel() === 'debug' || window.localStorage?.getItem('DEBUG_LONG_TASKS') === '1';
}

function formatLogData(data: unknown): unknown {
  if (data === undefined || data === null || data === '') return '';
  if (typeof data === 'object') {
    try {
      const str = JSON.stringify(data, null, 0);
      return str.length > 500 ? str.slice(0, 500) + '…' : str;
    } catch {
      return data;
    }
  }
  return data;
}

class Logger {
  private sessionId: string;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isDevelopment = (import.meta as ImportMeta & { env: { DEV?: boolean; PROD?: boolean } }).env.DEV;
  private minLevel: LogLevel = getMinLogLevel();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupPerformanceMonitoring();
  }

  private shouldOutput(level: LogEntry['level']): boolean {
    const order = LOG_LEVEL_ORDER[level] ?? 0;
    const minOrder = LOG_LEVEL_ORDER[this.minLevel] ?? 0;
    return order >= minOrder;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createLogEntry(level: LogEntry['level'], message: string, data?: unknown, component?: string): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      component,
      sessionId: this.sessionId
    };
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output in development: respect VITE_LOG_LEVEL (Long Task also when DEBUG_LONG_TASKS=1)
    const forceLongTask = entry.message === 'Long Task Detected' && entry.level === 'debug' && shouldLogLongTasks();
    if (this.isDevelopment && (this.shouldOutput(entry.level) || forceLongTask)) {
      const style = this.getConsoleStyle(entry.level);
      const dataForConsole = formatLogData(entry.data);
      const hasData = entry.data !== undefined && entry.data !== null && dataForConsole !== '';
      console.log(
        `%c[${entry.level.toUpperCase()}] ${entry.timestamp} ${entry.component ? `[${entry.component}]` : ''} ${entry.message}`,
        style,
        hasData ? dataForConsole : ''
      );
    }
  }

  private getConsoleStyle(level: string): string {
    const styles = {
      error: 'color: #ff4444; font-weight: bold;',
      warn: 'color: #ffaa00; font-weight: bold;',
      info: 'color: #0088ff; font-weight: bold;',
      debug: 'color: #888888;',
      performance: 'color: #00aa00; font-weight: bold;'
    };
    return styles[level as keyof typeof styles] || '';
  }

  private setupPerformanceMonitoring() {
    if (typeof window !== 'undefined' && this.isDevelopment) {
      // Monitor page load performance
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          this.performance('Page Load', {
            loadTime: perfData.loadEventEnd - perfData.loadEventStart,
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            totalTime: perfData.loadEventEnd - perfData.fetchStart
          });
        }, 0);
      });

      // Monitor long tasks: only log when VITE_LOG_LEVEL=debug or localStorage DEBUG_LONG_TASKS=1
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            if (!shouldLogLongTasks()) return;
            list.getEntries().forEach((entry) => {
              if (entry.duration > 50) {
                this.debug('Long Task Detected', {
                  duration: entry.duration,
                  startTime: entry.startTime
                });
              }
            });
          });
          observer.observe({ entryTypes: ['longtask'] });
        } catch {
          // PerformanceObserver not supported
        }
      }
    }
  }


  error(message: string, error?: unknown, component?: string) {
    this.addLog(this.createLogEntry('error', message, error, component));
    if ((import.meta as ImportMeta & { env: { DEV?: boolean; PROD?: boolean } }).env.PROD && typeof window !== 'undefined' && (window as Window & { Sentry?: { captureException: (error: Error, config: Record<string, unknown>) => void; captureMessage: (message: string, config: Record<string, unknown>) => void } }).Sentry) {
      (window as Window & { Sentry?: { captureException: (error: Error, config: Record<string, unknown>) => void; captureMessage: (message: string, config: Record<string, unknown>) => void } }).Sentry.captureException(error instanceof Error ? error : new Error(message), {
        extra: { component, message, data: error }
      });
    }
  }

  warn(message: string, data?: unknown, component?: string) {
    this.addLog(this.createLogEntry('warn', message, data, component));
    if ((import.meta as ImportMeta & { env: { DEV?: boolean; PROD?: boolean } }).env.PROD && typeof window !== 'undefined' && (window as Window & { Sentry?: { captureException: (error: Error, config: Record<string, unknown>) => void; captureMessage: (message: string, config: Record<string, unknown>) => void } }).Sentry) {
      (window as Window & { Sentry?: { captureException: (error: Error, config: Record<string, unknown>) => void; captureMessage: (message: string, config: Record<string, unknown>) => void } }).Sentry.captureMessage(message, {
        level: 'warning',
        extra: { component, data }
      });
    }
  }

  info(message: string, data?: unknown, component?: string) {
    this.addLog(this.createLogEntry('info', message, data, component));
  }

  debug(message: string, data?: unknown, component?: string) {
    if (this.isDevelopment) {
      this.addLog(this.createLogEntry('debug', message, data, component));
    }
  }

  performance(message: string, data?: unknown, component?: string) {
    this.addLog(this.createLogEntry('performance', message, data, component));
  }

  // Performance timing utilities
  startTimer(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.performance(`Timer: ${label}`, { duration: `${duration.toFixed(2)}ms` });
    };
  }

  // Get logs for debugging
  getLogs(level?: LogEntry['level']): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const fisioLogger = new Logger();
export const logger = fisioLogger;

// Convenience aliases for direct console.log replacement
// Use these instead of console.log/warn/error throughout the codebase
export const log = {
  debug: (message: string, data?: unknown, component?: string) => fisioLogger.debug(message, data, component),
  info: (message: string, data?: unknown, component?: string) => fisioLogger.info(message, data, component),
  warn: (message: string, data?: unknown, component?: string) => fisioLogger.warn(message, data, component),
  error: (message: string, error?: unknown, component?: string) => fisioLogger.error(message, error, component),
  performance: (message: string, data?: unknown, component?: string) => fisioLogger.performance(message, data, component),
};

// Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    fisioLogger.error('Global Error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    fisioLogger.error('Unhandled Promise Rejection', {
      reason: event.reason
    });
  });
}