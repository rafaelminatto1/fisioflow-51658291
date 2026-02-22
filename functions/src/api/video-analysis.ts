import { onCall } from 'firebase-functions/v2/https';
import { ai, gemini15Pro } from '../ai/config';
import { z } from 'genkit';
import { AI_FUNCTION } from '../lib/function-config';

/**
 * Cloud Function para análise de vídeo de movimento usando Gemini 1.5 Pro.
 * Recebe a URL de um vídeo no Cloud Storage e retorna análise biomecânica.
 */
export const analyzeMovementVideoHandler = async (request: any) => {
  const { videoUrl, exerciseName } = request.data;

  if (!videoUrl) {
    throw new Error('videoUrl é obrigatório');
  }

  const promptText = `
    Você é um especialista em biomecânica e fisioterapia.
    Analise este vídeo do exercício "${exerciseName || 'movimento corporal'}".
    
    Forneça um relatório estruturado contendo:
    1. Contagem de repetições (se aplicável).
    2. Qualidade da execução (0 a 10).
    3. Principais erros biomecânicos observados (ex: valgo dinâmico, perda de lordose).
    4. Sugestões de correção para o paciente.

    Se o vídeo não mostrar um exercício claro, informe isso.
  `;

  try {
    // Usando a SDK do Genkit para chamar o modelo multimodal
    const response = await ai.generate({
      model: gemini15Pro,
      prompt: [
        { text: promptText },
        { media: { url: videoUrl, contentType: 'video/mp4' } }
      ],
      output: {
        schema: z.object({
          reps: z.number().describe("Número de repetições contadas"),
          score: z.number().min(0).max(10).describe("Nota de qualidade técnica de 0 a 10"),
          errors: z.array(z.string()).describe("Lista de erros biomecânicos identificados"),
          feedback: z.string().describe("Feedback construtivo e direto para o paciente"),
          isValidExercise: z.boolean().describe("Se foi possível identificar um exercício válido no vídeo")
        })
      }
    });

    return {
      success: true,
      analysis: response.output
    };

  } catch (error: any) {
    console.error("Erro na análise de vídeo:", error);
    throw new Error(`Falha na análise de vídeo: ${error.message}`);
  }
};

export const analyzeMovementVideo = onCall(AI_FUNCTION, analyzeMovementVideoHandler);
