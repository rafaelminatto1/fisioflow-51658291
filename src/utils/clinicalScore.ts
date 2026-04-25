import { PostureMetric } from "./postureMetrics";

export interface ClinicalPostureScore {
  totalScore: number; // 0-100
  cervicalStressKg: number; // Peso extra estimado na cervical
  postureLevel: "excellent" | "good" | "fair" | "poor";
  recommendations: string[];
}

/**
 * Lógica avançada para calcular o score biomecânico
 */
export function calculateClinicalScore(metrics: PostureMetric[]): ClinicalPostureScore {
  let penalty = 0;
  let cervicalDev = 0;
  const recommendations: string[] = [];

  metrics.forEach((metric) => {
    // Penalidades baseadas em desvios
    if (metric.name === "head_tilt" || metric.name === "shoulder_level") {
      penalty += metric.value * 2; // Cada grau de inclinação lateral tira 2 pontos
    }

    if (metric.name === "forward_head") {
      cervicalDev = metric.value;
      penalty += metric.value * 5; // Anteriorização de cabeça é mais grave
    }
  });

  // Cálculo de estresse cervical (Regra de Kapandji adaptada)
  // Cada 2.5cm (ou approx 10 graus) dobra o peso da cabeça (aprox 5kg)
  const baseHeadWeight = 5.0;
  const extraWeight = (cervicalDev / 10) * baseHeadWeight;
  const totalCervicalStress = baseHeadWeight + extraWeight;

  const totalScore = Math.max(0, 100 - penalty);

  let level: ClinicalPostureScore["postureLevel"] = "poor";
  if (totalScore > 85) level = "excellent";
  else if (totalScore > 70) level = "good";
  else if (totalScore > 50) level = "fair";

  if (cervicalDev > 10) recommendations.push("Exercícios de retração cervical (Chin Tuck)");
  if (totalScore < 70) recommendations.push("Liberação miofascial de trapézio e peitorais");

  return {
    totalScore: Math.round(totalScore),
    cervicalStressKg: Number(totalCervicalStress.toFixed(1)),
    postureLevel: level,
    recommendations,
  };
}
