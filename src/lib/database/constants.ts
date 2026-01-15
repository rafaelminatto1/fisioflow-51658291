/**
 * Database Status Constants
 *
 * This file contains all valid status values for database tables.
 * Always use these constants when querying or updating the database
 * to avoid typos and ensure consistency.
 *
 * IMPORTANT: The database uses mixed languages (Portuguese and English)
 * for different tables. This is a legacy design decision that should be
 * standardized in the future.
 */

// ============================================================================
// PATIENTS TABLE
// ============================================================================
/**
 * Valid status values for the 'patients' table.
 * Uses English values (legacy).
 */
export const PATIENT_STATUS = {
  /** Active patient - currently in treatment */
  ACTIVE: 'active',
  /** Inactive patient - not currently in treatment */
  INACTIVE: 'inactive',
  /** Archived patient - historical records only */
  ARCHIVED: 'archived',
} as const;

export type PatientStatus = typeof PATIENT_STATUS[keyof typeof PATIENT_STATUS];

// ============================================================================
// APPOINTMENTS TABLE
// ============================================================================
/**
 * Valid status values for the 'appointments' table.
 * Uses Portuguese values.
 */
export const APPOINTMENT_STATUS = {
  /** Agendado - scheduled */
  AGENDADO: 'agendado',
  /** Confirmado - confirmed */
  CONFIRMADO: 'confirmado',
  /** Em andamento - in progress (not currently used but available) */
  EM_ANDAMENTO: 'em_andamento',
  /** Atendido - completed */
  ATENDIDO: 'atendido',
  /** Cancelado - cancelled */
  CANCELADO: 'cancelado',
  /** Falta - no show */
  FALTA: 'falta',
  /** Reagendado - rescheduled */
  REAGENDADO: 'reagendado',
} as const;

export type AppointmentStatus = typeof APPOINTMENT_STATUS[keyof typeof APPOINTMENT_STATUS];

// ============================================================================
// SESSIONS TABLE
// ============================================================================
/**
 * Valid status values for the 'sessions' table.
 * Uses English values.
 */
export const SESSION_STATUS = {
  /** Draft - not yet completed */
  DRAFT: 'draft',
  /** Completed - finished */
  COMPLETED: 'completed',
} as const;

export type SessionStatus = typeof SESSION_STATUS[keyof typeof SESSION_STATUS];

// ============================================================================
// PATIENT_PATHOLOGIES TABLE
// ============================================================================
/**
 * Valid status values for the 'patient_pathologies' table.
 * Uses Portuguese values.
 */
export const PATHOLOGY_STATUS = {
  /** Em tratamento - currently being treated */
  EM_TRATAMENTO: 'em_tratamento',
  /** Tratada - treated/cured */
  TRATADA: 'tratada',
  /** Crônica - chronic condition */
  CRONICA: 'cronica',
} as const;

export type PathologyStatus = typeof PATHOLOGY_STATUS[keyof typeof PATHOLOGY_STATUS];

// ============================================================================
// PAYMENTS TABLE
// ============================================================================
/**
 * Valid status values for the 'payments' table.
 * Uses English values.
 */
export const PAYMENT_STATUS = {
  /** Pending - not yet paid */
  PENDING: 'pending',
  /** Paid - payment completed */
  PAID: 'paid',
  /** Cancelled - payment cancelled */
  CANCELLED: 'cancelled',
  /** Refunded - payment was refunded */
  REFUNDED: 'refunded',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates if a value is a valid Patient status
 */
export function isValidPatientStatus(status: string): status is PatientStatus {
  return Object.values(PATIENT_STATUS).includes(status as PatientStatus);
}

/**
 * Validates if a value is a valid Appointment status
 */
export function isValidAppointmentStatus(status: string): status is AppointmentStatus {
  return Object.values(APPOINTMENT_STATUS).includes(status as AppointmentStatus);
}

/**
 * Validates if a value is a valid Session status
 */
export function isValidSessionStatus(status: string): status is SessionStatus {
  return Object.values(SESSION_STATUS).includes(status as SessionStatus);
}

/**
 * Validates if a value is a valid Pathology status
 */
export function isValidPathologyStatus(status: string): status is PathologyStatus {
  return Object.values(PATHOLOGY_STATUS).includes(status as PathologyStatus);
}

/**
 * Validates if a value is a valid Payment status
 */
export function isValidPaymentStatus(status: string): status is PaymentStatus {
  return Object.values(PAYMENT_STATUS).includes(status as PaymentStatus);
}

/**
 * Gets all valid statuses for a given table name
 */
export function getValidStatusesForTable(tableName: string): readonly string[] {
  switch (tableName) {
    case 'patients':
      return Object.values(PATIENT_STATUS);
    case 'appointments':
      return Object.values(APPOINTMENT_STATUS);
    case 'sessions':
      return Object.values(SESSION_STATUS);
    case 'patient_pathologies':
      return Object.values(PATHOLOGY_STATUS);
    case 'payments':
      return Object.values(PAYMENT_STATUS);
    default:
      return [];
  }
}
