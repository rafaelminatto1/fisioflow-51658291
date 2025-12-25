import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { transcribeSessionSchema, parseAndValidate, errorResponse } from '../_shared/validation.ts';
import { checkRateLimit, createRateLimitResponse } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(req, 'ai-transcribe-session');
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit excedido para ai-transcribe-session: ${rateLimitResult.current_count}/${rateLimitResult.limit}`);
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    // Validate input
    const { data, error: validationError } = await parseAndValidate(req, transcribeSessionSchema, corsHeaders);
    if (validationError) {
      return validationError;
    }

    const { audioData, patientId } = data;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY não configurada');
      return errorResponse('Erro de configuração do servidor', 500, corsHeaders);
    }

    // Remove base64 prefix if present
    const base64Audio = audioData.replace(/^data:audio\/\w+;base64,/, '');

    // Step 1: Transcribe audio using Gemini
    const transcriptionResponse = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio: base64Audio,
        model: 'google/gemini-2.5-flash',
      }),
    });

    if (!transcriptionResponse.ok) {
      console.error('Erro na transcrição:', transcriptionResponse.status);
      if (transcriptionResponse.status === 429) {
        return errorResponse('Limite de requisições excedido. Tente novamente em alguns instantes.', 429, corsHeaders);
      }
      if (transcriptionResponse.status === 402) {
        return errorResponse('Créditos insuficientes. Entre em contato com o suporte.', 402, corsHeaders);
      }
      return errorResponse('Erro ao transcrever áudio', 500, corsHeaders);
    }

    const transcriptionData = await transcriptionResponse.json();
    const transcribedText = transcriptionData.text || '';

    // Step 2: Structure transcription into SOAP format using Gemini
    const structureResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente especializado em estruturar notas de fisioterapia no formato SOAP.
            
Analise a transcrição fornecida e organize em 4 seções:

1. **Subjetivo (S)**: Queixas, sintomas e histórico relatado pelo paciente
2. **Objetivo (O)**: Observações físicas, testes, medições e avaliações realizadas
3. **Avaliação (A)**: Análise, diagnóstico funcional e progresso
4. **Plano (P)**: Condutas realizadas, exercícios prescritos e orientações

Retorne APENAS um JSON válido no formato:
{
  "subjective": "texto",
  "objective": "texto", 
  "assessment": "texto",
  "plan": "texto"
}`
          },
          {
            role: 'user',
            content: `Transcrição da sessão: "${transcribedText.substring(0, 10000)}"`
          }
        ],
      }),
    });

    if (!structureResponse.ok) {
      console.error('Erro na estruturação:', structureResponse.status);
      return errorResponse('Erro ao estruturar SOAP', 500, corsHeaders);
    }

    const structureData = await structureResponse.json();
    const soapText = structureData.choices[0].message.content;

    // Extract JSON from response
    const jsonMatch = soapText.match(/\{[\s\S]*\}/);
    const soapData = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      subjective: transcribedText,
      objective: '',
      assessment: '',
      plan: ''
    };

    return new Response(
      JSON.stringify({
        transcription: transcribedText,
        soapData,
        patientId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro na função:', error);
    return errorResponse('Erro ao processar requisição', 500, corsHeaders);
  }
});
