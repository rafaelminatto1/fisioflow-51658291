"use strict";
// Definição do Exercício Individual
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneratePlanInputSchema = exports.ExercisePlanSchema = exports.ExerciseSchema = void 0;
var genkit_1 = require("genkit");
exports.ExerciseSchema = genkit_1.z.object({
    name: genkit_1.z.string().describe('Nome do exercício, ex: "Agachamento Livre"'),
    sets: genkit_1.z.number().int().min(1).describe('Número de séries'),
    reps: genkit_1.z.string().describe('Repetições ou tempo, ex: "12 reps" ou "30 seg"'),
    rest: genkit_1.z.string().describe('Tempo de descanso, ex: "60s"'),
    notes: genkit_1.z.string().optional().describe('Dica de execução curta, ex: "Mantenha a coluna reta"'),
    videoQuery: genkit_1.z.string().describe('Termo de busca otimizado para encontrar vídeo deste exercício no YouTube'),
});
// Definição do Plano Completo
exports.ExercisePlanSchema = genkit_1.z.object({
    planName: genkit_1.z.string().describe('Nome criativo do plano, ex: "Reabilitação Lombar Fase 1"'),
    goal: genkit_1.z.string().describe('Objetivo principal do plano'),
    frequency: genkit_1.z.string().describe('Frequência sugerida, ex: "3x por semana"'),
    durationWeeks: genkit_1.z.number().int().describe('Duração estimada do programa em semanas'),
    exercises: genkit_1.z.array(exports.ExerciseSchema).describe('Lista de exercícios do plano'),
    warmup: genkit_1.z.string().describe('Sugestão rápida de aquecimento'),
    cooldown: genkit_1.z.string().describe('Sugestão rápida de resfriamento/alongamento final'),
});
// Input para o gerador (O que o frontend envia)
exports.GeneratePlanInputSchema = genkit_1.z.object({
    patientName: genkit_1.z.string(),
    age: genkit_1.z.number().optional(),
    condition: genkit_1.z.string().describe('Condição clínica ou lesão, ex: "Tendinite patelar"'),
    painLevel: genkit_1.z.number().min(0).max(10).describe('Nível de dor atual (0-10)'),
    equipment: genkit_1.z.array(genkit_1.z.string()).describe('Equipamentos disponíveis, ex: ["elástico", "halteres", "nenhum"]'),
    goals: genkit_1.z.string().describe('Objetivo do paciente, ex: "Voltar a correr"'),
    limitations: genkit_1.z.string().optional().describe('Limitações específicas, ex: "Não pode pular"'),
});
