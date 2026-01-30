/**
 * Centralized Error Handler Middleware
 * Provides structured error handling with logging and context
 */

import { HttpsError } from 'firebase-functions/v2/https';
import { getLogger, LogContext } from '../lib/logger';
import { AuthContext } from './auth';
import { logAudit, AuditAction, AuditCategory } from './audit-log';

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  DATABASE = 'database',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  INTERNAL = 'internal',
}

/**
 * Classified error with context
 */
export interface ClassifiedError extends Error {
  category: ErrorCategory;
  code?: string;
  statusCode?: number;
  context?: Record<string, any>;
  originalError?: Error;
}

/**
 * Creates a classified error
 */
export function createError(
  category: ErrorCategory,
  message: string,
  context?: Record<string, any>,
  originalError?: Error
): ClassifiedError {
  const error = new Error(message) as ClassifiedError;
  error.category = category;
  error.context = context;
  error.originalError = originalError;

  if (originalError) {
    error.stack = originalError.stack;
  }

  return error;
}

/**
 * Error handler result
 */
export interface ErrorHandlerResult {
  error: HttpsError;
  shouldLog: boolean;
  context: LogContext;
}

/**
 * Handles errors with structured logging and converts to HttpsError
 *
 * @param error - The error to handle
 * @param functionName - Name of the function where error occurred
 * @param auth - Auth context if available
 * @param requestData - Request data for context
 * @returns HttpsError to throw
 */
export function handleError(
  error: unknown,
  functionName: string,
  auth?: AuthContext,
  requestData?: any
): HttpsError {
  const logger = getLogger(functionName);
  const logContext: LogContext = {
    functionName,
    userId: auth?.userId,
    organizationId: auth?.organizationId,
  };

  // Already an HttpsError - just log and rethrow
  if (error instanceof HttpsError) {
    logger.error('HttpsError thrown', {
      ...logContext,
      code: error.code,
      message: error.message,
      requestData,
    });

    // Log audit for permission errors
    if (error.code === 'permission-denied' && auth) {
      logAudit({
        action: AuditAction.PERMISSION_CHANGE,
        category: AuditCategory.USER,
        user_id: auth.userId,
        user_name: auth.email,
        user_email: auth.email,
        organization_id: auth.organizationId,
        details: {
          function: functionName,
          reason: error.message,
        },
        success: false,
        error_message: error.message,
      }).catch(() => {});
    }

    return error;
  }

  // Classified error
  if (isClassifiedError(error)) {
    return handleClassifiedError(error, logger, logContext, requestData);
  }

  // Database errors
  if (isDatabaseError(error)) {
    return handleDatabaseError(error as Error, logger, logContext, requestData);
  }

  // Generic Error
  return handleGenericError(error as Error, logger, logContext, requestData);
}

/**
 * Checks if error is a ClassifiedError
 */
function isClassifiedError(error: unknown): error is ClassifiedError {
  return (
    error instanceof Error &&
    'category' in error &&
    typeof (error as any).category === 'string'
  );
}

/**
 * Checks if error is a database error
 */
function isDatabaseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const errorMsg = error.message.toLowerCase();
  const errorName = error.constructor.name.toLowerCase();

  return (
    errorMsg.includes('database') ||
    errorMsg.includes('connection') ||
    errorMsg.includes('query') ||
    errorMsg.includes('constraint') ||
    errorMsg.includes('duplicate') ||
    errorMsg.includes('foreign key') ||
    errorName.includes('postgres') ||
    errorName.includes('database') ||
    'code' in error
  );
}

/**
 * Handles classified errors
 */
function handleClassifiedError(
  error: ClassifiedError,
  logger: ReturnType<typeof getLogger>,
  logContext: LogContext,
  requestData?: any
): HttpsError {
  const { category, message, context, originalError } = error;

  logger.error('Classified error', {
    ...logContext,
    category,
    message,
    errorContext: context,
    originalError: originalError?.message,
    requestData,
  });

  // Map category to HttpsError code
  const codeMap: Record<ErrorCategory, 'unauthenticated' | 'permission-denied' | 'invalid-argument' | 'not-found' | 'internal'> = {
    [ErrorCategory.AUTHENTICATION]: 'unauthenticated',
    [ErrorCategory.AUTHORIZATION]: 'permission-denied',
    [ErrorCategory.VALIDATION]: 'invalid-argument',
    [ErrorCategory.NOT_FOUND]: 'not-found',
    [ErrorCategory.DATABASE]: 'internal',
    [ErrorCategory.BUSINESS_LOGIC]: 'invalid-argument',
    [ErrorCategory.EXTERNAL_SERVICE]: 'internal',
    [ErrorCategory.INTERNAL]: 'internal',
  };

  return new HttpsError(
    codeMap[category] || 'internal',
    message,
    { category, ...context }
  );
}

