/**
 * Clinical Analysis Flow (Genkit)
 * 
 * Modernized version using Genkit patterns with ai.defineFlow()
 * Replaces direct Vertex AI SDK calls with Genkit abstractions
 */

import { z } from 'zod';
import { gemini15Pro, gemini15Flash } from '@genkit-ai/vertexai';
import { ai } from '../config';

// ============================================================================
// SCHEMAS
// ============================================================================

const ClinicalAnalysisInputSchema = z.object({
    patientId: z.string(),
    currentSOAP: z.object({
        subjective: z.string().optional(),
        objective: z.unknown().optional(),
        assessment: z.string().optional(),
        plan: z.unknown().optional(),
        vitalSigns: z.record(z.unknown()).optional(),
        functionalTests: z.record(z.unknown()).optional(),
    }),
    useGrounding: z.boolean().optional().default(false),
    treatmentDurationWeeks: z.number().optional(),
    redFlagCheckOnly: z.boolean().optional().default(false),
});

const ClinicalAnalysisOutputSchema = z.object({
    analysis: z.object({
        clinicalImpression: z.string(),
        differentialDiagnosis: z.array(z.string()),
        recommendedTests: z.array(z.string()),
        treatmentRecommendations: z.array(z.string()),
        prognosisIndicators: z.object({
            expectedRecoveryTime: z.string(),
            functionalGoals: z.array(z.string()),
            riskFactors: z.array(z.string()),
        }),
        evidenceLevel: z.string(),
    }),
    redFlags: z.array(z.object({
        flag: z.string(),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        recommendation: z.string(),
    })),
    confidence: z.number().min(0).max(1),
});

export type ClinicalAnalysisInput = z.infer<typeof ClinicalAnalysisInputSchema>;
export type ClinicalAnalysisOutput = z.infer<typeof ClinicalAnalysisOutputSchema>;

// ============================================================================
// FLOWS
// ============================================================================

/**
 * Red Flag Check Flow
 * Fast check for critical warning signs using Flash model
 */
export const redFlagCheckFlow = ai.defineFlow(
    {
        name: 'redFlagCheck',
        inputSchema: ClinicalAnalysisInputSchema,
        outputSchema: z.object({
            hasRedFlags: z.boolean(),
            redFlags: z.array(z.object({
                flag: z.string(),
                severity: z.enum(['low', 'medium', 'high', 'critical']),
                recommendation: z.string(),
            })),
        }),
    },
    async (input: ClinicalAnalysisInput) => {
        const prompt = `Como especialista em fisioterapia no Brasil, analise os seguintes dados do paciente para identificar RED FLAGS (sinais de alerta):

DADOS SUBJETIVOS:
${input.currentSOAP.subjective || 'Não informado'}

DADOS OBJETIVOS:
${JSON.stringify(input.currentSOAP.objective || {}, null, 2)}

AVALIAÇÃO:
${input.currentSOAP.assessment || 'Não informado'}

Identifique qualquer sinal de alerta que requeira atenção médica imediata ou investigação adicional.

Retorne um JSON com:
- hasRedFlags: boolean
- redFlags: array de objetos com { flag, severity, recommendation }

Severidades: low, medium, high, critical`;

        const { output } = await ai.generate({
            model: gemini15Flash,
            prompt,
            config: {
                temperature: 0.1,
                maxOutputTokens: 1500,
            },
            output: {
                format: 'json',
                schema: z.object({
                    hasRedFlags: z.boolean(),
                    redFlags: z.array(z.object({
                        flag: z.string(),
                        severity: z.enum(['low', 'medium', 'high', 'critical']),
                        recommendation: z.string(),
                    })),
                }),
            },
        });

        if (!output) {
            throw new Error('Failed to check red flags');
        }

        return output;
    }
);

/**
 * Comprehensive Clinical Analysis Flow
 * Detailed analysis using Pro model with optional grounding
 */
export const clinicalAnalysisFlow = ai.defineFlow(
    {
        name: 'clinicalAnalysis',
        inputSchema: ClinicalAnalysisInputSchema,
        outputSchema: ClinicalAnalysisOutputSchema,
    },
    async (input: ClinicalAnalysisInput) => {
        const prompt = `Como fisioterapeuta especialista no Brasil, realize uma análise clínica completa baseada nos seguintes dados:

PACIENTE ID: ${input.patientId}

DADOS SUBJETIVOS (Queixa do paciente):
${input.currentSOAP.subjective || 'Não informado'}

DADOS OBJETIVOS (Exame físico):
${JSON.stringify(input.currentSOAP.objective || {}, null, 2)}

SINAIS VITAIS:
${JSON.stringify(input.currentSOAP.vitalSigns || {}, null, 2)}

TESTES FUNCIONAIS:
${JSON.stringify(input.currentSOAP.functionalTests || {}, null, 2)}

AVALIAÇÃO PRÉVIA:
${input.currentSOAP.assessment || 'Não informado'}

${input.treatmentDurationWeeks ? `DURAÇÃO DO TRATAMENTO: ${input.treatmentDurationWeeks} semanas` : ''}

DIRETRIZES:
1. Use evidências científicas atualizadas (contexto brasileiro)
2. Considere diagnósticos diferenciais
3. Sugira testes complementares se necessário
4. Forneça recomendações de tratamento baseadas em evidência
5. Indique nível de evidência (A, B, C, D)
6. Identifique fatores de risco e prognóstico

Retorne análise estruturada em JSON conforme o schema.`;

        const { output } = await ai.generate({
            model: gemini15Pro,
            prompt,
            config: {
                temperature: 0.3,
                maxOutputTokens: 3000,
            },
            output: {
                format: 'json',
                schema: ClinicalAnalysisOutputSchema,
            },
        });

        if (!output) {
            throw new Error('Failed to generate clinical analysis');
        }

        return output;
    }
);

/**
 * Combined Flow: Red Flag Check + Full Analysis
 * Optimized workflow that uses Flash for screening, Pro for analysis
 */
export const comprehensiveClinicalFlow = ai.defineFlow(
    {
        name: 'comprehensiveClinical',
        inputSchema: ClinicalAnalysisInputSchema,
        outputSchema: ClinicalAnalysisOutputSchema,
    },
    async (input: ClinicalAnalysisInput) => {
        const redFlagResult = await redFlagCheckFlow(input);
        const analysisResult = await clinicalAnalysisFlow(input);

        return {
            ...analysisResult,
            redFlags: redFlagResult.redFlags,
        };
    }
);
