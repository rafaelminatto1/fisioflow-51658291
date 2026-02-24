/**
 * Exercise Suggestion Flow (Genkit)
 */

import { z } from '../config';
import { ai, gemini15Flash } from '../config';

const ExerciseSuggestionInputSchema = z.object({
    patientId: z.string(),
    goals: z.array(z.string()),
    availableEquipment: z.array(z.string()).optional().default([]),
    treatmentPhase: z.enum(['initial', 'progressive', 'advanced', 'maintenance']).optional().default('initial'),
    painMap: z.record(z.string(), z.number()).optional(),
    sessionCount: z.number().optional().default(0),
});

const ExerciseRecommendationSchema = z.object({
    exerciseId: z.string().optional(),
    name: z.string(),
    category: z.string(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    rationale: z.string(),
    targetArea: z.string(),
    goalsAddressed: z.array(z.string()),
    sets: z.number().optional(),
    reps: z.string().optional(),
    duration: z.number().optional(),
    frequency: z.string().optional(),
    precautions: z.array(z.string()).optional(),
    confidence: z.number().min(0).max(1),
    videoQuery: z.string().optional(),
});

const ExerciseProgramOutputSchema = z.object({
    exercises: z.array(ExerciseRecommendationSchema),
    programRationale: z.string(),
    expectedOutcomes: z.array(z.string()),
    progressionCriteria: z.array(z.string()),
    redFlags: z.array(z.string()).optional(),
    alternatives: z.array(ExerciseRecommendationSchema).optional(),
    estimatedDuration: z.number(),
});

export type ExerciseSuggestionInput = z.infer<typeof ExerciseSuggestionInputSchema>;
export type ExerciseRecommendation = z.infer<typeof ExerciseRecommendationSchema>;
export type ExerciseProgramOutput = z.infer<typeof ExerciseProgramOutputSchema>;

export const exerciseSuggestionFlow = ai.defineFlow(
    {
        name: 'exerciseSuggestion',
        inputSchema: ExerciseSuggestionInputSchema,
        outputSchema: ExerciseProgramOutputSchema,
    },
    async (input: ExerciseSuggestionInput) => {
        const { goals, availableEquipment, treatmentPhase, painMap, sessionCount } = input;

        const maxPainLevel = painMap
            ? Math.max(...Object.values(painMap).map((v: number) => v), 0)
            : 0;

        const prompt = `Como fisioterapeuta especialista, crie um programa de exercícios personalizado:

OBJETIVOS DO TRATAMENTO:
${goals.map((g: string, i: number) => `${i + 1}. ${g}`).join('\n')}

FASE DO TRATAMENTO: ${treatmentPhase}
SESSÕES COMPLETADAS: ${sessionCount}
NÍVEL DE DOR ATUAL: ${maxPainLevel}/10
${painMap ? `MAPA DE DOR: ${JSON.stringify(painMap)}` : ''}

EQUIPAMENTOS DISPONÍVEIS:
${availableEquipment && availableEquipment.length > 0 ? availableEquipment.join(', ') : 'Apenas peso corporal'}

DIRETRIZES:
1. Adapte a dificuldade à fase do tratamento
2. Se dor > 7, priorize exercícios de baixo impacto
3. Use apenas equipamentos disponíveis
4. Inclua progressões claras
5. Forneça precauções de segurança
6. Gere 5-8 exercícios complementares
7. Para videoQuery, use termos em português ou inglês para busca no YouTube

FASES:
- initial: Exercícios suaves, foco em mobilidade e controle motor
- progressive: Aumentar carga e complexidade gradualmente
- advanced: Exercícios funcionais e específicos do esporte/atividade
- maintenance: Manutenção de ganhos e prevenção

Retorne um programa estruturado em JSON.`;

        const { output } = await ai.generate({
            model: gemini15Flash,
            prompt,
            config: {
                temperature: 0.5,
                maxOutputTokens: 3000,
            },
            output: {
                format: 'json',
                schema: ExerciseProgramOutputSchema,
            },
        });

        if (!output) {
            throw new Error('Failed to generate exercise suggestions');
        }

        return output;
    }
);

export const exerciseProgressionFlow = ai.defineFlow(
    {
        name: 'exerciseProgression',
        inputSchema: z.object({
            currentExercise: z.object({
                name: z.string(),
                sets: z.number(),
                reps: z.string(),
                difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
            }),
            patientProgress: z.object({
                painReduction: z.number().min(0).max(10),
                strengthGain: z.enum(['none', 'minimal', 'moderate', 'significant']),
                functionalImprovement: z.enum(['none', 'minimal', 'moderate', 'significant']),
            }),
        }),
        outputSchema: z.object({
            shouldProgress: z.boolean(),
            progressionOptions: z.array(z.object({
                name: z.string(),
                rationale: z.string(),
                sets: z.number(),
                reps: z.string(),
                difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
                videoQuery: z.string(),
            })),
            maintenanceOption: z.object({
                recommendation: z.string(),
                adjustments: z.array(z.string()),
            }),
        }),
    },
    async (input: { currentExercise: { name: string; sets: number; reps: string; difficulty: 'beginner' | 'intermediate' | 'advanced' }; patientProgress: { painReduction: number; strengthGain: 'none' | 'minimal' | 'moderate' | 'significant'; functionalImprovement: 'none' | 'minimal' | 'moderate' | 'significant' } }) => {
        const prompt = `Como fisioterapeuta, avalie se o paciente está pronto para progressão:

EXERCÍCIO ATUAL:
- Nome: ${input.currentExercise.name}
- Séries: ${input.currentExercise.sets}
- Repetições: ${input.currentExercise.reps}
- Dificuldade: ${input.currentExercise.difficulty}

PROGRESSO DO PACIENTE:
- Redução de dor: ${input.patientProgress.painReduction}/10
- Ganho de força: ${input.patientProgress.strengthGain}
- Melhora funcional: ${input.patientProgress.functionalImprovement}

TAREFA:
1. Determine se o paciente deve progredir
2. Se sim, sugira 2-3 opções de progressão
3. Forneça também uma opção de manutenção

Retorne análise estruturada em JSON.`;

        const { output } = await ai.generate({
            model: gemini15Flash,
            prompt,
            config: {
                temperature: 0.4,
                maxOutputTokens: 1500,
            },
            output: {
                format: 'json',
                schema: z.object({
                    shouldProgress: z.boolean(),
                    progressionOptions: z.array(z.object({
                        name: z.string(),
                        rationale: z.string(),
                        sets: z.number(),
                        reps: z.string(),
                        difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
                        videoQuery: z.string(),
                    })),
                    maintenanceOption: z.object({
                        recommendation: z.string(),
                        adjustments: z.array(z.string()),
                    }),
                }),
            },
        });

        if (!output) {
            throw new Error('Failed to generate progression recommendations');
        }

        return output;
    }
);
