import { v4 as uuidv4 } from 'uuid';

// Tipos para o sistema de logging
export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  error?: Error;
  context?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  stack?: string;
  userAgent?: string;
  url?: string;
  component?: string;
}

export interface ErrorContext {
  context?: string;
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 1000;
  private sessionId: string;
  private isProduction = process.env.NODE_ENV === 'production';

  constructor() {
    this.sessionId = uuidv4();
    this.setupGlobalErrorHandlers();
  }

  // Configurar handlers globais de erro
  private setupGlobalErrorHandlers() {
    // Erros JavaScript não capturados
    window.addEventListener('error', (event) => {
      this.logError(event.error || new Error(event.message), {
        context: 'GlobalErrorHandler',
        url: event.filename,
        line: event.lineno,
        column: event.colno,
        timestamp: new Date().toISOString()
      });
    });

    // Promises rejeitadas não capturadas
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          context: 'UnhandledPromiseRejection',
          timestamp: new Date().toISOString()
        }
      );
    });

    // Erros de recursos (imagens, scripts, etc.)
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.logError(new Error(`Resource loading error: ${event.target}`), {
          context: 'ResourceError',
          target: event.target?.toString(),
          timestamp: new Date().toISOString()
        });
      }
    }, true);
  }

  // Log de erro principal
  logError(error: Error, context?: ErrorContext): string {
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    const logEntry: ErrorLogEntry = {
      id,
      timestamp,
      level: 'error',
      message: error.message,
      error,
      stack: error.stack,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...context
    };

    this.addLog(logEntry);
    this.sendToRemoteLogger(logEntry);
    
    // Log no console em desenvolvimento
    if (!this.isProduction) {
      console.error('🚨 Error logged:', logEntry);
    }

    return id;
  }

  // Log de warning
  logWarning(message: string, context?: ErrorContext): string {
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    const logEntry: ErrorLogEntry = {
      id,
      timestamp,
      level: 'warn',
      message,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...context
    };

    this.addLog(logEntry);
    
    if (!this.isProduction) {
      console.warn('⚠️ Warning logged:', logEntry);
    }

    return id;
  }

  // Log de informação
  logInfo(message: string, context?: ErrorContext): string {
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    const logEntry: ErrorLogEntry = {
      id,
      timestamp,
      level: 'info',
      message,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...context
    };

    this.addLog(logEntry);
    
    if (!this.isProduction) {
      console.info('ℹ️ Info logged:', logEntry);
    }

    return id;
  }

  // Log de debug
  logDebug(message: string, context?: ErrorContext): string {
    // Só loga em desenvolvimento
    if (this.isProduction) return '';
    
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    const logEntry: ErrorLogEntry = {
      id,
      timestamp,
      level: 'debug',
      message,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...context
    };

    this.addLog(logEntry);
    console.debug('🐛 Debug logged:', logEntry);

    return id;
  }

  // Adicionar log à lista local
  private addLog(logEntry: ErrorLogEntry) {
    this.logs.unshift(logEntry);
    
    // Manter apenas os logs mais recentes
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Salvar no localStorage para persistência
    this.saveToLocalStorage();
  }

  // Enviar para serviço remoto de logging
  private async sendToRemoteLogger(logEntry: ErrorLogEntry) {
    if (!this.isProduction) return;

    try {
      // Aqui você pode integrar com serviços como Sentry, LogRocket, etc.
      // Por enquanto, vamos simular o envio
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      // Falha silenciosa para não criar loop de erros
      console.error('Failed to send log to remote service:', error);
    }
  }

  // Salvar logs no localStorage
  private saveToLocalStorage() {
    try {
      const logsToSave = this.logs.slice(0, 100); // Salvar apenas os 100 mais recentes
      localStorage.setItem('fisioflow_error_logs', JSON.stringify(logsToSave));
    } catch (error) {
      // Falha silenciosa
      console.warn('Failed to save logs to localStorage:', error);
    }
  }

  // Carregar logs do localStorage
  private loadFromLocalStorage() {
    try {
      const savedLogs = localStorage.getItem('fisioflow_error_logs');
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      }
    } catch (error) {
      console.warn('Failed to load logs from localStorage:', error);
    }
  }

  // Obter logs
  getLogs(level?: ErrorLogEntry['level'], limit?: number): ErrorLogEntry[] {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }
    
    if (limit) {
      filteredLogs = filteredLogs.slice(0, limit);
    }
    
    return filteredLogs;
  }

  // Limpar logs
  clearLogs() {
    this.logs = [];
    localStorage.removeItem('fisioflow_error_logs');
  }

  // Obter estatísticas dos logs
  getLogStats() {
    const stats = {
      total: this.logs.length,
      errors: this.logs.filter(log => log.level === 'error').length,
      warnings: this.logs.filter(log => log.level === 'warn').length,
      info: this.logs.filter(log => log.level === 'info').length,
      debug: this.logs.filter(log => log.level === 'debug').length,
      sessionId: this.sessionId,
      oldestLog: this.logs[this.logs.length - 1]?.timestamp,
      newestLog: this.logs[0]?.timestamp
    };
    
    return stats;
  }

  // Exportar logs para download
  exportLogs(): string {
    const exportData = {
      exportedAt: new Date().toISOString(),
      sessionId: this.sessionId,
      stats: this.getLogStats(),
      logs: this.logs
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // Método para integração com Sentry (se disponível)
  integrateSentry() {
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      const Sentry = (window as any).Sentry;
      
      // Configurar contexto da sessão
      Sentry.setContext('session', {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString()
      });
      
      return true;
    }
    
    return false;
  }
}

