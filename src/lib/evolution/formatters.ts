/**
 * Evolution Formatters - Utilities for formatting clinical notes and other data
 */

export const clinicalLabels: Record<string, string> = {
  notes: "Notas",
  painScale: "Escala de Dor (EVA)",
  complaints: "Queixas",
  perceivedEvolution: "Evolução Percebida",
  assessment: "Avaliação",
  subjective: "Subjetivo",
  objective: "Objetivo",
  plan: "Plano",
  measurements: "Medições",
  physicalExam: "Exame Físico",
  observation: "Observação",
  recommendations: "Recomendações",
};

/**
 * Parses a string to see if it's JSON and returns the object, or null if not JSON.
 */
export const tryParseJSON = (text: string | undefined): any | null => {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      return null;
    }
  }
  return null;
};

/**
 * Formats a JSON string or plain text into a structured summary.
 */
export const formatClinicalSummary = (text: string | undefined): { label: string; value: string }[] | string => {
  const data = tryParseJSON(text);
  if (data && typeof data === "object") {
    return Object.entries(data)
      .filter(([_, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => {
        let displayValue = "";
        
        if (Array.isArray(value)) {
          displayValue = value
            .map((item: any) => {
              if (typeof item === "object" && item !== null) {
                if (item.name && item.value) {
                  return `${item.name}: ${item.value}${item.unit ? " " + item.unit : ""}`;
                }
                return JSON.stringify(item);
              }
              return String(item);
            })
            .join(", ");
        } else if (typeof value === "object" && value !== null) {
          displayValue = JSON.stringify(value);
        } else {
          displayValue = String(value);
        }

        return {
          label: clinicalLabels[key] || key,
          value: displayValue,
        };
      });
  }
  return text || "";
};

/**
 * Formats a clinical string (potentially JSON) into a single human-readable string.
 */
export const formatClinicalText = (text: string | undefined): string => {
  const summary = formatClinicalSummary(text);
  if (Array.isArray(summary)) {
    return summary
      .map((item) => `${item.label}: ${item.value}`)
      .join("\n");
  }
  return summary;
};
