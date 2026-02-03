import { genkit, z } from 'genkit';
import { googleAI, gemini15Flash } from '@genkit-ai/googleai';

/**
 * AI LOGIC FLOW: Analisador de Progresso Clínico
 * Este fluxo detecta se o paciente está estagnado baseado nas metas.
 */
export const ai = genkit({
  plugins: [googleAI()],
});

export const clinicalAlertFlow = ai.defineFlow(
  {
    name: 'clinicalAlertFlow',
    inputSchema: z.object({
      currentEvolution: z.string(),
      patientGoals: z.array(z.string()),
      historySummary: z.string()
    }),
    outputSchema: z.object({
      requiresAlert: z.boolean(),
      reason: z.string(),
      suggestion: z.string()
    })
  },
  async (input) => {
    const response = await ai.generate({
      model: gemini15Flash,
      system: 'Você é um supervisor de clínica de fisioterapia. Seu objetivo é identificar falta de progresso.',
      prompt: `
        Histórico: ${input.historySummary}
        Metas: ${input.patientGoals.join(', ')}
        Nova Evolução: ${input.currentEvolution}
        
        O paciente está progredindo em direção às metas? Se houver estagnação ou piora, gere um alerta.
        Responda em formato JSON.
      `,
      output: { format: 'json' }
    });

    return response.output as any;
  }
);
