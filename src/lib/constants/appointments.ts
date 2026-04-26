/**
 * Appointment Constants
 *
 * Centralized appointment status values, derived types, and display labels.
 * Use `as const` to ensure TypeScript infers literal types (no widening to `string`).
 *
 * @module lib/constants/appointments
 */

// ============================================================================
// APPOINTMENT STATUSES
// ============================================================================

/**
 * Canonical appointment status values (English, snake_case — matches DB).
 */
export const APPOINTMENT_STATUSES = [
  "scheduled",
  "confirmed",
  "completed",
  "missed",
  "cancelled",
  "rescheduled",
  "no_show",
  "in_progress",
] as const;

/**
 * Derived literal union type — TypeScript infers each string as a literal.
 * Use this instead of `string` for appointment status fields.
 */
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/**
 * Display labels for each appointment status (Brazilian Portuguese).
 * Every status in `APPOINTMENT_STATUSES` must have a corresponding label here.
 */
export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  missed: "Faltou",
  cancelled: "Cancelado",
  rescheduled: "Reagendado",
  no_show: "Não Compareceu",
  in_progress: "Em Atendimento",
};

// ============================================================================
// APPOINTMENT TYPES
// ============================================================================

/**
 * Canonical appointment type values.
 */
export const APPOINTMENT_TYPES = [
  "Consulta Inicial",
  "Fisioterapia",
  "Reavaliação",
  "Consulta de Retorno",
] as const;

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

/**
 * Display labels for appointment types (same as values for this domain).
 */
export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  "Consulta Inicial": "Consulta Inicial",
  Fisioterapia: "Fisioterapia",
  Reavaliação: "Reavaliação",
  "Consulta de Retorno": "Consulta de Retorno",
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Returns true if the given value is a valid `AppointmentStatus`.
 */
export function isAppointmentStatus(value: unknown): value is AppointmentStatus {
  return APPOINTMENT_STATUSES.includes(value as AppointmentStatus);
}

/**
 * Returns the display label for a status, falling back to the raw value.
 */
export function getAppointmentStatusLabel(status: string): string {
  return isAppointmentStatus(status) ? APPOINTMENT_STATUS_LABELS[status] : status;
}
