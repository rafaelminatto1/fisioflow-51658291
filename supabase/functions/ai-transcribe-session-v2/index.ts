// Edge Function de Transcrição de Sessão usando Whisper via AI SDK
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { generateText } from 'https://esm.sh/ai@3.0.0';
import { openai } from 'https://esm.sh/@ai-sdk/openai@0.0.0';
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
    const rateLimitResult = await checkRateLimit(req, 'ai-transcribe-session', { maxRequests: 10, windowMinutes: 5 });
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, headers);
    }

    // Autenticação
    const { user, error: authError } = await validateAuth(req);
    if (authError) return authError;

    const supabase = createSupabaseClient(req);

    // Parse body (multipart form data para áudio)
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const sessionId = formData.get('sessionId') as string;

    if (!audioFile) {
      return errorResponse('Arquivo de áudio é obrigatório', 400);
    }

    if (!sessionId) {
      return errorResponse('sessionId é obrigatório', 400);
    }

    // Verificar se a sessão existe e pertence ao usuário
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, patient_id, therapist_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return errorResponse('Sessão não encontrada', 404);
    }

    // Verificar permissão (terapeuta da sessão ou admin)
    if (session.therapist_id !== user.id && user.organization_id) {
      // Verificar se é admin da organização
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return errorResponse('Sem permissão para transcrever esta sessão', 403);
      }
    }

    // Converter áudio para base64 ou usar API de transcrição
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    // Configurar modelo OpenAI Whisper
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return errorResponse('OpenAI API key não configurada', 500);
    }

    const openaiClient = openai({
      apiKey: openaiApiKey,
    });

    // Usar Whisper para transcrição
    // Nota: A API do Whisper requer upload de arquivo, então vamos usar a API diretamente
    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData, // Enviar formData diretamente
    });

    if (!transcriptionResponse.ok) {
      const error = await transcriptionResponse.text();
      console.error('Erro na transcrição:', error);
      return errorResponse('Erro ao transcrever áudio', 500);
    }

    const transcriptionData = await transcriptionResponse.json();
    const rawTranscript = transcriptionData.text;

    // Estruturar transcrição usando AI SDK
    const structuredTranscript = await generateText({
      model: openaiClient('gpt-4o-mini'),
      prompt: `Estruture a seguinte transcrição de uma sessão de fisioterapia em formato SOAP:

TRANSCRIÇÃO:
${rawTranscript}

Estruture em:
- Subjetivo: O que o paciente relatou
- Objetivo: O que foi observado/medido
- Avaliação: Análise e interpretação
- Plano: Próximos passos e prescrições

Seja conciso mas completo.`,
      temperature: 0.3,
    });

    // Salvar transcrição no banco
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        transcription: rawTranscript,
        structured_notes: structuredTranscript.text,
        transcribed_at: new Date().toISOString(),
        transcribed_by: user.id,
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Erro ao salvar transcrição:', updateError);
      // Não falhar a requisição
    }

    return successResponse({
      transcription: rawTranscript,
      structured: structuredTranscript.text,
      sessionId,
    }, 200, {
      ...headers,
      ...addRateLimitHeaders({}, rateLimitResult),
    });
  } catch (error) {
    console.error('Erro no AI Transcribe:', error);
    captureException(error instanceof Error ? error : new Error(String(error)));

    return errorResponse(
      'Erro ao transcrever sessão. Tente novamente.',
      500
    );
  }
});

