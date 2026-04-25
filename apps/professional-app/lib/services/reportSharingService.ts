import { fetchApi } from "@/lib/api";
import { generateEvolutionTextSummary } from "./pdfGenerator";
import type { Patient, Evolution } from "@/types";

/**
 * Service to orchestrate clinical report generation, saving, and sharing.
 */
export const reportSharingService = {
  /**
   * Generates a text summary, saves the emission record, and sends via WhatsApp.
   */
  async shareEvolutionViaWhatsApp(
    patient: Patient,
    evolution: Evolution,
    therapistId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Generate the professional text
      const messageContent = generateEvolutionTextSummary(patient, evolution);

      // 2. Save the report emission record to Neon DB
      // Note: Using the direct clinical API endpoint for generated reports
      await fetchApi("/api/clinical/generated-reports", {
        method: "POST",
        data: {
          patient_id: patient.id,
          report_type: "evolution",
          content: messageContent,
          metadata: {
            evolutionId: evolution.id,
            therapistId: therapistId,
            painLevel: evolution.painLevel,
          },
        },
      });

      // 3. Send via WhatsApp API
      // Using the integrated communications endpoint
      await fetchApi("/api/whatsapp/messages", {
        method: "POST",
        data: {
          patient_id: patient.id,
          message_content: messageContent,
          to_phone: patient.phone, // Automated fallback in backend if missing
          message_type: "clinical_report",
        },
      });

      return { success: true, message: "Relatório enviado com sucesso via WhatsApp!" };
    } catch (error: any) {
      console.error("[reportSharingService] Error:", error);
      throw new Error(error.message || "Falha ao processar e enviar o relatório.");
    }
  },
};
