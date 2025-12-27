// Edge Function de Prescrição de Exercícios usando Vercel AI SDK com generateObject
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { generateObject } from 'https://esm.sh/ai@3.0.0';
import { google } from 'https://esm.sh/@ai-sdk/google@0.0.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { checkRateLimit, createRateLimitResponse, addRateLimitHeaders } from '../_shared/rate-limit.ts';
import { validateAuth, createSupabaseClient, errorResponse, successResponse, getCorsHeaders } from '../_shared/api-helpers.ts';
import { captureException } from '../_shared/sentry.ts';

const corsHeaders = getCorsHeaders();

// Schema para a prescrição de exercícios
const ExercisePrescriptionSchema = z.object({
  exercises: z.array(
    z.object({
      name: z.string().describe('Nome do exercício'),
      description: z.string().describe('Descrição detalhada do exercício'),
      sets: z.number().describe('Número de séries'),
      repetitions: z.string().describe('Número de repetições ou duração (ex: "10-12" ou "30 segundos")'),
      frequency: z.string().describe('Frequência (ex: "3x por semana", "diário")'),
      duration_weeks: z.number().describe('Duração em semanas'),
      progression: z.string().optional().describe('Como progredir o exercício'),
      precautions: z.string().optional().describe('Precauções ou contraindicações'),
      target_muscles: z.array(z.string()).describe('Músculos ou grupos musculares trabalhados'),
    })
  ),
  rationale: z.string().describe('Justificativa clínica para a prescrição'),
  goals: z.array(z.string()).describe('Objetivos do tratamento'),
  expected_outcomes: z.string().describe('Resultados esperados'),
});

serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const headers = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(req, 'ai-exercise-prescription', { maxRequests: 20, windowMinutes: 5 });
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, headers);
    }

    // Autenticação
    const { user, error: authError } = await validateAuth(req);
    if (authError) return authError;

    const supabase = createSupabaseClient(req);

    // Parse body
    const body = await req.json();
    const { patientId } = body;

    if (!patientId) {
      return errorResponse('patientId é obrigatório', 400);
    }

    // Buscar dados do paciente
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select(`
        *,
        medical_record:medical_records(
          diagnosis,
          treatment_goals,
          pathologies:patient_pathologies(*),
          surgeries:patient_surgeries(*)
        ),
        recent_sessions:sessions(
          id,
          notes,
          created_at
        )
      `)
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return errorResponse('Paciente não encontrado', 404);
    }

    // Buscar exercícios já prescritos
    const { data: currentPrescriptions } = await supabase
      .from('exercise_prescriptions')
      .select('exercise_id, exercises(name)')
      .eq('patient_id', patientId)
      .eq('status', 'active');

    // Preparar contexto
    const patientContext = `
PACIENTE: ${patient.name}
IDADE: ${patient.birth_date ? new Date().getFullYear() - new Date(patient.birth_date).getFullYear() : 'N/A'}
GÊNERO: ${patient.gender || 'N/A'}

DIAGNÓSTICO: ${patient.medical_record?.diagnosis || 'Não especificado'}

OBJETIVOS DO TRATAMENTO:
${patient.medical_record?.treatment_goals?.map((g: string) => `- ${g}`).join('\n') || 'Não especificado'}

PATOLOGIAS:
${patient.medical_record?.pathologies?.map((p: any) => `- ${p.pathology_name} (${p.severity || 'não especificado'})`).join('\n') || 'Não especificado'}

SESSÕES RECENTES:
${patient.recent_sessions?.slice(0, 3).map((s: any) => `- ${s.notes || 'Sem observações'}`).join('\n') || 'Sem sessões recentes'}

EXERCÍCIOS JÁ PRESCRITOS:
${currentPrescriptions?.map((p: any) => `- ${p.exercises?.name || 'N/A'}`).join('\n') || 'Nenhum'}
`;

    // Configurar modelo
    const model = google('gemini-2.0-flash-exp', {
      apiKey: Deno.env.get('GOOGLE_AI_API_KEY') || Deno.env.get('LOVABLE_API_KEY'),
    });

    // Gerar prescrição estruturada
    const { object: prescription } = await generateObject({
      model,
      schema: ExercisePrescriptionSchema,
      prompt: `Você é um fisioterapeuta especialista em prescrição de exercícios terapêuticos.

Analise o histórico do paciente abaixo e prescreva exercícios baseados em evidências científicas.

${patientContext}

INSTRUÇÕES:
- Prescreva 3-5 exercícios apropriados para a condição do paciente
- Seja específico com séries, repetições e frequência
- Inclua progressão quando apropriado
- Considere as patologias e objetivos do tratamento
- Evite exercícios já prescritos
- Baseie-se em evidências científicas
- Seja prático e aplicável`,
      temperature: 0.7,
    });

    // Salvar prescrição no banco
    const prescriptionRecords = prescription.exercises.map((exercise: any) => ({
      patient_id: patientId,
      exercise_name: exercise.name,
      description: exercise.description,
      sets: exercise.sets,
      repetitions: exercise.repetitions,
      frequency: exercise.frequency,
      duration_weeks: exercise.duration_weeks,
      progression: exercise.progression,
      precautions: exercise.precautions,
      target_muscles: exercise.target_muscles,
      rationale: prescription.rationale,
      goals: prescription.goals,
      expected_outcomes: prescription.expected_outcomes,
      created_by: user.id,
      status: 'pending', // Aguardando aprovação do fisioterapeuta
    }));

    const { error: insertError } = await supabase
      .from('exercise_prescriptions')
      .insert(prescriptionRecords);

    if (insertError) {
      console.error('Erro ao salvar prescrição:', insertError);
      // Não falhar a requisição, apenas logar o erro
    }

    return successResponse({
      prescription,
      saved: !insertError,
    }, 200, {
      ...headers,
      ...addRateLimitHeaders({}, rateLimitResult),
    });
  } catch (error) {
    console.error('Erro no AI Exercise Prescription:', error);
    captureException(error instanceof Error ? error : new Error(String(error)));

    return errorResponse(
      'Erro ao gerar prescrição. Tente novamente.',
      500
    );
  }
});

