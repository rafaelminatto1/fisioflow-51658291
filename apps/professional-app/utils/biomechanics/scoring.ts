export type RiskLevel = "low" | "moderate" | "high";

/**
 * Assimetria percentual entre lados esquerdo e direito (0–100%).
 */
export const calculateAsymmetry = (left: number, right: number): number => {
  if (left === 0 && right === 0) return 0;
  const max = Math.max(Math.abs(left), Math.abs(right));
  const min = Math.min(Math.abs(left), Math.abs(right));
  if (max === 0) return 0;
  return Math.round(((max - min) / max) * 1000) / 10;
};

/**
 * Classifica o risco clínico a partir da assimetria percentual.
 * Limiares baseados em referências de assimetria de membros inferiores
 * (≥15% costuma ser sinalizado como déficit relevante).
 */
export const evaluateRisk = (asymmetry: number): RiskLevel => {
  if (asymmetry >= 15) return "high";
  if (asymmetry >= 8) return "moderate";
  return "low";
};
