/**
 * Multimodal Analysis Flow (Genkit)
 * Uses Gemini 1.5 Pro to analyze clinical images and videos
 */

import { z } from 'genkit';
import { ai, gemini15Pro } from '../config';

export const MultimodalAnalysisInputSchema = z.object({
    patientId: z.string(),
    type: z.enum(['posture', 'exam', 'movement', 'wound']),
    mediaUrl: z.string().url(), // Can be a Cloud Storage signed URL or public URL
    contentType: z.string().optional().default('image/jpeg'),
    notes: z.string().optional(),
});

export const MultimodalAnalysisOutputSchema = z.object({
    findings: z.array(z.string()),
    severity: z.enum(['low', 'moderate', 'high', 'urgent']),
    clinicalSummary: z.string(),
    suggestions: z.array(z.string()),
    disclaimer: z.string(),
});

export type MultimodalAnalysisInput = z.infer<typeof MultimodalAnalysisInputSchema>;
export type MultimodalAnalysisOutput = z.infer<typeof MultimodalAnalysisOutputSchema>;

export const multimodalAnalysisFlow = ai.defineFlow(
    {
        name: 'multimodalAnalysis',
        inputSchema: MultimodalAnalysisInputSchema,
        outputSchema: MultimodalAnalysisOutputSchema,
    },
    async (input: MultimodalAnalysisInput) => {
        const { type, mediaUrl, contentType, notes } = input;

        let systemPrompt = '';
        
        switch (type) {
            case 'posture':
                systemPrompt = 'Você é um especialista em biomecânica e fisioterapia. Analise esta foto de postura procurando por desvios como escoliose, hipercifose, inclinação pélvica ou assimetrias de ombro.';
                break;
            case 'exam':
                systemPrompt = 'Você é um radiologista e fisioterapeuta. Analise este exame (raio-x, ressonância ou laudo) e identifique achados clínicos relevantes para a reabilitação física.';
                break;
            case 'movement':
                systemPrompt = 'Você é especialista em análise de movimento. Analise este vídeo ou sequência de fotos de um exercício e identifique erros de execução, compensações ou limitações de amplitude.';
                break;
            default:
                systemPrompt = 'Analise esta imagem clínica e forneça achados relevantes para fisioterapia.';
        }

        systemPrompt += `\n\nNotas adicionais do terapeuta: ${notes || 'Nenhuma'}`;

        const { output } = await ai.generate({
            model: gemini15Pro,
            prompt: [
                { text: systemPrompt },
                { media: { url: mediaUrl, contentType: contentType } }
            ],
            config: {
                temperature: 0.2, // Low temperature for clinical accuracy
            },
            output: {
                format: 'json',
                schema: MultimodalAnalysisOutputSchema,
            },
        });

        if (!output) {
            throw new Error('Falha ao processar análise multimodal');
        }

        return {
            ...output,
            disclaimer: 'ESTA É UMA ANÁLISE AUXILIAR GERADA POR IA. O diagnóstico final deve ser feito por um profissional de saúde qualificado.'
        };
    }
);
