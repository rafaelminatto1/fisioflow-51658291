
// Definição do Exercício Individual

import { z } from '../ai/config';

export const ExerciseSchema = z.object({
  name: z.string().describe('Nome do exercício, ex: "Agachamento Livre"'),
  sets: z.number().int().min(1).describe('Número de séries'),
  reps: z.string().describe('Repetições ou tempo, ex: "12 reps" ou "30 seg"'),
  rest: z.string().describe('Tempo de descanso, ex: "60s"'),
  notes: z.string().optional().describe('Dica de execução curta, ex: "Mantenha a coluna reta"'),
  videoQuery: z.string().describe('Termo de busca otimizado para encontrar vídeo deste exercício no YouTube'),
});

// Definição do Plano Completo
export const ExercisePlanSchema = z.object({
  planName: z.string().describe('Nome criativo do plano, ex: "Reabilitação Lombar Fase 1"'),
  goal: z.string().describe('Objetivo principal do plano'),
  frequency: z.string().describe('Frequência sugerida, ex: "3x por semana"'),
  durationWeeks: z.number().int().describe('Duração estimada do programa em semanas'),
  exercises: z.array(ExerciseSchema).describe('Lista de exercícios do plano'),
  warmup: z.string().describe('Sugestão rápida de aquecimento'),
  cooldown: z.string().describe('Sugestão rápida de resfriamento/alongamento final'),
});

// Input para o gerador (O que o frontend envia)
export const GeneratePlanInputSchema = z.object({
  patientName: z.string(),
  age: z.number().optional(),
  condition: z.string().describe('Condição clínica ou lesão, ex: "Tendinite patelar"'),
  painLevel: z.number().min(0).max(10).describe('Nível de dor atual (0-10)'),
  equipment: z.array(z.string()).describe('Equipamentos disponíveis, ex: ["elástico", "halteres", "nenhum"]'),
  goals: z.string().describe('Objetivo do paciente, ex: "Voltar a correr"'),
  limitations: z.string().optional().describe('Limitações específicas, ex: "Não pode pular"'),
});

export type ExercisePlan = z.infer<typeof ExercisePlanSchema>;
export type GeneratePlanInput = z.infer<typeof GeneratePlanInputSchema>;