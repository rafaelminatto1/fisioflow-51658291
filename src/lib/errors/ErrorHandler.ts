
import { AppError } from './AppError';
import { logger } from './logger';
import { toast } from '@/hooks/use-toast';

/**
 * Global Error Handler Helper
 * Centralizes error logging and user notification strategies.
 */
export const ErrorHandler = {
    /**
     * Handle any error thrown in the application
     */
    handle(error: unknown, context?: string) {
        let appError: AppError;

        if (error instanceof AppError) {
            appError = error;
        } else if (error instanceof Error) {
            // Wrap generic errors
            appError = new AppError(error.message, 'UNKNOWN_ERROR', 500, false);
            appError.stack = error.stack;
        } else {
            // Handle non-error objects
            appError = new AppError('Erro desconhecido', 'UNKNOWN_ERROR', 500, false);
        }

        // Log the error
        if (appError.isOperational) {
            logger.warn(appError.message, { code: appError.code, context }, context);
        } else {
            logger.error(appError.message, appError, context);
        }

        // Notify user if appropriate
        // We avoid notifying for 404s in some cases, or background sync issues
        if (appError.isOperational || appError.statusCode === 500) {
            this.notifyUser(appError);
        }

        return appError;
    },

    /**
     * Show toast notification to user
     */
    notifyUser(error: AppError) {
        toast({
            variant: 'destructive',
            title: this.getTitle(error),
            description: error.message,
        });
    },

    /**
     * Get friendly title based on error code
     */
    getTitle(error: AppError): string {
        switch (error.code) {
            case 'BAD_REQUEST': return 'Dados Inválidos';
            case 'UNAUTHORIZED': return 'Sessão Expirada';
            case 'FORBIDDEN': return 'Permissão Negada';
            case 'NOT_FOUND': return 'Não Encontrado';
            case 'INTERNAL_ERROR': return 'Erro no Sistema';
            default: return 'Ocorreu um Erro';
        }
    }
};
