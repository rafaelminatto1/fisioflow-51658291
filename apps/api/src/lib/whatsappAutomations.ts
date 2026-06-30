/**
 * Gate + envio dos templates de automação do WhatsApp.
 *
 * Fluxos automáticos (welcome/feedback/exercício/review) só enviam quando a org
 * liga `settings.crm_whatsapp.automations_enabled` (default OFF) — isso evita
 * disparar templates que ainda não foram aprovados pela Meta (sem poluir a DLQ).
 */
import type { Env } from "../types/env";
import type { DbPool } from "./db";
import { createPool } from "./db";
import { WhatsAppService } from "./whatsapp";
import { AUTOMATION_TEMPLATES, type AutomationTemplateKey } from "./whatsappAutomationTemplates";

export async function areAutomationsEnabled(pool: DbPool, orgId: string): Promise<boolean> {
  const res = await pool.query(
    `SELECT (settings->'crm_whatsapp'->>'automations_enabled')::boolean AS enabled
       FROM organizations WHERE id = $1`,
    [orgId],
  );
  return res.rows[0]?.enabled === true;
}

export type AutomationSendResult = { sent: boolean; skipped?: string };

export async function sendAutomationTemplate(
  env: Env,
  orgId: string,
  phone: string | null | undefined,
  key: AutomationTemplateKey,
  vars: string[],
): Promise<AutomationSendResult> {
  if (!phone) return { sent: false, skipped: "no_phone" };

  const pool = createPool(env);
  const enabled = await areAutomationsEnabled(pool, orgId);
  if (!enabled) return { sent: false, skipped: "automations_disabled" };

  const template = AUTOMATION_TEMPLATES[key];
  const wa = new WhatsAppService(env);
  await wa.sendSmartTemplate(phone, template.name, vars);
  return { sent: true };
}
