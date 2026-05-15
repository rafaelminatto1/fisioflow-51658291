/**
 * Biomechanical Asymmetry and Scoring Utilities
 */

/**
 * Calculates the percentage of asymmetry between two values (left vs right)
 * Formula: |(L - R) / max(L, R)| * 100
 */
export function calculateAsymmetry(left: number, right: number): number {
  if (left === 0 && right === 0) return 0;

  const diff = Math.abs(left - right);
  const max = Math.max(Math.abs(left), Math.abs(right));

  return (diff / max) * 100;
}

/**
 * Evaluates the clinical risk based on asymmetry percentage
 */
export function evaluateRisk(asymmetry: number): "low" | "moderate" | "high" {
  if (asymmetry < 10) return "low";
  if (asymmetry < 15) return "moderate";
  return "high";
}

/**
 * Common Gait (Marcha) Metrics
 */
export interface GaitMetrics {
  stepLengthLeft: number;
  stepLengthRight: number;
  cadence: number; // steps per minute
}

export function analyzeGait(metrics: GaitMetrics) {
  const asymmetry = calculateAsymmetry(metrics.stepLengthLeft, metrics.stepLengthRight);
  return {
    asymmetry,
    risk: evaluateRisk(asymmetry),
    isNormal: asymmetry < 10,
  };
}
