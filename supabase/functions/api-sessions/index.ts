import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  successResponse,
  errorResponse,
  createdResponse,
  optionsResponse,
  paginatedResponse,
  getPaginationParams,
  createSupabaseClient,
  validateAuth,
  extractIdFromPath,
  isValidUUID,
  methodNotAllowed,
  parseJsonBody,
  logRequest,
  handleSupabaseError,
} from '../_shared/api-helpers.ts';
import { sessionCreateSchema, sessionUpdateSchema, validateSchema } from '../_shared/schemas.ts';
import { checkRateLimit, createRateLimitResponse } from '../_shared/rate-limit.ts';
import { captureException } from '../_shared/sentry.ts';

const BASE_PATH = '/api-sessions';

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  logRequest(req, 'Sessions API');

  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }

  // Rate limiting
  const rateLimitResult = await checkRateLimit(req, 'api-sessions', { maxRequests: 100, windowMinutes: 1 });
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult, {});
  }

  // Autenticação
  const { user, error: authError } = await validateAuth(req);
  if (authError) return authError;

  const supabase = createSupabaseClient(req);

  try {
    const sessionId = extractIdFromPath(pathname, BASE_PATH);

    // Rota: POST /api-sessions/:id/complete
    if (sessionId && pathname.endsWith('/complete') && req.method === 'POST') {
      return await completeSession(supabase, sessionId, user!.organization_id);
    }

    // Rotas com ID
    if (sessionId && !pathname.includes('/complete')) {
      if (!isValidUUID(sessionId)) {
        return errorResponse('ID de sessão inválido', 400);
      }

      switch (req.method) {
        case 'GET':
          return await getSession(supabase, sessionId, user!.organization_id);
        case 'PATCH':
          return await updateSession(req, supabase, sessionId, user!.organization_id);
        default:
          return methodNotAllowed(['GET', 'PATCH']);
      }
    }

    // Rotas sem ID (collection)
    switch (req.method) {
      case 'GET':
        return await listSessions(url, supabase, user!.organization_id);
      case 'POST':
        return await createSession(req, supabase, user!);
      default:
        return methodNotAllowed(['GET', 'POST']);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await captureException(err, { function: 'api-sessions' });
    return errorResponse('Erro interno do servidor', 500);
  }
});

// ========== LIST SESSIONS ==========
async function listSessions(url: URL, supabase: any, organizationId?: string) {
  const { page, limit, offset } = getPaginationParams(url);
  const patientId = url.searchParams.get('patientId');
  const therapistId = url.searchParams.get('therapistId');

  let query = supabase
    .from('sessions')
    .select(`
      *,
      patient:patients(id, name),
      therapist:profiles(id, name),
      appointment:appointments(id, start_time)
    `, { count: 'exact' });

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  if (patientId) {
    query = query.eq('patient_id', patientId);
  }

  if (therapistId) {
    query = query.eq('therapist_id', therapistId);
  }

  query = query.order('created_at', { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return handleSupabaseError(error);
  }

  return paginatedResponse(data || [], count || 0, page, limit);
}

// ========== GET SESSION ==========
async function getSession(supabase: any, sessionId: string, organizationId?: string) {
  let query = supabase
    .from('sessions')
    .select(`
      *,
      patient:patients(id, name, email, phone),
      therapist:profiles(id, name),
      appointment:appointments(*),
      pain_maps:pain_maps(
        *,
        points:pain_map_points(*)
      ),
      attachments:session_attachments(*)
    `)
    .eq('id', sessionId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Sessão não encontrada', 404);
    }
    return handleSupabaseError(error);
  }

  return successResponse(data);
}

// ========== CREATE SESSION ==========
async function createSession(req: Request, supabase: any, user: { id: string; organization_id?: string }) {
  const { data: body, error: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;

  const validation = validateSchema(sessionCreateSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  const { appointment_id } = validation.data;

  // Verificar se appointment existe e obter patient_id
  const { data: appointment, error: aptError } = await supabase
    .from('appointments')
    .select('id, patient_id, therapist_id, status')
    .eq('id', appointment_id)
    .eq('organization_id', user.organization_id)
    .single();

  if (aptError || !appointment) {
    return errorResponse('Agendamento não encontrado', 404);
  }

  if (appointment.status === 'cancelled') {
    return errorResponse('Não é possível iniciar sessão de agendamento cancelado', 400);
  }

  // Verificar se já existe sessão para este agendamento
  const { data: existingSession } = await supabase
    .from('sessions')
    .select('id')
    .eq('appointment_id', appointment_id)
    .single();

  if (existingSession) {
    return errorResponse('Já existe uma sessão para este agendamento', 409);
  }

  const sessionData = {
    appointment_id,
    patient_id: appointment.patient_id,
    therapist_id: appointment.therapist_id || user.id,
    organization_id: user.organization_id,
    status: 'draft',
    started_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('sessions')
    .insert(sessionData)
    .select()
    .single();

  if (error) {
    return handleSupabaseError(error);
  }

  // Atualizar status do agendamento
  await supabase
    .from('appointments')
    .update({ status: 'in_progress' })
    .eq('id', appointment_id);

  return createdResponse(data);
}

// ========== UPDATE SESSION (SOAP) ==========
async function updateSession(req: Request, supabase: any, sessionId: string, organizationId?: string) {
  const { data: body, error: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;

  const validation = validateSchema(sessionUpdateSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  let query = supabase
    .from('sessions')
    .update({ ...validation.data, updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Sessão não encontrada', 404);
    }
    return handleSupabaseError(error);
  }

  return successResponse(data);
}

// ========== COMPLETE SESSION ==========
async function completeSession(supabase: any, sessionId: string, organizationId?: string) {
  // Verificar se sessão existe e está em draft
  let selectQuery = supabase
    .from('sessions')
    .select('id, appointment_id, status')
    .eq('id', sessionId);

  if (organizationId) {
    selectQuery = selectQuery.eq('organization_id', organizationId);
  }

  const { data: session, error: selectError } = await selectQuery.single();

  if (selectError || !session) {
    return errorResponse('Sessão não encontrada', 404);
  }

  if (session.status === 'completed') {
    return errorResponse('Sessão já foi finalizada', 400);
  }

  // Atualizar sessão
  let updateQuery = supabase
    .from('sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (organizationId) {
    updateQuery = updateQuery.eq('organization_id', organizationId);
  }

  const { data, error } = await updateQuery.select().single();

  if (error) {
    return handleSupabaseError(error);
  }

  // Atualizar status do agendamento
  await supabase
    .from('appointments')
    .update({ status: 'completed' })
    .eq('id', session.appointment_id);

  return successResponse(data);
}

