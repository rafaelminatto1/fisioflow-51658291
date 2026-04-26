/**
 * Schemas — Barrel Export
 *
 * Zod schemas for API boundary validation.
 * Three variants per entity: Create, Update, Response.
 *
 * Usage:
 *   import { PatientResponseSchema, AppointmentCreateSchema } from '@/schemas';
 *
 * @module schemas
 */

// Patient schemas
export {
  PatientCreateSchema,
  PatientUpdateSchema,
  PatientResponseSchema,
} from "./patient.schema";
export type { PatientCreate, PatientUpdate, PatientResponse } from "./patient.schema";

// Appointment schemas
export {
  AppointmentCreateSchema,
  AppointmentUpdateSchema,
  AppointmentResponseSchema,
} from "./appointment.schema";
export type {
  AppointmentCreate,
  AppointmentUpdate,
  AppointmentResponse,
} from "./appointment.schema";

// Legacy schemas (kept for backward compatibility)
export { PatientSchema, PatientFormSchema, PatientQuickFormSchema } from "./patient";
export type { PatientFormData, PatientQuickFormData } from "./patient";

export {
  AppointmentSchema,
  VerifiedAppointmentSchema,
} from "./appointment";
export type { AppointmentRow, VerifiedAppointment } from "./appointment";
