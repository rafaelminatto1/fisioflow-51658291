/**
 * Patient Progress Analysis Flow (Genkit)
 */

import { z } from '../config';
import { ai, gemini15Flash } from '../config';

/**
 * Analysis flow to determine if patient is progressing well
 */
export const analyzePatientProgressFlow = ai.defineFlow(
    {
        name: 'analyzePatientProgress',
        inputSchema: z.object({
            patientName: z.string(),
            diagnosis: z.string(),
            lastEvolutions: z.array(z.string()), // Last 3 evolutions
            goals: z.array(z.string()), // Patient goals
        }),
        outputSchema: z.object({
            status: z.enum(['evoluindo', 'estagnado', 'regredindo']),
            reasoning: z.string(),
            suggestion: z.string(),
        }),
    },
    async (input) => {
        const prompt = `
      Atue como um Supervisor Clínico de Fisioterapia.
      
      Paciente: ${input.patientName}
      Diagnóstico: ${input.diagnosis}
      Metas: ${input.goals.join(', ')}
      
      Últimas Evoluções (da mais antiga para a mais recente):
      ${input.lastEvolutions.map((e, i) => `${i + 1}. ${e}`).join('\n')}
      
      Analise se o paciente está progredindo em direção às metas.
      Seja crítico. Identifique estagnação.
      
      Retorne um JSON com:
      - status: 'evoluindo' | 'estagnado' | 'regredindo'
      - reasoning: explicação detalhada
      - suggestion: sugestão clínica para a próxima sessão
    `;

        const { output } = await ai.generate({
            model: gemini15Flash,
            prompt: prompt,
            output: {
                format: 'json',
                schema: z.object({
                    status: z.enum(['evoluindo', 'estagnado', 'regredindo']),
                    reasoning: z.string(),
                    suggestion: z.string(),
                }),
            },
        });

        if (!output) {
            throw new Error('Falha ao gerar análise de IA');
        }

        return output;
    }
);
