export interface PatientFeatures {
  recentNoShows: number;
  recentCancellations: number;
  sessionsWithoutEvolution: number;
  daysSinceLastSession: number;
  hasFutureSession: boolean;
  painVariation: number; // Ex: -3 (melhorou), +2 (piorou)
  totalSessions: number;
}

export interface RiskScores {
  noShowRisk: number;       // 0-100
  dropoutRisk: number;      // 0-100
  nonAdherenceRisk: number; // 0-100
  needsActiveContact: boolean;
}

/**
 * Calculadora Heurística de Risco (Machine Learning Leve / Based-Rules).
 * Motor determinístico sem LLM.
 */
export function calculatePatientRisks(features: PatientFeatures): RiskScores {
  let noShowRisk = 0;
  let dropoutRisk = 0;
  let nonAdherenceRisk = 0;

  // 1. No-Show Risk (Risco de Falta)
  noShowRisk += features.recentNoShows * 25; 
  noShowRisk += features.recentCancellations * 10;
  if (!features.hasFutureSession) {
    noShowRisk += 20;
  }
  
  // 2. Dropout Risk (Risco de Abandono Definitivo)
  if (features.daysSinceLastSession > 14 && !features.hasFutureSession) {
    dropoutRisk += 40;
  }
  if (features.daysSinceLastSession > 30) {
    dropoutRisk += 30; // acumulativo
  }
  if (features.painVariation < -4 && features.totalSessions > 5 && !features.hasFutureSession) {
    // Paciente melhorou muito e não tem próxima -> Alta probabilidade de achar que teve "alta sozinho"
    dropoutRisk += 50; 
  }
  if (features.painVariation > 2) {
    // Paciente piorando e faltando
    dropoutRisk += features.recentNoShows * 15;
  }

  // 3. Non-Adherence Risk (Falta de engajamento no tratamento)
  nonAdherenceRisk += features.sessionsWithoutEvolution * 10;
  nonAdherenceRisk += features.recentCancellations * 15;
  
  // Normalização
  const normalize = (val: number) => Math.min(Math.max(val, 0), 100);
  
  noShowRisk = normalize(noShowRisk);
  dropoutRisk = normalize(dropoutRisk);
  nonAdherenceRisk = normalize(nonAdherenceRisk);

  const needsActiveContact = (dropoutRisk > 70) || (noShowRisk > 60);

  return {
    noShowRisk,
    dropoutRisk,
    nonAdherenceRisk,
    needsActiveContact
  };
}

/**
 * Opcional: Explicação usando AI Router.
 * APENAS acionado se o fisioterapeuta clicar em "Explicar Risco".
 */
export async function explainRiskWithAI(
  router: any, // AIRouter instance
  features: PatientFeatures, 
  scores: RiskScores
): Promise<string> {
  const prompt = `
O paciente atingiu os seguintes scores de risco (0-100):
- Faltar (No-Show): ${scores.noShowRisk}
- Abandonar (Dropout): ${scores.dropoutRisk}
- Não-Aderência: ${scores.nonAdherenceRisk}

Contexto (Features):
- Faltas recentes: ${features.recentNoShows}
- Tem próxima sessão agendada? ${features.hasFutureSession ? "Sim" : "Não"}
- Dias desde a última sessão: ${features.daysSinceLastSession}
- Variação de Dor (negativo é melhor): ${features.painVariation}

Explique brevemente de forma humana e profissional por que esses scores estão assim e sugira uma ação para a recepção/fisioterapeuta.
  `;

  return await router.run(prompt, "workers-ai"); // Usa modelo barato
}
