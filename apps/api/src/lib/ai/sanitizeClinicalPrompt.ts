import { redactPII, replacePatientName } from "./piiRedaction";
import { AIRouterError } from "./aiErrors";
import { DataExposureLevel } from "./aiTasks";

export interface SanitizationConfig {
  patientName?: string;
  level: DataExposureLevel;
  provider: string; // "workers-ai", "google", etc.
}

export interface SanitizeResult {
  sanitizedPrompt: string;
  redactedEntities: string[];
}

export function sanitizePrompt(prompt: string, config: SanitizationConfig): SanitizeResult {
  try {
    if (config.level === "none") {
      // Strict redaction even if level is none just to be safe
      const { text, redactedEntities } = redactPII(prompt);
      return { sanitizedPrompt: text, redactedEntities };
    }

    if (config.level === "full_internal_only") {
      if (config.provider !== "workers-ai") {
        throw new AIRouterError("Nível full_internal_only é permitido apenas para provedores internos (Workers AI). Vazamento evitado.", "EXPOSURE_VIOLATION");
      }
      return { sanitizedPrompt: prompt, redactedEntities: [] };
    }

    // For minimal or clinical_context, we perform full redaction and name replacement
    let currentText = prompt;
    
    if (config.patientName) {
      currentText = replacePatientName(currentText, config.patientName, "Paciente");
    }
    
    const { text, redactedEntities } = redactPII(currentText);
    
    if (config.patientName && currentText !== prompt) {
      if (!redactedEntities.includes("NAME")) redactedEntities.push("NAME");
    }

    return { sanitizedPrompt: text, redactedEntities };
  } catch (e: any) {
    if (e instanceof AIRouterError) throw e;
    throw new AIRouterError("Falha na sanitização de PII. A requisição foi bloqueada por segurança.", "SANITIZATION_FAILED", e.message);
  }
}
