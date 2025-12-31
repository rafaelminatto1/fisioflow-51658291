import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  successResponse,
  errorResponse,
  createdResponse,
  noContentResponse,
  optionsResponse,
  paginatedResponse,
  getPaginationParams,
  getSearchParam,
  getSortParams,
  createSupabaseClient,
  validateAuth,
  extractIdFromPath,
  isValidUUID,
  methodNotAllowed,
  parseJsonBody,
  logRequest,
  handleSupabaseError,
} from '../_shared/api-helpers.ts';
import { patientCreateSchema, patientUpdateSchema, medicalRecordUpdateSchema, validateSchema } from '../_shared/schemas.ts';
import { checkRateLimit, createRateLimitResponse, addRateLimitHeaders } from '../_shared/rate-limit.ts';
import { captureException } from '../_shared/sentry.ts';

const BASE_PATH = '/api-patients';

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  logRequest(req, 'Patients API');

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }

  // Rate limiting
  const rateLimitResult = await checkRateLimit(req, 'api-patients', { maxRequests: 100, windowMinutes: 1 });
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult, {});
  }

  // Autenticação
  const { user, error: authError } = await validateAuth(req);
  if (authError) return authError;

  const supabase = createSupabaseClient(req);

  try {
    // Extrair ID se presente
    const patientId = extractIdFromPath(pathname, BASE_PATH);

    // Rota: GET /api-patients/:id/medical-record
    if (patientId && pathname.endsWith('/medical-record')) {
      if (req.method === 'GET') {
        return await getMedicalRecord(supabase, patientId, user!.organization_id);
      }
      if (req.method === 'PUT') {
        return await updateMedicalRecord(req, supabase, patientId, user!.organization_id);
      }
      return methodNotAllowed(['GET', 'PUT']);
    }

    // Rotas com ID
    if (patientId) {
      if (!isValidUUID(patientId)) {
        return errorResponse('ID de paciente inválido', 400);
      }

      switch (req.method) {
        case 'GET':
          return await getPatient(supabase, patientId, user!.organization_id);
        case 'PATCH':
          return await updatePatient(req, supabase, patientId, user!.organization_id);
        case 'DELETE':
          return await deletePatient(supabase, patientId, user!.organization_id);
        default:
          return methodNotAllowed(['GET', 'PATCH', 'DELETE']);
      }
    }

    // Rotas sem ID (collection)
    switch (req.method) {
      case 'GET':
        return await listPatients(url, supabase, user!.organization_id);
      case 'POST':
        return await createPatient(req, supabase, user!);
      default:
        return methodNotAllowed(['GET', 'POST']);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await captureException(err, { function: 'api-patients' });
    return errorResponse('Erro interno do servidor', 500);
  }
});

// ========== LIST PATIENTS ==========
async function listPatients(url: URL, supabase: any, organizationId?: string) {
  const { page, limit, offset } = getPaginationParams(url);
  const search = getSearchParam(url);
  const { sortBy, sortOrder } = getSortParams(url);
  const status = url.searchParams.get('status') || 'active';

  let query = supabase
    .from('patients')
    .select('*', { count: 'exact' });

  // Filtro por organização
  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  // Filtro por status
  if (status !== 'all') {
    query = query.eq('is_active', status === 'active');
  }

  // Busca por nome, CPF ou telefone
  if (search) {
    query = query.or(`name.ilike.%${search}%,cpf.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  // Ordenação
  const sortColumn = sortBy === 'lastVisit' ? 'last_visit_at' : sortBy === 'createdAt' ? 'created_at' : 'name';
  query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

  // Paginação
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return handleSupabaseError(error);
  }

  return paginatedResponse(data || [], count || 0, page, limit);
}

// ========== GET PATIENT ==========
async function getPatient(supabase: any, patientId: string, organizationId?: string) {
  let query = supabase
    .from('patients')
    .select(`
      *,
      medical_record:medical_records(*),
      upcoming_appointments:appointments(
        id, start_time, end_time, status, therapist:profiles(name)
      )
    `)
    .eq('id', patientId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Paciente não encontrado', 404);
    }
    return handleSupabaseError(error);
  }

  // Filtrar apenas agendamentos futuros
  if (data.upcoming_appointments) {
    data.upcoming_appointments = data.upcoming_appointments.filter(
      (apt: any) => new Date(apt.start_time) > new Date() && apt.status !== 'cancelled'
    ).slice(0, 5);
  }

  return successResponse(data);
}

// ========== CREATE PATIENT ==========
async function createPatient(req: Request, supabase: any, user: { id: string; organization_id?: string }) {
  const { data: body, error: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;

  // Validar schema
  const validation = validateSchema(patientCreateSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  const patientData = {
    ...validation.data,
    organization_id: user.organization_id,
    created_by: user.id,
    is_active: true,
  };

  // Verificar CPF duplicado
  const { data: existingPatient } = await supabase
    .from('patients')
    .select('id')
    .eq('cpf', patientData.cpf)
    .eq('organization_id', user.organization_id)
    .single();

  if (existingPatient) {
    return errorResponse('CPF já cadastrado', 409, 'DUPLICATE_CPF');
  }

  const { data, error } = await supabase
    .from('patients')
    .insert(patientData)
    .select()
    .single();

  if (error) {
    return handleSupabaseError(error);
  }

  // Criar prontuário médico vazio
  await supabase.from('medical_records').insert({
    patient_id: data.id,
    organization_id: user.organization_id,
  });

  return createdResponse(data);
}

// ========== UPDATE PATIENT ==========
async function updatePatient(req: Request, supabase: any, patientId: string, organizationId?: string) {
  const { data: body, error: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;

  // Validar schema
  const validation = validateSchema(patientUpdateSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  let query = supabase
    .from('patients')
    .update({ ...validation.data, updated_at: new Date().toISOString() })
    .eq('id', patientId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Paciente não encontrado', 404);
    }
    return handleSupabaseError(error);
  }

  return successResponse(data);
}

// ========== DELETE PATIENT (SOFT DELETE) ==========
async function deletePatient(supabase: any, patientId: string, organizationId?: string) {
  let query = supabase
    .from('patients')
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq('id', patientId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { error } = await query;

  if (error) {
    return handleSupabaseError(error);
  }

  return noContentResponse();
}

// ========== GET MEDICAL RECORD ==========
async function getMedicalRecord(supabase: any, patientId: string, organizationId?: string) {
  let query = supabase
    .from('medical_records')
    .select(`
      *,
      pathologies:patient_pathologies(*),
      surgeries:patient_surgeries(*),
      goals:treatment_goals(*)
    `)
    .eq('patient_id', patientId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Prontuário não encontrado', 404);
    }
    return handleSupabaseError(error);
  }

  return successResponse(data);
}

// ========== UPDATE MEDICAL RECORD ==========
async function updateMedicalRecord(req: Request, supabase: any, patientId: string, organizationId?: string) {
  const { data: body, error: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;

  const validation = validateSchema(medicalRecordUpdateSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  let query = supabase
    .from('medical_records')
    .update({ ...validation.data, updated_at: new Date().toISOString() })
    .eq('patient_id', patientId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    return handleSupabaseError(error);
  }

  return successResponse(data);
}

