/**
 * Database Validation Utilities
 *
 * Provides runtime validation functions for database operations.
 * Use these to validate data before sending to Firebase Firestore.
 */
import {

  PatientStatus,
  AppointmentStatus,
  SessionStatus,
  PathologyStatus,
  PaymentStatus,
} from './constants';
import {
  isValidPatientStatus,
  isValidAppointmentStatus,
  isValidSessionStatus,
  isValidPathologyStatus,
  isValidPaymentStatus,
} from './constants';
import { fisioLogger as logger } from '@/lib/errors/logger';


// ============================================================================
// ERROR TYPES
// ============================================================================

export class DatabaseValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown,
    public validOptions: readonly string[]
  ) {
    super(message);
    this.name = 'DatabaseValidationError';
  }
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates and throws an error if the patient status is invalid
 *
 * @param status - The status value to validate
 * @throws {DatabaseValidationError} If status is invalid
 * @returns The validated status
 *
 * @example
 * ```typescript
 * try {
 *   validatePatientStatus(newStatus);
 *   await updateDoc(doc(db, 'patients', patientId), { status: newStatus });
 * } catch (error) {
 *   if (error instanceof DatabaseValidationError) {
 *     toast.error(error.message);
 *   }
 * }
 * ```
 */
export function validatePatientStatus(status: string): asserts status is PatientStatus {
  if (!isValidPatientStatus(status)) {
    throw new DatabaseValidationError(
      `Status de paciente inválido: "${status}". Valores válidos: active, inactive, archived`,
      'status',
      status,
      ['active', 'inactive', 'archived']
    );
  }
}

/**
 * Validates and throws an error if the appointment status is invalid
 *
 * @param status - The status value to validate
 * @throws {DatabaseValidationError} If status is invalid
 * @returns The validated status
 *
 * @example
 * ```typescript
 * try {
 *   validateAppointmentStatus(newStatus);
 *   await updateAppointmentStatus(appointmentId, newStatus);
 * } catch (error) {
 *   handleError(error);
 * }
 * ```
 */
export function validateAppointmentStatus(status: string): asserts status is AppointmentStatus {
  if (!isValidAppointmentStatus(status)) {
    throw new DatabaseValidationError(
      `Status de agendamento inválido: "${status}". Valores válidos: agendado, confirmado, atendido, cancelado, falta, reagendado`,
      'status',
      status,
      ['agendado', 'confirmado', 'atendido', 'cancelado', 'falta', 'reagendado']
    );
  }
}

/**
 * Validates and throws an error if the session status is invalid
 *
 * @param status - The status value to validate
 * @throws {DatabaseValidationError} If status is invalid
 * @returns The validated status
 */
export function validateSessionStatus(status: string): asserts status is SessionStatus {
  if (!isValidSessionStatus(status)) {
    throw new DatabaseValidationError(
      `Status de sessão inválido: "${status}". Valores válidos: draft, completed`,
      'status',
      status,
      ['draft', 'completed']
    );
  }
}

/**
 * Validates and throws an error if the pathology status is invalid
 *
 * @param status - The status value to validate
 * @throws {DatabaseValidationError} If status is invalid
 * @returns The validated status
 */
export function validatePathologyStatus(status: string): asserts status is PathologyStatus {
  if (!isValidPathologyStatus(status)) {
    throw new DatabaseValidationError(
      `Status de patologia inválido: "${status}". Valores válidos: em_tratamento, tratada, cronica`,
      'status',
      status,
      ['em_tratamento', 'tratada', 'cronica']
    );
  }
}

/**
 * Validates and throws an error if the payment status is invalid
 *
 * @param status - The status value to validate
 * @throws {DatabaseValidationError} If status is invalid
 * @returns The validated status
 */
export function validatePaymentStatus(status: string): asserts status is PaymentStatus {
  if (!isValidPaymentStatus(status)) {
    throw new DatabaseValidationError(
      `Status de pagamento inválido: "${status}". Valores válidos: pending, paid, cancelled, refunded`,
      'status',
      status,
      ['pending', 'paid', 'cancelled', 'refunded']
    );
  }
}

// ============================================================================
// BATCH VALIDATION
// ============================================================================

