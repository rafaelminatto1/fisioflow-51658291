import type { Env } from "../types/env";
import { createPool } from "./db";
import { computeAvailableSlots } from "../routes/publicBooking";

// Clínica única: resolve a org pelo WABA id (ou primeira org).
async function resolveOrgId(pool: ReturnType<typeof createPool>, env: Env): Promise<string | null> {
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

export async function buildAppointmentScreen(
  pool: ReturnType<typeof createPool>,
  env: Env,
): Promise<object> {
  const orgId = await resolveOrgId(pool, env);
  const therapists = orgId
    ? (await pool.query(
        `SELECT id, full_name FROM profiles
         WHERE organization_id = $1 AND 'Fisioterapeuta' = ANY(roles) AND deleted_at IS NULL
         ORDER BY full_name`,
        [orgId],
      )).rows
    : [];
  return {
    therapists: therapists.map((t: any) => ({ id: t.id, title: t.full_name })),
    is_therapist_enabled: therapists.length > 0,
  };
}

export async function buildSlotsData(
  pool: ReturnType<typeof createPool>,
  _env: Env,
  therapistId: string,
  date: string,
): Promise<object> {
  const slots = await computeAvailableSlots(pool, therapistId, date);
  return { slots: slots.map((s) => ({ id: s, title: s })) };
}
