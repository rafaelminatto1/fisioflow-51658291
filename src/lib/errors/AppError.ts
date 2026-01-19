
/**
 * Application Error Class
 * Standardizes error handling across the application.
 */
export class AppError extends Error {
    public readonly code: string;
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, code: string = 'INTERNAL_SERVER_ERROR', statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }

    /**
     * Factory method for bad request errors (400)
     */
    static badRequest(message: string, code: string = 'BAD_REQUEST') {
        return new AppError(message, code, 400);
    }

    /**
     * Factory method for unauthorized errors (401)
     */
    static unauthorized(message: string = 'Não autorizado', code: string = 'UNAUTHORIZED') {
        return new AppError(message, code, 401);
    }

    /**
     * Factory method for forbidden errors (403)
     */
    static forbidden(message: string = 'Acesso negado', code: string = 'FORBIDDEN') {
        return new AppError(message, code, 403);
    }

    /**
     * Factory method for not found errors (404)
     */
    static notFound(message: string = 'Recurso não encontrado', code: string = 'NOT_FOUND') {
        return new AppError(message, code, 404);
    }

    /**
     * Factory method for internal server errors (500)
     */
    static internal(message: string = 'Erro interno do servidor', code: string = 'INTERNAL_ERROR') {
        return new AppError(message, code, 500);
    }

    /**
     * Creates an AppError from an unknown error
     */
    static from(error: unknown, context?: string): AppError {
        if (error instanceof AppError) {
            return error;
        }

        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        const newError = new AppError(message, 'UNKNOWN_ERROR', 500);

        if (context) {
            // Log context if needed or attach to error (not implemented in base class yet)
            // For now just return the error
        }

        return newError;
    }
}
