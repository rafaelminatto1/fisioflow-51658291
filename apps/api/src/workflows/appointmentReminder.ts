import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import type { Env } from "../types/env";
import { runWithOrg } from "../lib/db";

export interface AppointmentReminderParams {
  appointmentId: string;
  organizationId: string;
  patientId: string;
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
 * Monta a mensagem SEND_WHATSAPP com o MESMO formato do poll
 * (`dispatchScheduledReminders` em cron.ts): texto-livre primeiro, fallback p/
 * template, log no CRM + broadcast WS — tudo feito pelo consumidor da fila.
 * Extraído como função pura para paridade testável.
 */
export function buildReminderQueueMessage(payload: AppointmentReminderParams) {
  const timeStr = payload.apptTimeStr;
  const therapistStr = payload.therapistName || "Fisioterapeuta";
  const firstName = (payload.patientName || "paciente").split(" ")[0];

  return {
    type: "SEND_WHATSAPP" as const,
    payload: {
      to: payload.patientPhone,
      languageCode: "pt_BR",
      templateName: payload.templateName,
      bodyParameters: [
        { type: "text" as const, text: firstName },
        { type: "text" as const, text: timeStr },
        { type: "text" as const, text: therapistStr },
      ],
      organizationId: payload.organizationId,
      patientId: payload.patientId,
      messageText: `Lembrete: sua sessão é às ${timeStr} com ${therapistStr}.`,
      appointmentId: payload.appointmentId,
    },
  };
}

/**
 * Workflow: Lembrete de Consulta (por evento)
 *
 * Cada instância é criada com id determinístico `reminder-<appointmentId>`
 * no momento em que o agendamento é criado/remarcado (ver `reminderWorkflow.ts`).
 *
 * Fluxo:
 *  1. Dorme até `sendAtMs` (calculado por `computeReminderSendAt`).
 *  2. Rechecagem: relê o agendamento no banco (sob RLS via `runWithOrg`) — se
 *     cancelado, remarcado p/ outro horário, ou inexistente, encerra sem enviar.
 *  3. Enfileira o envio na BACKGROUND_QUEUE (mesma paridade do poll: texto-livre
 *     primeiro + fallback template `lembrete_consulta_botoes` + log CRM/WS).
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
      // RLS: `app.org_id` precisa estar setado, senão a query volta 0 linhas
      // (e o lembrete seria silenciosamente descartado). runWithOrg garante isso.
      return runWithOrg(payload.organizationId, async () => {
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
    });

    if (!shouldStillSend(row, payload)) return;

    await step.do("send-reminder", async () => {
      if (!this.env.BACKGROUND_QUEUE) return;
      await this.env.BACKGROUND_QUEUE.send(buildReminderQueueMessage(payload));
    });

    this.logReminder(payload.appointmentId, payload.organizationId);
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
