/**
 * CRM Automation Engine — contact-centric.
 *
 * Diferente de `automation-engine.ts` (que opera sobre conversas do WhatsApp
 * inbox), este motor responde a eventos do funil/CRM:
 *   - lead_created, stage_changed, birthday, discharge, nps_low,
 *     appointment_no_show, inactivity
 *
 * Fluxo:
 *   1. processCrmTrigger(env, pool, triggerType, contactId, payload)
 *      busca regras ativas em crm_automation_rules + templates globais
 *      (organization_id IS NULL & ativo = true por org via flag) → cria
 *      registros em crm_automation_executions com scheduled_for adequado.
 *   2. scanPendingExecutions(env, pool) é chamado pelo cron worker (a cada
 *      5 min) e executa as ações vencidas.
 *
 * Idempotência: cooldown_minutes na regra evita disparo duplicado.
 */
import { WhatsAppService } from "../lib/whatsapp";
import { logContactActivity } from "../lib/contacts";
import type { Env } from "../types/env";
import type { DbPool } from "../lib/db";

export type CrmTriggerType =
  | "lead_created"
  | "stage_changed"
  | "birthday"
  | "discharge"
  | "nps_low"
  | "appointment_no_show"
  | "inactivity";

interface AutomationAction {
  type:
    | "send_whatsapp"
    | "send_email"
    | "send_nps"
    | "create_task"
    | "update_stage"
    | "add_tag"
    | "wait"
    | "webhook";
  config: Record<string, unknown>;
  delay_seconds?: number;
}

interface RuleRow {
  id: string;
  organization_id: string | null;
  nome: string;
  ativo: boolean;
  gatilho_tipo: CrmTriggerType;
  gatilho_config: Record<string, unknown>;
  condicoes: Array<{ field: string; operator: string; value: unknown }>;
  acoes: AutomationAction[];
  prioridade: number;
  cooldown_minutes: number;
}

interface TriggerContext {
  contactId: string | null;
  payload: Record<string, unknown>;
}

/**
 * Avalia uma condição contra o payload do trigger.
 */
function evaluateCondition(
  cond: { field: string; operator: string; value: unknown },
  ctx: TriggerContext,
): boolean {
  const path = cond.field.split(".");
  let cur: unknown = ctx.payload;
  for (const key of path) {
    if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[key];
    else return false;
  }
  switch (cond.operator) {
    case "eq":
      return cur === cond.value;
    case "neq":
      return cur !== cond.value;
    case "in":
      return Array.isArray(cond.value) && (cond.value as unknown[]).includes(cur);
    case "contains":
      return typeof cur === "string" && cur.includes(String(cond.value));
    case "gt":
      return typeof cur === "number" && cur > Number(cond.value);
    case "lt":
      return typeof cur === "number" && cur < Number(cond.value);
    default:
      return false;
  }
}

/**
 * Match adicional do gatilho_config (ex.: {to:"avaliacao_agendada"} para
 * stage_changed só dispara quando payload.to === "avaliacao_agendada").
 */
function matchesGatilhoConfig(
  rule: RuleRow,
  ctx: TriggerContext,
): boolean {
  const cfg = rule.gatilho_config ?? {};
  for (const [k, v] of Object.entries(cfg)) {
    if ((ctx.payload as Record<string, unknown>)[k] !== v) return false;
  }
  return true;
}

/**
 * Verifica cooldown: não dispara mesma regra para mesmo contato dentro do
 * intervalo cooldown_minutes.
 */
async function inCooldown(
  pool: DbPool,
  ruleId: string,
  contactId: string | null,
  cooldownMinutes: number,
): Promise<boolean> {
  if (cooldownMinutes <= 0 || !contactId) return false;
  const res = await pool.query(
    `SELECT 1 FROM crm_automation_executions
      WHERE rule_id = $1 AND contact_id = $2
        AND created_at > NOW() - ($3 || ' minutes')::interval
      LIMIT 1`,
    [ruleId, contactId, String(cooldownMinutes)],
  );
  return res.rows.length > 0;
}

