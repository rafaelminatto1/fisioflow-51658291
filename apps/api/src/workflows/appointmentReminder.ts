import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import type { Env } from "../types/env";
import { apiRetries, throwIfMetaError } from "./retryPolicy";

export interface AppointmentReminderParams {
  appointmentId: string;
  organizationId: string;
  patientPhone: string;
  patientName: string;
  therapistName: string;
  apptDateStr: string;
  apptTimeStr: string;
  sendAtMs: number;
  templateName: string;
}

const NO_SEND_STATUSES = new Set([
  "cancelado",
  "cancelled",
  "faltou",
  "no_show",
  "completed",
  "concluido",
  "remarcado",
  "rescheduled",
]);

/**
 * Verifica se, no instante do envio, o agendamento ainda justifica o lembrete:
 * precisa existir, não estar em status terminal/cancelado, e continuar no
 * mesmo dia/horário para o qual o lembrete foi originalmente agendado
 * (evita lembrete "fantasma" após reagendamento).
 */
export function shouldStillSend(
  row: { status?: string; date_str?: string; time_str?: string } | null,
  payload: { apptDateStr: string; apptTimeStr: string },
): boolean {
  if (!row) return false;
  if (row.status && NO_SEND_STATUSES.has(String(row.status))) return false;
  if (row.date_str !== payload.apptDateStr) return false;
  if ((row.time_str ?? "").slice(0, 5) !== payload.apptTimeStr) return false;
  return true;
}

/**
 * Workflow: Lembrete de Consulta (por evento)
 *
 * Cada instância é criada com id determinístico `reminder-<appointmentId>`
 * no momento em que o agendamento é criado/remarcado (ver `reminderWorkflow.ts`).
 *
 * Fluxo:
 *  1. Dorme até `sendAtMs` (calculado por `computeReminderSendAt`).
 *  2. Rechecagem: relê o agendamento no banco — se cancelado, remarcado p/
 *     outro horário, ou inexistente, encerra sem enviar.
 *  3. Envia o template Meta aprovado (`lembrete_consulta_botoes`).
 */
export class AppointmentReminderWorkflow extends WorkflowEntrypoint<
  Env,
  AppointmentReminderParams
> {
  async run(event: WorkflowEvent<AppointmentReminderParams>, step: WorkflowStep) {
    const payload = event.payload;

    if (payload.sendAtMs > Date.now()) {
      await step.sleepUntil("wait-reminder", new Date(payload.sendAtMs));
    }

    const row = await step.do("recheck-status", async () => {
      const { getRawSql } = await import("../lib/db");
      const sql = getRawSql(this.env, "read");
      const res = await sql`
        SELECT status,
               to_char(date, 'YYYY-MM-DD') AS date_str,
               substr(start_time::text, 1, 5) AS time_str
        FROM appointments
        WHERE id = ${payload.appointmentId}::uuid AND deleted_at IS NULL
      `;
      return (
        (res.rows[0] as { status?: string; date_str?: string; time_str?: string } | undefined) ??
        null
      );
    });

    if (!shouldStillSend(row, payload)) return;

    await step.do("send-reminder", { retries: apiRetries() }, () => this.sendReminder(payload));

    this.logReminder(payload.appointmentId, payload.organizationId);
  }

  private async sendReminder(payload: AppointmentReminderParams) {
    if (!this.env.WHATSAPP_PHONE_NUMBER_ID || !this.env.WHATSAPP_ACCESS_TOKEN) return;

    const firstName = (payload.patientName || "paciente").split(" ")[0];
    const recipientPhone = payload.patientPhone.replace(/\D/g, "");

    const res = await fetch(
      `https://graph.facebook.com/v25.0/${this.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.env.WHATSAPP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipientPhone,
          type: "template",
          template: {
            name: payload.templateName,
            language: { code: "pt_BR" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: firstName },
                  { type: "text", text: payload.apptTimeStr },
                  { type: "text", text: payload.therapistName },
                ],
              },
            ],
          },
        }),
      },
    );
    await throwIfMetaError(res, "reminder-template");
  }

  private logReminder(appointmentId: string, organizationId: string) {
    if (!this.env.ANALYTICS) return;
    try {
      this.env.ANALYTICS.writeDataPoint({
        blobs: [
          "/workflow/appointment-reminder",
          "WORKFLOW",
          organizationId,
          "reminder_sent",
          appointmentId,
        ],
        doubles: [0, 200, 0],
        indexes: [organizationId],
      });
    } catch {}
  }
}
