/**
 * Vercel AI SDK - Chat API Route (v2)
 *
 * Provides streaming chat interface for patient analysis
 * using the AI SDK's useChat hook compatible endpoint
 */

import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

interface ChatRequest {
  messages: any[];
  patientId?: string;
  patientName?: string;
  language?: 'pt-BR' | 'en';
  model?: 'openai' | 'google';
}

export async function POST(req: Request) {
  try {
    const body: ChatRequest = await req.json();
    const { messages, patientId, patientName, language = 'pt-BR', model = 'openai' } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response('Messages array is required', { status: 400 });
    }

    // System prompt for patient analysis
    const systemPrompt = language === 'pt-BR'
      ? `Você é um assistente especialista em fisioterapia e análise de pacientes.

CONTEXTO:
- Nome do paciente: ${patientName || 'Não informado'}
- ID do paciente: ${patientId || 'Não informado'}

DIRETRIZES:
- Forneça análises baseadas em dados quando disponíveis
- Sugira intervenções baseadas em evidências
- Identifique fatores de risco e bandeiras vermelhas
- Seja específico em suas recomendações
- Use emojis moderadamente para melhor legibilidade
- Responda em português do Brasil

LIMITAÇÕES:
- Nunca faça diagnósticos definitivos
- Sempre recomende validação por profissional qualificado
- Não prescreva medicamentos
- Indique quando é necessário encaminhamento para especialista`
      : `You are a specialist physical therapy and patient analysis assistant.

CONTEXT:
- Patient name: ${patientName || 'Not provided'}
- Patient ID: ${patientId || 'Not provided'}

GUIDELINES:
- Provide data-driven analyses when available
- Suggest evidence-based interventions
- Identify risk factors and red flags
- Be specific in your recommendations
- Use emojis moderately for better readability

LIMITATIONS:
- Never make definitive diagnoses
- Always recommend validation by a qualified professional
- Do not prescribe medications
- Indicate when specialist referral is needed`;

    // Select model based on configuration
    const aiModel = model === 'google'
      ? google('gemini-1.5-flash-latest')
      : openai('gpt-4o-mini');

    // Filter out system messages from the request (we add our own)
    const userMessages = messages.filter(m => m.role !== 'system');

    // Generate streaming response
    const result = streamText({
      model: aiModel,
      system: systemPrompt,
      messages: userMessages,
      temperature: 0.7,
    });

    // Return the stream as AI SDK message stream response
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('[AI Chat API] Error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to process chat request',
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
