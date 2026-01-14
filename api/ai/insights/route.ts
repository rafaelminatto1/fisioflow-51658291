/**
 * Vercel AI SDK - Insights API Route
 *
 * Provides streaming AI-generated clinical insights for patients
 */

import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

interface InsightsRequest {
  prompt: string;
  patientId?: string;
  patientName?: string;
  language?: 'pt-BR' | 'en';
  model?: 'openai' | 'google';
}

export async function POST(req: Request) {
  try {
    const body: InsightsRequest = await req.json();
    const { prompt, language = 'pt-BR', model = 'openai' } = body;

    if (!prompt) {
      return new Response('Prompt is required', { status: 400 });
    }

    // System prompt for clinical analysis
    const systemPrompt = language === 'pt-BR'
      ? `Você é um assistente especialista em fisioterapia e analytics clínico.
Suas respostas devem ser:
- Baseadas em evidências científicas quando possível
- Concisas e diretas
- Focadas em ações práticas e mensuráveis
- Em português do Brasil
- Em formato markdown para melhor legibilidade

IMPORTANTE: Sempre inclua uma nota de que suas recomendações devem ser validadas por um profissional de saúde qualificado.`
      : `You are a specialized physical therapy and clinical analytics assistant.
Your responses should be:
- Evidence-based when possible
- Concise and direct
- Focused on practical, measurable actions
- In markdown format for better readability

IMPORTANT: Always include a note that your recommendations should be validated by a qualified healthcare professional.`;

    // Select model based on configuration
    const aiModel = model === 'google'
      ? google('gemini-1.5-flash-latest')
      : openai('gpt-4o-mini');

    // Generate streaming response
    const result = streamText({
      model: aiModel,
      system: systemPrompt,
      prompt,
      temperature: 0.7,
    });

    // Return the stream as AI SDK message stream response
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('[AI Insights API] Error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to generate insights',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
