/**
 * Patient Executive Summary Flow (Genkit)
 * 
 * Gera um resumo executivo do histórico completo do paciente.
 */

import { z } from 'genkit';
import { ai, gemini15Flash } from '../config';

export const patientExecutiveSummaryFlow = ai.defineFlow(
    {
        name: 'patientExecutiveSummary',
        inputSchema: z.object({
            patientName: z.string(),
            condition: z.string(),
            history: z.array(z.object({
                date: z.string(),
                subjective: z.string().optional(),
                objective: z.string().optional(),
                assessment: z.string().optional(),
                plan: z.string().optional(),
                exercises: z.array(z.string()).optional(),
            })),
            goals: z.array(z.string()).optional(),
        }),
        outputSchema: z.object({
            summary: z.string(),
            trends: z.array(z.object({
                metric: z.string(),
                observation: z.string(),
                sentiment: z.enum(['positive', 'neutral', 'negative']),
            })),
            clinicalAdvice: z.string(),
            keyRisks: z.array(z.string()),
        }),
    },
    async (input) => {
        const historyText = input.history.map(h =>
            `Data: ${h.date}
Subjetivo: ${h.subjective || 'N/A'}
Objetivo: ${h.objective || 'N/A'}
Exercícios: ${h.exercises?.join(', ') || 'N/A'}`
        ).join('\n---\n');

        const prompt = `
      Você é um Consultor Sênior de Fisioterapia.
      Analise o histórico abaixo e gere um resumo executivo de alto nível para o terapeuta.
      
      Paciente: ${input.patientName}
      Condição: ${input.condition}
      Metas: ${input.goals?.join(', ') || 'Não especificadas'}
      
      Histórico de Sessões:
      ${historyText}
      
      Objetivo:
      1. Sintetizar a jornada do paciente até agora.
      2. Identificar padrões (ex: dor piora em certas atividades, melhora após certos exercícios).
      3. Destacar riscos (ex: falta de adesão, sintomas atípicos).
      4. Dar um conselho clínico estratégico.

      Responda em PORTUGUÊS.
    `;

        const { output } = await ai.generate({
            model: gemini15Flash,
            prompt: prompt,
            output: {
                format: 'json',
                schema: z.object({
                    summary: z.string(),
                    trends: z.array(z.object({
                        metric: z.string(),
                        observation: z.string(),
                        sentiment: z.enum(['positive', 'neutral', 'negative']),
                    })),
                    clinicalAdvice: z.string(),
                    keyRisks: z.array(z.string()),
                }),
            },
        });

        if (!output) {
            throw new Error('Falha ao gerar resumo executivo');
        }

        return output;
    }
);
