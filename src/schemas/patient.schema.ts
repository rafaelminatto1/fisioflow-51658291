/**
 * Patient Zod Schemas
 *
 * Three variants per entity:
 * - PatientCreateSchema  — no `id`, `created_at`, `updated_at`
 * - PatientUpdateSchema  — all fields optional
 * - PatientResponseSchema — `id` required, timestamps required
 *
 * Business invariants validated:
 * - Pain level 0–10 (via pain.validation.ts)
 * - ISO 8601 dates
 * - Valid UUIDs for IDs
 *
 * Extra fields: use `.passthrough()` where the API may return additional
 * join fields (e.g., organization name). Use `.strip()` for create/update
 * to prevent accidental extra fields from being sent to the API.
 *
 * @module schemas/patient.schema
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

const patientStatusEnum = z.enum([
  "active",
  "inactive",
  "Em Tratamento",
  "Inicial",
  "Alta",
  "Arquivado",
  "Recuperação",
  "Concluído",
]);

const genderEnum = z.enum(["masculino", "feminino", "outro"]);

// ─── Shared base fields (used across all three schemas) ───────────────────────

const patientBaseFields = {
  full_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(200),
  name: z.string().optional().nullable(),
  email: z.string().email("Email inválido").optional().nullable(),
  phone: z.string().optional().nullable(),
  cpf: z.string().optional().nullable(),
  birth_date: isoDateSchema,
  gender: genderEnum.optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip_code: z.string().optional().nullable(),
  main_condition: z.string().optional().nullable(),
  status: patientStatusEnum.optional().default("active"),
  progress: z.number().min(0).max(100).optional().default(0),
  incomplete_registration: z.boolean().optional().default(false),
  organization_id: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
  medical_history: z.string().optional().nullable(),
  allergies: z.string().optional().nullable(),
  medications: z.string().optional().nullable(),
  health_insurance: z.string().optional().nullable(),
  insurance_number: z.string().optional().nullable(),
  emergency_contact: z.string().optional().nullable(),
  emergency_phone: z.string().optional().nullable(),
  blood_type: z.string().optional().nullable(),
  marital_status: z.string().optional().nullable(),
  profession: z.string().optional().nullable(),
  education_level: z.string().optional().nullable(),
  photo_url: z.string().optional().nullable(),
};

// ─── PatientCreateSchema ──────────────────────────────────────────────────────

/**
 * Schema for creating a new patient.
 * - No `id`, `created_at`, `updated_at` (server-generated)
 * - `full_name` is required
 * - Extra fields are stripped to prevent accidental data leakage
 */
export const PatientCreateSchema = z.object(patientBaseFields).strip();

export type PatientCreate = z.infer<typeof PatientCreateSchema>;

// ─── PatientUpdateSchema ──────────────────────────────────────────────────────

/**
 * Schema for updating an existing patient.
 * - All fields optional (partial update)
 * - Extra fields are stripped
 */
export const PatientUpdateSchema = z
  .object({
    ...patientBaseFields,
    full_name: z.string().min(2).max(200).optional(),
  })
  .strip();

export type PatientUpdate = z.infer<typeof PatientUpdateSchema>;

// ─── PatientResponseSchema ────────────────────────────────────────────────────

/**
 * Schema for validating API responses.
 * - `id` is required (UUID)
 * - Timestamps are required
 * - Extra fields are passed through (API may return join fields)
 *
 * Invalid items should be logged and excluded from lists — not thrown.
 */
export const PatientResponseSchema = z
  .object({
    id: uuidSchema,
    ...patientBaseFields,
    created_at: isoDateTimeSchema,
    updated_at: isoDateTimeSchema,
  })
  .passthrough(); // Allow extra join fields from API (e.g., organization name)

export type PatientResponse = z.infer<typeof PatientResponseSchema>;
