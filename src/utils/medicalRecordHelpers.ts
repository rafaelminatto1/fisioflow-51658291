/**
 * Medical Record Helpers
 *
 * Helper functions for saving medical record data
 * Legacy helper kept for compatibility.
 * The active flows now save these entities through the Workers/Neon routes.
 */

import { toast } from "sonner";
import { fisioLogger as logger } from "@/lib/errors/logger";

export interface Surgery {
  name: string;
  date: string;
  surgeon: string;
  hospital: string;
  notes?: string;
}

export interface Goal {
  description: string;
  targetDate: string;
}

export interface Pathology {
  name: string;
  status: "active" | "treated";
  diagnosedAt: string;
}

const unsupportedLegacyHelper = (action: string) => {
  const error = new Error(
    `${action} não é mais suportado por este helper legado. Use os serviços Workers/Neon do domínio de evolução.`,
  );
  logger.error(
    `[medicalRecordHelpers] ${action} helper legado acionado`,
    error,
    "medicalRecordHelpers",
  );
  toast.error(`Fluxo legado de ${action.toLowerCase()} não suportado.`);
  throw error;
};

/**
 * Save surgeries for a medical record
 * @param recordId - Medical record ID
 * @param newSurgeries - Array of surgeries to save
 */
export const saveSurgeries = async (_recordId: string, _newSurgeries: Surgery[]) => {
  unsupportedLegacyHelper("Salvar cirurgias");
};

/**
 * Save goals for a medical record
 * @param recordId - Medical record ID
 * @param newGoals - Array of goals to save
 */
export const saveGoals = async (_recordId: string, _newGoals: Goal[]) => {
  unsupportedLegacyHelper("Salvar objetivos");
};

/**
 * Save pathologies for a medical record
 * @param recordId - Medical record ID
 * @param newPathologies - Array of pathologies to save
 */
export const savePathologies = async (_recordId: string, _newPathologies: Pathology[]) => {
  unsupportedLegacyHelper("Salvar patologias");
};
