import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import type { Env } from '../types/env';

export type AppointmentReminderParams = {
  appointmentId: string;
  patientPhone: string;
  patientName: string;
  therapistName: string;
  appointmentDate: string; // ISO string
  organizationId: string;
};

/**
 * Workflow: Lembrete de Consulta
 *
 * Fluxo:
 *  1. Aguarda até D-3 (3 dias antes) → envia lembrete WhatsApp
 *  2. Aguarda até D-1 (1 dia antes)  → envia lembrete WhatsApp
 *  3. Aguarda até D-0 (2h antes)     → envia lembrete final
 *
 * Suporta cancelamento via sendEvent('cancel').
 */
export class AppointmentReminderWorkflow extends WorkflowEntrypoint<Env, AppointmentReminderParams> {
  async run(event: WorkflowEvent<AppointmentReminderParams>, step: WorkflowStep) {
    const { appointmentId, patientPhone, patientName, therapistName, appointmentDate, organizationId } =
      event.payload;

    const apptTime = new Date(appointmentDate).getTime();
    const now = Date.now();

    // --- D-3 ---
    const d3 = apptTime - 3 * 24 * 60 * 60 * 1000;
    if (d3 > now) {
      await step.sleepUntil('wait-d3', new Date(d3));
    }

    await step.do('send-d3-reminder', async () => {
      await this.sendReminder(patientPhone, patientName, therapistName, appointmentDate, 3);
      await this.logReminder(appointmentId, organizationId, 'd3');
    });

    // --- D-1 ---
    const d1 = apptTime - 1 * 24 * 60 * 60 * 1000;
    if (d1 > Date.now()) {
      await step.sleepUntil('wait-d1', new Date(d1));
    }

    await step.do('send-d1-reminder', async () => {
      await this.sendReminder(patientPhone, patientName, therapistName, appointmentDate, 1);
      await this.logReminder(appointmentId, organizationId, 'd1');
    });

    // --- D-0 (2h antes) ---
    const d0 = apptTime - 2 * 60 * 60 * 1000;
    if (d0 > Date.now()) {
      await step.sleepUntil('wait-d0', new Date(d0));
    }

    await step.do('send-d0-reminder', async () => {
      await this.sendReminder(patientPhone, patientName, therapistName, appointmentDate, 0);
      await this.logReminder(appointmentId, organizationId, 'd0');
    });
  }

  private async sendReminder(
    phone: string,
    patientName: string,
    therapistName: string,
    appointmentDate: string,
    daysAhead: number,
  ) {
    if (!this.env.WHATSAPP_PHONE_NUMBER_ID || !this.env.WHATSAPP_ACCESS_TOKEN) return;

    const dateStr = new Date(appointmentDate).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    const msg =
      daysAhead === 0
        ? `Olá ${patientName}! Sua consulta com ${therapistName} é em 2 horas (${dateStr}). Te esperamos! 🏥`
        : `Olá ${patientName}! Lembrete: sua consulta com ${therapistName} é ${daysAhead === 1 ? 'amanhã' : 'em 3 dias'} (${dateStr}). Confirme sua presença respondendo SIM.`;

    await fetch(
      `https://graph.facebook.com/v19.0/${this.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.env.WHATSAPP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone.replace(/\D/g, ''),
          type: 'text',
          text: { body: msg },
        }),
      },
    );
  }

  private async logReminder(appointmentId: string, organizationId: string, stage: string) {
    if (!this.env.ANALYTICS) return;
    try {
      this.env.ANALYTICS.writeDataPoint({
        blobs: ['/workflow/appointment-reminder', 'WORKFLOW', organizationId, `reminder_${stage}`],
        doubles: [0, 200, 0],
        indexes: [organizationId],
      });
    } catch {}
  }
}
