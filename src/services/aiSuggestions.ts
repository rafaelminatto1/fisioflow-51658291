import { Exercise } from "@/types";

// Mapeamento clínico de patologias para tipos de exercícios
const PROTOCOLS: Record<string, { categories: string[]; minScore: number }> = {
  "dor-lombar": {
    categories: ["Mobilidade", "Estabilização", "Core"],
    minScore: 85,
  },
  cervicalgia: {
    categories: ["Mobilidade", "Liberação", "Postural"],
    minScore: 80,
  },
  "pos-op-joelho": {
    categories: ["Fortalecimento", "Isometria"],
    minScore: 90,
  },
};

export function getAISuggestions(diagnosis: string, allExercises: Exercise[]): Exercise[] {
  const protocol = PROTOCOLS[diagnosis.toLowerCase()] || PROTOCOLS["dor-lombar"];

  return allExercises
    .filter((ex) => protocol.categories.some((cat) => ex.category?.includes(cat)))
    .slice(0, 4)
    .map((ex) => ({
      ...ex,
      // Simulando meta-dados de IA
      aiMetadata: {
        score: Math.floor(Math.random() * (100 - protocol.minScore + 1) + protocol.minScore),
        reason: "Baseado no protocolo de 12 semanas para " + diagnosis,
      },
    }));
}
