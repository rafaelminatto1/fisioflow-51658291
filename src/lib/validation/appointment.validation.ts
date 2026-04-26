/**
 * Appointment Domain Validation
 *
 * Pure validation functions for appointment business invariants.
 * Always returns `ValidationResult` — never throws.
 *
 * @module lib/validation/appointment.validation
 */

import type { ValidationResult } from "@/types/common";

/** Default business hours (07:00–20:00) */
const DEFAULT_BUSINESS_HOURS = { start: "07:00", end: "20:00" } as const;

export interface AppointmentInput {
  /** Appointment date — string (YYYY-MM-DD or ISO) or Date object */
  date: string | Date;
  /** Duration in minutes */
  duration: number;
  /** Optional time in HH:MM format */
  time?: string;
  /** If true (default), validate that date is not in the past */
  isNew?: boolean;
}

export interface BusinessHours {
  start: string; // HH:MM
  end: string; // HH:MM
}

/**
 * Parse a time string "HH:MM" into total minutes since midnight.
 * Returns NaN if the string is not a valid HH:MM time.
 */
function timeToMinutes(time: string): number {
  if (typeof time !== "string") return NaN;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return NaN;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return NaN;
  return h * 60 + m;
}

/**
 * Safely coerce a date-like value to a Date object.
 * Returns `null` if the value cannot be parsed.
 */
function toDate(value: unknown): Date | null {
  try {
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate an appointment input against domain invariants.
 *
 * Rules:
 * - If `isNew` is true (default), the date must not be in the past.
 * - Duration must be between 15 and 480 minutes inclusive.
 * - If `time` is provided, it must fall within the configured business hours.
 *
 * @param input - The appointment data to validate.
 * @param businessHours - Optional override for business hours (default 07:00–20:00).
 * @returns `ValidationResult` — never throws.
 */
export function validateAppointment(
  input: AppointmentInput,
  businessHours: BusinessHours = DEFAULT_BUSINESS_HOURS,
): ValidationResult {
  const errors: string[] = [];

  try {
    const isNew = input.isNew !== false; // default true

    // --- Date validation ---
    const date = toDate(input.date);
    if (date === null) {
      errors.push("Data inválida");
    } else if (isNew) {
      // Compare date-only (ignore time component) to avoid timezone edge cases
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const appointmentDay = new Date(date);
      appointmentDay.setHours(0, 0, 0, 0);
      if (appointmentDay < today) {
        errors.push("A data não pode estar no passado");
      }
    }

    // --- Duration validation ---
    const duration = input.duration;
    if (
      typeof duration !== "number" ||
      !isFinite(duration) ||
      duration < 15 ||
      duration > 480
    ) {
      errors.push("A duração deve ser entre 15 e 480 minutos");
    }

    // --- Time validation (optional field) ---
    if (input.time !== undefined && input.time !== null) {
      const timeMin = timeToMinutes(input.time);
      const startMin = timeToMinutes(businessHours.start);
      const endMin = timeToMinutes(businessHours.end);

      if (isNaN(timeMin)) {
        errors.push("Horário inválido (formato esperado: HH:MM)");
      } else if (!isNaN(startMin) && !isNaN(endMin)) {
        if (timeMin < startMin || timeMin > endMin) {
          errors.push(
            `O horário deve estar dentro do horário de funcionamento (${businessHours.start}–${businessHours.end})`,
          );
        }
      }
    }
  } catch {
    // Totality guarantee: never propagate unexpected errors
    errors.push("Erro inesperado na validação do agendamento");
  }

  return { valid: errors.length === 0, errors };
}
