
// Inicializa o Genkit

import { genkit, z } from 'genkit';
import { googleAI, gemini15Flash } from '@genkit-ai/googleai';
import { logger } from '../lib/logger';
import { onCall } from 'firebase-functions/v2/https';

const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })],
});

/**
 * Flow: Analisa se o paciente está evoluindo bem
 */
export const analyzePatientProgressFlow = ai.defineFlow(
  {
    name: 'analyzePatientProgress',
    inputSchema: z.object({
      patientName: z.string(),
      diagnosis: z.string(),
      lastEvolutions: z.array(z.string()), // Últimas 3 evoluções
      goals: z.array(z.string()) // Metas do paciente
    }),
    outputSchema: z.object({
      status: z.enum(['evoluindo', 'estagnado', 'regredindo']),
      reasoning: z.string(),
      suggestion: z.string()
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
    `;

    const { output } = await ai.generate({
      model: gemini15Flash,
      prompt: prompt,
      output: { format: 'json' } // Força saída JSON estruturada
    });

    if (!output) {
      throw new Error('Falha ao gerar análise de IA');
    }

    return output as any; // Cast necessário pois o output é inferido
  }
);

/**
 * Wrapper Callable para o Frontend chamar
 */
export const analyzeProgressLegacy = onCall(
  { cpu: 2, memory: '1GiB' },
  async (request) => {
    if (!request.auth) {
      throw new Error('Unauthorized');
    }

    // Schema de validação do Request (espelho do Input do Flow)
    const RequestSchema = z.object({
      patientName: z.string().min(1),
      diagnosis: z.string().min(1),
      lastEvolutions: z.array(z.string()).min(1, 'Pelo menos uma evolução é necessária'),
      goals: z.array(z.string()).min(1, 'Pelo menos uma meta é necessária')
    });

    try {
      // Validar input antes de chamar a IA (Economia de custos/erros)
      const validData = RequestSchema.parse(request.data);

      // Executar o flow
      const result = await analyzePatientProgressFlow(validData);
      return result;
    } catch (e: any) {
      logger.error('Genkit flow failed', e);

      if (e instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${e.issues.map((err: any) => err.message).join(', ')}`);
      }

      throw new Error('Analysis failed');
    }
  });
