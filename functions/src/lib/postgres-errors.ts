/**
 * PostgreSQL Error Handler
 *
 * Provides specific error handling for PostgreSQL error codes
 * https://www.postgresql.org/docs/current/errcodes-appendix.html
 *
 * @module lib/postgres-errors
 */

import { HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

// ============================================================================
// POSTGRESQL ERROR CODES
// ============================================================================

/**
 * PostgreSQL error codes that we handle specifically
 */
export enum PostgresErrorCode {
  // Class 23 - Integrity Constraint Violation
  UNIQUE_VIOLATION = '23505',        // unique_violation
  FOREIGN_KEY_VIOLATION = '23503',   // foreign_key_violation
  NOT_NULL_VIOLATION = '23502',      // not_null_violation
  CHECK_VIOLATION = '23514',         // check_violation
  EXCLUSION_VIOLATION = '23P01',     // exclusion_violation

  // Class 40 - Transaction Rollback
  SERIALIZATION_FAILURE = '40001',   // serialization_failure
  TRANSACTION_ROLLBACK = '40002',    // transaction_rollback
  DEADLOCK_DETECTED = '40P01',       // deadlock_detected

  // Class 08 - Connection Exception
  CONNECTION_EXCEPTION = '08000',    // connection_exception
  CONNECTION_DOES_NOT_EXIST = '08003', // connection_does_not_exist
  CONNECTION_FAILURE = '08006',      // connection_failure

  // Class 53 - Insufficient Resources
  INSUFFICIENT_RESOURCES = '53000',  // insufficient_resources
  DISK_FULL = '53100',               // disk_full
  OUT_OF_MEMORY = '53200',           // out_of_memory

  // Class 54 - Program Limit Exceeded
  PROGRAM_LIMIT_EXCEEDED = '54000',  // program_limit_exceeded
  TOO_MANY_CONNECTIONS = '53300',    // too_many_connections

  // Class 40 - Query Cancellation
  QUERY_CANCELED = '57014',          // query_canceled

  // Class 28 - Authorization
  INSUFFICIENT_PRIVILEGE = '42501',  // insufficient_privilege
}

// ============================================================================
// ERROR INTERFACES
// ============================================================================

export interface PostgresError extends Error {
  code?: string;
  detail?: string;
  table?: string;
  column?: string;
  constraint?: string;
  schema?: string;
}

// ============================================================================
// ERROR TRANSLATION
// ============================================================================

/**
 * Translates PostgreSQL errors to user-friendly Firebase HttpsError messages
 */
export function translatePostgresError(error: any): HttpsError {
  const postgresError = error as PostgresError;
  const code = postgresError.code;

  logger.error('[PostgresError]', {
    code,
    detail: postgresError.detail,
    table: postgresError.table,
    column: postgresError.column,
    constraint: postgresError.constraint,
    message: error.message,
  });

  switch (code) {
    // ========================================================================
    // UNIQUE VIOLATION (23505) - Duplicate key
    // ========================================================================
    case PostgresErrorCode.UNIQUE_VIOLATION:
      return new HttpsError(
        'already-exists',
        formatUniqueViolationError(postgresError),
        { constraint: postgresError.constraint, table: postgresError.table }
      );

    // ========================================================================
    // FOREIGN KEY VIOLATION (23503) - Referenced key doesn't exist
    // ========================================================================
    case PostgresErrorCode.FOREIGN_KEY_VIOLATION:
      return new HttpsError(
        'failed-precondition',
        formatForeignKeyViolationError(postgresError),
        { constraint: postgresError.constraint, table: postgresError.table }
      );

    // ========================================================================
    // NOT NULL VIOLATION (23502) - Required field missing
    // ========================================================================
    case PostgresErrorCode.NOT_NULL_VIOLATION:
      return new HttpsError(
        'invalid-argument',
        `O campo '${postgresError.column}' é obrigatório e não foi informado.`,
        { column: postgresError.column, table: postgresError.table }
      );

    // ========================================================================
    // SERIALIZATION FAILURE (40001) - Concurrent modification
    // ========================================================================
    case PostgresErrorCode.SERIALIZATION_FAILURE:
    case PostgresErrorCode.DEADLOCK_DETECTED:
      return new HttpsError(
        'aborted',
        'Este registro foi modificado por outro usuário. Por favor, tente novamente.',
        { code, retryable: true }
      );

    // ========================================================================
    // CONNECTION ERRORS (08xxx)
    // ========================================================================
    case PostgresErrorCode.CONNECTION_EXCEPTION:
    case PostgresErrorCode.CONNECTION_FAILURE:
    case PostgresErrorCode.CONNECTION_DOES_NOT_EXIST:
      return new HttpsError(
        'unavailable',
        'Serviço temporariamente indisponível. Por favor, tente novamente em alguns instantes.',
        { code, retryable: true }
      );

    // ========================================================================
    // INSUFFICIENT RESOURCES (53xxx, 54xxx)
    // ========================================================================
    case PostgresErrorCode.INSUFFICIENT_RESOURCES:
    case PostgresErrorCode.DISK_FULL:
    case PostgresErrorCode.OUT_OF_MEMORY:
    case PostgresErrorCode.TOO_MANY_CONNECTIONS:
      return new HttpsError(
        'unavailable',
        'Serviço sobrecarregado. Por favor, aguarde alguns instantes e tente novamente.',
        { code, retryable: true }
      );

    // ========================================================================
    // AUTHORIZATION ERRORS (28xxx)
    // ========================================================================
    case PostgresErrorCode.INSUFFICIENT_PRIVILEGE:
      return new HttpsError(
        'permission-denied',
        'Você não tem permissão para realizar esta operação.',
        { code }
      );

    // ========================================================================
    // DEFAULT - Unknown error
    // ========================================================================
    default:
      return new HttpsError(
        'internal',
        'Erro ao processar sua solicitação. Por favor, tente novamente.',
        { originalMessage: error.message, code }
      );
  }
}

/**
 * Formats unique violation error messages
 */
function formatUniqueViolationError(error: PostgresError): string {
  const constraint = error.constraint || '';
  const table = error.table || '';

  // Common constraint patterns
  if (constraint.includes('email') || constraint.includes('cpf')) {
    return 'Já existe um registro com este e-mail/CPF.';
  }
  if (constraint.includes('username') || constraint.includes('name')) {
    return 'Já existe um registro com este nome.';
  }
  if (table === 'patients' && constraint.includes('organization_id')) {
    return 'Já existe um paciente com este código na organização.';
  }
  if (table === 'appointments' && constraint.includes('patient_professional_time')) {
    return 'Já existe um agendamento para este horário.';
  }

  return 'Já existe um registro com estes dados. Por favor, verifique e tente novamente.';
}

/**
 * Formats foreign key violation error messages
 */
function formatForeignKeyViolationError(error: PostgresError): string {
  const constraint = error.constraint || '';

  if (constraint.includes('organization')) {
    return 'Organização não encontrada.';
  }
  if (constraint.includes('patient')) {
    return 'Paciente não encontrado.';
  }
  if (constraint.includes('professional') || constraint.includes('therapist')) {
    return 'Profissional não encontrado.';
  }
  if (constraint.includes('appointment')) {
    return 'Agendamento não encontrado.';
  }
  if (constraint.includes('exercise')) {
    return 'Exercício não encontrado.';
  }

  return 'Registro relacionado não encontrado. Por favor, verifique os dados informados.';
}

// ============================================================================
// ERROR CHECKING UTILITIES
// ============================================================================

/**
 * Check if an error is a retryable PostgreSQL error
 */
export function isRetryablePostgresError(error: any): boolean {
  const postgresError = error as PostgresError;
  const code = postgresError.code;

  return [
    PostgresErrorCode.SERIALIZATION_FAILURE,
    PostgresErrorCode.DEADLOCK_DETECTED,
    PostgresErrorCode.CONNECTION_EXCEPTION,
    PostgresErrorCode.CONNECTION_FAILURE,
    PostgresErrorCode.INSUFFICIENT_RESOURCES,
    PostgresErrorCode.TOO_MANY_CONNECTIONS,
    PostgresErrorCode.QUERY_CANCELED,
  ].includes(code as PostgresErrorCode);
}

/**
 * Check if an error is a PostgreSQL error
 */
export function isPostgresError(error: any): error is PostgresError {
  const postgresError = error as PostgresError;
  return postgresError.code !== undefined;
}

/**
 * Wrap a database operation with automatic error translation
 */
export async function withPostgresErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (isPostgresError(error)) {
      logger.error(`[PostgresError${context ? ` in ${context}` : ''}]`, {
        code: error.code,
        message: error.message,
      });
      throw translatePostgresError(error);
    }
    throw error;
  }
}

/**
 * Retry wrapper for retryable PostgreSQL errors
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 500
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !isRetryablePostgresError(error)) {
        throw error;
      }

      const delay = delayMs * Math.pow(2, attempt);
      logger.warn(`[PostgresRetry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, {
        code: (error as PostgresError).code,
        message: (error as any).message,
      });

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
