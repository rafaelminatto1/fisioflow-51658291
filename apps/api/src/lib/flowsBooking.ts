import type { Env } from "../types/env";
import { createPool } from "./db";
import { buildSlotGrid } from "../routes/publicBooking";

// Tipos de atendimento oferecidos no Flow (id casa com normalizeAppointmentType).
export const BOOKING_TYPES = [
  { id: "evaluation", title: "Avaliação" },
  { id: "session", title: "Sessão" },
];

const ACTIVE_STATUS_EXCLUDE = ["cancelado", "faltou", "faltou_sem_aviso", "faltou_com_aviso"];

// Clínica única: resolve a org pelo WABA id (ou primeira org).
export async function resolveOrgId(pool: ReturnType<typeof createPool>, env: Env): Promise<string | null> {
  const waba = env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  if (waba) {
    const r = await pool.query(
      `SELECT id FROM organizations WHERE (settings->>'whatsapp_business_account_id') = $1 LIMIT 1`,
      [waba],
    );
    if (r.rows[0]?.id) return r.rows[0].id;
  }
  const first = await pool.query(`SELECT id FROM organizations ORDER BY created_at LIMIT 1`);
  return first.rows[0]?.id ?? null;
}

// IDs dos fisioterapeutas ativos da org (role case-insensitive).
export async function getTherapistIds(
  pool: ReturnType<typeof createPool>,
  orgId: string,
): Promise<string[]> {
  const r = await pool.query(
    `SELECT id FROM profiles
     WHERE organization_id = $1
       AND EXISTS (SELECT 1 FROM unnest(roles) role WHERE lower(role) = 'fisioterapeuta')
     ORDER BY full_name`,
    [orgId],
  );
  return r.rows.map((row: any) => row.id);
}

// Profissional designado para AVALIAÇÃO (mais criterioso). Configurável em
// settings.crm_whatsapp.evaluation_professional_id; senão o primeiro fisio.
export async function getEvaluationProfessionalId(
  pool: ReturnType<typeof createPool>,
  orgId: string,
): Promise<string | null> {
  const cfg = await pool.query(
    `SELECT settings->'crm_whatsapp'->>'evaluation_professional_id' AS pid FROM organizations WHERE id = $1`,
    [orgId],
  );
  const configured = cfg.rows[0]?.pid;
  if (configured) return configured;
  const ids = await getTherapistIds(pool, orgId);
  return ids[0] ?? null;
}

// Horários ocupados de UM fisio numa data.
async function bookedSlotsForTherapist(
  pool: ReturnType<typeof createPool>,
  therapistId: string,
  date: string,
): Promise<string[]> {
  try {
    const r = await pool.query(
      `SELECT start_time FROM appointments
       WHERE therapist_id = $1 AND date = $2 AND status NOT IN ('cancelado','faltou','faltou_sem_aviso','faltou_com_aviso')`,
      [therapistId, date],
    );
    return r.rows.map((row: any) => String(row.start_time).substring(0, 5));
  } catch {
    return [];
  }
}

// Horários livres de UM fisio (avaliação -> profissional designado).
export async function availableSlotsForTherapist(
  pool: ReturnType<typeof createPool>,
  therapistId: string,
  date: string,
): Promise<string[]> {
  const booked = await bookedSlotsForTherapist(pool, therapistId, date);
  return buildSlotGrid().filter((s) => !booked.includes(s));
}

// Capacidade da clínica: slot livre se ao menos 1 fisio estiver livre (sessão).
export async function availableSlotsByCapacity(
  pool: ReturnType<typeof createPool>,
  orgId: string,
  date: string,
): Promise<string[]> {
  const therapistIds = await getTherapistIds(pool, orgId);
  if (therapistIds.length === 0) return [];
  const total = therapistIds.length;
  let bookedCount: Record<string, number> = {};
  try {
    const r = await pool.query(
      `SELECT substr(start_time::text,1,5) AS t, count(*)::int AS n
       FROM appointments
       WHERE organization_id = $1 AND date = $2
         AND status NOT IN ('cancelado','faltou','faltou_sem_aviso','faltou_com_aviso')
       GROUP BY 1`,
      [orgId, date],
    );
    for (const row of r.rows) bookedCount[row.t] = row.n;
  } catch {
    bookedCount = {};
  }
  return buildSlotGrid().filter((s) => (bookedCount[s] ?? 0) < total);
}

// WhatsApp Flows DatePicker devolve a data como epoch millis em string.
export function toIsoDate(date: string): string {
  return /^\d+$/.test(String(date)) ? new Date(Number(date)).toISOString().slice(0, 10) : date;
}

export async function buildAppointmentScreen(
  _pool: ReturnType<typeof createPool>,
  _env: Env,
): Promise<object> {
  // O paciente NÃO escolhe o fisioterapeuta: só o tipo de atendimento.
  return { types: BOOKING_TYPES, slots: [] };
}

export async function buildSlotsData(
  pool: ReturnType<typeof createPool>,
  env: Env,
  type: string,
  date: string,
): Promise<object> {
  const iso = toIsoDate(date);
  const orgId = await resolveOrgId(pool, env);
  if (!orgId) return { slots: [] };

  let slots: string[];
  if (type === "evaluation") {
    // Avaliação -> disponibilidade do profissional designado.
    const evalId = await getEvaluationProfessionalId(pool, orgId);
    slots = evalId ? await availableSlotsForTherapist(pool, evalId, iso) : [];
  } else {
    // Sessão -> capacidade agregada (qualquer fisio livre).
    slots = await availableSlotsByCapacity(pool, orgId, iso);
  }
  return { slots: slots.map((s) => ({ id: s, title: s })) };
}

export { ACTIVE_STATUS_EXCLUDE };
