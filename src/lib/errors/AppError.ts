
/**
 * Application Error Class
 * Standardizes error handling across the application.
 */
export class AppError extends Error {
    public readonly code: string;
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly context?: Record<string, unknown>;
    public readonly originalError?: unknown;

    constructor(
        message: string,
        code: string = 'INTERNAL_SERVER_ERROR',
        statusCode: number = 500,
        isOperational: boolean = true,
        context?: Record<string, unknown>,
        originalError?: unknown
    ) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.context = context;
        this.originalError = originalError;

        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }

    /**
     * Factory method for bad request errors (400)
     */
    static badRequest(message: string, code: string = 'BAD_REQUEST', context?: Record<string, unknown>) {
        return new AppError(message, code, 400, true, context);
    }

    /**
     * Factory method for unauthorized errors (401)
     */
    static unauthorized(message: string = 'Não autorizado', code: string = 'UNAUTHORIZED', context?: Record<string, unknown>) {
        return new AppError(message, code, 401, true, context);
    }

    /**
     * Factory method for forbidden errors (403)
     */
    static forbidden(message: string = 'Acesso negado', code: string = 'FORBIDDEN', context?: Record<string, unknown>) {
        return new AppError(message, code, 403, true, context);
    }

    /**
     * Factory method for not found errors (404)
     */
    static notFound(message: string = 'Recurso não encontrado', code: string = 'NOT_FOUND', context?: Record<string, unknown>) {
        return new AppError(message, code, 404, true, context);
    }

    /**
     * Factory method for conflict errors (409)
     */
    static conflict(message: string, code: string = 'CONFLICT', context?: Record<string, unknown>) {
        return new AppError(message, code, 409, true, context);
    }

    /**
     * Factory method for validation errors (422)
     */
    static validation(message: string, code: string = 'VALIDATION_ERROR', context?: Record<string, unknown>) {
        return new AppError(message, code, 422, true, context);
    }

    /**
     * Factory method for rate limit errors (429)
     */
    static rateLimit(message: string = 'Muitas tentativas. Tente novamente em alguns instantes.', code: string = 'RATE_LIMIT', context?: Record<string, unknown>) {
        return new AppError(message, code, 429, true, context);
    }

    /**
     * Factory method for internal server errors (500)
     */
    static internal(message: string = 'Erro interno do servidor', code: string = 'INTERNAL_ERROR', context?: Record<string, unknown>) {
        return new AppError(message, code, 500, false, context);
    }

    /**
     * Factory method for service unavailable errors (503)
     */
    static serviceUnavailable(message: string = 'Serviço temporariamente indisponível', code: string = 'SERVICE_UNAVAILABLE', context?: Record<string, unknown>) {
        return new AppError(message, code, 503, true, context);
    }

    /**
     * Factory method for network errors
     */
    static network(message: string = 'Erro de conexão', code: string = 'NETWORK_ERROR', context?: Record<string, unknown>) {
        return new AppError(message, code, 503, true, context);
    }

    /**
     * Factory method for timeout errors
     */
    static timeout(message: string = 'Operação expirou', code: string = 'TIMEOUT', context?: Record<string, unknown>) {
        return new AppError(message, code, 504, true, context);
    }

    /**
     * Creates an AppError from an unknown error
     */
    static from(error: unknown, context?: string | Record<string, unknown>): AppError {
        if (error instanceof AppError) {
            return error;
        }

        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        const errorContext = typeof context === 'string' ? { context } : context;

        const newError = new AppError(
            message,
            'UNKNOWN_ERROR',
            500,
            true,
            errorContext,
            error
        );

        return newError;
    }

    /**
     * Check if this error matches a specific code
     */
    isCode(code: string): boolean {
        return this.code === code;
    }

    /**
     * Check if this error is a client error (4xx)
     */
    isClientError(): boolean {
        return this.statusCode >= 400 && this.statusCode < 500;
    }

    /**
     * Check if this error is a server error (5xx)
     */
    isServerError(): boolean {
        return this.statusCode >= 500;
    }

    /**
     * Check if this error should trigger a retry
     */
    shouldRetry(): boolean {
        return (
            this.code === 'NETWORK_ERROR' ||
            this.code === 'TIMEOUT' ||
            this.code === 'SERVICE_UNAVAILABLE' ||
            this.statusCode === 503 ||
            this.statusCode === 504
        );
    }

    /**
     * Get a user-friendly error message with suggestions
     */
    getUserMessage(): string {
        const suggestions: Record<string, string> = {
            NETWORK_ERROR: 'Verifique sua conexão com a internet e tente novamente.',
            TIMEOUT: 'A operação demorou muito. Tente novamente.',
            SESSION_EXPIRED: 'Faça login novamente para continuar.',
            INVALID_CREDENTIALS: 'Verifique suas credenciais e tente novamente.',
            UNIQUE_VIOLATION: 'Este registro já existe.',
            FOREIGN_KEY: 'Registro relacionado não encontrado.',
            RLS_DENIED: 'Você não tem permissão para acessar este recurso.',
            RATE_LIMIT: 'Aguarde alguns instantes antes de tentar novamente.',
        };

        const suggestion = suggestions[this.code];
        if (suggestion) {
            return `${this.message}. ${suggestion}`;
        }

        return this.message;
    }

    /**
     * Convert to plain object for logging/API responses
     */
    toJSON(): {
        name: string;
        message: string;
        code: string;
        statusCode: number;
        isOperational: boolean;
        context?: Record<string, unknown>;
    } {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            isOperational: this.isOperational,
            context: this.context,
        };
    }
}

