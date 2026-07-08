import { Env } from "./types/env";
import { createPool } from "./lib/db";
import { triggerInngestEvent } from "./lib/inngest-client";
import { sendAppointmentReminderEmail } from "./lib/email";
import { dispatchMorningBriefing } from "./lib/briefing/sendBriefing";
import type { WhatsAppQueuePayload } from "./queue";
import { cleanupRateLimits } from "./middleware/rateLimit";
import { runHealthMonitor } from "./lib/monitor";
import { scanPendingExecutions } from "./services/crm-automation-engine";
import { scoreContacts } from "./jobs/leadScoring";
import { notifyPatientAppointment } from "./lib/push";
import { RTMAlertsService } from "./services/rtm-alerts";
import { syncAutoRAGContent } from "./routes/aiSearch";
import { sendHepDailyReminders } from "./jobs/hepDailyReminder";
import { dispatchExerciseReminders } from "./lib/exerciseReminders";
import {
  backfillInstagramProfilesForOrganization,
  persistInstagramProfileSyncState,
} from "./lib/instagram-profile";

/**
 * Cloudflare Worker Cron Trigger Handler
 */
export async function handleScheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  const cron = event.cron;

  console.log(`[Cron] Executing job: ${cron} at ${new Date().toISOString()}`);

  try {
    switch (cron) {
      case "*/5 * * * *": // A cada 5 minutos — Health monitor leve, sem acordar Neon
        await runHealthMonitor(env);
        break;

      case "0 6 * * *": {
        // 03:00 BRT — Lead scoring batch
        try {
          const pool = createPool(env);
          const out = await scoreContacts(env, pool, { batchSize: 50 });
          console.log(`[Cron] Lead scoring: scored=${out.scored} failed=${out.failed}`);
        } catch (err) {
          console.warn("[Cron] Lead scoring failed:", err);
        }
        break;
      }

      case "*/15 * * * *": {
        // A cada 15 minutos — CRM automations scan (executa ações agendadas)
        try {
          const pool = createPool(env);
          const out = await scanPendingExecutions(env, pool, 50);
          if (out.executed || out.failed) {
            console.log(`[Cron] CRM automations: executed=${out.executed} failed=${out.failed}`);
          }
        } catch (err) {
          console.warn("[Cron] CRM scan failed:", err);
        }
        // Lembretes de sessão configuráveis (regra 5h + exceções por horário)
        try {
          const pool = createPool(env);
          await dispatchScheduledReminders(pool, env);
        } catch (err) {
          console.warn("[Cron] Scheduled reminders failed:", err);
        }
        // SLA de leads + auto-reply do Concierge no Instagram (movidos do tick */5
        // para não acordar o Neon a cada 5 min — scale-to-zero).
        try {
          const pool = createPool(env);
          await dispatchLeadSlaEscalations(pool, env);
        } catch (err) {
          console.warn("[Cron] Lead SLA escalation failed:", err);
        }
        try {
          const pool = createPool(env);
          await dispatchInstagramConcierge(pool, env);
        } catch (err) {
          console.warn("[Cron] Instagram concierge failed:", err);
        }
        try {
          const pool = createPool(env);
          await dispatchInstagramProfileBackfill(pool, env, 25);
        } catch (err) {
          console.warn("[Cron] Instagram profile backfill failed:", err);
        }
        break;
      }

      case "0 9 * * *": {
        // UTC 09h = BRT 06h — Lembretes + prewarm pós cold-start
        const pool = createPool(env);
        await prewarmDatabase(pool);
        await sendAppointmentReminders(pool, env, ctx);
        await send48hConfirmationRequests(pool, env);
        await processBirthdays(pool, env, ctx);
        await processInactivePatients(pool, env, ctx);
        await processRecallCampaigns(pool, env, ctx);
        try {
          await dispatchSessionDropoutReengagement(pool, env, ctx);
        } catch (e) {
          console.warn("[Cron] Session-3 dropout failed:", e);
        }
        try {
          const out = await dispatchExerciseReminders(pool, env);
          if (out.sent) console.log(`[Cron] Exercise reminders sent=${out.sent}`);
        } catch (e) {
          console.warn("[Cron] Exercise reminders failed:", e);
        }
        try {
          const sent = await dispatchMorningBriefing(env);
          if (sent) console.log("[Cron] Morning briefing dispatched");
        } catch (e) {
          console.error("[Cron] Morning briefing failed", e);
        }
        break;
      }

      case "0 11 * * *": {
        // UTC 11h = BRT 08h — Manutenção + lembrete same-day não confirmados
        const pool = createPool(env);
        await performDatabaseCleanup(pool, env);
        await sendSameDayUnconfirmedReminders(pool, env);
        if (env.EDGE_CACHE) {
          const deleted = await cleanupRateLimits(env.EDGE_CACHE);
          console.log(`[Cron] D1 rate_limits cleanup: ${deleted} rows deleted.`);
        }
        break;
      }

      case "0 12 * * *": {
        // UTC 12h = BRT 09h — Automações por vencimento de tarefa
        const pool = createPool(env);
        await processDueDateAutomations(pool);
        break;
      }

      case "0 10 * * *":
        // UTC 10h = BRT 07h — Segundo prewarm logo antes do horário comercial
        {
          const pool = createPool(env);
          await prewarmDatabase(pool);
        }
        console.log("[Cron] WikiSync delegated to scheduled workflow");
        break;

      case "10 10 * * 1":
        // DELEGADO: KnowledgeSyncWorkflow agora usa schedules no wrangler.toml
        // AutoRAG sync mantido separado - requer credenciais API
        if (env.CF_API_TOKEN && env.CF_ACCOUNT_ID) {
          try {
            const indexed = await syncAutoRAGContent(env);
            console.log("[Cron] AutoRAG sync complete:", JSON.stringify(indexed));
          } catch (err) {
            console.error("[Cron] AutoRAG sync failed:", err);
          }
        }
        break;

      case "30 10 * * *":
        // ClinicAgent briefings - mantido como RPC pois é DO, não Workflow
        if (env.CLINIC_AGENT) {
          const pool = createPool(env);
          const orgs = await pool.query("SELECT id FROM organizations WHERE is_active = true");
          for (const org of orgs.rows) {
            const stub = env.CLINIC_AGENT.get(env.CLINIC_AGENT.idFromName(org.id));
            await (stub as any).setOrgId({ orgId: org.id }).catch(() => {});
            await (stub as any)
              .runMorningBriefing()
              .catch((err: unknown) =>
                console.error(`[Cron] ClinicAgent briefing failed for org ${org.id}:`, err),
              );
          }
        }
        break;

      case "30 21 * * *":
        // ClinicAgent daily summary - mantido como RPC pois é DO, não Workflow
        if (env.CLINIC_AGENT) {
          const pool = createPool(env);
          const orgs = await pool.query("SELECT id FROM organizations WHERE is_active = true");
          for (const org of orgs.rows) {
            const stub = env.CLINIC_AGENT.get(env.CLINIC_AGENT.idFromName(org.id));
            await (stub as any)
              .runDailySummary()
              .catch((err: unknown) =>
                console.error(`[Cron] ClinicAgent summary failed for org ${org.id}:`, err),
              );
          }
        }
        break;

      case "0 12 * * 1":
        // ClinicAgent missing patients alert - mantido como RPC
        if (env.CLINIC_AGENT) {
          const pool = createPool(env);
          const orgs = await pool.query("SELECT id FROM organizations WHERE is_active = true");
          for (const org of orgs.rows) {
            const stub = env.CLINIC_AGENT.get(env.CLINIC_AGENT.idFromName(org.id));
            await (stub as any)
              .checkMissingPatients()
              .catch((err: unknown) =>
                console.error(`[Cron] ClinicAgent missing patients failed for org ${org.id}:`, err),
              );
          }
        }
        break;

      case "0 14 * * *": {
        // UTC 14h = BRT 11h — NPS auto-trigger (Orgs & Patients)
        const pool = createPool(env);
        await triggerNpsSurveys(pool, env);
        await triggerPatientNpsSurveys(pool, env);
        break;
      }

      case "0 13 * * *": {
        // UTC 13h = BRT 10h — Anti-Churn (Reativação e Pacotes)
        // Placeholder: anti-churn automations (patient reactivation) are handled by Workflows
        console.log("[Cron] Anti-churn automations — delegated to WORKFLOW_REENGAGEMENT");
        break;
      }

      case "0 15 * * *": {
        // UTC 15h = BRT 12h — RTM Clinical Alerts
        const pool = createPool(env);

        // 1. Process Clinical Proactive Alerts for ALL organizations
        console.log("[Cron] Processing RTM Clinical Alerts for all orgs...");
        const orgs = await pool.query("SELECT id FROM organizations WHERE is_active = true");
        for (const org of orgs.rows) {
          const clinicalAlerts = await RTMAlertsService.processDailyAlerts(env, org.id);
          if (clinicalAlerts > 0) {
            console.log(
              `[Cron] RTM Clinical Alerts: triggered ${clinicalAlerts} alerts for org ${org.id}.`,
            );
          }
        }

        // 2. Original wearable analysis
        await processWearableRTMAlerts(pool, env);
        break;
      }

      case "0 3 1 * *": {
        // UTC 03h dia 1 do mes — S6.2 Pipeline R2 archive: envia sessions >90d
        // ao Pipeline (sink Iceberg fisioflow_archive.sessions_archive).
        const { runSessionArchive } = await import("./lib/sessionArchive");
        const result = await runSessionArchive(env, "cron");
        console.log(
          `[Cron] sessionArchive run=${result.runId} status=${result.status} eligible=${result.rowsEligible} sent=${result.rowsSent} marked=${result.rowsMarked}`,
        );
        if (result.errorMessage) console.error("[Cron] sessionArchive error:", result.errorMessage);
        break;
      }

      case "0 9 1,15 * *": {
        // UTC 09h dia 1 e 15 — S8 SLO biweekly report.
        const { runSloBiweeklyReport } = await import("./lib/sloReport");
        const result = await runSloBiweeklyReport(env);
        console.log(
          `[Cron] sloBiweekly requests=${result.requests} uptimePct=${result.uptimePct} p95=${result.p95_ms} adminsNotified=${result.adminsNotified}`,
        );
        if (result.error) console.error("[Cron] sloBiweekly error:", result.error);
        try {
          const pool = createPool(env);
          await refreshInstagramTokens(pool, env);
        } catch (e) {
          console.warn("[Cron] IG token refresh failed:", e);
        }
        break;
      }

      case "15 * * * *": {
        // A cada hora aos 15min — S9 T5 SLO health check (alerta se uptime <99.5% ou p95 >2s).
        const { checkSloHealth } = await import("./lib/sloReport");
        const result = await checkSloHealth(env);
        if (result.triggered) {
          console.warn(
            `[Cron] sloHealth ALERT uptime=${result.uptimePct} p95=${result.p95_ms} reason=${result.reason} notified=${result.adminsNotified}`,
          );
        }
        if (result.error) console.error("[Cron] sloHealth error:", result.error);

        // Campanhas de WhatsApp agendadas cuja hora chegou.
        try {
          const pool = createPool(env);
          const due = await pool.query(
            `SELECT id FROM crm_campanhas
              WHERE status = 'agendada' AND agendada_em IS NOT NULL AND agendada_em <= now()
              LIMIT 20`,
          );
          if (due.rows.length) {
            const { processCampaignSend } = await import("./lib/campaignSender");
            for (const row of due.rows) {
              await pool.query(
                `UPDATE crm_campanhas SET status = 'enviando', updated_at = now() WHERE id = $1`,
                [row.id],
              );
              const out = await processCampaignSend(pool, env, String(row.id));
              console.log(`[Cron] campanha ${row.id}: sent=${out.sent} failed=${out.failed}`);
            }
          }
        } catch (err) {
          console.error("[Cron] scheduled campaigns failed:", err);
        }
        break;
      }

      case "0 21 * * *": {
        // UTC 21h = BRT 18h — S11 HEP daily reminder push aos pacientes do app
        try {
          const pool = createPool(env);
          const out = await sendHepDailyReminders(env, pool);
          console.log(
            `[Cron] HEP reminder: candidates=${out.candidates} pushed=${out.pushed} failed=${out.failed}`,
          );
        } catch (err) {
          console.error("[Cron] HEP reminder failed:", err);
        }
        break;
      }

      default:
        console.warn(`[Cron] No handler defined for schedule: ${cron}`);
    }
  } catch (error) {
    console.error(`[Cron] Error executing job ${cron}:`, error);
  }
}

