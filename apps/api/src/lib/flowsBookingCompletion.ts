import type { Env } from "../types/env";
import { createPool } from "./db";
import {
  BOOKING_TYPES,
  getEvaluationProfessionalId,
  getTherapistIds,
  toIsoDate,
  availableSlotsByCapacity,
} from "./flowsBooking";
import { normalizeAppointmentType, calculateEndTime } from "../routes/appointmentHelpers";
import { linkContactToPatient } from "./whatsapp-identity";
import { sendListMessage } from "./whatsapp-interactive";

// Flow "Agendar atendimento" publicado na Meta (WABA 806225345331804).
export const DEFAULT_BOOKING_FLOW_ID = "1706568520560773";

const EXCLUDE = "'cancelado','faltou','faltou_sem_aviso','faltou_com_aviso'";

// Detecta intenção clara do paciente de agendar (para enviar o Flow nativo).
export function isBookingIntent(text: string | undefined | null): boolean {
  const t = (text || "").toLowerCase().trim();
  if (!t) return false;
  return (
    /\b(quero|gostaria|preciso|posso|como)\b[\s\S]{0,40}\b(agendar|marcar|agendamento)\b/.test(t) ||
    /\b(agendar|marcar)\b[\s\S]{0,20}\b(avalia|sess[aã]o|atendimento|hor[aá]rio|fisio)\b/.test(t) ||
    /^\s*(agendar|agendamento|marcar)\b/.test(t)
  );
}

export interface FlowBookingPayload {
  type?: string;
  date?: string;
  slot?: string;
}

export interface FlowContact {
  id: string;
  display_name?: string | null;
  patient_id?: string | null;
}

export interface ConfirmedBookingResult {
  appointmentId: string;
  professionalName: string;
  typeLabel: string;
  isoDate: string;
  time: string;
  confirmationText: string;
}

function typeLabelFor(typeId: string | undefined): string {
  return BOOKING_TYPES.find((t) => t.id === typeId)?.title ?? "Atendimento";
}

function formatBrDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

async function findOrCreatePatient(
  pool: ReturnType<typeof createPool>,
  orgId: string,
  contact: FlowContact,
  phone: string,
): Promise<string | null> {
  if (contact.patient_id) return contact.patient_id;

  const existing = await pool.query(
    `SELECT id FROM patients WHERE organization_id = $1 AND phone = $2 LIMIT 1`,
    [orgId, phone],
  );
  if (existing.rows[0]?.id) {
    await linkContactToPatient(pool as any, contact.id, existing.rows[0].id).catch(() => {});
    return existing.rows[0].id;
  }

  const created = await pool.query(
    `INSERT INTO patients (full_name, phone, organization_id, status)
     VALUES ($1, $2, $3, 'active') RETURNING id`,
    [contact.display_name || "Paciente (WhatsApp)", phone, orgId],
  );
  const patientId = created.rows[0]?.id;
  if (patientId) await linkContactToPatient(pool as any, contact.id, patientId).catch(() => {});
  return patientId ?? null;
}

// Escolhe o fisioterapeuta: avaliação -> profissional designado; sessão -> um
// fisio livre no horário. Retorna null se ninguém disponível (slot tomado).
async function pickTherapist(
  pool: ReturnType<typeof createPool>,
  orgId: string,
  typeNorm: string,
  isoDate: string,
  startTime: string,
): Promise<{ id: string; full_name: string } | null> {
  if (typeNorm === "evaluation") {
    const evalId = await getEvaluationProfessionalId(pool, orgId);
    if (!evalId) return null;
    const busy = await pool.query(
      `SELECT 1 FROM appointments WHERE therapist_id = $1 AND date = $2 AND start_time = $3 AND status NOT IN (${EXCLUDE}) LIMIT 1`,
      [evalId, isoDate, startTime],
    );
    if (busy.rows.length > 0) return null;
    const prof = await pool.query(`SELECT id, full_name FROM profiles WHERE id = $1 LIMIT 1`, [evalId]);
    return prof.rows[0] ?? null;
  }

  const ids = await getTherapistIds(pool, orgId);
  if (ids.length === 0) return null;
  const free = await pool.query(
    `SELECT id, full_name FROM profiles
     WHERE id = ANY($1::uuid[])
       AND id NOT IN (
         SELECT therapist_id FROM appointments
         WHERE date = $2 AND start_time = $3 AND status NOT IN (${EXCLUDE})
       )
     ORDER BY full_name LIMIT 1`,
    [ids, isoDate, startTime],
  );
  return free.rows[0] ?? null;
}

