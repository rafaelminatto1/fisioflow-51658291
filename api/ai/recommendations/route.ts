/**
 * Vercel AI SDK - Treatment Recommendations API Route
 *
 * Provides AI-powered treatment recommendations with streaming
 */

import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

interface RecommendationsRequest {
  prompt: string;
  patientId?: string;
  patientName?: string;
  diagnosis?: string;
  primaryComplaint?: string;
  sessionCount?: number;
  language?: 'pt-BR' | 'en';
  model?: 'openai' | 'google';
}

export async function POST(req: Request) {
  try {
    const body: RecommendationsRequest = await req.json();
    const {
      prompt,
      patientName,
      diagnosis,
      primaryComplaint,
      sessionCount,
      language = 'pt-BR',
      model = 'openai',
    } = body;

    if (!prompt) {
      return new Response('Prompt is required', { status: 400 });
    }

    // Build enhanced system prompt with patient context
    const systemPrompt = language === 'pt-BR'
      ? `Você é um fisioterapeuta especialista criando um plano de tratamento personalizado.

DADOS DO PACIENTE:
- Nome: ${patientName || 'Não informado'}
- Diagnóstico: ${diagnosis || 'Não informado'}
- Queixa principal: ${primaryComplaint || 'Não informada'}
- Sessões realizadas: ${sessionCount || 0}

PLANO DE TRATAMENTO DEVE INCLUIR:
1. **Objetivos do Tratamento**
   - Objetivos a curto prazo (1-2 semanas)
   - Objetivos a médio prazo (4-6 semanas)
   - Objetivos funcionais específicos

2. **Intervenções Propostas**
   - Técnicas manuais (com indicações)
   - Exercícios terapêuticos (com séries/repetições)
   - Modalidades terapêuticas
   - Orientações para casa

3. **Frequência e Duração**
   - Frequência semanal sugerida
   - Duração estimada do tratamento
   - Critérios para progressão

4. **Critérios de Alta**
   - Objetivos a serem alcançados
   - Marcadores funcionais

IMPORTANTE:
- Baseie recomendações em evidências quando possível
- Adapte ao contexto do paciente
- Inclua nota sobre validação profissional
- Use formato markdown`
      : `You are a specialist physical therapist creating a personalized treatment plan.

PATIENT DATA:
- Name: ${patientName || 'Not provided'}
- Diagnosis: ${diagnosis || 'Not provided'}
- Chief complaint: ${primaryComplaint || 'Not provided'}
- Sessions completed: ${sessionCount || 0}

TREATMENT PLAN SHOULD INCLUDE:
1. **Treatment Goals**
   - Short-term goals (1-2 weeks)
   - Medium-term goals (4-6 weeks)
   - Specific functional goals

2. **Proposed Interventions**
   - Manual techniques (with indications)
   - Therapeutic exercises (with sets/reps)
   - Therapeutic modalities
   - Home instructions

3. **Frequency and Duration**
   - Suggested weekly frequency
   - Estimated treatment duration
   - Progression criteria

4. **Discharge Criteria**
   - Goals to be achieved
   - Functional markers

IMPORTANT:
- Base recommendations on evidence when possible
- Adapt to patient context
- Include note about professional validation
- Use markdown format`;

    // Select model based on configuration
    const aiModel = model === 'google'
      ? google('gemini-1.5-flash-latest')
      : openai('gpt-4o-mini');

    // Generate streaming response
    const result = streamText({
      model: aiModel,
      system: systemPrompt,
      prompt,
      temperature: 0.6, // Slightly lower for more structured output
      maxTokens: 2000,
    });

    // Return the stream as AI SDK message stream response
    return result.toAIStreamResponse();
  } catch (error) {
    console.error('[AI Recommendations API] Error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to generate recommendations',
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