// Instância singleton do logger
export const errorLogger = new ErrorLogger();

// Utilitários para logging específico
export const logApiError = (error: Error, endpoint: string, method: string, status?: number) => {
  return errorLogger.logError(error, {
    context: 'APIError',
    endpoint,
    method,
    status,
    timestamp: new Date().toISOString()
  });
};

export const logValidationError = (error: Error, formName: string, field?: string) => {
  return errorLogger.logError(error, {
    context: 'ValidationError',
    formName,
    field,
    timestamp: new Date().toISOString()
  });
};

export const logAuthError = (error: Error, action: string) => {
  return errorLogger.logError(error, {
    context: 'AuthError',
    action,
    timestamp: new Date().toISOString()
  });
};

export const logFileUploadError = (error: Error, fileName: string, fileSize: number) => {
  return errorLogger.logError(error, {
    context: 'FileUploadError',
    fileName,
    fileSize,
    timestamp: new Date().toISOString()
  });
};

export const logDatabaseError = (error: Error, operation: string, table?: string) => {
  return errorLogger.logError(error, {
    context: 'DatabaseError',
    operation,
    table,
    timestamp: new Date().toISOString()
  });
};

// Hook React para usar o logger
export const useErrorLogger = () => {
  const logError = React.useCallback((error: Error, context?: ErrorContext) => {
    return errorLogger.logError(error, context);
  }, []);

  const logWarning = React.useCallback((message: string, context?: ErrorContext) => {
    return errorLogger.logWarning(message, context);
  }, []);

  const logInfo = React.useCallback((message: string, context?: ErrorContext) => {
    return errorLogger.logInfo(message, context);
  }, []);

  const getLogs = React.useCallback((level?: ErrorLogEntry['level'], limit?: number) => {
    return errorLogger.getLogs(level, limit);
  }, []);

  return {
    logError,
    logWarning,
    logInfo,
    getLogs,
    clearLogs: errorLogger.clearLogs.bind(errorLogger),
    getStats: errorLogger.getLogStats.bind(errorLogger),
    exportLogs: errorLogger.exportLogs.bind(errorLogger)
  };
};

// Importar React para o hook
import React from 'react';

export default errorLogger;