export async function processCrmTrigger(
  env: Env,
  pool: DbPool,
  organizationId: string,
  triggerType: CrmTriggerType,
  contactId: string | null,
  payload: Record<string, unknown>,
): Promise<{ scheduled: number }> {
  try {
    // Regras da própria org + templates globais (org IS NULL) ativos
    const rulesRes = await pool.query<RuleRow>(
      `SELECT * FROM crm_automation_rules
        WHERE ativo = true
          AND gatilho_tipo = $1
          AND (organization_id = $2 OR organization_id IS NULL)
        ORDER BY prioridade ASC`,
      [triggerType, organizationId],
    );

    if (!rulesRes.rows.length) return { scheduled: 0 };

    const ctx: TriggerContext = { contactId, payload };
    let scheduled = 0;

    for (const rule of rulesRes.rows) {
      if (!matchesGatilhoConfig(rule, ctx)) continue;
      const allConds = (rule.condicoes ?? []).every((c) => evaluateCondition(c, ctx));
      if (!allConds) continue;
      if (await inCooldown(pool, rule.id, contactId, rule.cooldown_minutes)) continue;

      // Cria execução(ões): uma por ação, com scheduled_for cumulativo
      let cumulativeDelay = 0;
      for (let i = 0; i < rule.acoes.length; i++) {
        const action = rule.acoes[i];
        cumulativeDelay += action.delay_seconds ?? 0;
        await pool.query(
          `INSERT INTO crm_automation_executions
             (organization_id, rule_id, contact_id, status, action_index,
              scheduled_for, payload)
           VALUES ($1,$2,$3,'pending',$4,
                   NOW() + ($5 || ' seconds')::interval, $6::jsonb)`,
          [
            organizationId,
            rule.id,
            contactId,
            i,
            String(cumulativeDelay),
            JSON.stringify({ trigger: triggerType, ...payload }),
          ],
        );
        scheduled++;
      }
    }
    return { scheduled };
  } catch (err) {
    console.error("[crm-automation-engine] processCrmTrigger:", err);
    return { scheduled: 0 };
  }
}

// =========================================================================
// Executor
// =========================================================================

function interpolate(tpl: string, vars: Record<string, unknown>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => {
    const v = vars[k];
    return v == null ? "" : String(v);
  });
}

async function loadContactVars(
  pool: DbPool,
  contactId: string,
): Promise<Record<string, unknown>> {
  const res = await pool.query(
    `SELECT id, nome, telefone, email FROM contacts WHERE id = $1`,
    [contactId],
  );
  return (res.rows[0] as Record<string, unknown>) ?? {};
}

