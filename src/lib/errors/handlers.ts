import { toast } from 'sonner';
import { errorLogger, logApiError, logValidationError, logAuthError } from './logger';
import { ZodError } from 'zod';

// Tipos de erro customizados
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: string;
  public readonly metadata?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: string,
    metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.metadata = metadata;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public readonly field?: string;
  public readonly validationErrors?: Record<string, string[]>;

  constructor(
    message: string,
    field?: string,
    validationErrors?: Record<string, string[]>,
    metadata?: Record<string, any>
  ) {
    super(message, 400, true, 'ValidationError', metadata);
    this.name = 'ValidationError';
    this.field = field;
    this.validationErrors = validationErrors;
  }
}

export class AuthError extends AppError {
  public readonly authAction?: string;

  constructor(
    message: string,
    statusCode: number = 401,
    authAction?: string,
    metadata?: Record<string, any>
  ) {
    super(message, statusCode, true, 'AuthError', metadata);
    this.name = 'AuthError';
    this.authAction = authAction;
  }
}

export class NetworkError extends AppError {
  public readonly endpoint?: string;
  public readonly method?: string;

  constructor(
    message: string,
    statusCode: number = 0,
    endpoint?: string,
    method?: string,
    metadata?: Record<string, any>
  ) {
    super(message, statusCode, true, 'NetworkError', metadata);
    this.name = 'NetworkError';
    this.endpoint = endpoint;
    this.method = method;
  }
}

export class FileUploadError extends AppError {
  public readonly fileName?: string;
  public readonly fileSize?: number;

  constructor(
    message: string,
    fileName?: string,
    fileSize?: number,
    metadata?: Record<string, any>
  ) {
    super(message, 400, true, 'FileUploadError', metadata);
    this.name = 'FileUploadError';
    this.fileName = fileName;
    this.fileSize = fileSize;
  }
}

// Handler principal de erros
export class ErrorHandler {
  // Tratar erro de API
  static handleApiError(error: any, endpoint?: string, method?: string): AppError {
    let appError: AppError;

    if (error.response) {
      // Erro de resposta HTTP
      const { status, data } = error.response;
      const message = data?.message || data?.error || `Erro HTTP ${status}`;
      
      appError = new NetworkError(message, status, endpoint, method, {
        responseData: data,
        headers: error.response.headers
      });
    } else if (error.request) {
      // Erro de rede
      appError = new NetworkError(
        'Erro de conexão. Verifique sua internet.',
        0,
        endpoint,
        method,
        { request: error.request }
      );
    } else {
      // Erro de configuração ou outro
      appError = new AppError(
        error.message || 'Erro desconhecido',
        500,
        false,
        'UnknownError',
        { originalError: error }
      );
    }

    // Log do erro
    logApiError(appError, endpoint || 'unknown', method || 'unknown', appError.statusCode);
    
    return appError;
  }

  // Tratar erro de validação Zod
  static handleValidationError(error: ZodError, formName?: string): ValidationError {
    const validationErrors: Record<string, string[]> = {};
    let firstError = '';

    error.errors.forEach((err) => {
      const field = err.path.join('.');
      if (!validationErrors[field]) {
        validationErrors[field] = [];
      }
      validationErrors[field].push(err.message);
      
      if (!firstError) {
        firstError = err.message;
      }
    });

    const validationError = new ValidationError(
      firstError || 'Dados inválidos',
      Object.keys(validationErrors)[0],
      validationErrors,
      { formName, zodError: error }
    );

    // Log do erro
    logValidationError(validationError, formName || 'unknown');
    
    return validationError;
  }

  // Tratar erro de autenticação
  static handleAuthError(error: any, action?: string): AuthError {
    let message = 'Erro de autenticação';
    let statusCode = 401;

    if (error.message) {
      message = error.message;
    }

    if (error.status || error.statusCode) {
      statusCode = error.status || error.statusCode;
    }

    // Mensagens específicas baseadas no código
    switch (statusCode) {
      case 401:
        message = 'Credenciais inválidas ou sessão expirada';
        break;
      case 403:
        message = 'Acesso negado. Você não tem permissão para esta ação';
        break;
      case 429:
        message = 'Muitas tentativas. Tente novamente em alguns minutos';
        break;
    }

    const authError = new AuthError(message, statusCode, action, {
      originalError: error
    });

    // Log do erro
    logAuthError(authError, action || 'unknown');
    
    return authError;
  }

  // Tratar erro de upload de arquivo
  static handleFileUploadError(error: any, fileName?: string, fileSize?: number): FileUploadError {
    let message = 'Erro no upload do arquivo';

    // Mensagens específicas baseadas no tipo de erro
    if (error.message?.includes('size')) {
      message = 'Arquivo muito grande. Tamanho máximo permitido: 50MB';
    } else if (error.message?.includes('type')) {
      message = 'Tipo de arquivo não permitido';
    } else if (error.message?.includes('network')) {
      message = 'Erro de conexão durante o upload';
    }

    const fileError = new FileUploadError(message, fileName, fileSize, {
      originalError: error
    });

    // Log do erro
    errorLogger.logError(fileError, {
      context: 'FileUploadError',
      fileName,
      fileSize
    });
    
    return fileError;
  }

