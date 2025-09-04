// Exportações do logger
export {
  errorLogger,
  logApiError,
  logValidationError,
  logAuthError,
  logFileUploadError,
  logDatabaseError,
  useErrorLogger,
  type ErrorLogEntry,
  type ErrorContext
} from './logger';

// Exportações dos handlers
export {
  ErrorHandler,
  AppError,
  ValidationError,
  AuthError,
  NetworkError,
  FileUploadError,
  handleAsyncError,
  catchErrors,
  useErrorHandler
} from './handlers';

// Exportações do ErrorBoundary
export {
  default as ErrorBoundary,
  useErrorBoundary,
  ErrorFallback,
  withErrorBoundary
} from '../components/error/ErrorBoundary';

// Utilitários de conveniência
export const createError = {
  validation: (message: string, field?: string, validationErrors?: Record<string, string[]>) => 
    new ValidationError(message, field, validationErrors),
  
  auth: (message: string, statusCode?: number, action?: string) => 
    new AuthError(message, statusCode, action),
  
  network: (message: string, statusCode?: number, endpoint?: string, method?: string) => 
    new NetworkError(message, statusCode, endpoint, method),
  
  fileUpload: (message: string, fileName?: string, fileSize?: number) => 
    new FileUploadError(message, fileName, fileSize),
  
  app: (message: string, statusCode?: number, context?: string, metadata?: Record<string, any>) => 
    new AppError(message, statusCode, true, context, metadata)
};

// Constantes de erro comuns
export const ERROR_MESSAGES = {
  // Autenticação
  INVALID_CREDENTIALS: 'Credenciais inválidas',
  SESSION_EXPIRED: 'Sessão expirada. Faça login novamente',
  ACCESS_DENIED: 'Acesso negado',
  UNAUTHORIZED: 'Não autorizado',
  
  // Validação
  REQUIRED_FIELD: 'Este campo é obrigatório',
  INVALID_EMAIL: 'Email inválido',
  INVALID_PHONE: 'Telefone inválido',
  INVALID_CPF: 'CPF inválido',
  WEAK_PASSWORD: 'Senha muito fraca',
  PASSWORD_MISMATCH: 'Senhas não coincidem',
  
  // Rede
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet',
  SERVER_ERROR: 'Erro interno do servidor',
  NOT_FOUND: 'Recurso não encontrado',
  TIMEOUT: 'Tempo limite excedido',
  
  // Upload
  FILE_TOO_LARGE: 'Arquivo muito grande',
  INVALID_FILE_TYPE: 'Tipo de arquivo não permitido',
  UPLOAD_FAILED: 'Falha no upload do arquivo',
  
  // Genérico
  UNKNOWN_ERROR: 'Erro desconhecido',
  OPERATION_FAILED: 'Operação falhou',
  DATA_NOT_FOUND: 'Dados não encontrados',
  PERMISSION_DENIED: 'Permissão negada'
};

// Códigos de status HTTP comuns
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

// Utilitário para retry de operações
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  backoff: number = 2
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Se é o último attempt ou erro não é recuperável, throw
      if (attempt === maxRetries || !isRetryableError(lastError)) {
        throw lastError;
      }
      
      // Aguardar antes do próximo attempt
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(backoff, attempt - 1)));
      
      errorLogger.logWarning(`Retry attempt ${attempt}/${maxRetries}`, {
        context: 'RetryOperation',
        error: lastError.message,
        attempt
      });
    }
  }
  
  throw lastError!;
};

// Verificar se erro é recuperável (pode ser retentado)
const isRetryableError = (error: Error): boolean => {
  if (error instanceof NetworkError) {
    // Erros de rede temporários são recuperáveis
    return error.statusCode === 0 || 
           error.statusCode >= 500 || 
           error.statusCode === 429;
  }
  
  if (error instanceof AppError) {
    // Erros de servidor são recuperáveis
    return error.statusCode >= 500;
  }
  
  // Por padrão, assumir que não é recuperável
  return false;
};

// Circuit breaker simples
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private maxFailures: number = 5,
    private timeout: number = 60000 // 1 minuto
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new AppError('Circuit breaker is OPEN', 503, true, 'CircuitBreaker');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.maxFailures) {
      this.state = 'OPEN';
      errorLogger.logWarning('Circuit breaker opened', {
        context: 'CircuitBreaker',
        failures: this.failures,
        maxFailures: this.maxFailures
      });
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
  
  reset() {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
  }
}

// Instância global do circuit breaker para APIs
export const apiCircuitBreaker = new CircuitBreaker(5, 60000);

// Wrapper para operações críticas
export const withCircuitBreaker = <T>(
  operation: () => Promise<T>,
  circuitBreaker: CircuitBreaker = apiCircuitBreaker
): Promise<T> => {
  return circuitBreaker.execute(operation);
};

// Rate limiter simples
export class RateLimiter {
  private requests: number[] = [];
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minuto
  ) {}
  
  isAllowed(): boolean {
    const now = Date.now();
    
    // Remover requests antigas
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }
  
  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - this.requests.length);
  }
  
  getResetTime(): number {
    if (this.requests.length === 0) return 0;
    return this.requests[0] + this.windowMs;
  }
}

// Instância global do rate limiter
export const globalRateLimiter = new RateLimiter(100, 60000);

// Middleware para rate limiting
export const withRateLimit = async <T>(
  operation: () => Promise<T>,
  rateLimiter: RateLimiter = globalRateLimiter
): Promise<T> => {
  if (!rateLimiter.isAllowed()) {
    throw new AppError(
      'Muitas requisições. Tente novamente em alguns instantes.',
      429,
      true,
      'RateLimit',
      {
        remainingRequests: rateLimiter.getRemainingRequests(),
        resetTime: rateLimiter.getResetTime()
      }
    );
  }
  
  return operation();
};