/**
 * Validates multiple status values at once
 *
 * @param validations - Array of validations to perform
 * @throws {DatabaseValidationError} If any validation fails
 * @returns true if all validations pass
 *
 * @example
 * ```typescript
 * validateBatch([
 *   { table: 'patients', field: 'status', value: patientStatus },
 *   { table: 'appointments', field: 'status', value: appointmentStatus },
 * ]);
 * ```
 */
export function validateBatch(validations: Array<{
  table: string;
  field: string;
  value: string;
}>): true {
  for (const validation of validations) {
    const { table, field, value } = validation;

    if (field !== 'status') continue;

    switch (table) {
      case 'patients':
        validatePatientStatus(value);
        break;
      case 'appointments':
        validateAppointmentStatus(value);
        break;
      case 'sessions':
        validateSessionStatus(value);
        break;
      case 'patient_pathologies':
        validatePathologyStatus(value);
        break;
      case 'payments':
        validatePaymentStatus(value);
        break;
      default:
        // Unknown table, skip validation
        logger.warn(`Unknown table for validation: ${table}`, undefined, 'database-validation');
    }
  }

  return true;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets a user-friendly error message for invalid status
 *
 * @param status - The invalid status value
 * @param tableName - The table name for context
 * @returns A user-friendly error message
 */
export function getStatusErrorMessage(status: string, tableName: string): string {
  const messages: Record<string, string> = {
    patients: `Status "${status}" inválido. Use: Ativo, Inativo ou Arquivado`,
    appointments: `Status "${status}" inválido. Use: Agendado, Confirmado, Atendido, Cancelado, Falta ou Reagendado`,
    sessions: `Status "${status}" inválido. Use: Rascunho ou Concluído`,
    patient_pathologies: `Status "${status}" inválido. Use: Em Tratamento, Tratada ou Crônica`,
    payments: `Status "${status}" inválido. Use: Pendente, Pago, Cancelado ou Reembolsado`,
  };

  return messages[tableName] || `Status "${status}" inválido para a tabela ${tableName}`;
}

/**
 * Formats status value for display in UI
 *
 * @param status - The status value
 * @param tableName - The table name for context
 * @returns A formatted, user-friendly status label
 *
 * @example
 * ```typescript
 * const label = formatStatusForDisplay('agendado', 'appointments');
 * // Returns: 'Agendado'
 *
 * const label = formatStatusForDisplay('active', 'patients');
 * // Returns: 'Ativo'
 * ```
 */
export function formatStatusForDisplay(status: string, tableName: string): string {
  const statusLabels: Record<string, Record<string, string>> = {
    patients: {
      active: 'Ativo',
      inactive: 'Inativo',
      archived: 'Arquivado',
    },
    appointments: {
      agendado: 'Agendado',
      confirmado: 'Confirmado',
      em_andamento: 'Em Andamento',
      atendido: 'Atendido',
      cancelado: 'Cancelado',
      falta: 'Falta',
      reagendado: 'Reagendado',
    },
    sessions: {
      draft: 'Rascunho',
      completed: 'Concluído',
    },
    patient_pathologies: {
      em_tratamento: 'Em Tratamento',
      tratada: 'Tratada',
      cronica: 'Crônica',
    },
    payments: {
      pending: 'Pendente',
      paid: 'Pago',
      cancelled: 'Cancelado',
      refunded: 'Reembolsado',
    },
  };

  return statusLabels[tableName]?.[status] || status;
}

/**
 * Gets CSS class for status badge
 *
 * @param status - The status value
 * @param tableName - The table name for context
 * @returns Tailwind CSS classes for the status badge
 *
 * @example
 * ```typescript
 * const className = getStatusBadgeClass('agendado', 'appointments');
 * // Returns: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
 * ```
 */
export function getStatusBadgeClass(status: string, tableName: string): string {
  const statusClasses: Record<string, Record<string, string>> = {
    patients: {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      archived: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200',
    },
    appointments: {
      agendado: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      confirmado: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      em_andamento: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      atendido: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      cancelado: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      falta: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      reagendado: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    },
    sessions: {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    },
    patient_pathologies: {
      em_tratamento: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      tratada: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      cronica: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    },
    payments: {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      refunded: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    },
  };

  return statusClasses[tableName]?.[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
}
