import type { Env } from "../../types/env";
import { createResend } from "../email";
import { getRawSql, runWithOrg } from "../db";
import type { ActionHandler } from "./runAutomation";

function orgOf(context: Record<string, unknown>): string {
  return String(context.organizationId ?? context.orgId ?? context.organization_id ?? "");
}

/**
 * Real action handlers for automations triggered from the event bus.
 * Kept small and side-effect-safe. Params come from the automation node;
 * context is the triggering event's data (for templating fields).
 */
export function buildActionHandlers(env: Env): Record<string, ActionHandler> {
  return {
    send_email: async (params) => {
      const to = String(params.to ?? "");
      if (!to) return { skipped: "sem destinatário" };
      const resend = createResend(env);
      if (!resend) return { skipped: "Resend não configurado" };
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL ?? "FisioFlow <noreply@moocafisio.com.br>",
        to,
        subject: String(params.subject ?? "Notificação FisioFlow"),
        html: String(params.html ?? params.message ?? ""),
      });
      return { sent: true, to };
    },

    send_whatsapp: async (params, context) => {
      if (!env.BACKGROUND_QUEUE) return { skipped: "fila indisponível" };
      const to = String(params.to ?? context.patientPhone ?? "");
      if (!to) return { skipped: "sem destinatário" };
      await env.BACKGROUND_QUEUE.send({
        type: "SEND_WHATSAPP",
        payload: {
          to,
          templateName: String(params.templateName ?? ""),
          languageCode: String(params.languageCode ?? "pt_BR"),
          bodyParameters: Array.isArray(params.bodyParameters) ? params.bodyParameters : [],
          organizationId: orgOf(context),
          patientId: String(context.patientId ?? ""),
          messageText: String(params.message ?? ""),
          appointmentId: String(context.appointmentId ?? ""),
        },
      });
      return { enqueued: true, to };
    },

    create_task: async (params, context) => {
      const orgId = orgOf(context);
      if (!orgId) return { skipped: "sem org" };
      const titulo = String(params.title ?? params.titulo ?? "Tarefa da automação");
      await runWithOrg(orgId, async () => {
        const sql = getRawSql(env, "write");
        await sql(
          `INSERT INTO tarefas (organization_id, created_by, titulo, descricao) VALUES ($1,$2,$3,$4)`,
          [orgId, "automation", titulo, params.description ?? params.descricao ?? null],
        );
      });
      return { created: true, titulo };
    },

    send_webhook: async (params, context) => {
      const url = String(params.url ?? "");
      if (!url.startsWith("https://")) return { skipped: "url inválida (use https)" };
      try {
        const res = await fetch(url, {
          method: String(params.method ?? "POST"),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params.body ?? { event: context }),
        });
        return { delivered: res.ok, status: res.status };
      } catch (e) {
        return { error: String((e as Error)?.message ?? e) };
      }
    },

    log_event: async (params, context) => {
      console.log("[Automation] log_event", { params, context });
      return { logged: true };
    },
  };
}
