
import { AppError, SupabaseError } from './AppError';
import { logger } from './logger';
import { toast } from 'sonner';

/**
 * Error notification options
 */
export interface ErrorNotificationOptions {
    /** Whether to show toast notification (default: true) */
    showNotification?: boolean;
    /** Custom title for notification */
    title?: string;
    /** Custom message for notification */
    message?: string;
    /** Notification duration in milliseconds */
    duration?: number;
    /** Action button for notification */
    action?: {
        label: string;
        onClick: () => void;
    };
}

/**
 * Global Error Handler Helper
 * Centralizes error logging and user notification strategies.
 */
export const ErrorHandler = {
    /**
     * Handle any error thrown in the application
     */
    handle(error: unknown, context?: string, options?: ErrorNotificationOptions): AppError {
        let appError: AppError;

        // Convert to AppError if needed
        if (error instanceof AppError) {
            appError = error;
        } else if (error instanceof Error) {
            // Check if it's a Supabase error
            if (this.isSupabaseError(error)) {
                appError = SupabaseError.fromNetworkError(error);
            } else {
                // Wrap generic errors
                appError = new AppError(error.message, 'UNKNOWN_ERROR', 500, false, { context }, error);
                appError.stack = error.stack;
            }
        } else {
            // Handle non-error objects
            appError = new AppError('Erro desconhecido', 'UNKNOWN_ERROR', 500, false, { context, originalError: error });
        }

        // Log the error
        this.logError(appError, context);

        // Notify user if appropriate
        const shouldNotify = options?.showNotification ?? this.shouldNotifyUser(appError);
        if (shouldNotify) {
            this.notifyUser(appError, options);
        }

        // Special handling for auth errors
        if (this.isAuthError(appError)) {
            this.handleAuthError(appError);
        }

        return appError;
    },

    /**
     * Determine if error should be shown to user
     */
    shouldNotifyUser(error: AppError): boolean {
        // Don't notify for 404s in some cases
        if (error.code === 'NOT_FOUND' && error.context?.silent) {
            return false;
        }

        // Always notify for operational errors and server errors
        return error.isOperational || error.statusCode >= 500;
    },

    /**
     * Log error appropriately based on severity
     */
    logError(error: AppError, context?: string) {
        const logData = {
            code: error.code,
            statusCode: error.statusCode,
            context,
            ...error.context,
        };

        if (error.isOperational) {
            logger.warn(error.message, logData, context || error.code);
        } else {
            logger.error(error.message, error.toJSON(), context || 'CRITICAL');
        }
    },

    /**
     * Show toast notification to user
     */
    notifyUser(error: AppError, options?: ErrorNotificationOptions) {
        const title = options?.title || this.getTitle(error);
        const message = options?.message || error.getUserMessage();
        const fullMessage = title ? `${title}: ${message}` : message;

        // Determine toast type based on error severity
        const toastType = this.getToastType(error);

        // Show notification with action if provided
        const toastFn = toast[toastType] || toast.error;

        if (options?.action) {
            toastFn(fullMessage, {
                duration: options?.duration,
                action: {
                    label: options.action.label,
                    onClick: options.action.onClick,
                },
            });
        } else {
            toastFn(fullMessage, { duration: options?.duration });
        }
    },

    /**
     * Get toast type based on error
     */
    getToastType(error: AppError): 'error' | 'warning' | 'info' {
        if (error.statusCode >= 500 || !error.isOperational) {
            return 'error';
        }
        if (error.statusCode === 401 || error.statusCode === 403) {
            return 'warning';
        }
        if (error.statusCode >= 400 && error.statusCode < 500) {
            return 'warning';
        }
        return 'error';
    },

    /**
     * Get friendly title based on error code
     */
    getTitle(error: AppError): string {
        // Supabase-specific titles
        if (error instanceof SupabaseError) {
            switch (error.code) {
                case 'UNIQUE_VIOLATION': return 'Registro Duplicado';
                case 'FOREIGN_KEY': return 'Registro Relacionado';
                case 'REQUIRED_FIELD': return 'Campo Obrigatório';
                case 'RLS_DENIED': return 'Acesso Restrito';
                case 'INVALID_CREDENTIALS': return 'Credenciais Inválidas';
                case 'EMAIL_NOT_CONFIRMED': return 'E-mail Não Confirmado';
                case 'SESSION_EXPIRED': return 'Sessão Expirada';
                case 'NETWORK_ERROR': return 'Sem Conexão';
                case 'TIMEOUT': return 'Tempo Esgotado';
                default: return 'Erro de Banco de Dados';
            }
        }

        // General error titles
        switch (error.code) {
            case 'BAD_REQUEST': return 'Dados Inválidos';
            case 'UNAUTHORIZED': return 'Não Autorizado';
            case 'FORBIDDEN': return 'Permissão Negada';
            case 'NOT_FOUND': return 'Não Encontrado';
            case 'CONFLICT': return 'Conflito de Dados';
            case 'VALIDATION_ERROR': return 'Erro de Validação';
            case 'RATE_LIMIT': return 'Muitas Tentativas';
            case 'INTERNAL_ERROR': return 'Erro no Sistema';
            case 'NETWORK_ERROR': return 'Erro de Conexão';
            case 'TIMEOUT': return 'Operação Expirou';
            case 'SERVICE_UNAVAILABLE': return 'Serviço Indisponível';
            default: return 'Ocorreu um Erro';
        }
    },

    /**
     * Check if error is a Supabase error
     */
    isSupabaseError(error: Error): boolean {
        const message = error.message.toLowerCase();
        return (
            message.includes('supabase') ||
            message.includes('postgres') ||
            message.includes('database') ||
            message.includes('constraint') ||
            message.includes('duplicate key') ||
            message.includes('foreign key') ||
            message.includes('null constraint') ||
            error.name === 'PostgresError'
        );
    },

    /**
     * Check if error is an auth error
     */
    isAuthError(error: AppError): boolean {
        return (
            error.code === 'UNAUTHORIZED' ||
            error.code === 'INVALID_CREDENTIALS' ||
            error.code === 'SESSION_EXPIRED' ||
            error.code === 'EMAIL_NOT_CONFIRMED' ||
            error.code === 'INVALID_REFRESH_TOKEN' ||
            error.statusCode === 401
        );
    },

    /**
     * Handle auth-specific errors
     */
    handleAuthError(error: AppError) {
        // Clear session data
        if (typeof window !== 'undefined') {
            // Could trigger logout flow here
            logger.info('Auth error detected, session may need refresh', { code: error.code });
        }
    },

    /**
     * Handle async errors in promises
     */
    async handleAsync<T>(
        fn: () => Promise<T>,
        context?: string,
        options?: ErrorNotificationOptions & { fallbackValue?: T }
    ): Promise<T> {
        try {
            return await fn();
        } catch (error) {
            this.handle(error, context, options);
            if (options?.fallbackValue !== undefined) {
                return options.fallbackValue;
            }
            throw error;
        }
    },

    /**
     * Wrap a function with error handling
     */
    wrap<T extends (...args: unknown[]) => unknown>(
        fn: T,
        context?: string,
        options?: ErrorNotificationOptions
    ): T {
        return ((...args: unknown[]) => {
            try {
                const result = fn(...args);
                // Handle async functions
                if (result instanceof Promise) {
                    return result.catch((error) => {
                        throw this.handle(error, context, options);
                    });
                }
                return result;
            } catch (error) {
                throw this.handle(error, context, options);
            }
        }) as T;
    },

    /**
     * Batch handle multiple errors
     */
    handleBatch(errors: unknown[], context?: string): AppError[] {
        return errors.map((error, index) =>
            this.handle(error, `${context}[${index}]`, { showNotification: false })
        );
    },

    /**
     * Get recovery suggestion for error
     */
    getRecoverySuggestion(error: AppError): string | null {
        const suggestions: Record<string, string> = {
            NETWORK_ERROR: 'Verifique sua conexão com a internet.',
            TIMEOUT: 'Tente novamente. Se o problema persistir, contate o suporte.',
            SESSION_EXPIRED: 'Faça login novamente.',
            INVALID_CREDENTIALS: 'Verifique seu e-mail e senha.',
            UNIQUE_VIOLATION: 'Este registro já existe. Verifique os dados.',
            FOREIGN_KEY: 'Verifique se os registros relacionados existem.',
            REQUIRED_FIELD: 'Preencha todos os campos obrigatórios.',
            RATE_LIMIT: 'Aguarde alguns minutos antes de tentar novamente.',
            SERVICE_UNAVAILABLE: 'O serviço está temporariamente indisponível. Tente novamente mais tarde.',
        };

        return suggestions[error.code] || null;
    },
};

/**
 * React Error Boundary fallback component helper
 */
export function getErrorFallbackMessage(error: unknown): string {
    const appError = ErrorHandler.handle(error, 'ErrorBoundary', { showNotification: false });
    return appError.getUserMessage();
}

/**
 * Higher-order component for error boundaries
 * Note: This is a placeholder - would need React import and ErrorBoundary library
 */
// Uncomment when using with React Error Boundary
/*
import React from 'react';

export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    fallback?: React.ComponentType<{ error: Error; retry: () => void }>
): React.ComponentType<P> {
    return function WithErrorBoundaryWrapper(props: P) {
        // This would be used with React Error Boundary
        return React.createElement(Component, props);
    };
}
*/
