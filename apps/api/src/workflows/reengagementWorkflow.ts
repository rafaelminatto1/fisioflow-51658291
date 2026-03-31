import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import type { Env } from '../types/env';
import { createPool } from '../lib/db';

export type PatientReengagementParams = {
  patientId: string;
  patientName: string;
  patientPhone: string;
  organizationId: string;
  therapistName: string;
  daysSinceLastAppointment: number;
};

/**
 * Workflow: Reengajamento de Paciente Inativo
 *
 * Disparado quando paciente não agenda consulta há N dias.
 * Fluxo progressivo de 3 tentativas antes de escalar para humano.
 *
 *  D+0: Mensagem amigável ("Sentimos sua falta")
 *  D+7: Oferta de desconto ou flexibilidade de horário
 *  D+15: Escalada para terapeuta ligar
 *  D+30: Marca como inativo no sistema
 */
export class PatientReengagementWorkflow extends WorkflowEntrypoint<Env, PatientReengagementParams> {
  async run(event: WorkflowEvent<PatientReengagementParams>, step: WorkflowStep) {
    const { patientId, patientName, patientPhone, organizationId, therapistName } = event.payload;

    // Tentativa 1 — Mensagem amigável
    await step.do('send-reengagement-1', async () => {
      await this.sendWhatsApp(
        patientPhone,
        `Olá ${patientName}! Sentimos sua falta! 😊\n\nJá faz um tempinho desde sua última consulta. Como você está se sentindo? Se quiser agendar uma sessão de acompanhamento, estamos aqui!`,
      );
    });

    // Aguarda resposta por 7 dias
    let reengaged = false;
    try {
      await step.waitForEvent('patient-responded-1', { type: 'appointment-booked', timeout: '7 days' });
      reengaged = true;
    } catch {
      // Sem resposta — tentativa 2
    }

    if (reengaged) {
      await this.markReengaged(patientId, organizationId);
      return;
    }

    // Tentativa 2 — Flexibilidade / facilidade
    await step.do('send-reengagement-2', async () => {
      await this.sendWhatsApp(
        patientPhone,
        `Olá ${patientName}! Temos horários flexíveis disponíveis esta semana, inclusive no período noturno.\n\nGostaria de retomar seu acompanhamento com ${therapistName}? Responda SIM e entraremos em contato! 💪`,
      );
    });

    try {
      await step.waitForEvent('patient-responded-2', { type: 'appointment-booked', timeout: '8 days' });
      reengaged = true;
    } catch {}

    if (reengaged) {
      await this.markReengaged(patientId, organizationId);
      return;
    }

    // Tentativa 3 — Escalada para humano
    await step.do('escalate-to-therapist', async () => {
      // Notifica a clínica via Analytics + cria tarefa para a recepção ligar
      if (this.env.ANALYTICS) {
        this.env.ANALYTICS.writeDataPoint({
          blobs: ['/workflow/reengagement', 'WORKFLOW', organizationId, 'escalated_to_human'],
          doubles: [0, 200, 0],
          indexes: [organizationId],
        });
      }

      // Cria tarefa para a equipe
      const pool = createPool(this.env);
      await pool.query(
        `INSERT INTO tarefas (title, description, priority, status, organization_id, created_at, updated_at)
         VALUES ($1, $2, 'alta', 'pendente', $3, NOW(), NOW())`,
        [
          `Ligar para paciente inativo: ${patientName}`,
          `Paciente não agenda consulta há mais de 15 dias. Ligar para ${patientPhone} e oferecer reagendamento.`,
          organizationId,
        ],
      );
    });

    // Aguarda mais 15 dias
    await step.sleep('wait-before-deactivate', '15 days');

    // Verifica se agendou nesse intervalo
    const booked = await step.do('check-if-booked', async () => {
      const pool = createPool(this.env);
      const res = await pool.query<{ id: string }>(
        `SELECT id FROM appointments WHERE patient_id = $1 AND organization_id = $2 AND created_at > NOW() - INTERVAL '16 days' LIMIT 1`,
        [patientId, organizationId],
      );
      return res.rows.length > 0;
    });

    if (!booked) {
      // Marca como inativo
      await step.do('mark-inactive', async () => {
        const pool = createPool(this.env);
        await pool.query(
          `UPDATE patients SET status = 'inativo', updated_at = NOW() WHERE id = $1 AND organization_id = $2`,
          [patientId, organizationId],
        );
      });
    }
  }

  private async markReengaged(patientId: string, organizationId: string) {
    if (!this.env.ANALYTICS) return;
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['/workflow/reengagement', 'WORKFLOW', organizationId, 'patient_reengaged'],
      doubles: [0, 200, 0],
      indexes: [organizationId],
    });
  }

  private async sendWhatsApp(phone: string, message: string) {
    if (!this.env.WHATSAPP_PHONE_NUMBER_ID || !this.env.WHATSAPP_ACCESS_TOKEN) return;
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
          text: { body: message },
        }),
      },
    );
  }
}
