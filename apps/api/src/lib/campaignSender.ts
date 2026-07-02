/**
 * Disparo real de campanhas de WhatsApp: envia um template APROVADO por
 * destinatário e grava meta_message_id (rastreado depois por delivered/read no
 * webhook de status). Só age quando a campanha é tipo 'whatsapp' e tem
 * `template_key` de um template aprovado — free-text continua log-only.
 */
import type { Env } from "../types/env";
import type { DbPool } from "./db";
import { writeEvent } from "./analytics";
import { WhatsAppService } from "./whatsapp";
import {
  AUTOMATION_TEMPLATES,
  templateVarCount,
  type AutomationTemplateKey,
} from "./whatsappAutomationTemplates";

export interface CampaignSendResult {
  sent: number;
  failed: number;
  skipped?: string;
}

function firstName(name: unknown): string {
  const s = typeof name === "string" ? name.trim() : "";
  return s ? s.split(/\s+/)[0] : "Paciente";
}

async function markEnvio(
  pool: DbPool,
  id: string,
  status: "enviado" | "falha",
  metaMessageId: string | null,
  phone: string | null,
  error: string | null,
): Promise<void> {
  await pool.query(
    `UPDATE crm_campanha_envios
        SET status = $2, meta_message_id = $3, phone = $4, error = $5, enviado_em = now()
      WHERE id = $1`,
    [id, status, metaMessageId, phone, error],
  );
}

export async function processCampaignSend(
  pool: DbPool,
  env: Env,
  campaignId: string,
): Promise<CampaignSendResult> {
  const campRes = await pool.query(
    `SELECT id, organization_id, tipo, template_key FROM crm_campanhas WHERE id = $1`,
    [campaignId],
  );
  const camp = campRes.rows[0];
  if (!camp) return { sent: 0, failed: 0, skipped: "not_found" };
  if (camp.tipo !== "whatsapp" || !camp.template_key) {
    return { sent: 0, failed: 0, skipped: "not_whatsapp_template" };
  }
  const template = AUTOMATION_TEMPLATES[camp.template_key as AutomationTemplateKey];
  if (!template) return { sent: 0, failed: 0, skipped: "unknown_template" };

  // LGPD: re-checa o opt-out no momento do envio (importante p/ campanhas agendadas
  // — o paciente pode ter revogado entre a criação e o disparo). Marca como falha
  // quem revogou, para não enviar e refletir no resumo.
  await pool.query(
    `UPDATE crm_campanha_envios e
        SET status = 'falha', error = 'opt-out de marketing', enviado_em = now()
      WHERE e.campanha_id = $1 AND e.status IN ('pendente', 'agendado')
        AND EXISTS (
          SELECT 1 FROM patients p2
          JOIN marketing_consents mc ON mc.patient_id = p2.id
          WHERE p2.organization_id = $2
            AND regexp_replace(COALESCE(p2.phone, ''), '[^0-9]', '', 'g')
                = regexp_replace(COALESCE(e.phone, ''), '[^0-9]', '', 'g')
            AND (mc.is_active = false OR mc.revoked_at IS NOT NULL))`,
    [campaignId, camp.organization_id],
  );

  const enviosRes = await pool.query(
    `SELECT e.id, COALESCE(e.phone, ct.telefone, p.phone) AS phone,
            COALESCE(ct.nome, p.full_name) AS full_name
       FROM crm_campanha_envios e
       LEFT JOIN contacts ct ON ct.id = e.contact_id
       LEFT JOIN patients p ON p.id = e.patient_id
      WHERE e.campanha_id = $1 AND e.status IN ('pendente', 'agendado')
      LIMIT 500`,
    [campaignId],
  );

  const wa = new WhatsAppService(env);
  const varCount = templateVarCount(template.body);
  let sent = 0;
  let failed = 0;

  for (const e of enviosRes.rows) {
    const phone = e.phone ? String(e.phone) : null;
    if (!phone) {
      await markEnvio(pool, e.id, "falha", null, null, "sem telefone");
      failed++;
      continue;
    }
    const vars = varCount > 0 ? [firstName(e.full_name)] : [];
    let metaId: string | null = null;
    let error: string | null = null;
    try {
      const result = (await wa.sendSmartTemplate(phone, template.name, vars)) as any;
      metaId = result?.messages?.[0]?.id ?? null;
      if (!metaId) error = JSON.stringify(result?.error ?? result ?? {}).slice(0, 400);
    } catch (err) {
      error = String((err as Error)?.message ?? err).slice(0, 400);
    }
    const accepted = !!metaId;
    await markEnvio(pool, e.id, accepted ? "enviado" : "falha", metaId, phone, error);
    if (accepted) sent++;
    else failed++;
  }

  await pool.query(
    `UPDATE crm_campanhas SET status = 'concluida', concluida_em = now(),
            total_enviados = $2, updated_at = now()
      WHERE id = $1`,
    [campaignId, sent],
  );

  writeEvent(env, {
    event: "campaign_sent",
    orgId: camp.organization_id,
    route: "/campaign/send",
    method: "QUEUE",
    status: 200,
    value: sent,
  });

  return { sent, failed };
}
