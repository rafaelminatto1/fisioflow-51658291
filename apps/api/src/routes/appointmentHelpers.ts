/**
 * appointmentHelpers — funções puras e helpers de capacidade extraídas de appointments.ts.
 */
import { sql } from "drizzle-orm";
import { isUuid } from "../lib/validators";

export const STATUS_MAP: Record<string, string> = {
  // Canonical PT-BR enum values stored in the database (pass-through)
  agendado: "agendado",
  atendido: "atendido",
  avaliacao: "avaliacao",
  cancelado: "cancelado",
  faltou: "faltou",
  faltou_com_aviso: "faltou_com_aviso",
  faltou_sem_aviso: "faltou_sem_aviso",
  nao_atendido: "nao_atendido",
  nao_atendido_sem_cobranca: "nao_atendido_sem_cobranca",
  presenca_confirmada: "presenca_confirmada",
  remarcar: "remarcar",

  // Legacy English aliases -> canonical PT-BR enum values
  scheduled: "agendado",
  confirmed: "presenca_confirmada",
  in_progress: "atendido",
  completed: "atendido",
  evaluation: "avaliacao",
  cancelled: "cancelado",
  no_show: "faltou",
  rescheduled: "remarcar",

  // Other accepted aliases -> canonical PT-BR enum values
  aguardando: "agendado",
  aguardando_confirmacao: "agendado",
  confirmado: "presenca_confirmada",
  em_andamento: "atendido",
  concluido: "atendido",
  falta: "faltou",
  remarcado: "remarcar",
  reagendado: "remarcar",
};

export const APPOINTMENT_TYPE_MAP: Record<string, string> = {
  "avaliação inicial": "evaluation",
  "avaliacao inicial": "evaluation",
  avaliacao: "evaluation",
  evaluation: "evaluation",
  fisioterapia: "session",
  session: "session",
  sessão: "session",
  sessao: "session",
  osteopatia: "session",
  reabilitação: "session",
  reabilitacao: "session",
  drenagem: "session",
  drenagem_linfatica: "session",
  massagem: "session",
  rpg: "session",
  pilates: "session",
  reavaliação: "reassessment",
  reavaliacao: "reassessment",
  reassessment: "reassessment",
  grupo: "group",
  group: "group",
  retorno: "return",
  return: "return",
  outro: "session",
};

const VALID_STATUSES = new Set([
  "agendado",
  "atendido",
  "avaliacao",
  "cancelado",
  "faltou",
  "faltou_com_aviso",
  "faltou_sem_aviso",
  "nao_atendido",
  "nao_atendido_sem_cobranca",
  "presenca_confirmada",
  "remarcar",
]);

export function normalizeStatus(raw: string | undefined): string {
  if (!raw) return "agendado";
  const normalized = raw.toLowerCase().trim().replace(/\s+/g, "_");
  if (VALID_STATUSES.has(normalized)) return normalized;
  if (STATUS_MAP[normalized]) return STATUS_MAP[normalized];
  return /^[a-z0-9_]{2,80}$/.test(normalized) ? normalized : "agendado";
}

export function normalizeAppointmentType(raw: string | undefined): string {
  if (!raw) return "session";
  const normalized = raw.toLowerCase().trim();
  return APPOINTMENT_TYPE_MAP[normalized] ?? "session";
}

export function presentAppointmentType(raw: string | undefined): string {
  switch (normalizeAppointmentType(raw)) {
    case "evaluation":
      return "Avaliação Inicial";
    case "reassessment":
      return "Reavaliação";
    case "group":
      return "Grupo";
    case "return":
      return "Retorno";
    case "session":
    default:
      return "Fisioterapia";
  }
}

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const endHours = Math.floor(normalizedMinutes / 60);
  const endMinutes = normalizedMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
}

export function sanitizeAppointmentRow(row: Record<string, unknown>): Record<string, unknown> {
  const startTime =
    row.start_time && row.start_time !== "" && row.start_time !== "null"
      ? (row.start_time as string).substring(0, 5)
      : "08:00";

  const duration = parseInt(String(row.duration_minutes ?? "60"), 10) || 60;

  const endTime =
    row.end_time && row.end_time !== "" && row.end_time !== "null"
      ? (row.end_time as string).substring(0, 5)
      : calculateEndTime(startTime, duration);

  return { ...row, start_time: startTime, end_time: endTime, duration_minutes: duration };
}

export function isConflictError(err: { code?: string; message?: string }): boolean {
  return (
    err.code === "23P01" || // exclusion_violation
    err.code === "23505" || // unique_violation
    (!!err.message &&
      (err.message.includes("no_overlapping_therapist_appointments") ||
        err.message.includes("duplicate key value violates unique constraint")))
  );
}

