import { Env } from "./types/env";
import { createPool } from "./lib/db";
import { triggerInngestEvent } from "./lib/inngest-client";
import { sendAppointmentReminderEmail } from "./lib/email";
import type { WhatsAppQueuePayload } from "./queue";
import { cleanupRateLimits } from "./middleware/rateLimit";
import { runHealthMonitor } from "./lib/monitor";

/**
 * Cloudflare Worker Cron Trigger Handler
 */
export async function handleScheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  const pool = createPool(env);
  const cron = event.cron;

  console.log(`[Cron] Executing job: ${cron} at ${new Date().toISOString()}`);

  try {
    const now = new Date();
    const day = now.getUTCDay(); // 0-6 (Sunday is 0)
    const hour = now.getUTCHours() - 3; // Ajuste para Horário de Brasília (BRT)

    // Business Hours check: Monday to Friday, 7 AM to 8 PM (20h)
    const _isBusinessHours = day >= 1 && day <= 5 && hour >= 7 && hour < 20;

    switch (cron) {
      case "* * * * *": // A cada minuto — Health monitor (ntfy.sh push se API cair)
        await runHealthMonitor(env);
        break;

      case "0 9 * * *": // UTC 09h = BRT 06h — Lembretes + prewarm pós cold-start
        await prewarmDatabase(pool);
        await sendAppointmentReminders(pool, env, ctx);
        await processBirthdays(pool, env, ctx);
        await processInactivePatients(pool, env, ctx);
        break;

      case "0 11 * * *": // UTC 11h = BRT 08h — Manutenção em horário de expediente
        await performDatabaseCleanup(pool, env);
        if (env.EDGE_CACHE) {
          const deleted = await cleanupRateLimits(env.EDGE_CACHE);
          console.log(`[Cron] D1 rate_limits cleanup: ${deleted} rows deleted.`);
        }
        break;

      case "0 12 * * *": // UTC 12h = BRT 09h — Automações por vencimento de tarefa
        await processDueDateAutomations(pool);
        break;

      case "0 5 * * *": // UTC 05h = BRT 02h — WikiSyncWorkflow (indexa páginas modificadas)
        if (env.WORKFLOW_WIKI_SYNC) {
          await env.WORKFLOW_WIKI_SYNC.create({
            id: `wiki-sync-${new Date().toISOString().slice(0, 10)}`,
            params: { triggerType: "cron" },
          }).catch((err) => console.error("[Cron] WikiSync create failed:", err));
        }
        break;

      case "0 6 * * 1": // UTC 06h Segunda = BRT 03h — KnowledgeSyncWorkflow
        if (env.WORKFLOW_KNOWLEDGE_SYNC) {
          await env.WORKFLOW_KNOWLEDGE_SYNC.create({
            id: `knowledge-sync-${new Date().toISOString().slice(0, 10)}`,
            params: { triggerType: "cron", syncTarget: "all" },
          }).catch((err) => console.error("[Cron] KnowledgeSync create failed:", err));
        }
        break;

      case "30 10 * * *": // UTC 10h30 = BRT 07h30 — ClinicAgent morning briefing
        if (env.CLINIC_AGENT) {
          const stub = env.CLINIC_AGENT.get(env.CLINIC_AGENT.idFromName("global"));
          await (stub as any).runMorningBriefing().catch((err: unknown) =>
            console.error("[Cron] ClinicAgent briefing failed:", err),
          );
        }
        break;

      case "30 21 * * *": // UTC 21h30 = BRT 18h30 — ClinicAgent daily summary
        if (env.CLINIC_AGENT) {
          const stub = env.CLINIC_AGENT.get(env.CLINIC_AGENT.idFromName("global"));
          await (stub as any).runDailySummary().catch((err: unknown) =>
            console.error("[Cron] ClinicAgent summary failed:", err),
          );
        }
        break;

      case "0 12 * * 1": // UTC 12h Segunda = BRT 09h — ClinicAgent missing patients alert
        if (env.CLINIC_AGENT) {
          const stub = env.CLINIC_AGENT.get(env.CLINIC_AGENT.idFromName("global"));
          await (stub as any).checkMissingPatients().catch((err: unknown) =>
            console.error("[Cron] ClinicAgent missing patients failed:", err),
          );
        }
        break;

      case "0 14 * * *": // UTC 14h = BRT 11h — NPS auto-trigger (7-day orgs)
        await triggerNpsSurveys(pool, env);
        break;

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
    await triggerInngestEvent(env, ctx, "patient.inactive", {
      patientId: row.id,
      name: row.full_name,
      phone: row.phone,
    });
  }
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
    LEFT JOIN profiles prof ON prof.user_id = a.therapist_id
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

    // 2. WhatsApp Reminder — enqueue for async processing with automatic retry
    if (row.patient_phone && env.BACKGROUND_QUEUE) {
      try {
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
    const dateStr = tomorrow.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" });
    for (const [orgId, rows] of orgGroups) {
      const first = rows[0];
      await sendPushToOrg(orgId, {
        title: `Agenda de amanhã — ${rows.length} sessão${rows.length > 1 ? "ões" : ""}`,
        body: `${dateStr} · Primeiro: ${first.patient_name} às ${first.time?.substring(0, 5) ?? ""}`,
        url: "/agenda",
        tag: `reminder-summary-${tomorrow.toISOString().split("T")[0]}`,
      }, env).catch(() => {});
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
        pg_prewarm('exercise_protocols') AS protocols_blocks
    `);
    console.log("[Cron] Database cache prewarmed successfully.");
  } catch (error) {
    console.warn("[Cron] Prewarm failed (non-critical):", error);
  }
}