/**
 * Handles database errors
 */
function handleDatabaseError(
  error: Error,
  logger: ReturnType<typeof getLogger>,
  logContext: LogContext,
  requestData?: any
): HttpsError {
  const message = error.message.toLowerCase();

  logger.error('Database error', {
    ...logContext,
    errorMessage: error.message,
    errorName: error.name,
    errorCode: (error as any).code,
    stack: error.stack,
    requestData,
  });

  // Check for specific database error codes
  const code = (error as any).code;

  // PostgreSQL error codes
  if (code === '23505') {
    // Unique violation
    return new HttpsError(
      'already-exists',
      'Registro já existe',
      { originalMessage: error.message }
    );
  }

  if (code === '23503') {
    // Foreign key violation
    return new HttpsError(
      'failed-precondition',
      'Registro dependente não encontrado',
      { originalMessage: error.message }
    );
  }

  if (code === '23502') {
    // Not null violation
    return new HttpsError(
      'invalid-argument',
      'Campo obrigatório não fornecido',
      { originalMessage: error.message }
    );
  }

  if (message.includes('connection') || message.includes('connect')) {
    return new HttpsError(
      'internal',
      'Erro de conexão com o banco de dados',
      { originalMessage: error.message }
    );
  }

  return new HttpsError(
    'internal',
    'Erro ao executar operação no banco de dados',
    { originalMessage: error.message }
  );
}

/**
 * Handles generic errors
 */
function handleGenericError(
  error: Error,
  logger: ReturnType<typeof getLogger>,
  logContext: LogContext,
  requestData?: any
): HttpsError {
  logger.error('Unhandled error', {
    ...logContext,
    errorMessage: error.message,
    errorName: error.name,
    stack: error.stack,
    requestData,
  });

  return new HttpsError(
    'internal',
    error.message || 'Erro interno do servidor',
    { name: error.name }
  );
}

/**
 * Wrapper for async handlers with automatic error handling
 *
 * @param handler - The async function to wrap
 * @param functionName - Name of the function for logging
 * @returns Wrapped function with error handling
 */
export function withErrorHandling<T extends any[], R>(
  handler: (data: T[0], auth?: AuthContext) => Promise<R>,
  functionName: string
) {
  return async (data: T[0], auth?: AuthContext): Promise<R> => {
    try {
      return await handler(data, auth);
    } catch (error) {
      throw handleError(error, functionName, auth, data);
    }
  };
}

/**
 * Validates required fields in request data
 *
 * @param data - Request data to validate
 * @param requiredFields - Array of required field names
 * @param atLeastOne - If true, at least one field must be present (optional)
 * @throws HttpsError if validation fails
 */
export function validateRequiredFields(
  data: any,
  requiredFields: string[],
  atLeastOne?: boolean
): void {
  if (atLeastOne) {
    // At least one of the fields must be present
    const hasOne = requiredFields.some(field =>
      data[field] !== undefined && data[field] !== null && data[field] !== ''
    );

    if (!hasOne) {
      throw createError(
        ErrorCategory.VALIDATION,
        `Pelo menos um dos campos é obrigatório: ${requiredFields.join(' ou ')}`,
        { requiredFields }
      );
    }
    return;
  }

  const missing: string[] = [];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    throw createError(
      ErrorCategory.VALIDATION,
      `Campos obrigatórios não fornecidos: ${missing.join(', ')}`,
      { missingFields: missing }
    );
  }
}

/**
 * Validates a field against allowed values
 *
 * @param field - Field name
 * @param value - Field value
 * @param allowedValues - Array of allowed values
 * @throws HttpsError if validation fails
 */
export function validateAllowedValues<T>(
  field: string,
  value: T,
  allowedValues: T[]
): void {
  if (!allowedValues.includes(value)) {
    throw createError(
      ErrorCategory.VALIDATION,
      `Valor inválido para ${field}: ${value}. Valores permitidos: ${allowedValues.join(', ')}`,
      { field, value, allowedValues }
    );
  }
}

/**
 * Wraps a database operation with error handling
 *
 * @param operation - Description of the operation
 * @param fn - Async function to execute
 * @returns Result of the function
 */
export async function withDatabaseErrorHandling<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw createError(
      ErrorCategory.DATABASE,
      `Erro ao ${operation}: ${(error as Error).message}`,
      { operation },
      error as Error
    );
  }
}
