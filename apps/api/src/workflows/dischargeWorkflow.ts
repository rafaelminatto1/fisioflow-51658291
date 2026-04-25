import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import type { Env } from "../types/env";
import { createPool } from "../lib/db";

export type PatientDischargeParams = {
  patientId: string;
  patientName: string;
  patientPhone: string;
  organizationId: string;
  therapistId: string;
  therapistName: string;
  dischargeSummary: string;
};

/**
 * Workflow: Alta do Paciente
 *
 * Fluxo:
 *  1. Envia pesquisa de satisfação (D+0)
 *  2. Aguarda 7 dias → verifica resposta → lembrete se não respondeu
 *  3. D+30: envia questionário de follow-up (como está após a alta?)
 *  4. Aguarda aprovação do terapeuta para arquivar prontuário
 *  5. Arquiva prontuário após 30 dias da aprovação
 */
export class PatientDischargeWorkflow extends WorkflowEntrypoint<Env, PatientDischargeParams> {
  async run(event: WorkflowEvent<PatientDischargeParams>, step: WorkflowStep) {
    const {
      patientId,
      patientName,
      patientPhone,
      organizationId,
      therapistName,
      dischargeSummary,
    } = event.payload;

    // 1. Mensagem de alta + pesquisa de satisfação imediata
    await step.do("send-discharge-message", async () => {
      await this.sendWhatsApp(
        patientPhone,
        `${patientName}, parabéns pela sua alta! 🎉\n\nFoi um prazer acompanhar sua recuperação. Para nos ajudar a melhorar, responda nossa pesquisa rápida:\nhttps://moocafisio.com.br/satisfacao?p=${patientId}\n\n${therapistName} e toda a equipe desejam muito sucesso! 💪`,
      );
    });

    // 2. Aguarda 7 dias → verifica resposta da pesquisa
    await step.sleep("wait-survey-response", "7 days");

    const surveyResult = await step.do("check-survey-response", async () => {
      const pool = createPool(this.env);
      const res = (await pool.query(
        `SELECT id FROM satisfaction_surveys WHERE patient_id = $1 AND organization_id = $2 AND created_at > NOW() - INTERVAL '8 days' LIMIT 1`,
        [patientId, organizationId],
      )) as unknown as { rows: { id: string }[] };
      return { responded: res.rows.length > 0 };
    });

    if (!surveyResult.responded) {
      await step.do("send-survey-reminder", async () => {
        await this.sendWhatsApp(
          patientPhone,
          `Olá ${patientName}! Ainda não recebemos sua avaliação. Leva só 1 minuto e nos ajuda muito:\nhttps://moocafisio.com.br/satisfacao?p=${patientId}`,
        );
      });
    }

    // 3. D+30: follow-up clínico
    await step.sleep("wait-followup", "23 days"); // já esperou 7 dias acima

    await step.do("send-followup", async () => {
      await this.sendWhatsApp(
        patientPhone,
        `Olá ${patientName}! Já faz um mês desde sua alta. Como você está se sentindo?\n\nCaso tenha alguma dúvida ou precise de acompanhamento, estamos sempre disponíveis! 😊`,
      );
    });

    // 4. Aguarda aprovação do terapeuta para arquivar (até 60 dias)
    try {
      await step.waitForEvent("therapist-archive-approval", {
        type: "archive-approved",
        timeout: "60 days",
      });
    } catch {
      // Arquiva automaticamente após 60 dias sem resposta
    }

    // 5. Arquiva prontuário
    await step.do("archive-patient-record", async () => {
      const pool = createPool(this.env);
      await pool.query(
        `UPDATE patients SET status = 'alta', discharge_date = NOW(), discharge_summary = $1, updated_at = NOW()
         WHERE id = $2 AND organization_id = $3`,
        [dischargeSummary, patientId, organizationId],
      );

      if (this.env.ANALYTICS) {
        this.env.ANALYTICS.writeDataPoint({
          blobs: ["/workflow/discharge", "WORKFLOW", organizationId, "patient_discharged"],
          doubles: [0, 200, 0],
          indexes: [organizationId],
        });
      }
    });
  }

  private async sendWhatsApp(phone: string, message: string) {
    if (!this.env.WHATSAPP_PHONE_NUMBER_ID || !this.env.WHATSAPP_ACCESS_TOKEN) return;
    await fetch(`https://graph.facebook.com/v21.0/${this.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.env.WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace(/\D/g, ""),
        type: "text",
        text: { body: message },
      }),
    });
  }
}
