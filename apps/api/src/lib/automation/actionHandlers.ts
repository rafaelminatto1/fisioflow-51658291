import type { Env } from "../../types/env";
import { createResend } from "../email";
import type { ActionHandler } from "./runAutomation";

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

    log_event: async (params, context) => {
      console.log("[Automation] log_event", { params, context });
      return { logged: true };
    },
  };
}