export function countsTowardCapacity(status: string): boolean {
  const normalized = normalizeStatus(status);
  return ![
    "cancelado",
    "faltou",
    "faltou_com_aviso",
    "faltou_sem_aviso",
    "nao_atendido",
    "nao_atendido_sem_cobranca",
    "remarcar",
  ].includes(normalized);
}

async function statusCountsTowardCapacity(
  db: any,
  organizationId: string,
  status: string,
): Promise<boolean> {
  const normalized = normalizeStatus(status);
  try {
    const result = await db.execute(sql`
      SELECT counts_toward_capacity
      FROM appointment_status_settings
      WHERE organization_id = ${organizationId}
        AND key = ${normalized}
      LIMIT 1
    `);
    const value = result.rows?.[0]?.counts_toward_capacity;
    if (typeof value === "boolean") return value;
  } catch (error: any) {
    if (!String(error?.message ?? "").includes("does not exist")) throw error;
  }
  return countsTowardCapacity(normalized);
}

export async function getIntervalCapacity(
  db: any,
  organizationId: string,
  date: string,
  startTime: string,
  endTime: string,
): Promise<number> {
  try {
    const result = await db.execute(sql`
      SELECT MIN(max_patients)::int AS capacity
      FROM schedule_capacity
      WHERE organization_id = ${organizationId}
        AND day_of_week = EXTRACT(DOW FROM ${date}::date)
        AND start_time < ${endTime}::time
        AND end_time > ${startTime}::time
    `);
    const capacity = Number(result.rows?.[0]?.capacity ?? 1);
    return Number.isFinite(capacity) && capacity > 0 ? capacity : 1;
  } catch (error: any) {
    if (error?.message?.includes("does not exist")) return 1;
    throw error;
  }
}

export async function getOverlappingAppointments(
  db: any,
  organizationId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: string,
): Promise<Array<{ id: string; patientId: string; startTime: string; date: string }>> {
  try {
    const safeOrgId = isUuid(organizationId)
      ? organizationId
      : "00000000-0000-0000-0000-000000000000";
    const result = await db.execute(sql`
      SELECT id, patient_id AS "patientId", start_time AS "startTime", date
      FROM appointments
      WHERE organization_id = ${safeOrgId}::uuid
        AND date = ${date}::date
        AND status::text NOT IN (
          'cancelado', 'cancelled',
          'faltou', 'faltou_com_aviso', 'faltou_sem_aviso',
          'nao_atendido', 'nao_atendido_sem_cobranca', 'no_show',
          'remarcar', 'remarcado', 'rescheduled'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM appointment_status_settings ass
          WHERE ass.organization_id = appointments.organization_id
            AND ass.key = appointments.status::text
            AND ass.counts_toward_capacity = FALSE
        )
        AND deleted_at IS NULL
        AND start_time < ${endTime}::time
        AND end_time > ${startTime}::time
        ${excludeAppointmentId && isUuid(excludeAppointmentId) ? sql`AND id != ${excludeAppointmentId}::uuid` : sql``}
      ORDER BY start_time ASC, created_at ASC
    `);
    return (result.rows || []) as any;
  } catch (error: any) {
    console.error("[getOverlappingAppointments] Query failed:", error.message);
    if (error.message.includes("does not exist")) return [];
    throw error;
  }
}

export async function enforceCapacity(
  db: any,
  organizationId: string,
  payload: {
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    ignoreCapacity?: boolean;
    excludeAppointmentId?: string;
    useLock?: boolean;
  },
) {
  if (
    payload.ignoreCapacity ||
    !(await statusCountsTowardCapacity(db, organizationId, payload.status))
  ) {
    return null;
  }

  const capacity = await getIntervalCapacity(
    db,
    organizationId,
    payload.date,
    payload.startTime,
    payload.endTime,
  );
  const conflicts = await getOverlappingAppointments(
    db,
    organizationId,
    payload.date,
    payload.startTime,
    payload.endTime,
    payload.excludeAppointmentId,
  );

  if (conflicts.length < capacity) return null;

  return {
    error: "Capacidade do horário excedida para este intervalo.",
    capacity,
    total: conflicts.length + 1,
    conflicts,
  };
}

export function sanitizeInput(data: any): any {
  if (data === null || data === undefined) return null;
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (trimmed === "" || trimmed === "null" || trimmed === "undefined") return null;
    return trimmed;
  }
  if (Array.isArray(data)) return data.map(sanitizeInput);
  if (typeof data === "object") {
    return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, sanitizeInput(v)]));
  }
  return data;
}

export function toPositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "sim"].includes(normalized)) return true;
    if (["false", "0", "no", "nao", "não"].includes(normalized)) return false;
  }
  return fallback;
}
