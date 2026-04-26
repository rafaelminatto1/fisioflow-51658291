/**
 * Appointment Zod Schemas
 *
 * Three variants per entity:
 * - AppointmentCreateSchema  — no `id`, `created_at`, `updated_at`
 * - AppointmentUpdateSchema  — all fields optional
 * - AppointmentResponseSchema — `id` required, timestamps required
 *
 * Business invariants validated:
 * - Duration 15–480 minutes
 * - ISO 8601 dates
 * - Valid UUIDs for IDs
 * - Pain level 0–10 (where applicable)
 *
 * Extra fields: use `.passthrough()` for response schemas where the API
 * may return additional join fields. Use `.strip()` for create/update.
 *
 * @module schemas/appointment.schema
 */

import { z } from "zod";

// ─── Shared field validators ──────────────────────────────────────────────────

/** UUID v4 validator */
const uuidSchema = z.string().uuid("ID deve ser um UUID válido");

/** ISO 8601 date string (YYYY-MM-DD) */
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato ISO 8601 (YYYY-MM-DD)")
  .optional()
  .nullable();

/** ISO 8601 datetime string */
const isoDateTimeSchema = z
  .string()
  .datetime({ offset: true, message: "Timestamp deve estar no formato ISO 8601" })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, "Timestamp inválido"))
  .optional()
  .nullable();

/** HH:MM time string */
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Horário deve estar no formato HH:MM")
  .optional()
  .nullable();

/** Duration in minutes: 15–480 */
const durationSchema = z
  .number()
  .int("Duração deve ser um número inteiro")
  .min(15, "Duração mínima é 15 minutos")
  .max(480, "Duração máxima é 480 minutos")
  .optional()
  .nullable();

/** Pain level 0–10 */
const painLevelSchema = z
  .number()
  .int("Nível de dor deve ser um número inteiro")
  .min(0, "Nível de dor mínimo é 0")
  .max(10, "Nível de dor máximo é 10")
  .optional()
  .nullable();

const appointmentStatusEnum = z.enum([
  "scheduled",
  "confirmed",
  "completed",
  "missed",
  "cancelled",
  "rescheduled",
  "no_show",
  "in_progress",
]);

const appointmentTypeEnum = z
  .enum(["Consulta Inicial", "Fisioterapia", "Reavaliação", "Consulta de Retorno"])
  .optional()
  .nullable();

const paymentStatusEnum = z
  .enum(["pending", "paid", "partial", "cancelled", "refunded"])
  .optional()
  .nullable();

// ─── Shared base fields ───────────────────────────────────────────────────────

const appointmentBaseFields = {
  patient_id: z.string().min(1, "ID do paciente é obrigatório"),
  therapist_id: z.string().min(1, "ID do terapeuta é obrigatório").optional().nullable(),
  organization_id: z.string().optional().nullable(),
  date: isoDateSchema,
  start_time: timeSchema,
  end_time: timeSchema,
  duration: durationSchema,
  status: appointmentStatusEnum.optional().default("scheduled"),
  type: appointmentTypeEnum,
  notes: z.string().optional().nullable(),
  room: z.string().optional().nullable(),
  payment_status: paymentStatusEnum,
  session_type: z.enum(["individual", "group"]).optional().nullable(),
  pain_level: painLevelSchema,
};

// ─── AppointmentCreateSchema ──────────────────────────────────────────────────

/**
 * Schema for creating a new appointment.
 * - No `id`, `created_at`, `updated_at` (server-generated)
 * - `patient_id` is required
 * - Extra fields are stripped
 */
export const AppointmentCreateSchema = z.object(appointmentBaseFields).strip();

export type AppointmentCreate = z.infer<typeof AppointmentCreateSchema>;

// ─── AppointmentUpdateSchema ──────────────────────────────────────────────────

/**
 * Schema for updating an existing appointment.
 * - All fields optional (partial update)
 * - Extra fields are stripped
 */
export const AppointmentUpdateSchema = z
  .object({
    ...appointmentBaseFields,
    patient_id: z.string().min(1).optional(),
  })
  .strip();

export type AppointmentUpdate = z.infer<typeof AppointmentUpdateSchema>;

// ─── AppointmentResponseSchema ────────────────────────────────────────────────

/**
 * Schema for validating API responses.
 * - `id` is required (UUID)
 * - Timestamps are required
 * - Extra fields are passed through (API may return join fields like patient name)
 *
 * Invalid items should be logged and excluded from lists — not thrown.
 */
export const AppointmentResponseSchema = z
  .object({
    id: uuidSchema,
    ...appointmentBaseFields,
    created_at: isoDateTimeSchema,
    updated_at: isoDateTimeSchema,
    // Optional join fields from API
    patient: z
      .object({
        full_name: z.string().optional().nullable(),
        id: z.string().optional().nullable(),
      })
      .optional()
      .nullable(),
    professional: z
      .object({
        full_name: z.string().optional().nullable(),
        id: z.string().optional().nullable(),
      })
      .optional()
      .nullable(),
  })
  .passthrough(); // Allow extra join fields from API

export type AppointmentResponse = z.infer<typeof AppointmentResponseSchema>;
