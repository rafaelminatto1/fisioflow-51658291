/**
 * Cloud Function Handler: Marketing Template Generation
 *
 * Generates marketing content (reviews, birthdays, social media captions)
 * using Gemini Pro via Vertex AI.
 */

import { logger } from '../lib/logger';
import { HttpsError } from 'firebase-functions/v2/https';

// ============================================================================
// MAIN HANDLER
// ============================================================================

export const marketingTemplateHandler = async (request: any) => {
  const { prompt, language = 'pt-BR' } = request.data;

  if (!prompt) {
    throw new HttpsError('invalid-argument', 'O campo "prompt" é obrigatório.');
  }

  try {
    const { VertexAI } = await import('@google-cloud/vertexai');
    const vertexAI = new VertexAI({
      project: process.env.GCLOUD_PROJECT || 'fisioflow-migration',
      location: 'us-central1', // Using US for better availability if needed, or southamerica-east1
    });

    const generativeModel = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-flash', // Flash is better for marketing/text tasks (faster/cheaper)
    });

    const result = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Generate content in ${language}. Prompt: ${prompt}` }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    });

    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Não foi possível obter uma resposta da IA.');
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      logger.warn('[MarketingAI] Response is not valid JSON, returning as plain text:', text);
      return { template: text, suggestions: [] };
    }
  } catch (error: any) {
    logger.error('[MarketingAI] Error generating content:', error);
    throw new HttpsError('internal', error.message || 'Erro ao gerar conteúdo de marketing.');
  }
};
