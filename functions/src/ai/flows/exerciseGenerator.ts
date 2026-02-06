/**
 * Exercise Plan Generator Flow (Genkit)
 * 
 * Original flow for generating comprehensive exercise plans
 */

import { z } from 'zod';
import { gemini15Flash } from '@genkit-ai/vertexai';
import { ai } from '../config';
import { ExercisePlanInputSchema, ExercisePlanOutputSchema } from '../schemas';

/**
 * Generate Exercise Plan Flow
 * Creates personalized exercise plans based on patient assessment
 */
export const generateExercisePlan = ai.defineFlow(
    {
        name: 'generateExercisePlan',
        inputSchema: ExercisePlanInputSchema,
        outputSchema: ExercisePlanOutputSchema,
    },
    async (input) => {
        const prompt = `Como fisioterapeuta especialista, crie um plano de exercícios personalizado:

DADOS DO PACIENTE:
${JSON.stringify(input, null, 2)}

Gere um plano estruturado com exercícios específicos, progressões e orientações.`;

        const { output } = await ai.generate({
            model: gemini15Flash,
            prompt,
            config: {
                temperature: 0.6,
                maxOutputTokens: 2500,
            },
            output: {
                format: 'json',
                schema: ExercisePlanOutputSchema,
            },
        });

        if (!output) {
            throw new Error('Failed to generate exercise plan');
        }

        return output;
    }
);