async function processBirthdays(db: any, env: Env, ctx: ExecutionContext) {
  console.log("[Cron] Checking for birthdays...");
  const result = await db.query(`
    SELECT id, full_name, phone
    FROM patients
    WHERE is_active = true
      AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM CURRENT_DATE)
  `);

  for (const row of result.rows) {
    await triggerInngestEvent(env, ctx, "patient.birthday", {
      patientId: row.id,
      name: row.full_name,
      phone: row.phone,
    });
  }
}

async function processInactivePatients(db: any, env: Env, ctx: ExecutionContext) {
  console.log("[Cron] Checking for inactive patients...");
  const result = await db.query(`
    SELECT p.id, p.full_name, p.phone, p.organization_id
    FROM patients p
    WHERE p.is_active = true
      AND p.organization_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.patient_id = p.id
          AND a.organization_id = p.organization_id
          AND a.date >= (CURRENT_DATE - INTERVAL '15 days')
      )
  `);

  for (const row of result.rows) {
    // 1. Inngest event (legacy/analytics)
    await triggerInngestEvent(env, ctx, "patient.inactive", {
      patientId: row.id,
      name: row.full_name,
      phone: row.phone,
    });

    // 2. Cloudflare Workflows (New Durable Automation)
    if (env.WORKFLOW_REENGAGEMENT) {
      await env.WORKFLOW_REENGAGEMENT.create({
        id: `reengage-${row.id}-${new Date().toISOString().slice(0, 10)}`,
        params: {
          patientId: row.id,
          patientName: row.full_name,
          patientPhone: row.phone,
          organizationId: row.organization_id,
          therapistName: "seu fisioterapeuta", // Could be dynamic if we join with last appointment therapist
          daysSinceLastAppointment: 15,
        },
      }).catch((err) => console.error(`[Cron] Workflow Reengagement failed for ${row.id}:`, err));
    }
  }
}

/**
 * #4 — Evasão da "sessão 3": paciente no meio do tratamento (2-5 sessões feitas) que
 * parou na janela crítica (7-21 dias) sem próxima sessão marcada. Cria tarefa de
 * reativação no CRM e dispara o workflow de reengajamento. Dedup: não recria se já
 * houver tarefa de reativação para o paciente nos últimos 30 dias.
 */
