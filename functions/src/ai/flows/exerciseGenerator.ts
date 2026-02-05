import { gemini15Flash } from '@genkit-ai/vertexai';
import { GeneratePlanInputSchema, ExercisePlanSchema } from '../schemas';
import { ai } from '../config';
import type { GeneratePlanInput, ExercisePlan } from '../schemas';

export const generateExercisePlan = ai.defineFlow(
  {
    name: 'generateExercisePlan',
    inputSchema: GeneratePlanInputSchema,
    outputSchema: ExercisePlanSchema,
  },
  async (input: GeneratePlanInput): Promise<ExercisePlan> => {
    const prompt = `
      Você é um Fisioterapeuta Especialista com 20 anos de experiência (AI Coach FisioFlow).

      Crie um plano de tratamento personalizado para o seguinte paciente:
      - Nome: ${input.patientName}
      - Idade: ${input.age ? input.age + ' anos' : 'Não informado'}
      - Condição Clínica: ${input.condition}
      - Nível de Dor (0-10): ${input.painLevel}
      - Equipamentos Disponíveis: ${input.equipment.join(', ') || 'Peso do corpo apenas'}
      - Objetivos: ${input.goals}
      - Limitações/Restrições: ${input.limitations || 'Nenhuma'}

      DIRETRIZES CLÍNICAS:
      1. Priorize a segurança. Se a dor for alta (>7), sugira exercícios de baixíssimo impacto e isometria.
      2. Adapte aos equipamentos. Não sugira máquinas de academia se o usuário só tem elásticos.
      3. Seja motivador, mas profissional.
      4. Para o campo 'videoQuery', gere um termo de busca preciso em inglês ou português que retornaria um bom vídeo tutorial no YouTube (ex: 'squat technique', 'exercicio pendulo ombro').

      Gere a saída estritamente no formato JSON solicitado.
    `;

    const { output } = await ai.generate({
      model: gemini15Flash,
      prompt: prompt,
      output: { format: 'json', schema: ExercisePlanSchema },
    });

    if (!output) {
      throw new Error('Failed to generate exercise plan');
    }

    return output as ExercisePlan;
  }
);