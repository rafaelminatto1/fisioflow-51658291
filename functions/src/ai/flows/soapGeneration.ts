/**
 * SOAP Note Generation Flow (Genkit)
 */

import { z } from 'zod';
import { gemini15Flash } from '@genkit-ai/vertexai';
import { ai } from '../config';

const SoapGenerationInputSchema = z.object({
    patientContext: z.object({
        patientName: z.string(),
        condition: z.string(),
        sessionNumber: z.number(),
    }),
    subjective: z.string().optional(),
    objective: z.string().optional(),
    assistantNeeded: z.enum(['assessment', 'plan', 'both', 'full']),
});

const SoapNoteOutputSchema = z.object({
    subjective: z.string().optional(),
    objective: z.string().optional(),
    assessment: z.string(),
    plan: z.string(),
    generatedSections: z.array(z.string()),
    confidence: z.number().min(0).max(1),
});

export type SoapGenerationInput = z.infer<typeof SoapGenerationInputSchema>;
export type SoapNoteOutput = z.infer<typeof SoapNoteOutputSchema>;

export const soapGenerationFlow = ai.defineFlow(
    {
        name: 'soapGeneration',
        inputSchema: SoapGenerationInputSchema,
        outputSchema: SoapNoteOutputSchema,
    },
    async (input: SoapGenerationInput) => {
        const { patientContext, subjective, objective, assistantNeeded } = input;

        let prompt = `Como fisioterapeuta experiente, complete a nota SOAP para o seguinte paciente:

CONTEXTO DO PACIENTE:
- Nome: ${patientContext.patientName}
- Condição: ${patientContext.condition}
- Sessão #${patientContext.sessionNumber}

`;

        if (subjective) {
            prompt += `SUBJETIVO (S) - Já fornecido:\n${subjective}\n\n`;
        }

        if (objective) {
            prompt += `OBJETIVO (O) - Já fornecido:\n${objective}\n\n`;
        }

        switch (assistantNeeded) {
            case 'assessment':
                prompt += `TAREFA: Gere apenas a seção AVALIAÇÃO (A) baseada nos dados S e O acima.`;
                break;
            case 'plan':
                prompt += `TAREFA: Gere apenas a seção PLANO (P) baseada nos dados S, O e A acima.`;
                break;
            case 'both':
                prompt += `TAREFA: Gere as seções AVALIAÇÃO (A) e PLANO (P) baseadas nos dados S e O acima.`;
                break;
            case 'full':
                prompt += `TAREFA: Gere uma nota SOAP completa (S, O, A, P). Use os dados fornecidos e complete o que falta.`;
                break;
        }

        prompt += `\n\nDIRETRIZES:\n1. Use terminologia profissional de fisioterapia\n2. Seja específico e objetivo\n3. Baseie-se em evidências clínicas\n4. Inclua metas mensuráveis no Plano\n5. Mantenha tom profissional mas empático\n\nFORMATO DE SAÍDA:\nRetorne um JSON com as seções geradas e um score de confiança (0-1).`;

        const { output } = await ai.generate({
            model: gemini15Flash,
            prompt,
            config: {
                temperature: 0.4,
                maxOutputTokens: 1500,
            },
            output: {
                format: 'json',
                schema: SoapNoteOutputSchema,
            },
        });

        if (!output) {
            throw new Error('Failed to generate SOAP note');
        }

        return output;
    }
);

export const soapEnhancementFlow = ai.defineFlow(
    {
        name: 'soapEnhancement',
        inputSchema: z.object({
            existingSOAP: z.object({
                subjective: z.string(),
                objective: z.string(),
                assessment: z.string(),
                plan: z.string(),
            }),
            enhancementType: z.enum(['clarity', 'detail', 'professional', 'evidence']),
        }),
        outputSchema: z.object({
            enhanced: z.object({
                subjective: z.string(),
                objective: z.string(),
                assessment: z.string(),
                plan: z.string(),
            }),
            improvements: z.array(z.string()),
        }),
    },
    async (input: { existingSOAP: { subjective: string; objective: string; assessment: string; plan: string }; enhancementType: 'clarity' | 'detail' | 'professional' | 'evidence' }) => {
        const enhancementPrompts: Record<string, string> = {
            clarity: 'Melhore a clareza e organização',
            detail: 'Adicione mais detalhes clínicos relevantes',
            professional: 'Ajuste para tom mais profissional',
            evidence: 'Adicione referências a evidências científicas',
        };

        const prompt = `${enhancementPrompts[input.enhancementType]} da seguinte nota SOAP:

SUBJETIVO:\n${input.existingSOAP.subjective}

OBJETIVO:\n${input.existingSOAP.objective}

AVALIAÇÃO:\n${input.existingSOAP.assessment}

PLANO:\n${input.existingSOAP.plan}

Retorne a nota SOAP aprimorada e uma lista das melhorias feitas.`;

        const { output } = await ai.generate({
            model: gemini15Flash,
            prompt,
            config: {
                temperature: 0.3,
                maxOutputTokens: 2000,
            },
            output: {
                format: 'json',
                schema: z.object({
                    enhanced: z.object({
                        subjective: z.string(),
                        objective: z.string(),
                        assessment: z.string(),
                        plan: z.string(),
                    }),
                    improvements: z.array(z.string()),
                }),
            },
        });

        if (!output) {
            throw new Error('Failed to enhance SOAP note');
        }

        return output;
    }
);
