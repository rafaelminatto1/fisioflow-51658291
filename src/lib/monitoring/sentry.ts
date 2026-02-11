/**
 * Sentry Error Tracking
 *
 * Monitora erros e exceções no app
 */

import * as Sentry from '@sentry/react';
import { logger } from '@/lib/logging/logger';
import type { Breadcrumb, BreadcrumbHint } from '@sentry/react';

/**
 * Configurações do Sentry
 */
interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
}

/**
 * Inicializa o Sentry
 */
export function initSentry(config: Partial<SentryConfig> = {}) {
  const dsn = config.dsn || import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    logger.warn('[Sentry] DSN não configurado, Sentry não será inicializado');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: config.environment || import.meta.env.MODE,
      release: config.release || import.meta.env.VITE_APP_VERSION,

      // Performance Monitoring
      tracesSampleRate: config.tracesSampleRate ?? 0.1, // 10% das transações
      profilesSampleRate: config.profilesSampleRate ?? 0.1, // 10% dos profiles

      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% das sessões normais
      replaysOnErrorSampleRate: 1.0, // 100% das sessões com erro

      // Integrations
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
        Sentry.extraErrorDataIntegration(),
      ],

      // Filter errors
      beforeSend(event, hint) {
        // Ignorar erros de extensões de navegador
        if (event.exception) {
          const error = hint.originalException;
          if (error instanceof Error) {
            // Ignorar erros comuns de terceiros
            if (error.message.includes('Script error')) {
              return null;
            }
            if (error.message.includes('Non-Error promise rejection')) {
              return null;
            }
          }
        }

        // Adicionar contexto customizado
        event.tags = {
          ...event.tags,
          app: 'fisioflow-web',
        };

        return event;
      },

      // Breadcrumbs
      beforeBreadcrumb(breadcrumb: Breadcrumb, hint?: BreadcrumbHint) {
        // Filtrar breadcrumbs desnecessários
        if (breadcrumb.category === 'xhr') {
          const url = breadcrumb.data?.url as string || '';
          // Não rastrear requisições para analytics
          if (url.includes('google-analytics')) {
            return null;
          }
        }

        return breadcrumb;
      },

      // Environment
      enabled: import.meta.env.PROD || import.meta.env.VITE_SENTRY_ENABLED === 'true',
    });

    logger.info('[Sentry] Inicializado com sucesso');
  } catch (error) {
    logger.error('[Sentry] Erro ao inicializar:', error);
  }
}

/**
 * Captura um erro e envia para o Sentry
 */
export function captureError(error: Error | unknown, context?: Record<string, any>) {
  logger.error('[Sentry] Capturando erro:', error);

  if (import.meta.env.PROD || import.meta.env.VITE_SENTRY_ENABLED === 'true') {
    Sentry.captureException(error, {
      tags: context,
      extra: context,
    });
  }
}

/**
 * Captura uma mensagem e envia para o Sentry
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
) {
  logger.log(`[Sentry] ${level}:`, message);

  if (import.meta.env.PROD || import.meta.env.VITE_SENTRY_ENABLED === 'true') {
    Sentry.captureMessage(message, {
      level,
      tags: context,
      extra: context,
    });
  }
}

/**
 * Adiciona breadcrumb para rastrear eventos
 */
export function addBreadcrumb(
  message: string,
  category: string = 'custom',
  level: 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

/**
 * Define o usuário atual no Sentry
 */
export function setUser(user: {
  id: string;
  email?: string;
  name?: string;
  role?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
    role: user.role,
  });
}

/**
 * Limpa o usuário atual
 */
export function clearUser() {
  Sentry.setUser(null);
}

/**
 * Define um contexto customizado
 */
export function setContext(key: string, context: Record<string, any>) {
  Sentry.setContext(key, context);
}

/**
 * Inicia uma performance transaction
 */
export function startTransaction(name: string, op: string = 'custom') {
  return Sentry.startTransaction({ name, op });
}

/**
 * Adiciona attachment a um evento
 */
export function addAttachment(filename: string, data: string | Blob, contentType?: string) {
  if (import.meta.env.PROD || import.meta.env.VITE_SENTRY_ENABLED === 'true') {
    const scope = Sentry.getCurrentScope();
    scope.addAttachment({
      filename,
      data,
      contentType,
    });
  }
}

/**
 * Classe de erro customizada com contexto
 */
export class TrackedError extends Error {
  public context: Record<string, any>;
  public level: 'info' | 'warning' | 'error';

  constructor(
    message: string,
    context: Record<string, any> = {},
    level: 'info' | 'warning' | 'error' = 'error'
  ) {
    super(message);
    this.name = 'TrackedError';
    this.context = context;
    this.level = level;

    // Capturar automaticamente
    captureError(this, { ...context, level });
  }
}

/**
 * Decorator para capturar erros de funções assíncronas
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  context?: {
    name?: string;
    onError?: (error: Error) => void;
  }
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      const functionName = context?.name || fn.name || 'anonymous';

      if (error instanceof Error) {
        captureError(error, {
          function: functionName,
          args: JSON.stringify(args),
        });
      } else {
        captureMessage(
          `Erro em ${functionName}: ${String(error)}`,
          'error',
          { args: JSON.stringify(args) }
        );
      }

      if (context?.onError) {
        context.onError(error as Error);
      }

      throw error;
    }
  }) as T;
}

/**
 * Hook React para usar Sentry
 */
export function useSentry() {
  return {
    captureError,
    captureMessage,
    addBreadcrumb,
    setUser,
    clearUser,
    setContext,
  };
}

/**
 * Componente Error Boundary com Sentry
 */
import { ComponentProps } from 'react';
export { Sentry.ErrorBoundary as ErrorBoundary };

export type ErrorBoundaryProps = ComponentProps<typeof Sentry.ErrorBoundary>;

/**
 * Utilitários específicos do FisioFlow
 */
export const fisioflowSentry = {
  /**
   * Rastreia erro de API
   */
  trackAPIError: (
    endpoint: string,
    method: string,
    error: Error | unknown,
    statusCode?: number
  ) => {
    captureError(error, {
      category: 'api_error',
      endpoint,
      method,
      status_code: statusCode,
    });
  },

  /**
   * Rastreia erro de validação
   */
  trackValidationError: (
    field: string,
    value: any,
    message: string
  ) => {
    captureMessage(message, 'warning', {
      category: 'validation_error',
      field,
      value: JSON.stringify(value),
    });
  },

  /**
   * Rastreia erro de IA
   */
  trackAIError: (
    model: string,
    operation: string,
    error: Error | unknown
  ) => {
    captureError(error, {
      category: 'ai_error',
      model,
      operation,
    });
  },

  /**
   * Rastreia erro de Firestore
   */
  trackFirestoreError: (
    collection: string,
    operation: string,
    error: Error | unknown
  ) => {
    captureError(error, {
      category: 'firestore_error',
      collection,
      operation,
    });
  },

  /**
   * Rastreia erro de auth
   */
  trackAuthError: (
    operation: string,
    error: Error | unknown
  ) => {
    captureError(error, {
      category: 'auth_error',
      operation,
    });
  },
};
