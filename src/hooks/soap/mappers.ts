import type { EvolutionRecord } from "./types";

const safeArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const safeNumber = (v: unknown): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Mapper para evolução clínica (modelo único — texto livre).
 *
 * Aceita payload da API em snake_case (canônico do worker) e devolve
 * o registro normalizado para uso direto no frontend.
 */
export const toEvolutionRecord = (record: Record<string, unknown>): EvolutionRecord => ({
  id: String(record.id),
  patient_id: String(record.patient_id ?? ""),
  appointment_id: record.appointment_id ? String(record.appointment_id) : undefined,
  session_number: record.session_number != null ? Number(record.session_number) : undefined,
  observacao: typeof record.observacao === "string" ? record.observacao : "",
  pain_scale: safeNumber(record.pain_scale),
  procedures: safeArray(record.procedures),
  exercises: safeArray(record.exercises),
  measurements: safeArray(record.measurements),
  home_exercises: safeArray(record.home_exercises),
  status: (record.status as EvolutionRecord["status"]) ?? "draft",
  duration_minutes: record.duration_minutes != null ? Number(record.duration_minutes) : undefined,
  last_auto_save_at: record.last_auto_save_at ? String(record.last_auto_save_at) : undefined,
  finalized_at: record.finalized_at ? String(record.finalized_at) : undefined,
  finalized_by: record.finalized_by ? String(record.finalized_by) : undefined,
  record_date: String(record.record_date ?? new Date().toISOString().slice(0, 10)),
  created_by: typeof record.created_by === "string" ? record.created_by : "Desconhecido",
  created_at: String(record.created_at ?? new Date().toISOString()),
  updated_at: String(record.updated_at ?? new Date().toISOString()),
  signed_at: record.signed_at ? String(record.signed_at) : undefined,
  is_edited: Boolean(record.is_edited),
  last_edited_by: record.last_edited_by ? String(record.last_edited_by) : undefined,
  last_edited_device_id: record.last_edited_device_id
    ? String(record.last_edited_device_id)
    : undefined,
  edit_reason: record.edit_reason ? String(record.edit_reason) : undefined,
});

/** Alias retro-compatível. */
export const toSoapRecordV2 = toEvolutionRecord;
