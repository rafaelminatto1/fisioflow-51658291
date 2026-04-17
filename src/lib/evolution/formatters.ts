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
      .filter(([_, value]) => value && value !== "")
      .map(([key, value]) => ({
        label: clinicalLabels[key] || key,
        value: String(value),
      }));
  }
  return text || "";
};
