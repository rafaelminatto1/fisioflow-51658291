import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import type { Env } from "../types/env";
import { createPool } from "../lib/db";

export type WearableActivityParams = {
  patientId: string;
  organizationId: string;
  alertType: "low_activity" | "milestone_reached" | "consistency_streak" | "recovery_peak";
  metricType?: string;
  currentValue?: number;
  baselineValue?: number;
  milestoneTitle?: string;
  daysStreak?: number;
};

/**
 * Workflow: Remote Therapeutic Monitoring (RTM) Alerts
 * Handles proactive alerts based on wearable data trends.
 */
export class PatientWearableActivityWorkflow extends WorkflowEntrypoint<
  Env,
  WearableActivityParams
> {
  async run(event: WorkflowEvent<WearableActivityParams>, step: WorkflowStep) {
    const {
      patientId,
      organizationId,
      alertType,
      metricType,
      currentValue,
      baselineValue,
      milestoneTitle,
    } = event.payload;

    const pool = createPool(this.env);

    // Get patient details
    const patientRes = await step.do("get-patient-info", async () => {
      const res = await pool.query(
        "SELECT full_name, phone FROM patients WHERE id = $1 AND organization_id = $2",
        [patientId, organizationId],
      );
      return res.rows[0] as { full_name: string; phone: string } | undefined;
    });

    if (!patientRes || !patientRes.phone) {
      console.warn(`[RTM Workflow] Patient ${patientId} not found or has no phone.`);
      return;
    }

    if (alertType === "low_activity") {
      await step.do("send-low-activity-alert", async () => {
        const dropPercent =
          baselineValue && baselineValue > 0
            ? Math.round((1 - (currentValue || 0) / baselineValue) * 100)
            : 0;

        const message = `Olá ${patientRes.full_name.split(" ")[0]}! Notamos que sua atividade física (${metricType}) diminuiu cerca de ${dropPercent}% esta semana. 📉\n\nManter a constância é fundamental para sua recuperação. Que tal retomar sua meta hoje? 💪`;

        await this.sendWhatsApp(patientRes.phone, message);
      });

      // Notify therapist if drop is severe (> 50%)
      if (baselineValue && currentValue && currentValue / baselineValue < 0.5) {
        await step.do("notify-therapist-escalation", async () => {
          await pool.query(
            `INSERT INTO notifications (organization_id, user_id, type, title, message, link, metadata)
             SELECT organization_id, user_id, 'alert', 'Queda de Atividade RTM', $1, $2, $3
             FROM user_profiles WHERE organization_id = $4 AND role = 'therapist' LIMIT 1`,
            [
              `Paciente ${patientRes.full_name} teve queda severa de atividade (${metricType}).`,
              `/patients/${patientId}/wearables`,
              JSON.stringify({ patient_id: patientId, alert_type: "severe_drop" }),
              organizationId,
            ],
          );
        });
      }
    } else if (alertType === "milestone_reached") {
      await step.do("send-milestone-celebration", async () => {
        const message = `Parabéns, ${patientRes.full_name.split(" ")[0]}! 🎉 Você atingiu um novo marco: *${milestoneTitle}*!\n\nSeu progresso é incrível e faz toda a diferença no seu tratamento. Continue assim! 🚀`;
        await this.sendWhatsApp(patientRes.phone, message);
      });
    } else if (alertType === "consistency_streak") {
      await step.do("send-streak-alert", async () => {
        const days = event.payload.daysStreak || 7;
        const message = `Incrível, ${patientRes.full_name.split(" ")[0]}! 🔥 Você completou ${days} dias seguidos de metas atingidas! Sua disciplina é o motor da sua melhora. Parabéns! 🦾`;
        await this.sendWhatsApp(patientRes.phone, message);
      });
    } else if (alertType === "recovery_peak") {
      await step.do("send-recovery-peak-alert", async () => {
        const message = `Excelente notícia, ${patientRes.full_name.split(" ")[0]}! 📈 Detectamos um novo pico de performance na sua recuperação (${metricType}). Você está superando suas próprias marcas! 🌟`;
        await this.sendWhatsApp(patientRes.phone, message);
      });
    }
  }

  private async sendWhatsApp(phone: string, message: string) {
    if (!this.env.WHATSAPP_PHONE_NUMBER_ID || !this.env.WHATSAPP_ACCESS_TOKEN) {
      console.warn("[RTM Workflow] WhatsApp credentials missing.");
      return;
    }
    await fetch(`https://graph.facebook.com/v25.0/${this.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
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
