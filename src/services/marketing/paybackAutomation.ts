import { FinancialService } from "../financialService";
import { marketingApi, patientsApi } from "@/api/v2";
import { sendMessage } from "@/services/whatsapp-api";
import { fisioLogger as logger } from "@/lib/errors/logger";

export interface PaybackConfig {
  targetRoi: number; // e.g., 1.5 (150% of CAC)
  defaultCac: number; // e.g., 120 (average cost to acquire a patient)
  loyaltyMessage: string;
}

export class PaybackAutomationService {
  private static DEFAULT_CONFIG: PaybackConfig = {
    targetRoi: 1.2, // Payback + 20% margin
    defaultCac: 150,
    loyaltyMessage:
      "Olá {nome}! Notamos que você é um de nossos pacientes mais fiéis. Como agradecimento, gostaríamos de oferecer um bônus especial na sua próxima sessão! 🎁",
  };

  /**
   * Check and trigger payback automation for a patient
   */
  static async processPatientPayback(
    patientId: string,
    patientName?: string,
    phone?: string,
  ): Promise<boolean> {
    try {
      let finalName = patientName;
      let finalPhone = phone;

      // 0. Fetch patient details if missing
      if (!finalName || !finalPhone) {
        const patient = (await patientsApi.get(patientId)).data;
        finalName = patient.full_name || patient.name || "Paciente";
        finalPhone = patient.phone || "";
      }

      if (!finalPhone) {
        logger.warn(
          `[PaybackAutomation] Patient ${patientId} has no phone. Skipping.`,
          {},
          "paybackAutomation",
        );
        return false;
      }

      // 1. Get LTV
      const ltv = await FinancialService.getPatientLTV(patientId);

      // 2. Get Config (In a real scenario, this would come from the database/organization config)
      const config = this.DEFAULT_CONFIG;

      // 3. Determine if Payback target reached
      const threshold = config.defaultCac * config.targetRoi;

      if (ltv >= threshold) {
        logger.info(
          `[PaybackAutomation] Patient ${finalName} reached payback threshold. LTV: ${ltv}, Threshold: ${threshold}`,
          { patientId },
          "paybackAutomation",
        );

        // 4. Check if already triggered (to avoid spam)
        const hasTriggered = await this.checkIfAlreadyTriggered(patientId);
        if (hasTriggered) return false;

        // 5. Send WhatsApp Message
        const message = config.loyaltyMessage.replace("{nome}", finalName.split(" ")[0]);
        await sendMessage(finalPhone, message);

        // 6. Record trigger
        await this.recordTrigger(patientId);

        return true;
      }

      return false;
    } catch (error) {
      logger.error("[PaybackAutomation] Error processing payback", error, "paybackAutomation");
      return false;
    }
  }

  private static async checkIfAlreadyTriggered(patientId: string): Promise<boolean> {
    // Logic to check audit logs or a specific automation_triggers table
    try {
      const logs = await marketingApi.automationLogs.list({ patientId, type: "payback_loyalty" });
      return logs.data && logs.data.length > 0;
    } catch {
      return false;
    }
  }

  private static async recordTrigger(patientId: string): Promise<void> {
    try {
      await marketingApi.automationLogs.create({
        patient_id: patientId,
        type: "payback_loyalty",
        executed_at: new Date().toISOString(),
        metadata: { source: "PaybackAutomationService" },
      });
    } catch (error) {
      logger.warn("[PaybackAutomation] Failed to record trigger log", error, "paybackAutomation");
    }
  }
}
