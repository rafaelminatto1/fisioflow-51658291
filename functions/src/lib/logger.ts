/**
 * Structured Logging Module
 * Logging estruturado para Cloud Functions compatível com Cloud Logging
 */

/**
 * Níveis de log
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * Contexto de log
 */
export interface LogContext {
  userId?: string;
  organizationId?: string;
  requestId?: string;
  functionName?: string;
  functionRegion?: string;
  [key: string]: any;
}

/**
 * Entrada de log estruturada
 */
export interface LogEntry {
  severity: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  timestamp: string;
  [key: string]: any;
}

/**
 * Logger para Cloud Functions
 */
export class StructuredLogger {
  private readonly functionName: string;
  private readonly region: string;
  private readonly context: LogContext;

  constructor(functionName: string, region: string = 'southamerica-east1') {
    this.functionName = functionName;
    this.region = region;
    this.context = {
      functionName,
      functionRegion: region,
    };
  }

  /**
   * Define o contexto de log
   */
  setContext(context: Partial<LogContext>): void {
    Object.assign(this.context, context);
  }

  /**
   * Limpa o contexto de log
   */
  clearContext(): void {
    this.context.userId = undefined;
    this.context.organizationId = undefined;
    this.context.requestId = undefined;
  }

  /**
   * Log em nível DEBUG
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log em nível INFO
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log em nível WARN
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log em nível ERROR
   */
  error(message: string, error?: Error | any): void {
    this.log(LogLevel.ERROR, message, error);
  }

  /**
   * Log em nível CRITICAL
   */
  critical(message: string, error?: Error | any): void {
    this.log(LogLevel.CRITICAL, message, error);
  }

  /**
   * Log genérico
   */
  private log(severity: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      severity,
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
    };

    // Adicionar dados adicionais
    if (data) {
      if (data instanceof Error) {
        entry.error = {
          name: data.name,
          message: data.message,
          stack: data.stack,
        };
        entry.errorType = data.name;
        entry.errorMessage = data.message;
      } else {
        Object.assign(entry, data);
      }
    }

    // Formatar para Cloud Logging
    const formatted = this.formatForCloudLogging(entry);

    // Escrever no console com o formato correto
    switch (severity) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(formatted);
        break;
    }
  }

  /**
   * Formata entrada para Cloud Logging
   */
  private formatForCloudLogging(entry: LogEntry): string {
    // Cloud Logging espera JSON estruturado
    const cloudEntry: any = {
      severity: entry.severity,
      message: entry.message,
      time: entry.timestamp,
      // Labels para filtragem - usar notação de colchetes para keys com pontos
      'logging.googleapis.com/labels': {
        function_name: this.functionName,
        region: this.region,
        ...(entry.userId && { user_id: entry.userId }),
        ...(entry.organizationId && { organization_id: entry.organizationId }),
      },
    };

    // Adicionar contexto
    if (entry.context) {
      Object.assign(cloudEntry, entry.context);
    }

    // Adicionar erro se presente
    if (entry.error) {
      cloudEntry.stack_trace = entry.error.stack;
      cloudEntry.serviceContext = {
        service: this.functionName,
        version: '1.0.0',
      };
    }

    return JSON.stringify(cloudEntry);
  }

  /**
   * Mede tempo de execução
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    this.debug(`${operation} - Started`);

    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.info(`${operation} - Completed`, { duration_ms: duration });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.error(`${operation} - Failed after ${duration}ms`, error as Error);
      throw error;
    }
  }
}

/**
 * Mapa de loggers singleton por função
 */
const loggerInstances = new Map<string, StructuredLogger>();

/**
 * Obtém um logger para a função atual
 */
export function getLogger(functionName: string, region?: string): StructuredLogger {
  if (!loggerInstances.has(functionName)) {
    loggerInstances.set(
      functionName,
      new StructuredLogger(functionName, region)
    );
  }
  return loggerInstances.get(functionName)!;
}

/**
 * Decorator para logging automático de funções
 */
export function logExecution(
  logger: StructuredLogger,
  operationName?: string
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const operation = operationName || propertyKey;

    descriptor.value = async function (...args: any[]) {
      logger.debug(`${operation} - Started`, { args });
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        logger.info(`${operation} - Completed`, {
          duration_ms: duration,
          result: typeof result === 'object' ? { ...result } : result,
        });
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`${operation} - Failed`, {
          duration_ms: duration,
          error: error as Error,
          args,
        });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Logger padrão para uso geral
 */
export const logger = {
  debug: (message: string, data?: any) => {
    getLogger('default').debug(message, data);
  },
  info: (message: string, data?: any) => {
    getLogger('default').info(message, data);
  },
  warn: (message: string, data?: any) => {
    getLogger('default').warn(message, data);
  },
  error: (message: string, error?: Error | any) => {
    getLogger('default').error(message, error);
  },
  critical: (message: string, error?: Error | any) => {
    getLogger('default').critical(message, error);
  },
  measure: async <T>(operation: string, fn: () => Promise<T>): Promise<T> => {
    return getLogger('default').measure(operation, fn);
  },
};
