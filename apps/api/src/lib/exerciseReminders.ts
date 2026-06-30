/**
 * Lembrete de exercícios em casa, ~2 dias após uma consulta concluída.
 *
 * Portado do Inngest morto (que usava step.sleep 2d). O atraso de 2 dias excede
 * o limite de delay da Cloudflare Queue (~12h), então roda no cron diário.
 * Dedup atômico via `appointment_reminder_log (appointment_id, kind='exercise_2d')`.
 * Gated por `settings.crm_whatsapp.automations_enabled` (default OFF).
 */
import type { Env } from "../types/env";
import type { DbPool } from "./db";
import { areAutomationsEnabled, sendAutomationTemplate } from "./whatsappAutomations";

function firstName(name: unknown): string {
  return String(name ?? "").trim().split(/\s+/)[0] || "Paciente";
}

export async function dispatchExerciseReminders(
  pool: DbPool,
  env: Env,
): Promise<{ sent: number }> {
  const candidates = await pool.query(
    `SELECT a.id, a.organization_id, p.full_name, p.phone
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
      WHERE a.status::text IN ('atendido', 'avaliacao', 'completed', 'realizado', 'concluido')
        AND a.date = (CURRENT_DATE - INTERVAL '2 days')::date
        AND p.phone IS NOT NULL
        AND a.organization_id IS NOT NULL`,
  );

  const enabledCache = new Map<string, boolean>();
  let sent = 0;

  for (const row of candidates.rows as Array<{
    id: string;
    organization_id: string;
    full_name: string;
    phone: string;
  }>) {
    const orgId = row.organization_id;
    if (!enabledCache.has(orgId)) {
      enabledCache.set(orgId, await areAutomationsEnabled(pool, orgId));
    }
    if (!enabledCache.get(orgId)) continue;

    // Claim atômico antes de enviar — evita reenvio (e só consome a janela para
    // orgs com o gate ligado).
    const claim = await pool.query(
      `INSERT INTO appointment_reminder_log (appointment_id, kind)
         VALUES ($1, 'exercise_2d')
       ON CONFLICT (appointment_id, kind) DO NOTHING RETURNING 1`,
      [row.id],
    );
    if (claim.rows.length === 0) continue;

    const res = await sendAutomationTemplate(env, orgId, row.phone, "lembrete_exercicios_v1", [
      firstName(row.full_name),
    ]);
    if (res.sent) sent++;
  }

  return { sent };
}