  // Mostrar erro para o usuário
  static showError(error: AppError | Error, customMessage?: string) {
    const message = customMessage || error.message || 'Erro desconhecido';
    
    if (error instanceof ValidationError) {
      // Mostrar primeiro erro de validação
      toast.error('Dados inválidos', {
        description: message
      });
    } else if (error instanceof AuthError) {
      // Erro de autenticação
      toast.error('Erro de autenticação', {
        description: message
      });
    } else if (error instanceof NetworkError) {
      // Erro de rede
      toast.error('Erro de conexão', {
        description: message
      });
    } else if (error instanceof FileUploadError) {
      // Erro de upload
      toast.error('Erro no upload', {
        description: message
      });
    } else {
      // Erro genérico
      toast.error('Erro', {
        description: message
      });
    }
  }

  // Mostrar sucesso
  static showSuccess(message: string, description?: string) {
    toast.success(message, {
      description
    });
  }

  // Mostrar aviso
  static showWarning(message: string, description?: string) {
    toast.warning(message, {
      description
    });
  }

  // Mostrar informação
  static showInfo(message: string, description?: string) {
    toast.info(message, {
      description
    });
  }

  // Verificar se é erro operacional
  static isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }

  // Obter código de status do erro
  static getStatusCode(error: Error): number {
    if (error instanceof AppError) {
      return error.statusCode;
    }
    return 500;
  }

  // Obter contexto do erro
  static getContext(error: Error): string | undefined {
    if (error instanceof AppError) {
      return error.context;
    }
    return undefined;
  }

  // Serializar erro para envio
  static serializeError(error: Error): Record<string, any> {
    const serialized: Record<string, any> = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };

    if (error instanceof AppError) {
      serialized.statusCode = error.statusCode;
      serialized.isOperational = error.isOperational;
      serialized.context = error.context;
      serialized.metadata = error.metadata;
    }

    if (error instanceof ValidationError) {
      serialized.field = error.field;
      serialized.validationErrors = error.validationErrors;
    }

    if (error instanceof AuthError) {
      serialized.authAction = error.authAction;
    }

    if (error instanceof NetworkError) {
      serialized.endpoint = error.endpoint;
      serialized.method = error.method;
    }

    if (error instanceof FileUploadError) {
      serialized.fileName = error.fileName;
      serialized.fileSize = error.fileSize;
    }

    return serialized;
  }
}

// Utilitários para tratamento de erros específicos
export const handleAsyncError = (fn: Function) => {
  return async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      // Converter erro desconhecido em AppError
      const appError = new AppError(
        error instanceof Error ? error.message : 'Erro desconhecido',
        500,
        false,
        'AsyncError',
        { originalError: error }
      );
      
      errorLogger.logError(appError);
      throw appError;
    }
  };
};

// Decorator para métodos de classe
export const catchErrors = (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
  const method = descriptor.value;
  
  descriptor.value = async function (...args: any[]) {
    try {
      return await method.apply(this, args);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      const appError = new AppError(
        error instanceof Error ? error.message : 'Erro desconhecido',
        500,
        false,
        `${target.constructor.name}.${propertyName}`,
        { originalError: error }
      );
      
      errorLogger.logError(appError);
      throw appError;
    }
  };
};

// Hook React para tratamento de erros
import { useCallback } from 'react';

export const useErrorHandler = () => {
  const handleError = useCallback((error: any, context?: string) => {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else if (error instanceof ZodError) {
      appError = ErrorHandler.handleValidationError(error, context);
    } else {
      appError = new AppError(
        error?.message || 'Erro desconhecido',
        500,
        false,
        context,
        { originalError: error }
      );
      errorLogger.logError(appError);
    }

    ErrorHandler.showError(appError);
    return appError;
  }, []);

  const handleApiError = useCallback((error: any, endpoint?: string, method?: string) => {
    const appError = ErrorHandler.handleApiError(error, endpoint, method);
    ErrorHandler.showError(appError);
    return appError;
  }, []);

  const handleValidationError = useCallback((error: ZodError, formName?: string) => {
    const appError = ErrorHandler.handleValidationError(error, formName);
    ErrorHandler.showError(appError);
    return appError;
  }, []);

  const showSuccess = useCallback((message: string, description?: string) => {
    ErrorHandler.showSuccess(message, description);
  }, []);

  const showWarning = useCallback((message: string, description?: string) => {
    ErrorHandler.showWarning(message, description);
  }, []);

  const showInfo = useCallback((message: string, description?: string) => {
    ErrorHandler.showInfo(message, description);
  }, []);

  return {
    handleError,
    handleApiError,
    handleValidationError,
    showSuccess,
    showWarning,
    showInfo
  };
};

export default ErrorHandler;