/**
 * Hook padrão para tratamento de erros em operações assíncronas
 *
 * Fornece uma interface consistente para:
 * - Tratamento de erros de API
 * - Mensagens de erro amigáveis
 * - Logging automático
 * - Retry com backoff exponencial
 */

import { useCallback, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/errors/logger';

export interface ApiErrorOptions {
  /** Mensagem customizada para o usuário */
  userMessage?: string;
  /** Mensagem técnica para logging */
  technicalMessage?: string;
  /** Contexto adicional para logging */
  context?: Record<string, unknown>;
  /** Se deve mostrar toast de erro */
  showToast?: boolean;
  /** Se deve logar o erro */
  logError?: boolean;
  /** Action de recuperação */
  recoveryAction?: () => void;
  /** Label do botão de recuperação */
  recoveryLabel?: string;
}

export interface AsyncOperationResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  reset: () => void;
}

export interface UseErrorHandlerReturn {
  error: Error | null;
  clearError: () => void;
  handleError: (error: unknown, options?: ApiErrorOptions) => void;
  executeAsync: <T>(
    asyncFn: () => Promise<T>,
    options?: ApiErrorOptions
  ) => Promise<T | null>;
  retry: () => Promise<void>;
  isRetrying: boolean;
}

/**
 * Hook para tratamento padronizado de erros
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastAsyncFn, setLastAsyncFn] = useState<(() => Promise<unknown>) | null>(null);
  const [lastOptions, setLastOptions] = useState<ApiErrorOptions | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((error: unknown, options: ApiErrorOptions = {}) => {
    const {
      userMessage = 'Ocorreu um erro inesperado. Tente novamente.',
      technicalMessage,
      context = {},
      showToast = true,
      logError: shouldLogError = true,
      recoveryAction,
      recoveryLabel = 'Tentar novamente',
    } = options;

    // Converter erro para Error
    const errorObj = error instanceof Error ? error : new Error(String(error));

    // Log do erro
    if (shouldLogError) {
      logger.error(
        technicalMessage || userMessage,
        { error: errorObj, ...context },
        'useErrorHandler'
      );
    }

    // Definir estado de erro
    setError(errorObj);

    // Mostrar toast
    if (showToast) {
      const description = errorObj.message || userMessage;

      if (recoveryAction) {
        toast({
          title: userMessage,
          description,
          variant: 'destructive',
          action: recoveryAction && {
            label: recoveryLabel,
            onClick: recoveryAction,
          },
        });
      } else {
        toast({
          title: 'Erro',
          description,
          variant: 'destructive',
        });
      }
    }
  }, []);

  const executeAsync = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options: ApiErrorOptions = {}
  ): Promise<T | null> => {
    try {
      const result = await asyncFn();
      setError(null);
      return result;
    } catch (error) {
      handleError(error, options);
      setLastAsyncFn(() => asyncFn);
      setLastOptions(options);
      return null;
    }
  }, [handleError]);

  const retry = useCallback(async () => {
    if (!lastAsyncFn) return;

    setIsRetrying(true);
    try {
      await executeAsync(lastAsyncFn, lastOptions || undefined);
    } finally {
      setIsRetrying(false);
    }
  }, [lastAsyncFn, lastOptions, executeAsync]);

  return {
    error,
    clearError,
    handleError,
    executeAsync,
    retry,
    isRetrying,
  };
}

/**
 * Determina se um erro deve ser logado baseado no tipo
 */
function shouldLogError(error: unknown): boolean {
  // Não logar erros de cancelamento
  if (error instanceof Error && error.name === 'AbortError') {
    return false;
  }

  // Não logar erros de rede offline
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return !navigator.onLine;
  }

  return true;
}

/**
 * Hook para operações assíncronas com estados de loading, error e data
 */
export function useAsyncOperation<T>() {
  const [state, setState] = useState<AsyncOperationResult<T>>({
    data: null,
    error: null,
    isLoading: false,
    reset: () => setState((prev) => ({ ...prev, error: null, data: null })),
  });

  const reset = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, data: null }));
  }, []);

  const execute = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options?: ApiErrorOptions
  ): Promise<T | null> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await asyncFn();
      setState({ data, error: null, isLoading: false, reset });
      return data as T;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));

      setState((prev) => ({ ...prev, error: errorObj, isLoading: false }));

      if (options?.showToast !== false) {
        toast({
          title: options.userMessage || 'Erro',
          description: errorObj.message,
          variant: 'destructive',
        });
      }

      if (options?.logError !== false) {
        logger.error(
          options.technicalMessage || 'Async operation error',
          { error: errorObj, ...options.context },
          'useAsyncOperation'
        );
      }

      return null;
    }
  }, []);

  return {
    ...state,
    execute,
  };
}

/**
 * Mapeia códigos de erro HTTP para mensagens amigáveis
 */
export function getErrorMessageFromStatus(status: number): string {
  const errorMessages: Record<number, string> = {
    400: 'Os dados enviados são inválidos.',
    401: 'Você não está autenticado.',
    403: 'Você não tem permissão para realizar esta ação.',
    404: 'O recurso solicitado não foi encontrado.',
    409: 'O recurso já existe ou está em conflito.',
    422: 'Os dados enviados são inválidos.',
    429: 'Muitas solicitações. Aguarde um momento.',
    500: 'Erro interno do servidor. Tente novamente.',
    502: 'Serviço temporariamente indisponível.',
    503: 'Serviço temporariamente indisponível.',
  };

  return errorMessages[status] || 'Ocorreu um erro inesperado.';
}

/**
 * Extrai informações úteis de um erro para logging
 */
export function extractErrorInfo(error: unknown): {
  message: string;
  name?: string;
  stack?: string;
  cause?: unknown;
  status?: number;
  code?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      cause: error.cause,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    return {
      message: String(err.message || err.error || 'Unknown error'),
      name: String(err.name || 'Error'),
      status: typeof err.status === 'number' ? err.status : undefined,
      code: err.code ? String(err.code) : undefined,
    };
  }

  return {
    message: String(error),
  };
}
