import type { Env } from "../types/env";
import { createPool } from "./db";
import { BOOKING_TYPES } from "./flowsBooking";

// Flow "Agendar atendimento" publicado na Meta (WABA 806225345331804).
export const DEFAULT_BOOKING_FLOW_ID = "1706568520560773";

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
  therapist?: string;
  date?: string;
  slot?: string;
}

export interface BookingRequestResult {
  professionalName: string;
  typeLabel: string;
  isoDate: string;
  time: string;
  confirmationText: string;
}

// WhatsApp Flows DatePicker devolve a data como epoch millis em string.
function toIsoDate(date: string): string {
  return /^\d+$/.test(String(date)) ? new Date(Number(date)).toISOString().slice(0, 10) : date;
}

function typeLabelFor(typeId: string | undefined): string {
  return BOOKING_TYPES.find((t) => t.id === typeId)?.title ?? "Atendimento";
}

function formatBrDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

/**
 * Cria um pedido de agendamento (public_booking_requests, pending) a partir da
 * conclusão do Flow, e monta o texto de confirmação para o paciente.
 * Retorna null se os dados forem insuficientes ou o profissional não existir.
 */
export async function createBookingRequestFromFlow(
  pool: ReturnType<typeof createPool>,
  orgId: string,
  contactName: string,
  contactPhone: string,
  payload: FlowBookingPayload,
): Promise<BookingRequestResult | null> {
  if (!payload.therapist || !payload.date || !payload.slot) return null;

  const isoDate = toIsoDate(payload.date);
  const time = String(payload.slot).slice(0, 5);
  const typeLabel = typeLabelFor(payload.type);

  const profRes = await pool.query(
    `SELECT user_id, full_name FROM profiles WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [payload.therapist, orgId],
  );
  const prof = profRes.rows[0] as { user_id: string; full_name: string } | undefined;
  if (!prof) return null;

  await pool.query(
    `INSERT INTO public_booking_requests (
      organization_id, profile_user_id, patient_name, patient_phone, patient_email,
      requested_date, requested_time, notes, professional_name, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
    [
      orgId,
      prof.user_id,
      contactName || "Paciente (WhatsApp)",
      contactPhone,
      null,
      isoDate,
      time,
      `Tipo: ${typeLabel} (via WhatsApp Flow)`,
      prof.full_name,
    ],
  );

  const confirmationText =
    `✅ Recebemos seu pedido de agendamento!\n\n` +
    `📋 ${typeLabel}\n` +
    `👤 ${prof.full_name}\n` +
    `📅 ${formatBrDate(isoDate)} às ${time}\n\n` +
    `Em breve confirmamos com você. 💙`;

  return { professionalName: prof.full_name, typeLabel, isoDate, time, confirmationText };
}
