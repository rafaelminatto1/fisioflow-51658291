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

    // 1. Gerar e enviar História de Sucesso (IA)
    await step.do("generate-success-story", async () => {
      try {
        const { runThinkingModel } = await import("../lib/ai-native");
        const pool = createPool(this.env);

        // Coleta histórico para a IA
        const history = await pool.query(
          `SELECT subjective, assessment, date FROM sessions WHERE patient_id = $1 ORDER BY date ASC`,
          [patientId],
        );

        const prompt = `
          Você é um assistente de alta humanizado. 
          Gere uma mensagem de "História de Sucesso" curta e emocionante para o paciente ${patientName}.
          Ele está recebendo alta hoje da fisioterapia com ${therapistName}.
          
          HISTÓRICO:
          ${JSON.stringify(history.rows)}

          Diretrizes:
          - Destaque a superação (ex: como ele chegou e como está saindo).
          - Use um tom inspirador.
          - Responda em Português Brasileiro.
          - Máximo 400 caracteres.
        `.trim();

        const aiStory = await runThinkingModel(this.env, {
          prompt,
          model: "gemini-1.5-flash",
          temperature: 0.7,
        });

        await this.sendWhatsApp(
          patientPhone,
          `🏆 *SUA HISTÓRIA DE SUCESSO:*\n\n${aiStory.content}\n\n${patientName}, parabéns pela sua jornada! 🎉 Para nos ajudar a melhorar, responda nossa pesquisa rápida:\nhttps://moocafisio.com.br/satisfacao?p=${patientId}`,
        );
      } catch (e) {
        console.warn("[Discharge/AI] Success story failed, sending default", e);
        await this.sendWhatsApp(
          patientPhone,
          `${patientName}, parabéns pela sua alta! 🎉\n\nFoi um prazer acompanhar sua recuperação. Responda nossa pesquisa rápida:\nhttps://moocafisio.com.br/satisfacao?p=${patientId}`,
        );
      }
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
    await fetch(`https://graph.facebook.com/v22.0/${this.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
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
