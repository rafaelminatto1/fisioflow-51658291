import { fetchApi } from "@/lib/api";
import { generateEvolutionTextSummary, generateHomeExercisesTextSummary } from "./pdfGenerator";
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
      await fetchApi("/api/whatsapp/messages", {
        method: "POST",
        data: {
          patient_id: patient.id,
          message_content: messageContent,
          to_phone: patient.phone,
          message_type: "clinical_report",
        },
      });

      return { success: true, message: "Relatório enviado com sucesso via WhatsApp!" };
    } catch (error: any) {
      console.error("[reportSharingService] Error:", error);
      throw new Error(error.message || "Falha ao processar e enviar o relatório.");
    }
  },

  /**
   * Sends home exercise prescription via WhatsApp.
   */
  async shareHomeExercisesViaWhatsApp(
    patient: Patient,
    homeExercises: Array<{ name: string; frequency?: string; detail?: string; prescription?: string }>,
    therapistId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const messageContent = generateHomeExercisesTextSummary(patient, homeExercises);

      await fetchApi("/api/whatsapp/messages", {
        method: "POST",
        data: {
          patient_id: patient.id,
          message_content: messageContent,
          to_phone: patient.phone,
          message_type: "exercise_prescription",
        },
      });

      return { success: true, message: "Exercícios para casa enviados com sucesso via WhatsApp!" };
    } catch (error: any) {
      console.error("[reportSharingService] Error sharing home exercises:", error);
      throw new Error(error.message || "Falha ao enviar exercícios para casa.");
    }
  },
};