/**
 * Cria um agendamento CONFIRMADO a partir da conclusão do Flow (sem o paciente
 * escolher o fisio). Lembretes 24h/1h são disparados automaticamente pelo cron.
 * Retorna null se faltar dado ou não houver disponibilidade.
 */
export async function createConfirmedAppointmentFromFlow(
  pool: ReturnType<typeof createPool>,
  orgId: string,
  contact: FlowContact,
  contactPhone: string,
  payload: FlowBookingPayload,
): Promise<ConfirmedBookingResult | null> {
  if (!payload.date || !payload.slot) return null;

  const isoDate = toIsoDate(payload.date);
  const time = String(payload.slot).slice(0, 5);
  const startTime = `${time}:00`;
  const endTime = `${calculateEndTime(time, 60)}:00`;
  const typeNorm = normalizeAppointmentType(payload.type);
  const typeLabel = typeLabelFor(payload.type);

  const therapist = await pickTherapist(pool, orgId, typeNorm, isoDate, startTime);
  if (!therapist) return null; // slot já tomado / sem profissional

  const patientId = await findOrCreatePatient(pool, orgId, contact, contactPhone);
  if (!patientId) return null;

  const appt = await pool.query(
    `INSERT INTO appointments
       (patient_id, therapist_id, date, start_time, end_time, duration_minutes, organization_id, status, type, notes)
     VALUES ($1, $2, $3, $4, $5, 60, $6, 'agendado', $7, $8) RETURNING id`,
    [patientId, therapist.id, isoDate, startTime, endTime, orgId, typeNorm, `${typeLabel} agendada via WhatsApp`],
  );
  const appointmentId = appt.rows[0]?.id;
  if (!appointmentId) return null;

  const confirmationText =
    `✅ Agendamento confirmado!\n\n` +
    `📋 ${typeLabel}\n` +
    `👤 ${therapist.full_name}\n` +
    `📅 ${formatBrDate(isoDate)} às ${time}\n\n` +
    `Você receberá um lembrete antes. Até lá! 💙`;

  return { appointmentId, professionalName: therapist.full_name, typeLabel, isoDate, time, confirmationText };
}

// Fallback: envia uma LISTA de horários de sessão do próximo dia útil (para
// quem não interage com o Flow). Cada linha agenda ao ser tocada (id book|...).
export async function sendSlotsListFallback(
  env: Env,
  pool: ReturnType<typeof createPool>,
  orgId: string,
  to: string,
  nowMs: number,
): Promise<boolean> {
  const d = new Date(nowMs);
  d.setUTCDate(d.getUTCDate() + 1);
  const iso = d.toISOString().slice(0, 10);
  const slots = await availableSlotsByCapacity(pool, orgId, iso);
  if (slots.length === 0) return false;
  const rows = slots.slice(0, 10).map((t) => ({ id: `book|session|${iso}|${t}`, title: t, description: "Sessão" }));
  const res = await sendListMessage(
    env,
    to,
    `Horários livres para ${formatBrDate(iso)}. Toque em um para agendar uma sessão:`,
    "Ver horários",
    [{ title: "Sessão", rows }],
  );
  return !(res as any)?.error;
}

// Parseia o id de uma linha da lista de fallback: "book|<type>|<iso>|<time>".
export function parseBookListId(id: string | undefined | null): FlowBookingPayload | null {
  if (!id || !id.startsWith("book|")) return null;
  const [, type, date, slot] = id.split("|");
  if (!date || !slot) return null;
  return { type, date, slot };
}
