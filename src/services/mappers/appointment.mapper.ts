import type { AppointmentRow } from "@/types/workers";
import type { Appointment } from "@/types";

// ─── Normalizers ────────────────────────────────────────────────────────────

function normalizeIsoDateTime(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

function normalizeDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split("T")[0];
  }
  if (typeof value === "string" && value.trim().length > 0) {
    // Already a date string like "2026-01-15"
    if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim();
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  }
  return "";
}

function normalizeTime(value: unknown): string {
  if (typeof value === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(value.trim())) {
    return value.trim().slice(0, 5);
  }
  return "00:00";
}

function normalizeStatus(
  value: unknown,
): "Confirmado" | "Pendente" | "Reagendado" | "Cancelado" | "Realizado" {
  const raw = typeof value === "string" ? value.toLowerCase().trim() : "";
  const map: Record<string, "Confirmado" | "Pendente" | "Reagendado" | "Cancelado" | "Realizado"> =
    {
      confirmed: "Confirmado",
      confirmado: "Confirmado",
      scheduled: "Pendente",
      pendente: "Pendente",
      pending: "Pendente",
      rescheduled: "Reagendado",
      reagendado: "Reagendado",
      cancelled: "Cancelado",
      canceled: "Cancelado",
      cancelado: "Cancelado",
      completed: "Realizado",
      realizado: "Realizado",
      concluido: "Realizado",
      concluído: "Realizado",
    };
  return map[raw] ?? "Pendente";
}

// ─── Mapper ─────────────────────────────────────────────────────────────────

/**
 * Maps a database `AppointmentRow` (snake_case) to the application `Appointment` type (camelCase).
 *
 * @param row - The raw database row from the appointments table.
 * @returns A fully-typed `Appointment` object with all fields normalized.
 */
export function mapAppointmentRow(row: AppointmentRow): Appointment {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    patientName: row.patient_name ?? "Desconhecido",
    date: normalizeDate(row.date),
    time: normalizeTime(row.start_time),
    duration: 60, // AppointmentRow does not carry duration; default to 60 min
    type: "Fisioterapia",
    status: normalizeStatus(row.status),
    notes: row.notes ?? "",
    createdAt: normalizeIsoDateTime(row.created_at),
    updatedAt: normalizeIsoDateTime(row.updated_at),
  };
}
