/**
 * Patient Executive Summary Flow (Genkit)
 * 
 * Gera um resumo executivo do histórico completo do paciente.
 * Versão Otimizada com Prompt Avançado.
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
            summary: z.string().describe("Resumo narrativo conciso do progresso (2-3 frases)"),
            trends: z.array(z.object({
                metric: z.string(),
                observation: z.string(),
                sentiment: z.enum(['positive', 'neutral', 'negative']),
            })).describe("Lista de tendências observadas (ex: dor, amplitude de movimento)"),
            clinicalAdvice: z.string().describe("Recomendação clínica acionável"),
            keyRisks: z.array(z.string()).describe("Lista de riscos ou alertas"),
        }),
    },
    async (input) => {
        // Validação e formatação do histórico
        let historyText = "Nenhum histórico disponível.";
        
        if (input.history && input.history.length > 0) {
            // Ordenar por data (mais recente primeiro se não estiver ordenado, mas geralmente enviamos ordenado)
            // Assumindo que o frontend envia ordenado ou que a IA consegue lidar.
            // Limitando o histórico para não estourar tokens se for muito grande
            const recentHistory = input.history.slice(0, 10); // Últimas 10 sessões
            
            historyText = recentHistory.map(h =>
                `Sessão (${h.date}):
   - Subjetivo: ${h.subjective || '-'}
   - Objetivo: ${h.objective || '-'}
   - Exercícios: ${h.exercises?.join(', ') || '-'}`
            ).join('\n\n');
        }

        const prompt = `
Role: Fisioterapeuta Sênior Especialista em Análise de Dados Clínicos.
Task: Gerar um resumo executivo de alta qualidade para o fisioterapeuta responsável.

Patient Context:
- Nome: ${input.patientName}
- Condição Principal: ${input.condition}
- Metas: ${input.goals?.length ? input.goals.join(', ') : 'Não definidas'}

Clinical History (Últimas sessões):
${historyText}

Instructions:
1. SUMMARY: Escreva um parágrafo curto (2-3 frases) sintetizando o estado atual do paciente e a progressão recente. Seja direto.
2. TRENDS: Identifique padrões claros nos dados (ex: "Dor diminuiu 50% nas últimas 3 semanas", "ADM de flexão estagnada em 90º"). Classifique o sentimento.
3. ADVICE: Sugira o próximo passo clínico lógico (ex: "Progredir carga em cadeia cinética fechada", "Reavaliar técnica de agachamento").
4. RISKS: Cite riscos potenciais baseados no histórico (ex: "Relato de dor tardia sugere sobrecarga", "Baixa adesão aos exercícios domiciliares").

Output Format: JSON estrito conforme schema.
Language: Portuguese (Brasil).
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
            throw new Error('Falha ao gerar resumo executivo. Tente novamente.');
        }

        return output;
    }
);
