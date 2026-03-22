import type { Hono } from 'hono';
import type { Env } from '../../types/env';
import type { AuthVariables } from '../../lib/auth';
import { createPool } from '../../lib/db';

export type PatientRouteApp = Hono<{ Bindings: Env; Variables: AuthVariables }>;
export type DbPool = ReturnType<typeof createPool>;
export type DbRow = Record<string, unknown>;
export type PatientPayload = Record<string, unknown>;

export function trimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function nullableString(value: unknown): string | null {
  return trimmedString(value) ?? null;
}

export function nullableBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'sim'].includes(normalized)) return true;
    if (['false', '0', 'no', 'nao', 'não'].includes(normalized)) return false;
  }
  return null;
}

export function nullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim();
    if (!normalized) return null;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return { street: value };
    }
  }
  return null;
}

export function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function normalizeMedicalRecordRow(row: DbRow) {
  return {
    ...row,
    id: String(row.id),
    patient_id: String(row.patient_id),
    chief_complaint: trimmedString(row.chief_complaint) ?? null,
    medical_history: trimmedString(row.medical_history) ?? null,
    current_medications: trimmedString(row.current_medications) ?? null,
    allergies: trimmedString(row.allergies) ?? null,
    previous_surgeries: trimmedString(row.previous_surgeries) ?? null,
    family_history: trimmedString(row.family_history) ?? null,
    lifestyle_habits: trimmedString(row.lifestyle_habits) ?? null,
    record_date: row.record_date ? String(row.record_date) : new Date().toISOString().slice(0, 10),
    created_by: trimmedString(row.created_by) ?? null,
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

export function normalizePhysicalExaminationRow(row: DbRow) {
  return {
    ...row,
    id: String(row.id),
    patient_id: String(row.patient_id),
    record_date: row.record_date ? String(row.record_date) : new Date().toISOString().slice(0, 10),
    created_by: trimmedString(row.created_by) ?? null,
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
    vital_signs: parseJsonObject(row.vital_signs) ?? {},
    general_appearance: trimmedString(row.general_appearance) ?? null,
    heent: trimmedString(row.heent) ?? null,
    cardiovascular: trimmedString(row.cardiovascular) ?? null,
    respiratory: trimmedString(row.respiratory) ?? null,
    gastrointestinal: trimmedString(row.gastrointestinal) ?? null,
    musculoskeletal: trimmedString(row.musculoskeletal) ?? null,
    neurological: trimmedString(row.neurological) ?? null,
    integumentary: trimmedString(row.integumentary) ?? null,
    psychological: trimmedString(row.psychological) ?? null,
  };
}

export function normalizeTreatmentPlanRow(row: DbRow) {
  return {
    ...row,
    id: String(row.id),
    patient_id: String(row.patient_id),
    record_date: row.record_date ? String(row.record_date) : new Date().toISOString().slice(0, 10),
    created_by: trimmedString(row.created_by) ?? null,
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
    diagnosis: parseJsonArray(row.diagnosis),
    objectives: parseJsonArray(row.objectives),
    procedures: parseJsonArray(row.procedures),
    exercises: parseJsonArray(row.exercises),
    recommendations: parseJsonArray(row.recommendations),
    follow_up_date: row.follow_up_date ? String(row.follow_up_date) : null,
  };
}

export function normalizeMedicalAttachmentRow(row: DbRow) {
  return {
    ...row,
    id: String(row.id),
    patient_id: String(row.patient_id),
    record_id: trimmedString(row.record_id) ?? null,
    file_name: trimmedString(row.file_name) ?? '',
    file_url: trimmedString(row.file_url) ?? '',
    file_type: trimmedString(row.file_type) ?? '',
    file_size: nullableNumber(row.file_size),
    uploaded_at: row.uploaded_at ? String(row.uploaded_at) : null,
    uploaded_by: trimmedString(row.uploaded_by) ?? null,
    category: trimmedString(row.category) ?? 'other',
    description: trimmedString(row.description) ?? null,
  };
}

export function normalizePathologyRow(row: DbRow) {
  return {
    ...row,
    id: String(row.id),
    patient_id: String(row.patient_id),
    name: trimmedString(row.pathology_name ?? row.name) ?? '',
    pathology_name: trimmedString(row.pathology_name ?? row.name) ?? '',
    icd_code: trimmedString(row.icd_code ?? row.cid_code) ?? null,
    cid_code: trimmedString(row.cid_code ?? row.icd_code) ?? null,
    status: trimmedString(row.status) ?? 'ativo',
    diagnosed_at: row.diagnosis_date ?? row.diagnosed_at ? String(row.diagnosis_date ?? row.diagnosed_at) : null,
    diagnosis_date: row.diagnosis_date ?? row.diagnosed_at ? String(row.diagnosis_date ?? row.diagnosed_at) : null,
    treated_at: row.treated_at ? String(row.treated_at) : null,
    severity: trimmedString(row.severity) ?? null,
    affected_region: trimmedString(row.affected_region) ?? null,
    notes: trimmedString(row.notes) ?? null,
    created_at: row.created_at ? String(row.created_at) : new Date().toISOString(),
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

export function normalizeSurgeryRow(row: DbRow) {
  return {
    ...row,
    id: String(row.id),
    patient_id: String(row.patient_id),
    name: trimmedString(row.surgery_name ?? row.name) ?? '',
    surgery_name: trimmedString(row.surgery_name ?? row.name) ?? '',
    surgery_date: row.surgery_date ? String(row.surgery_date) : null,
    surgeon: trimmedString(row.surgeon_name ?? row.surgeon) ?? null,
    surgeon_name: trimmedString(row.surgeon_name ?? row.surgeon) ?? null,
    hospital: trimmedString(row.hospital) ?? null,
    post_op_protocol: trimmedString(row.post_op_protocol) ?? null,
    surgery_type: trimmedString(row.surgery_type) ?? null,
    affected_side: trimmedString(row.affected_side) ?? null,
    complications: trimmedString(row.complications) ?? null,
    notes: trimmedString(row.notes) ?? null,
    created_at: row.created_at ? String(row.created_at) : new Date().toISOString(),
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

export function normalizeMedicalReturnRow(row: DbRow) {
  return {
    ...row,
    id: String(row.id),
    patient_id: String(row.patient_id),
    doctor_name: trimmedString(row.doctor_name) ?? '',
    doctor_phone: trimmedString(row.doctor_phone) ?? null,
    return_date: row.return_date ? String(row.return_date) : null,
    return_period: trimmedString(row.return_period) ?? null,
    notes: trimmedString(row.notes) ?? null,
    report_done: Boolean(row.report_done),
    report_sent: Boolean(row.report_sent),
    created_at: row.created_at ? String(row.created_at) : new Date().toISOString(),
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}
