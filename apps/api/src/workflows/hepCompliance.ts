import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import type { Env } from '../types/env';
import { createPool } from '../lib/db';

export type HEPComplianceParams = {
  patientId: string;
  patientName: string;
  patientPhone: string;
  exercisePlanId: string;
  organizationId: string;
  therapistName: string;
  durationWeeks: number; // quantas semanas monitorar
};

/**
 * Workflow: Monitoramento de Adesão ao HEP (Home Exercise Program)
 *
 * Fluxo semanal durante N semanas:
 *  1. A cada semana: verifica adesão no banco
 *  2. Se adesão < 60%: envia lembrete personalizado + notifica terapeuta
 *  3. Se adesão > 80%: envia mensagem de parabéns (gamificação)
 *  4. Ao final: gera relatório de adesão e envia ao terapeuta
 */
export class HEPComplianceWorkflow extends WorkflowEntrypoint<Env, HEPComplianceParams> {
  async run(event: WorkflowEvent<HEPComplianceParams>, step: WorkflowStep) {
    const { patientId, patientName, patientPhone, exercisePlanId, organizationId, therapistName, durationWeeks } =
      event.payload;

    const weeklyAdherence: number[] = [];

    for (let week = 1; week <= durationWeeks; week++) {
      // Aguarda 7 dias (exceto na 1ª iteração)
      if (week > 1) {
        await step.sleep(`wait-week-${week}`, '7 days');
      }

      // Verifica adesão da semana
      const adherence = await step.do(`check-adherence-week-${week}`, async () => {
        const pool = createPool(this.env);
        const result = await pool.query(
          `SELECT
             ROUND(
               COUNT(CASE WHEN completed = true THEN 1 END)::numeric /
               NULLIF(COUNT(*), 0) * 100,
               1
             ) AS rate
           FROM exercise_completions
           WHERE exercise_plan_id = $1
             AND patient_id = $2
             AND completed_at >= NOW() - INTERVAL '7 days'`,
          [exercisePlanId, patientId],
        ) as unknown as { rows: { rate: string }[] };
        return Number(result.rows[0]?.rate ?? 0);
      });

      weeklyAdherence.push(adherence);

      // Reagir baseado na adesão
      await step.do(`respond-week-${week}`, async () => {
        if (adherence < 60) {
          await this.sendWhatsApp(
            patientPhone,
            `Olá ${patientName}! 💪 Vi que você realizou ${adherence}% dos exercícios esta semana.\n\nLembre-se: a consistência é fundamental para sua recuperação! Precisa de ajuda ou tem alguma dúvida sobre os exercícios?`,
          );
        } else if (adherence >= 80) {
          await this.sendWhatsApp(
            patientPhone,
            `Parabéns ${patientName}! 🎉 Você realizou ${adherence}% dos exercícios esta semana. Continue assim — você está indo muito bem!`,
          );
        }
      });
    }

    // Relatório final ao terapeuta
    await step.do('generate-final-report', async () => {
      const avgAdherence =
        weeklyAdherence.length > 0
          ? Math.round(weeklyAdherence.reduce((a, b) => a + b, 0) / weeklyAdherence.length)
          : 0;

      const weeklyStr = weeklyAdherence.map((r, i) => `Semana ${i + 1}: ${r}%`).join('\n');

      await this.sendWhatsApp(
        patientPhone,
        `${patientName}, seu programa de exercícios domiciliares foi concluído! 🏆\n\nAdesão média: ${avgAdherence}%\n\nSeu fisioterapeuta ${therapistName} receberá o relatório completo. Obrigado pela dedicação!`,
      );

      if (this.env.ANALYTICS) {
        this.env.ANALYTICS.writeDataPoint({
          blobs: ['/workflow/hep-compliance', 'WORKFLOW', organizationId, 'hep_completed'],
          doubles: [0, 200, avgAdherence],
          indexes: [organizationId],
        });
      }
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
