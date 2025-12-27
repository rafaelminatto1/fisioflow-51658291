// Edge Function para Análise de Evolução do Paciente usando AI SDK
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { generateText } from 'https://esm.sh/ai@3.0.0';
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
    const rateLimitResult = await checkRateLimit(req, 'ai-evolution-analysis', { maxRequests: 15, windowMinutes: 5 });
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, headers);
    }

    // Autenticação
    const { user, error: authError } = await validateAuth(req);
    if (authError) return authError;

    const supabase = createSupabaseClient(req);

    // Parse body
    const body = await req.json();
    const { patientId, startDate, endDate } = body;

    if (!patientId) {
      return errorResponse('patientId é obrigatório', 400);
    }

    // Buscar dados do paciente
    const { data: patient } = await supabase
      .from('patients')
      .select('name, birth_date, medical_record:medical_records(diagnosis, treatment_goals)')
      .eq('id', patientId)
      .single();

    if (!patient) {
      return errorResponse('Paciente não encontrado', 404);
    }

    // Buscar sessões no período
    let sessionsQuery = supabase
      .from('sessions')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: true });

    if (startDate) {
      sessionsQuery = sessionsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      sessionsQuery = sessionsQuery.lte('created_at', endDate);
    }

    const { data: sessions } = await sessionsQuery;

    // Buscar mapas de dor
    const { data: painMaps } = await supabase
      .from('pain_maps')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: true });

    // Buscar medições de evolução
    const { data: measurements } = await supabase
      .from('evolution_measurements')
      .select('*')
      .eq('patient_id', patientId)
      .order('measured_at', { ascending: true });

    // Preparar contexto
    const evolutionContext = `
PACIENTE: ${patient.name}
DIAGNÓSTICO: ${patient.medical_record?.diagnosis || 'Não especificado'}
OBJETIVOS: ${patient.medical_record?.treatment_goals?.join(', ') || 'Não especificado'}

SESSÕES (${sessions?.length || 0}):
${sessions?.map((s: any, i: number) => `
Sessão ${i + 1} - ${new Date(s.created_at).toLocaleDateString('pt-BR')}:
- Status: ${s.status}
- Notas: ${s.notes || 'Sem notas'}
- Duração: ${s.duration_minutes || 'N/A'} minutos
`).join('\n') || 'Sem sessões'}

MAPAS DE DOR (${painMaps?.length || 0}):
${painMaps?.map((pm: any, i: number) => `
Mapa ${i + 1} - ${new Date(pm.created_at).toLocaleDateString('pt-BR')}:
- Nível médio de dor: ${pm.average_pain_level}/10
- Regiões afetadas: ${pm.affected_regions?.join(', ') || 'N/A'}
`).join('\n') || 'Sem mapas de dor'}

MEDIÇÕES (${measurements?.length || 0}):
${measurements?.map((m: any, i: number) => `
Medição ${i + 1} - ${new Date(m.measured_at).toLocaleDateString('pt-BR')}:
- Tipo: ${m.measurement_type}
- Valor: ${m.value} ${m.unit || ''}
- Observações: ${m.notes || 'N/A'}
`).join('\n') || 'Sem medições'}
`;

    // Configurar modelo
    const model = google('gemini-2.0-flash-exp', {
      apiKey: Deno.env.get('GOOGLE_AI_API_KEY') || Deno.env.get('LOVABLE_API_KEY'),
    });

    // Gerar análise
    const analysis = await generateText({
      model,
      prompt: `Você é um fisioterapeuta especialista em análise de evolução de pacientes.

Analise os dados abaixo e forneça:

1. RESUMO DA EVOLUÇÃO: Progresso geral do paciente
2. PONTOS POSITIVOS: Melhorias observadas
3. ÁREAS DE ATENÇÃO: Pontos que precisam de mais atenção
4. RECOMENDAÇÕES: Sugestões para próximas sessões
5. PREVISÃO: Estimativa de tempo para alcançar objetivos

${evolutionContext}

Seja objetivo, baseado em evidências e prático.`,
      temperature: 0.5,
      maxTokens: 2000,
    });

    // Calcular métricas
    const metrics = {
      totalSessions: sessions?.length || 0,
      completedSessions: sessions?.filter((s: any) => s.status === 'completed').length || 0,
      averagePainLevel: painMaps?.length
        ? painMaps.reduce((sum: number, pm: any) => sum + (pm.average_pain_level || 0), 0) / painMaps.length
        : null,
      painReduction: painMaps && painMaps.length >= 2
        ? ((painMaps[0].average_pain_level - painMaps[painMaps.length - 1].average_pain_level) / painMaps[0].average_pain_level) * 100
        : null,
      totalMeasurements: measurements?.length || 0,
    };

    return successResponse({
      analysis: analysis.text,
      metrics,
      period: {
        start: startDate || null,
        end: endDate || null,
      },
    }, 200, {
      ...headers,
      ...addRateLimitHeaders({}, rateLimitResult),
    });
  } catch (error) {
    console.error('Erro no AI Evolution Analysis:', error);
    captureException(error instanceof Error ? error : new Error(String(error)));

    return errorResponse(
      'Erro ao analisar evolução. Tente novamente.',
      500
    );
  }
});