async function dispatchSessionDropoutReengagement(pool: any, env: Env, ctx: ExecutionContext) {
  const DONE = "('confirmed','completed','realizado','concluido','presenca_confirmada')";
  const res = await pool.query(`
    SELECT p.id, p.full_name, p.phone, p.organization_id,
           (SELECT count(*) FROM appointments a2
              WHERE a2.patient_id = p.id AND a2.organization_id = p.organization_id
                AND a2.status IN ${DONE}) AS done_count,
           (SELECT max(a3.date) FROM appointments a3
              WHERE a3.patient_id = p.id AND a3.organization_id = p.organization_id
                AND a3.status IN ${DONE}) AS last_done
    FROM patients p
    WHERE p.is_active = true AND p.organization_id IS NOT NULL AND p.phone IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM appointments af
        WHERE af.patient_id = p.id AND af.organization_id = p.organization_id
          AND af.date >= CURRENT_DATE
          AND af.status NOT IN ('cancelado','faltou','cancelled','no_show')
      )
  `);

  const today = Date.now();
  let flagged = 0;
  for (const row of res.rows) {
    try {
      const done = Number(row.done_count);
      if (done < 2 || done > 5) continue;
      if (!row.last_done) continue;
      const daysSince = (today - new Date(row.last_done).getTime()) / 86_400_000;
      if (daysSince < 7 || daysSince > 21) continue;

      // dedup: já existe tarefa de reativação recente?
      const dup = await pool.query(
        `SELECT 1 FROM tarefas
         WHERE organization_id = $1 AND linked_entity_id = $2
           AND titulo ILIKE 'Reativar pacote%' AND created_at > now() - interval '30 days' LIMIT 1`,
        [row.organization_id, row.id],
      );
      if (dup.rows.length > 0) continue;

      await pool.query(
        `INSERT INTO tarefas (organization_id, created_by, titulo, descricao, status, prioridade, tipo,
           order_index, tags, label_ids, checklists, attachments, task_references, dependencies,
           requires_acknowledgment, acknowledgments, linked_entity_type, linked_entity_id)
         VALUES ($1, 'system', $2, $3, 'A_FAZER', 'ALTA', 'TAREFA',
           0, '{}', '{}', '[]', '[]', '[]', '[]', false, '[]', 'patient', $4)`,
        [
          row.organization_id,
          `Reativar pacote — risco de evasão (sessão ${done}) — ${row.full_name}`,
          `Paciente fez ${done} sessões e parou há ${Math.round(daysSince)} dias, sem próxima sessão marcada (janela crítica de evasão). Entrar em contato para reagendar e dar continuidade ao tratamento.`,
          row.id,
        ],
      );

      if (env.WORKFLOW_REENGAGEMENT) {
        await env.WORKFLOW_REENGAGEMENT.create({
          id: `dropout-${row.id}-${new Date().toISOString().slice(0, 10)}`,
          params: {
            patientId: row.id,
            patientName: row.full_name,
            patientPhone: row.phone,
            organizationId: row.organization_id,
            therapistName: "seu fisioterapeuta",
            daysSinceLastAppointment: Math.round(daysSince),
          },
        }).catch(() => {});
      }
      flagged++;
    } catch (e) {
      console.warn("[SessionDropout] row failed:", e);
    }
  }
  void ctx;
  if (flagged) console.log(`[Cron] Session-3 dropout reactivations=${flagged}`);
}

/**
 * Auto-reply do Concierge no Instagram (modo com atraso).
 * Roda a cada 5 min: se uma DM do Instagram fica sem resposta humana por mais que
 * `instagramReplyDelayMinutes`, a IA responde automaticamente via Instagram Direct.
 * Dedup natural: só responde se NÃO houver nenhuma saída na conversa nas últimas 24h
 * (se um humano respondeu, há saída → pula).
 */
/**
 * Renova os tokens de longa duração do Instagram (validade ~60 dias). Cada chamada a
 * `refresh_access_token` reinicia a validade para 60 dias a partir de agora, então rodar
 * periodicamente garante que o token nunca expire. Grava o token renovado em
 * organizations.settings.instagram_access_token (preferido pelo caminho de envio sobre o env).
 */