async function executeAction(
  env: Env,
  pool: DbPool,
  organizationId: string,
  contactId: string | null,
  action: AutomationAction,
  ruleId: string,
): Promise<void> {
  const vars = contactId ? await loadContactVars(pool, contactId) : {};

  switch (action.type) {
    case "send_whatsapp": {
      if (!contactId) throw new Error("send_whatsapp sem contact_id");
      const phone = vars.telefone as string | undefined;
      if (!phone) throw new Error("contato sem telefone");
      const wa = new WhatsAppService(env);
      const body = interpolate(String(action.config.body ?? ""), vars);
      const result = await wa.sendTextMessage(phone, body);
      if ((result as { error?: unknown }).error) {
        throw new Error(`whatsapp: ${JSON.stringify(result)}`);
      }
      await logContactActivity(pool, {
        organizationId,
        contactId,
        tipo: "whatsapp",
        titulo: "WhatsApp enviado (automação)",
        descricao: body,
        refAutomationId: ruleId,
        payload: { auto: true },
      });
      break;
    }
    case "send_email": {
      // Stub: integrar com Resend/SES futuramente.
      console.warn("[crm-automation] send_email não implementado ainda");
      break;
    }
    case "send_nps": {
      // Cria nps_survey + envia WhatsApp com link público
      if (!contactId) throw new Error("send_nps sem contact_id");
      const surveyRes = await pool.query<{ token: string; id: string }>(
        `INSERT INTO nps_surveys (organization_id, contact_id, patient_id, channel, rule_id)
         SELECT $1, $2, c.primary_patient_id, $3, $4
           FROM contacts c WHERE c.id = $2
         RETURNING id, token`,
        [organizationId, contactId, "whatsapp", ruleId],
      );
      const survey = surveyRes.rows[0];
      if (!survey) throw new Error("falha ao criar NPS survey");

      const baseUrl = String(action.config.base_url ?? env.NPS_PUBLIC_BASE_URL ?? "https://fisioflow.pages.dev");
      const link = `${baseUrl.replace(/\/$/, "")}/nps/${survey.token}`;
      const phone = vars.telefone as string | undefined;
      if (!phone) throw new Error("contato sem telefone");

      const wa = new WhatsAppService(env);
      const body = interpolate(
        String(action.config.body ?? "Olá {{nome}}, sua opinião é importante! Responda em 30s: {{nps_link}}"),
        { ...vars, nps_link: link },
      );
      const result = await wa.sendTextMessage(phone, body);
      if ((result as { error?: unknown }).error) {
        throw new Error(`whatsapp(nps): ${JSON.stringify(result)}`);
      }
      await pool.query(
        `UPDATE nps_surveys SET message_sent = $1 WHERE id = $2`,
        [body, survey.id],
      );
      await logContactActivity(pool, {
        organizationId,
        contactId,
        tipo: "nps",
        titulo: "Pesquisa NPS enviada",
        descricao: body,
        refAutomationId: ruleId,
        payload: { survey_id: survey.id, token: survey.token },
      });
      break;
    }
    case "create_task": {
      const titulo = interpolate(
        String(action.config.titulo ?? "Tarefa automação"),
        vars,
      );
      await pool.query(
        `INSERT INTO crm_tarefas
           (organization_id, titulo, descricao, status, responsavel_id, due_date)
         VALUES ($1,$2,$3,'pendente',$4, NOW() + INTERVAL '1 day')`,
        [
          organizationId,
          titulo,
          String(action.config.descricao ?? ""),
          (action.config.responsavel_id as string) ?? null,
        ],
      );
      if (contactId) {
        await logContactActivity(pool, {
          organizationId,
          contactId,
          tipo: "task",
          titulo: `Tarefa criada: ${titulo}`,
          refAutomationId: ruleId,
        });
      }
      break;
    }
    case "update_stage": {
      const newStage = String(action.config.estagio ?? "");
      if (!contactId || !newStage) break;
      const leadRes = await pool.query(
        `SELECT id FROM leads WHERE contact_id = $1 LIMIT 1`,
        [contactId],
      );
      if (leadRes.rows[0]) {
        await pool.query(
          `UPDATE leads SET estagio = $1, updated_at = NOW() WHERE id = $2`,
          [newStage, leadRes.rows[0].id],
        );
      }
      break;
    }
    case "add_tag": {
      const tag = String(action.config.tag ?? "");
      if (!contactId || !tag) break;
      await pool.query(
        `UPDATE contacts SET tags = array_append(tags, $1), updated_at = NOW()
          WHERE id = $2 AND NOT ($1 = ANY(tags))`,
        [tag, contactId],
      );
      break;
    }
    case "wait": {
      // No-op no executor — o delay já foi aplicado em scheduled_for.
      break;
    }
    case "webhook": {
      const url = String(action.config.url ?? "");
      if (!url) break;
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId, vars }),
        });
      } catch (e) {
        throw new Error(`webhook: ${(e as Error).message}`);
      }
      break;
    }
    default:
      throw new Error(`tipo de ação desconhecido: ${(action as { type: string }).type}`);
  }
}

/**
 * Executa lote de execuções vencidas. Chamado pelo cron worker.
 * Limita a `batchSize` por invocação para não estourar timeout.
 */
export async function scanPendingExecutions(
  env: Env,
  pool: DbPool,
  batchSize = 50,
): Promise<{ executed: number; failed: number }> {
  const pending = await pool.query<{
    id: string;
    organization_id: string;
    rule_id: string;
    contact_id: string | null;
    action_index: number;
  }>(
    `SELECT id, organization_id, rule_id, contact_id, action_index
       FROM crm_automation_executions
      WHERE status = 'pending' AND scheduled_for <= NOW()
      ORDER BY scheduled_for ASC
      LIMIT $1`,
    [batchSize],
  );

  let executed = 0;
  let failed = 0;
  for (const exec of pending.rows) {
    await pool.query(
      `UPDATE crm_automation_executions SET status='running', started_at=NOW() WHERE id=$1`,
      [exec.id],
    );
    try {
      const ruleRes = await pool.query<{ acoes: AutomationAction[] }>(
        `SELECT acoes FROM crm_automation_rules WHERE id = $1`,
        [exec.rule_id],
      );
      const action = ruleRes.rows[0]?.acoes?.[exec.action_index];
      if (!action) throw new Error("ação não encontrada");
      await executeAction(env, pool, exec.organization_id, exec.contact_id, action, exec.rule_id);
      await pool.query(
        `UPDATE crm_automation_executions
            SET status='completed', completed_at=NOW()
          WHERE id=$1`,
        [exec.id],
      );
      executed++;
    } catch (err) {
      failed++;
      await pool.query(
        `UPDATE crm_automation_executions
            SET status='failed', completed_at=NOW(), error=$2
          WHERE id=$1`,
        [exec.id, (err as Error).message?.slice(0, 500) ?? "unknown"],
      );
    }
  }
  return { executed, failed };
}
