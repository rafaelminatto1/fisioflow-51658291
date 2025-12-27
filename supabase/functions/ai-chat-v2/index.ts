// Edge Function de Chat IA usando Vercel AI SDK
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { streamText } from 'https://esm.sh/ai@3.0.0';
import { google } from 'https://esm.sh/@ai-sdk/google@0.0.0';
import { checkRateLimit, createRateLimitResponse, addRateLimitHeaders } from '../_shared/rate-limit.ts';
import { validateAuth, createSupabaseClient, errorResponse, successResponse, getCorsHeaders } from '../_shared/api-helpers.ts';
import { captureException } from '../_shared/sentry.ts';

const corsHeaders = getCorsHeaders();

serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const headers = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(req, 'ai-chat', { maxRequests: 30, windowMinutes: 5 });
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, headers);
    }

    // Autenticação
    const { user, error: authError } = await validateAuth(req);
    if (authError) return authError;

    const supabase = createSupabaseClient(req);

    // Parse body
    const body = await req.json();
    const { messages, patientId, context } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return errorResponse('Mensagens são obrigatórias', 400);
    }

    // Buscar contexto do paciente se fornecido
    let patientContext = '';
    if (patientId) {
      const { data: patient } = await supabase
        .from('patients')
        .select('name, medical_record:medical_records(diagnosis, treatment_goals)')
        .eq('id', patientId)
        .single();

      if (patient) {
        patientContext = `
Contexto do Paciente:
- Nome: ${patient.name}
${patient.medical_record?.diagnosis ? `- Diagnóstico: ${patient.medical_record.diagnosis}` : ''}
${patient.medical_record?.treatment_goals ? `- Objetivos: ${patient.medical_record.treatment_goals.join(', ')}` : ''}
`;
      }
    }

    // System prompt
    const systemPrompt = `Você é um assistente especializado em fisioterapia da Activity Fisioterapia.

Suas responsabilidades:
- Fornecer orientações sobre exercícios e tratamentos fisioterapêuticos
- Explicar condições musculoesqueléticas de forma clara
- Sugerir exercícios apropriados para diferentes condições
- Orientar sobre prevenção de lesões
- Explicar técnicas de reabilitação

Diretrizes importantes:
- Sempre reforce que suas orientações são informativas e não substituem avaliação presencial
- Use linguagem acessível mas tecnicamente correta
- Seja empático e acolhedor
- Para casos graves ou dor intensa, sempre recomende avaliação médica urgente
- Forneça recomendações práticas e aplicáveis
- Explique os benefícios de cada exercício ou técnica

${patientContext}

Tom: Profissional, acolhedor e educativo.`;

    // Configurar modelo
    const model = google('gemini-2.0-flash-exp', {
      apiKey: Deno.env.get('GOOGLE_AI_API_KEY') || Deno.env.get('LOVABLE_API_KEY'),
    });

    // Gerar resposta com streaming
    const result = await streamText({
      model,
      system: systemPrompt,
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      maxTokens: 2000,
      temperature: 0.7,
    });

    // Criar stream de resposta
    const stream = result.toDataStreamResponse({
      headers: {
        ...headers,
        ...addRateLimitHeaders({}, rateLimitResult),
      },
    });

    return stream;
  } catch (error) {
    console.error('Erro no AI Chat:', error);
    captureException(error instanceof Error ? error : new Error(String(error)));

    return errorResponse(
      'Erro ao processar mensagem. Tente novamente.',
      500
    );
  }
});

