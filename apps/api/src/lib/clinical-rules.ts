/**
 * Clinical Rules Engine - Biomechanics 2.0
 * Thresholds and evaluation logic based on clinical literature.
 */

export type ClinicalTestType = "TRENDELENBURG" | "DYNAMIC_VALGUS" | "HOP_TEST" | "GENERIC";

export interface ClinicalTestResult {
  status: "positive" | "negative" | "neutral";
  qualityScore: number; // 0 to 100
  findings: string[];
  recommendationKeywords: string[];
}

export const CLINICAL_THRESHOLDS = {
  TRENDELENBURG: {
    PELVIC_DROP_POSITIVE: 5, // degrees
    STABILITY_IDEAL: 90, // score
  },
  DYNAMIC_VALGUS: {
    MEDIAL_COLLAPSE_POSITIVE: 10, // degrees
    FPPA_MAX_IDEAL: 5, // degrees (Frontal Plane Projection Angle)
  },
  HOP_TEST: {
    ASYMMETRY_MAX: 10, // percentage difference
    STABILIZATION_TIME_IDEAL: 2, // seconds
  },
};

export function evaluateClinicalTest(
  type: ClinicalTestType,
  metrics: Record<string, any>,
): ClinicalTestResult {
  const findings: string[] = [];
  const keywords: string[] = [];
  let status: "positive" | "negative" | "neutral" = "neutral";
  let qualityScore = 100;

  switch (type) {
    case "TRENDELENBURG":
      const pelvicDrop = Math.abs(metrics.pelvicAngle || 0);
      const stability = metrics.stabilityIndex || 100;

      if (pelvicDrop > CLINICAL_THRESHOLDS.TRENDELENBURG.PELVIC_DROP_POSITIVE) {
        status = "positive";
        findings.push(`Queda pélvica significativa de ${pelvicDrop.toFixed(1)}°`);
        keywords.push("glúteo médio", "estabilização de quadril", "abdução");
        qualityScore -= 40;
      } else {
        status = "negative";
        findings.push("Estabilidade pélvica preservada");
        qualityScore -= (pelvicDrop / 5) * 10;
      }
      qualityScore = Math.max(0, qualityScore * (stability / 100));
      break;

    case "DYNAMIC_VALGUS":
      const kneeAngle = metrics.kneeValgusAngle || 0;
      if (kneeAngle > CLINICAL_THRESHOLDS.DYNAMIC_VALGUS.MEDIAL_COLLAPSE_POSITIVE) {
        status = "positive";
        findings.push(`Valgo dinâmico detectado: ${kneeAngle.toFixed(1)}°`);
        keywords.push("valgo dinâmico", "controle motor joelho", "rotação externa");
        qualityScore = Math.max(0, 100 - kneeAngle * 5);
      } else {
        status = "negative";
        findings.push("Alinhamento patelar adequado");
        qualityScore = 100 - kneeAngle;
      }
      break;

    case "HOP_TEST":
      const diff = metrics.lsi || 100; // Limb Symmetry Index
      if (diff < 90) {
        status = "positive"; // Positive for deficit
        findings.push(`Déficit de simetria: LSI de ${diff.toFixed(1)}%`);
        keywords.push("potência muscular", "estabilidade aterrissagem", "pliometria");
        qualityScore = diff;
      } else {
        status = "negative";
        findings.push("Simetria funcional adequada");
        qualityScore = diff;
      }
      break;

    default:
      status = "neutral";
      qualityScore = 80;
  }

  return {
    status,
    qualityScore: Math.round(qualityScore),
    findings,
    recommendationKeywords: keywords,
  };
}
