// Enhanced logging system with performance monitoring
interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug' | 'performance';
  message: string;
  data?: unknown;
  component?: string;
  userId?: string;
  sessionId: string;
}

class Logger {
  private sessionId: string;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isDevelopment = import.meta.env.DEV;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupPerformanceMonitoring();
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

    // Console output in development
    if (this.isDevelopment) {
      const style = this.getConsoleStyle(entry.level);
      console.log(
        `%c[${entry.level.toUpperCase()}] ${entry.timestamp} ${entry.component ? `[${entry.component}]` : ''} ${entry.message}`,
        style,
        entry.data || ''
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

      // Monitor long tasks
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
              if (entry.duration > 50) {
                this.warn('Long Task Detected', {
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
  }

  warn(message: string, data?: unknown, component?: string) {
    this.addLog(this.createLogEntry('warn', message, data, component));
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

export const logger = new Logger();

// Convenience aliases for direct console.log replacement
// Use these instead of console.log/warn/error throughout the codebase
export const log = {
  debug: (message: string, data?: unknown, component?: string) => logger.debug(message, data, component),
  info: (message: string, data?: unknown, component?: string) => logger.info(message, data, component),
  warn: (message: string, data?: unknown, component?: string) => logger.warn(message, data, component),
  error: (message: string, error?: unknown, component?: string) => logger.error(message, error, component),
  performance: (message: string, data?: unknown, component?: string) => logger.performance(message, data, component),
};

// Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.error('Global Error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled Promise Rejection', {
      reason: event.reason
    });
  });
}