/**
 * Supabase-specific error factory methods
 */
export class SupabaseError extends AppError {
    constructor(
        message: string,
        code: string,
        statusCode: number = 500,
        context?: Record<string, unknown>,
        originalError?: unknown
    ) {
        super(message, code, statusCode, true, context, originalError);
        this.name = 'SupabaseError';
    }

    /**
     * Create from Supabase Postgres error
     */
    static fromPostgresError(error: unknown): SupabaseError {
        const code = (error as { code?: string })?.code || 'UNKNOWN_ERROR';
        const message = (error as { message?: string })?.message || 'Erro no banco de dados';
        const details = (error as { details?: string })?.details || undefined;
        const hint = (error as { hint?: string })?.hint || undefined;

        const context: Record<string, unknown> = {};
        if (details) context.details = details;
        if (hint) context.hint = hint;
        const err = error as { table?: string; column?: string };
        if (err.table) context.table = err.table;
        if (err.column) context.column = err.column;

        // Map Postgres error codes to AppError types
        switch (code) {
            case '23505': // UNIQUE_VIOLATION
                return new SupabaseError('Registro já existe', 'UNIQUE_VIOLATION', 409, context);
            case '23503': // FOREIGN_KEY_VIOLATION
                return new SupabaseError('Registro relacionado não encontrado', 'FOREIGN_KEY', 400, context);
            case '23502': // NOT_NULL_VIOLATION
                return new SupabaseError('Campo obrigatório não preenchido', 'REQUIRED_FIELD', 400, context);
            case '23514': // CHECK_VIOLATION
                return new SupabaseError('Validação falhou', 'CHECK_VIOLATION', 400, context);
            case '42501': // RLS_PERMISSION_DENIED
                return new SupabaseError('Você não tem permissão para acessar este recurso', 'RLS_DENIED', 403, context);
            case '22001': // STRING_DATA_RIGHT_TRUNCATION
                return new SupabaseError('Dado muito longo para o campo', 'STRING_TOO_LONG', 400, context);
            default:
                return new SupabaseError(message, code, 500, context);
        }
    }

    /**
     * Create from Supabase Auth error
     */
    static fromAuthError(error: unknown): SupabaseError {
        const authError = error as { message?: string; status?: number };
        const message = authError.message || 'Erro de autenticação';
        const status = authError.status || 500;

        // Map common auth errors
        if (message.includes('Invalid login credentials')) {
            return new SupabaseError('Credenciais inválidas', 'INVALID_CREDENTIALS', 401);
        }
        if (message.includes('Email not confirmed')) {
            return new SupabaseError('E-mail não confirmado', 'EMAIL_NOT_CONFIRMED', 401);
        }
        if (message.includes('Invalid refresh token')) {
            return new SupabaseError('Sessão inválida', 'INVALID_REFRESH_TOKEN', 401);
        }
        if (message.includes('User already registered')) {
            return new SupabaseError('Usuário já cadastrado', 'USER_EXISTS', 409);
        }
        if (message.includes('Session not found')) {
            return new SupabaseError('Sessão expirada', 'SESSION_EXPIRED', 401);
        }

        return new SupabaseError(message, 'AUTH_ERROR', status);
    }

    /**
     * Create from network/connection error
     */
    static fromNetworkError(error: Error): SupabaseError {
        const message = error.message.toLowerCase();

        if (message.includes('timeout') || message.includes('timed out')) {
            return new SupabaseError('Operação expirou', 'TIMEOUT', 504, { originalMessage: error.message });
        }
        if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
            return new SupabaseError('Erro de conexão com o servidor', 'NETWORK_ERROR', 503, { originalMessage: error.message });
        }

        return new SupabaseError('Erro de comunicação com o servidor', 'COMMUNICATION_ERROR', 503, { originalMessage: error.message });
    }
}

/**
 * Database constraint error types
 */
export enum DatabaseErrorCode {
    UNIQUE_VIOLATION = '23505',
    FOREIGN_KEY_VIOLATION = '23503',
    NOT_NULL_VIOLATION = '23502',
    CHECK_VIOLATION = '23514',
    STRING_DATA_RIGHT_TRUNCATION = '22001',
    EXCLUSION_VIOLATION = '23P01',
}

/**
 * Auth error codes
 */
export enum AuthErrorCode {
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
    EMAIL_NOT_CONFIRMED = 'EMAIL_NOT_CONFIRMED',
    SESSION_EXPIRED = 'SESSION_EXPIRED',
    INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',
    USER_ALREADY_EXISTS = 'USER_EXISTS',
    USER_NOT_FOUND = 'USER_NOT_FOUND',
    WEAK_PASSWORD = 'WEAK_PASSWORD',
}

/**
 * Network error codes
 */
export enum NetworkErrorCode {
    NETWORK_ERROR = 'NETWORK_ERROR',
    TIMEOUT = 'TIMEOUT',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
    CONNECTION_REFUSED = 'CONNECTION_REFUSED',
}