async function refreshInstagramTokens(pool: any, env: Env) {
  const res = await pool.query(`
    SELECT id,
           settings->>'instagram_access_token' AS ig_token,
           settings->>'instagram_business_account_id' AS ig_account_id
    FROM organizations
    WHERE settings->>'instagram_business_account_id' IS NOT NULL
  `);
  for (const row of res.rows) {
    const current = row.ig_token || env.IG_ACCESS_TOKEN;
    if (!current) continue;
    try {
      const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(current)}`;
      const r = await fetch(url);
      const data = (await r.json()) as { access_token?: string; expires_in?: number; error?: unknown };
      if (!data.access_token) {
        console.warn(`[IG Refresh] org=${row.id} sem access_token:`, JSON.stringify(data.error ?? data));
        continue;
      }
      const expiresAt = new Date(Date.now() + (data.expires_in ?? 5_184_000) * 1000).toISOString();
      await pool.query(
        `UPDATE organizations
         SET settings = jsonb_set(
               jsonb_set(COALESCE(settings, '{}'::jsonb), '{instagram_access_token}', to_jsonb($2::text)),
               '{instagram_token_expires}', to_jsonb($3::text))
         WHERE id = $1`,
        [row.id, data.access_token, expiresAt],
      );
      console.log(`[IG Refresh] org=${row.id} token renovado, expira ${expiresAt}`);
    } catch (e) {
      console.warn(`[IG Refresh] org=${row.id} falhou:`, e);
    }
  }
}

export async function dispatchInstagramConcierge(pool: any, env: Env) {
  const {
    AIConciergeService,
    buildConciergeHistory,
    conciergeIdentity,
    conciergeHandoffMessage,
    createConciergeBookingTask,
    createConciergeHandoffTask,
    humanOwnsConversation,
    shouldSkipGreeting,
    stripGreetingIntro,
    wantsHumanAgent,
  } = await import("./services/ai-concierge");
  const { addMessage } = await import("./lib/whatsapp-conversations");
  const { sendInstagramText } = await import("./routes/instagram-webhook");
  const { needsHumanApproval } = await import("./lib/whatsappApproval");

  const res = await pool.query(`
    SELECT c.id, c.organization_id, c.contact_id, c.status AS conv_status, wc.wa_id AS igsid,
           lm.created_at AS last_at, lm.content::text AS last_content,
           lm.message_type AS last_message_type, lm.media_url AS last_media_url,
           o.settings->'crm_whatsapp'->'concierge' AS concierge,
           o.settings->>'instagram_business_account_id' AS ig_account_id,
           o.settings->>'instagram_access_token' AS ig_token,
           GREATEST(
             (SELECT max(mo.created_at) FROM wa_messages mo
                WHERE mo.conversation_id = c.id AND mo.direction = 'outbound'
                  AND mo.sender_type = 'agent'),
             (c.metadata->>'concierge_handoff_at')::timestamptz
           ) AS last_agent_at
    FROM wa_conversations c
    JOIN whatsapp_contacts wc ON wc.id = c.contact_id
    JOIN organizations o ON o.id = c.organization_id
    JOIN LATERAL (
      SELECT direction, created_at, content, message_type, media_url FROM wa_messages m
      WHERE m.conversation_id = c.id AND m.direction <> 'internal'
      ORDER BY created_at DESC LIMIT 1
    ) lm ON true
    WHERE c.channel = 'instagram' AND c.status IN ('open', 'pending')
      AND lm.direction = 'inbound'
      AND lm.created_at > now() - interval '24 hours'
  `);

  const now = Date.now();
  let sent = 0;
  for (const row of res.rows) {
    try {
      const cfg = (typeof row.concierge === "string" ? JSON.parse(row.concierge) : row.concierge) ?? {};
      if (cfg.instagramAutoReply !== true) continue;
      // Takeover unificado com WhatsApp/webchat: se um humano (sender_type='agent')
      // assumiu a conversa, o bot fica em silêncio conforme humanReplyPauseHours
      // (default 0 = até resolver/fechar; a query já filtra open/pending).
      if (humanOwnsConversation(row.last_agent_at, row.conv_status, cfg)) continue;
      if (!row.ig_account_id || !(row.ig_token || env.IG_ACCESS_TOKEN)) continue;

      const delayMin = typeof cfg.instagramReplyDelayMinutes === "number" ? cfg.instagramReplyDelayMinutes : 3;
      const ageMin = (now - new Date(row.last_at).getTime()) / 60000;
      if (ageMin < delayMin) continue;

      const lastMessageType = typeof row.last_message_type === "string" ? row.last_message_type : "";
      if (lastMessageType === "story_mention" || lastMessageType === "image") continue;
      if (row.last_media_url) continue;

      const text = (() => {
        const c = row.last_content;
        if (typeof c !== "string") return "";
        const t = c.trim();
        return t.startsWith('"') && t.endsWith('"') ? JSON.parse(t) : t;
      })();
      if (!text || text.length < 2) continue;

      // Handoff determinístico (antes do LLM): o lead pediu falar com um humano.
      if (wantsHumanAgent(text)) {
        const bridge = conciergeHandoffMessage(cfg);
        const r = (await sendInstagramText(
          env,
          String(row.ig_account_id),
          row.igsid,
          bridge,
          row.ig_token || undefined,
        )) as any;
        if (r?.message_id) {
          await addMessage(
            pool,
            row.id,
            row.organization_id,
            row.contact_id,
            "outbound",
            "system",
            "ai_concierge",
            "text",
            bridge,
            r.message_id,
          ).catch(() => {});
        }
        await pool.query(
          `UPDATE wa_conversations
             SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{concierge_handoff_at}', to_jsonb(now()::text)),
                 status = 'pending', updated_at = now()
           WHERE id = $1`,
          [row.id],
        );
        await createConciergeHandoffTask(pool, row.organization_id, row.id, text);
        sent++;
        continue;
      }

      // Histórico recente p/ contexto multi-turno e p/ não repetir a apresentação.
      let history: ReturnType<typeof buildConciergeHistory> = [];
      try {
        const histRes = await pool.query(
          `SELECT direction, content FROM wa_messages
             WHERE conversation_id = $1 AND message_type = 'text'
               AND direction IN ('inbound', 'outbound')
             ORDER BY created_at DESC LIMIT 10`,
          [row.id],
        );
        history = buildConciergeHistory([...histRes.rows].reverse());
        // A última mensagem é a inbound sendo respondida — passada à parte.
        const last = history[history.length - 1];
        if (last && last.role === "user" && last.content === text) history.pop();
      } catch (histErr) {
        console.warn("[IG Concierge] history load failed:", histErr);
      }

      const concierge = await AIConciergeService.processMessage(env, row.organization_id, text, history);
      // Só responde o que está coberto pelas informações oficiais; nunca inventa.
      if (!concierge.answerable || !concierge.reply) continue;
      // Urgências/sensíveis não são auto-respondidas — ficam para o humano.
      if (needsHumanApproval(concierge.intent, text)) continue;

      // Não repete a apresentação se já saudamos nesta conversa.
      const signature = conciergeIdentity(cfg).signature;
      const reply = shouldSkipGreeting(concierge.reply, history, signature)
        ? stripGreetingIntro(concierge.reply, signature)
        : concierge.reply;
      if (!reply || reply.length < 2) continue;

      const r = (await sendInstagramText(env, String(row.ig_account_id), row.igsid, reply, row.ig_token || undefined)) as any;
      if (r?.message_id) {
        await import("./lib/whatsapp-conversations").then(({ addMessage }) =>
          addMessage(
            pool,
            row.id,
            row.organization_id,
            row.contact_id,
            "outbound",
            "system",
            "ai_concierge",
            "text",
            reply,
            r.message_id,
          ).catch(() => {}),
        );
        // Lead confirmou horário → tarefa p/ a equipe efetivar a reserva.
        if (concierge.bookingRequest) {
          await createConciergeBookingTask(
            pool,
            row.organization_id,
            row.id,
            concierge.bookingRequest.slotLabel,
            text,
          );
        }
        sent++;
      }
    } catch (e) {
      console.warn("[IG Concierge] row failed:", e);
    }
  }
  if (sent) console.log(`[Cron] Instagram concierge replies=${sent}`);
}

async function dispatchInstagramProfileBackfill(pool: any, env: Env, batchLimit = 25) {
  const orgs = await pool.query(`
    SELECT id, settings->>'instagram_access_token' AS ig_token
    FROM organizations
    WHERE is_active = true
      AND (
        settings->>'instagram_business_account_id' IS NOT NULL
        OR settings->>'instagram_access_token' IS NOT NULL
      )
      AND EXISTS (
        SELECT 1
        FROM whatsapp_contacts wc
        JOIN wa_conversations c ON c.contact_id = wc.id
        WHERE wc.organization_id = organizations.id
          AND c.organization_id = organizations.id
          AND c.channel = 'instagram'
          AND wc.wa_id IS NOT NULL
          AND (
            wc.username IS NULL
            OR wc.display_name IS NULL
            OR wc.avatar_url IS NULL
          )
      )
    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    LIMIT 10
  `);

  for (const org of orgs.rows) {
    const igToken = String(org.ig_token || env.IG_ACCESS_TOKEN || "");
    if (!igToken) continue;

    try {
      const result = await backfillInstagramProfilesForOrganization(pool, String(org.id), igToken, {
        limit: batchLimit,
        force: false,
        env,
      });
      let pendingCount = 0;
      try {
        const pendingRes = await pool.query(
          `SELECT COUNT(DISTINCT wc.id)::int AS pending
           FROM whatsapp_contacts wc
           JOIN wa_conversations c ON c.contact_id = wc.id
           WHERE wc.organization_id = $1
             AND c.organization_id = $1
             AND c.channel = 'instagram'
             AND wc.wa_id IS NOT NULL
             AND (
               wc.username IS NULL
               OR wc.display_name IS NULL
               OR wc.avatar_url IS NULL
             )`,
          [org.id],
        );
        pendingCount = Number(pendingRes.rows[0]?.pending ?? 0);
      } catch (pendingErr) {
        console.error(`[Cron] Instagram profile backfill org=${org.id} pending count query falhou:`, pendingErr);
      }
      await persistInstagramProfileSyncState(
        pool,
        String(org.id),
        result,
        pendingCount,
      );

      if (result.scanned > 0) {
        console.log(
          `[Cron] Instagram profile backfill org=${org.id} scanned=${result.scanned} updated=${result.updated} skipped=${result.skipped} failed=${result.failed}`,
        );
      }
    } catch (orgErr) {
      // InstagramApiError (auth/rate-limit) ou outro erro — log e continua para próxima org
      console.error(`[Cron] Instagram profile backfill org=${org.id} falhou:`, orgErr instanceof Error ? orgErr.message : orgErr);
    }
  }
}

/**
 * #1 Speed-to-lead — alerta a equipe quando um lead aguarda resposta humana há mais
 * que o SLA configurado (organizations.settings.crm_whatsapp.concierge.slaMinutes).
 * Dedup por metadata.sla_escalated = timestamp do último inbound já escalado.
 */
async function dispatchLeadSlaEscalations(pool: any, env: Env) {
  const { notifyOrganization } = await import("./lib/push");
  const res = await pool.query(`
    SELECT c.id, c.organization_id, c.channel, c.metadata,
           lm.created_at AS last_at,
           wc.display_name, wc.wa_id,
           o.settings->'crm_whatsapp'->'concierge' AS concierge
    FROM wa_conversations c
    JOIN whatsapp_contacts wc ON wc.id = c.contact_id
    JOIN organizations o ON o.id = c.organization_id
    JOIN LATERAL (
      SELECT direction, created_at FROM wa_messages m
      WHERE m.conversation_id = c.id AND m.direction <> 'internal'
      ORDER BY created_at DESC LIMIT 1
    ) lm ON true
    WHERE c.status IN ('open', 'pending', 'assigned')
      AND lm.direction = 'inbound'
      AND lm.created_at > now() - interval '24 hours'
      AND c.patient_id IS NULL
  `);

  const now = Date.now();
  let escalated = 0;
  for (const row of res.rows) {
    try {
      const cfg = (typeof row.concierge === "string" ? JSON.parse(row.concierge) : row.concierge) ?? {};
      const slaEnabled = cfg.slaEnabled !== false;
      const defaultSlaMinutes = row.channel === "webchat" ? 2 : 10;
      const channelSlaMinutes =
        row.channel === "webchat" && typeof cfg.webchatSlaMinutes === "number"
          ? cfg.webchatSlaMinutes
          : null;
      const slaMinutes =
        channelSlaMinutes ?? (typeof cfg.slaMinutes === "number" ? cfg.slaMinutes : defaultSlaMinutes);
      if (!slaEnabled) continue;

      const lastIso = new Date(row.last_at).toISOString();
      const ageMin = (now - new Date(row.last_at).getTime()) / 60000;
      if (ageMin < slaMinutes) continue;

      const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
      if (meta.sla_escalated === lastIso) continue; // já escalado para este inbound

      await notifyOrganization(env, pool, row.organization_id, {
        title: "⏱️ Lead aguardando resposta",
        body: `${row.display_name || row.wa_id} está há ${Math.round(ageMin)} min sem resposta.`,
      }).catch(() => {});

      await pool.query(
        `UPDATE wa_conversations
         SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sla_escalated', $2::text)
         WHERE id = $1`,
        [row.id, lastIso],
      );
      escalated++;
    } catch (e) {
      console.warn("[SLA] row failed:", e);
    }
  }
  if (escalated) console.log(`[Cron] Lead SLA escalations=${escalated}`);
}

/**
 * Lembretes de sessão configuráveis por organização.
 * Roda a cada 15 min; calcula o instante de envio por agendamento
 * (regra das 5h + exceções por faixa de horário) e dispara quando a janela bate.
 * Dedup atômico via tabela appointment_reminder_log.
 */
async function dispatchScheduledReminders(pool: any, env: Env) {
  const { resolveReminderConfig, computeReminderSendAt } = await import("./lib/reminderScheduling");
  const { WhatsAppService } = await import("./lib/whatsapp");

  const res = await pool.query(`
    SELECT a.id, a.organization_id, a.patient_id,
           to_char(a.date, 'YYYY-MM-DD') AS date_str,
           substr(a.start_time::text, 1, 5) AS time_str,
           p.full_name AS patient_name, p.phone AS patient_phone,
           prof.full_name AS therapist_name,
           o.settings->'crm_whatsapp'->'reminders' AS rcfg
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    LEFT JOIN profiles prof ON prof.user_id = a.therapist_id::uuid
    JOIN organizations o ON o.id = a.organization_id
    WHERE a.date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day'
      AND a.status NOT IN ('cancelado', 'faltou', 'cancelled', 'no_show', 'completed', 'concluido')
      AND p.phone IS NOT NULL
  `);

  const now = Date.now();
  const WINDOW_MS = 20 * 60 * 1000; // tolera atraso/jitter do cron (15min)
  let sent = 0;

  for (const row of res.rows) {
    try {
      const cfg = resolveReminderConfig(row.rcfg);
      if (!cfg.enabled || !row.time_str) continue;

      const sendAt = computeReminderSendAt(row.date_str, row.time_str, cfg).getTime();
      if (!(sendAt <= now && sendAt > now - WINDOW_MS)) continue;

      // Dedup atômico: só envia se a linha foi inserida agora.
      const dedup = await pool.query(
        `INSERT INTO appointment_reminder_log (appointment_id, kind)
         VALUES ($1::uuid, 'session')
         ON CONFLICT (appointment_id, kind) DO NOTHING RETURNING 1`,
        [row.id],
      );
      if (dedup.rows.length === 0) continue;

      const timeStr = row.time_str as string;
      const therapistStr = row.therapist_name || "Fisioterapeuta";
      const firstName = (row.patient_name || "paciente").split(" ")[0];

      if (env.BACKGROUND_QUEUE) {
        // #3 — com botões (Confirmar/Remarcar) se configurado e template aprovado; senão o simples.
        const payload = cfg.useButtons
          ? {
              templateName: "lembrete_consulta_botoes",
              bodyParameters: [
                { type: "text", text: firstName },
                { type: "text", text: timeStr },
                { type: "text", text: therapistStr },
              ],
            }
          : {
              templateName: "lembrete_sessao",
              bodyParameters: [
                { type: "text", text: timeStr },
                { type: "text", text: therapistStr },
              ],
            };
        await env.BACKGROUND_QUEUE.send({
          type: "SEND_WHATSAPP",
          payload: {
            to: row.patient_phone,
            languageCode: "pt_BR",
            ...payload,
            organizationId: row.organization_id,
            patientId: row.patient_id,
            messageText: `Lembrete: sua sessão é às ${timeStr} com ${therapistStr}.`,
            appointmentId: row.id,
          },
        });
      }

      // Endereço apenas na primeira sessão/avaliação (best-effort via texto).
      if (cfg.sendAddressOnlyFirstVisit && cfg.addressText.trim()) {
        const prior = await pool.query(
          `SELECT 1 FROM appointments
           WHERE patient_id = $1 AND organization_id = $2
             AND status NOT IN ('cancelado', 'faltou', 'cancelled', 'no_show')
             AND (date < $3::date OR (date = $3::date AND substr(start_time::text, 1, 5) < $4))
           LIMIT 1`,
          [row.patient_id, row.organization_id, row.date_str, timeStr],
        );
        if (prior.rows.length === 0) {
          try {
            await new WhatsAppService(env).sendTextMessage(
              row.patient_phone,
              `📍 Endereço da clínica:\n${cfg.addressText.trim()}`,
            );
          } catch (e) {
            console.warn("[Reminder] address send failed:", e);
          }
        }
      }
      sent++;
    } catch (e) {
      console.warn("[Reminder] row failed:", e);
    }
  }
  if (sent) console.log(`[Cron] Scheduled reminders sent=${sent}`);
}

async function sendAppointmentReminders(pool: any, env: Env, _ctx: ExecutionContext) {
  console.log("[Cron] Sending appointment reminders (Email & WhatsApp)...");
  const result = await pool.query(`
    SELECT
      a.id,
      a.organization_id,
      a.patient_id,
      a.start_time::text AS time,
      TO_CHAR(a.date, 'DD/MM/YYYY') AS formatted_date,
      p.full_name AS patient_name,
      p.email AS patient_email,
      p.phone AS patient_phone,
      prof.full_name AS therapist_name
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    LEFT JOIN profiles prof ON prof.user_id = a.therapist_id::uuid
    WHERE a.date = CURRENT_DATE + INTERVAL '1 day'
      AND a.status NOT IN ('cancelado', 'faltou')
  `);

  let emailSent = 0;
  let whatsappSent = 0;

  for (const row of result.rows) {
    // 1. Email Reminder
    if (row.patient_email) {
      try {
        await sendAppointmentReminderEmail(env, row.patient_email, {
          patientName: row.patient_name,
          date: row.formatted_date,
          time: row.time?.substring(0, 5) ?? "",
          therapistName: row.therapist_name,
        });
        emailSent++;
      } catch (err) {
        console.error(`[Cron] Failed to send email to ${row.patient_email}:`, err);
      }
    }

    // 2. WhatsApp Reminder — enqueue for async processing with automatic retry.
    //    Compartilha o dedup com dispatchScheduledReminders (kind='session') para
    //    nunca enviar o lembrete de WhatsApp duas vezes para o mesmo agendamento.
    if (row.patient_phone && env.BACKGROUND_QUEUE) {
      try {
        const dedup = await pool.query(
          `INSERT INTO appointment_reminder_log (appointment_id, kind)
           VALUES ($1::uuid, 'session')
           ON CONFLICT (appointment_id, kind) DO NOTHING RETURNING 1`,
          [row.id],
        );
        if (dedup.rows.length > 0) {
          const timeStr = row.time?.substring(0, 5) ?? "";
          const therapistStr = row.therapist_name || "Fisioterapeuta";
          const queuePayload: WhatsAppQueuePayload = {
            to: row.patient_phone,
            templateName: "lembrete_sessao",
            languageCode: "pt_BR",
            bodyParameters: [
              { type: "text", text: timeStr },
              { type: "text", text: therapistStr },
            ],
            organizationId: row.organization_id,
            patientId: row.patient_id,
            messageText: `Lembrete automático: sua sessão será às ${timeStr} com ${therapistStr}.`,
            appointmentId: row.id,
          };
          await env.BACKGROUND_QUEUE.send({ type: "SEND_WHATSAPP", payload: queuePayload });
          whatsappSent++;
        }
      } catch (err) {
        console.error(`[Cron] Failed to enqueue WhatsApp for ${row.patient_phone}:`, err);
      }
    }
  }
  console.log(`[Cron] Sent ${emailSent} emails and ${whatsappSent} WhatsApp reminders.`);

  // 3. Push notification summary to each organization
  if (env.VAPID_PRIVATE_KEY && result.rows.length > 0) {
    const { sendPushToOrg } = await import("./lib/webpush");
    const orgGroups = new Map<string, typeof result.rows>();
    for (const row of result.rows) {
      const existing = orgGroups.get(row.organization_id) ?? [];
      existing.push(row);
      orgGroups.set(row.organization_id, existing);
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "short",
    });
    for (const [orgId, rows] of orgGroups) {
      const first = rows[0];
      await sendPushToOrg(
        orgId,
        {
          title: `Agenda de amanhã — ${rows.length} sessão${rows.length > 1 ? "ões" : ""}`,
          body: `${dateStr} · Primeiro: ${first.patient_name} às ${first.time?.substring(0, 5) ?? ""}`,
          url: "/agenda",
          tag: `reminder-summary-${tomorrow.toISOString().split("T")[0]}`,
        },
        env,
      ).catch(() => {});
    }
  }
}

async function performDatabaseCleanup(pool: any, _env: Env) {
  console.log("[Cron] Performing database maintenance...");

  try {
    // 1. Limpeza de Logs de Segurança (Manter apenas 90 dias)
    // Ações: LOGIN_SUCCESS, LOGIN_FAILURE
    const securityCleanup = await pool.query(`
      DELETE FROM audit_logs
      WHERE action IN ('LOGIN_SUCCESS', 'LOGIN_FAILURE')
        AND created_at < (CURRENT_DATE - INTERVAL '90 days')
    `);
    console.log(`[Cleanup] Deleted ${securityCleanup.rowCount} old security logs.`);

    // 2. Limpeza de Logs de Sistema (Opcional, manter 1 ano se não for clínico)
    // Aqui poderíamos limpar INSERT/UPDATE de tabelas menos críticas,
    // mas por segurança e legislação (20 anos para prontuários),
    // manteremos os logs de 'patients', 'evolutions' e 'appointments' intactos.

    // 3. Limpeza de tokens expirados (se houver tabela de sessions ou tokens)
    // await pool.query('DELETE FROM auth_tokens WHERE expires_at < NOW()');
  } catch (error) {
    console.error("[Cleanup] Error during database maintenance:", error);
  }
}

async function processDueDateAutomations(pool: any) {
  console.log("[Cron] Processing due_date_approaching automations...");
  try {
    // Find tasks vencendo em 1 ou 2 dias (janela: amanhã e depois de amanhã)
    const tasksRes = await pool.query(`
      SELECT t.id, t.titulo, t.board_id, t.column_id, t.organization_id,
             t.responsavel_id, t.created_by, t.status, t.label_ids, t.checklists, t.data_vencimento
      FROM tarefas t
      WHERE t.board_id IS NOT NULL
        AND t.status NOT IN ('CONCLUIDO', 'ARQUIVADO')
        AND t.data_vencimento::date IN (
          CURRENT_DATE + INTERVAL '1 day',
          CURRENT_DATE + INTERVAL '2 days'
        )
    `);

    if (tasksRes.rows.length === 0) return;

    // Group by board_id to fetch automations once per board
    const byBoard = new Map<string, typeof tasksRes.rows>();
    for (const task of tasksRes.rows) {
      const list = byBoard.get(task.board_id) ?? [];
      list.push(task);
      byBoard.set(task.board_id, list);
    }

    for (const [boardId, tasks] of byBoard) {
      const orgId = tasks[0].organization_id;
      const autoRes = await pool.query(
        `SELECT id, trigger, actions FROM board_automations
         WHERE board_id = $1 AND organization_id = $2 AND is_active = true
           AND (trigger->>'type') = 'due_date_approaching'`,
        [boardId, orgId],
      );
      if (!autoRes.rows.length) continue;

      for (const task of tasks) {
        const daysUntilDue = Math.ceil(
          (new Date(task.data_vencimento).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );

        for (const automation of autoRes.rows) {
          const triggerDays = automation.trigger?.days ?? 1;
          if (daysUntilDue !== triggerDays) continue;

          for (const action of automation.actions) {
            try {
              if (action.type === "send_notification") {
                const targetUserId = task.responsavel_id ?? task.created_by;
                if (!targetUserId) continue;
                await pool.query(
                  `INSERT INTO notifications (organization_id, user_id, type, title, message, link, metadata)
                   VALUES ($1,$2,'automation',$3,$4,$5,$6::jsonb)
                   ON CONFLICT DO NOTHING`,
                  [
                    orgId,
                    targetUserId,
                    action.message ?? "Tarefa vencendo em breve",
                    `"${task.titulo}" vence em ${daysUntilDue} dia(s).`,
                    `/boards/${boardId}`,
                    JSON.stringify({ task_id: task.id, automation_id: automation.id }),
                  ],
                );
              } else if (action.type === "assign_label" && action.label_id) {
                await pool.query(
                  `UPDATE tarefas SET label_ids = array_append(label_ids, $1::uuid), updated_at = NOW()
                   WHERE id = $2 AND NOT ($1::uuid = ANY(label_ids))`,
                  [action.label_id, task.id],
                );
              } else if (action.type === "change_status" && action.status) {
                await pool.query(
                  `UPDATE tarefas SET status = $1, updated_at = NOW() WHERE id = $2`,
                  [action.status, task.id],
                );
              }
            } catch (err) {
              console.error(
                `[Cron][Automation] action ${action.type} failed for task ${task.id}:`,
                err,
              );
            }
          }

          await pool
            .query(
              `UPDATE board_automations SET execution_count = execution_count + 1, last_executed_at = NOW() WHERE id = $1`,
              [automation.id],
            )
            .catch(() => null);
        }
      }
    }

    console.log(`[Cron] due_date_approaching: checked ${tasksRes.rows.length} tasks.`);
  } catch (error) {
    console.error("[Cron] processDueDateAutomations error:", error);
  }
}

async function triggerNpsSurveys(pool: any, env: Env) {
  console.log("[Cron] Triggering NPS surveys for 7-day orgs...");
  try {
    // Find organizations that became active ~7 days ago and haven't received NPS yet
    const result = await pool.query(`
      SELECT o.id AS org_id, o.name, u.id AS user_id, u.email, p.phone AS user_phone
      FROM organizations o
      JOIN user_profiles u ON u.organization_id = o.id AND u.role = 'admin'
      LEFT JOIN patients p ON p.id = u.patient_id
      WHERE o.created_at BETWEEN NOW() - INTERVAL '8 days' AND NOW() - INTERVAL '6 days'
        AND NOT EXISTS (
          SELECT 1 FROM satisfaction_surveys ss
          WHERE ss.organization_id = o.id
            AND ss.responded_at > NOW() - INTERVAL '30 days'
        )
      LIMIT 50
    `);

    for (const row of result.rows) {
      // Send WhatsApp NPS link if phone available
      if (row.user_phone && env.BACKGROUND_QUEUE) {
        const npsUrl = `${env.FRONTEND_URL ?? "https://moocafisio.com.br"}/surveys?nps=1&org=${row.org_id}`;
        const messageText = `Olá! 👋 Já faz uma semana que você está usando o FisioFlow. Como foi sua experiência até agora?\n\nResposta rápida (0-10): ${npsUrl}`;
        await env.BACKGROUND_QUEUE.send({
          type: "SEND_WHATSAPP",
          payload: {
            to: row.user_phone,
            templateName: "nps_survey",
            languageCode: "pt_BR",
            bodyParameters: [{ type: "text", text: messageText }],
            organizationId: row.org_id,
            patientId: row.user_id,
            messageText,
            appointmentId: "",
          },
        }).catch(() => {});
      }
    }

    console.log(`[Cron] NPS surveys triggered for ${result.rows.length} org(s).`);
  } catch (error) {
    console.warn("[Cron] NPS trigger failed (non-critical):", error);
  }
}

/**
 * Dispara pesquisas NPS para pacientes 7 dias após a sua primeira sessão.
 */
async function triggerPatientNpsSurveys(pool: any, env: Env) {
  console.log("[Cron] Triggering NPS surveys for patients (7-day post-first-session)...");
  try {
    const result = await pool.query(`
      WITH first_sessions AS (
        SELECT patient_id, MIN(date) as first_date
        FROM appointments
        WHERE status IN ('confirmed', 'completed', 'realizado', 'presenca_confirmada')
        GROUP BY patient_id
      )
      SELECT p.id as patient_id, p.full_name, p.phone, p.organization_id
      FROM patients p
      JOIN first_sessions fs ON fs.patient_id = p.id
      WHERE fs.first_date = CURRENT_DATE - INTERVAL '7 days'
        AND p.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM satisfaction_surveys ss
          WHERE ss.patient_id = p.id
            AND ss.responded_at > NOW() - INTERVAL '6 months'
        )
      LIMIT 100
    `);

    for (const row of result.rows) {
      if (row.phone && env.BACKGROUND_QUEUE) {
        const npsUrl = `${env.FRONTEND_URL ?? "https://moocafisio.com.br"}/satisfacao?p=${row.patient_id}`;
        const messageText = `Olá, ${row.full_name.split(" ")[0]}! 👋 Já faz uma semana desde sua primeira sessão na clínica. Como foi sua experiência?\n\nLeve 1 minuto para nos avaliar: ${npsUrl}`;

        await env.BACKGROUND_QUEUE.send({
          type: "SEND_WHATSAPP",
          payload: {
            to: row.phone,
            templateName: "patient_nps",
            languageCode: "pt_BR",
            bodyParameters: [{ type: "text", text: messageText }],
            organizationId: row.organization_id,
            patientId: row.patient_id,
            messageText,
            appointmentId: "",
          },
        }).catch(() => {});
      }
    }

    console.log(`[Cron] Patient NPS triggered for ${result.rows.length} patients.`);
  } catch (error) {
    console.warn("[Cron] Patient NPS trigger failed:", error);
  }
}

async function prewarmDatabase(pool: any) {
  console.log("[Cron] Prewarming database cache after scale-to-zero...");
  try {
    // pg_prewarm carrega as tabelas mais acessadas no buffer cache do Postgres
    // Reduz latência das primeiras queries do dia após o banco acordar
    await pool.query(`
      SELECT
        pg_prewarm('appointments') AS appointments_blocks,
        pg_prewarm('patients')     AS patients_blocks,
        pg_prewarm('exercises')    AS exercises_blocks,
        pg_prewarm('sessions')     AS sessions_blocks,
        pg_prewarm('exercise_protocols') AS protocols_blocks,
        pg_prewarm('organizations') AS orgs_blocks,
        pg_prewarm('profiles') AS profiles_blocks
    `);
    console.log("[Cron] Database cache prewarmed successfully.");
  } catch (error) {
    console.warn("[Cron] Prewarm failed (non-critical):", error);
  }
}

async function processRecallCampaigns(pool: any, env: Env, _ctx: ExecutionContext) {
  console.log("[Cron] Processing recall campaigns...");
  try {
    // Load active recall campaigns per organization
    const campaigns = await pool.query(`
      SELECT id, organization_id, name, days_without_visit, message_template
      FROM marketing_recall_campaigns
      WHERE enabled = true AND deleted = false
    `);

    let sent = 0;
    for (const campaign of campaigns.rows) {
      // Find patients whose last completed appointment is exactly at the threshold (±1 day window)
      const patients = await pool.query(
        `SELECT
           p.id, p.full_name, p.phone, p.whatsapp,
           MAX(a.date)::text AS last_appointment_date,
           MAX(a.notes) AS last_condition
         FROM patients p
         INNER JOIN appointments a ON a.patient_id = p.id
         WHERE p.organization_id = $1
           AND a.organization_id = $1
           AND a.status::text IN ('atendido','avaliacao')
           AND a.deleted_at IS NULL
           AND p.deleted_at IS NULL
         GROUP BY p.id, p.full_name, p.phone, p.whatsapp
         HAVING CURRENT_DATE - MAX(a.date)::date BETWEEN $2 AND ($2 + 1)`,
        [campaign.organization_id, campaign.days_without_visit],
      );

      for (const patient of patients.rows) {
        const phone = patient.whatsapp || patient.phone;
        if (!phone || !env.BACKGROUND_QUEUE) continue;

        const firstName = patient.full_name.split(" ")[0];
        const message = (campaign.message_template as string)
          .replace(/\{\{nome\}\}/gi, firstName)
          .replace(/\{\{name\}\}/gi, firstName);

        const queuePayload: WhatsAppQueuePayload = {
          to: phone,
          templateName: "recall_paciente",
          languageCode: "pt_BR",
          bodyParameters: [{ type: "text", text: firstName }],
          organizationId: campaign.organization_id,
          patientId: patient.id,
          messageText: message,
          appointmentId: "",
        };

        await env.BACKGROUND_QUEUE.send({ type: "SEND_WHATSAPP", payload: queuePayload });
        sent++;
      }
    }

    console.log(`[Cron] Recall campaigns: ${sent} WhatsApp messages queued.`);
  } catch (error) {
    console.warn("[Cron] Recall campaigns failed (non-critical):", error);
  }
}

async function send48hConfirmationRequests(pool: any, env: Env) {
  console.log("[Cron] Sending 48h confirmation requests...");
  try {
    // Appointments 2 days from now that haven't had a confirmation request sent yet
    const result = await pool.query(`
      SELECT
        a.id,
        a.organization_id,
        a.patient_id,
        a.start_time::text AS time,
        TO_CHAR(a.date, 'DD/MM/YYYY') AS formatted_date,
        p.full_name AS patient_name,
        p.phone AS patient_phone,
        prof.full_name AS therapist_name
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      LEFT JOIN profiles prof ON prof.user_id = a.therapist_id::uuid
      WHERE a.date = CURRENT_DATE + INTERVAL '2 days'
        AND a.status::text IN ('agendado', 'scheduled')
        AND a.confirmed_at IS NULL
        AND a.reminder_sent_at IS NULL
        AND a.deleted_at IS NULL
    `);

    let sent = 0;
    for (const row of result.rows) {
      if (!row.patient_phone || !env.BACKGROUND_QUEUE) continue;

      const timeStr = row.time?.substring(0, 5) ?? "";
      const therapistStr = row.therapist_name || "sua fisioterapeuta";
      const firstName = (row.patient_name as string).split(" ")[0];

      const message =
        `Olá, ${firstName}! 👋\n\n` +
        `Você tem uma sessão agendada para *${row.formatted_date}* às *${timeStr}* com *${therapistStr}*.\n\n` +
        `Por favor, confirme sua presença respondendo:\n` +
        `✅ *SIM* para confirmar\n` +
        `❌ *CANCELAR* para desmarcar\n\n` +
        `_Responda nessa mesma conversa._`;

      const queuePayload: WhatsAppQueuePayload = {
        to: row.patient_phone,
        templateName: "confirmacao_sessao",
        languageCode: "pt_BR",
        bodyParameters: [
          { type: "text", text: firstName },
          { type: "text", text: row.formatted_date },
          { type: "text", text: timeStr },
          { type: "text", text: therapistStr },
        ],
        organizationId: row.organization_id,
        patientId: row.patient_id,
        messageText: message,
        appointmentId: row.id,
      };

      await env.BACKGROUND_QUEUE.send({ type: "SEND_WHATSAPP", payload: queuePayload });

      // Also send push notification (non-fatal)
      notifyPatientAppointment(env, pool, row.patient_id, {
        appointmentId: row.id,
        datetime: `${row.formatted_date} às ${timeStr}`,
        therapistName: row.therapist_name,
        type: "reminder_48h",
      }).catch((err) => console.warn("[Cron] Push 48h failed:", err));

      await pool.query(
        `UPDATE appointments SET reminder_sent_at = NOW(), updated_at = NOW() WHERE id = $1::uuid`,
        [row.id],
      );

      sent++;
    }

    console.log(`[Cron] 48h confirmations: ${sent} messages queued.`);
  } catch (error) {
    console.warn("[Cron] 48h confirmation requests failed (non-critical):", error);
  }
}

async function sendSameDayUnconfirmedReminders(pool: any, env: Env) {
  console.log("[Cron] Sending same-day unconfirmed reminders...");
  try {
    const result = await pool.query(`
      SELECT
        a.id,
        a.organization_id,
        a.patient_id,
        a.start_time::text AS time,
        TO_CHAR(a.date, 'DD/MM/YYYY') AS formatted_date,
        p.full_name AS patient_name,
        p.phone AS patient_phone,
        prof.full_name AS therapist_name
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      LEFT JOIN profiles prof ON prof.user_id = a.therapist_id::uuid
      WHERE a.date = CURRENT_DATE
        AND a.status::text IN ('agendado', 'scheduled')
        AND a.confirmed_at IS NULL
        AND a.reminder_sent_at IS NULL
        AND a.deleted_at IS NULL
    `);

    let sent = 0;
    for (const row of result.rows) {
      if (!row.patient_phone || !env.BACKGROUND_QUEUE) continue;

      const timeStr = row.time?.substring(0, 5) ?? "";
      const firstName = (row.patient_name as string).split(" ")[0];

      const message =
        `Oi, ${firstName}! Só passando para lembrar da sua sessão *hoje* às *${timeStr}*. ` +
        `Te esperamos! Se não puder vir, responda *CANCELAR*.`;

      const queuePayload: WhatsAppQueuePayload = {
        to: row.patient_phone,
        templateName: "lembrete_dia_sessao",
        languageCode: "pt_BR",
        bodyParameters: [
          { type: "text", text: firstName },
          { type: "text", text: timeStr },
        ],
        organizationId: row.organization_id,
        patientId: row.patient_id,
        messageText: message,
        appointmentId: row.id,
      };

      await env.BACKGROUND_QUEUE.send({ type: "SEND_WHATSAPP", payload: queuePayload });

      // Push notification alongside WhatsApp (non-fatal)
      notifyPatientAppointment(env, pool, row.patient_id, {
        appointmentId: row.id,
        datetime: `hoje às ${timeStr}`,
        therapistName: row.therapist_name,
        type: "reminder_2h",
      }).catch((err) => console.warn("[Cron] Push same-day failed:", err));

      await pool.query(
        `UPDATE appointments SET reminder_sent_at = NOW(), updated_at = NOW() WHERE id = $1::uuid`,
        [row.id],
      );

      sent++;
    }

    console.log(`[Cron] Same-day unconfirmed reminders: ${sent} messages queued.`);
  } catch (error) {
    console.warn("[Cron] Same-day reminders failed (non-critical):", error);
  }
}
async function processWearableRTMAlerts(pool: any, env: Env) {
  console.log("[Cron] Processing Wearable RTM Alerts...");
  try {
    // Find patients with active wearable integrations
    const result = await pool.query(`
      SELECT DISTINCT p.id, p.organization_id, p.full_name
      FROM patients p
      INNER JOIN wearable_data wd ON wd.patient_id = p.id
      WHERE p.is_active = true
        AND wd.timestamp >= NOW() - INTERVAL '14 days'
    `);

    for (const row of result.rows) {
      const patientId = row.id;
      const orgId = row.organization_id;

      // Calculate current week vs previous week steps
      const activity = await pool.query(
        `
        SELECT 
          SUM(value) FILTER (WHERE timestamp >= NOW() - INTERVAL '7 days') as current_steps,
          SUM(value) FILTER (WHERE timestamp BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days') as prev_steps
        FROM wearable_data
        WHERE patient_id = $1 AND data_type = 'steps'
      `,
        [patientId],
      );

      const current = Number(activity.rows[0]?.current_steps || 0);
      const prev = Number(activity.rows[0]?.prev_steps || 0);

      // Alert if drop is > 30% and baseline was > 10k steps
      if (prev > 10000 && current / prev < 0.7) {
        const wearableWorkflow = (env as any).WORKFLOW_WEARABLE_ACTIVITY;
        if (wearableWorkflow) {
          await wearableWorkflow
            .create({
              id: `rtm-alert-${patientId}-${new Date().toISOString().slice(0, 10)}`,
              params: {
                patientId,
                organizationId: orgId,
                alertType: "low_activity",
                metricType: "Passos (Steps)",
                currentValue: current,
                baselineValue: prev,
              },
            })
            .catch(() => {});
        }
      }
    }
    console.log(`[Cron] Wearable RTM Alerts: checked ${result.rows.length} patients.`);
  } catch (error) {
    console.error("[Cron] processWearableRTMAlerts failed:", error);
  }
}
