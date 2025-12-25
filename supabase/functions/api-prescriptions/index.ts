import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  successResponse,
  errorResponse,
  createdResponse,
  optionsResponse,
  createSupabaseClient,
  validateAuth,
  extractIdFromPath,
  isValidUUID,
  methodNotAllowed,
  parseJsonBody,
  logRequest,
  handleSupabaseError,
} from '../_shared/api-helpers.ts';
import { prescriptionCreateSchema, validateSchema } from '../_shared/schemas.ts';
import { checkRateLimit, createRateLimitResponse } from '../_shared/rate-limit.ts';

const BASE_PATH = '/api-prescriptions';

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  logRequest(req, 'Prescriptions API');

  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }

  // Rate limiting
  const rateLimitResult = await checkRateLimit(req, 'api-prescriptions', { maxRequests: 100, windowMinutes: 1 });
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult, {});
  }

  // Autenticação
  const { user, error: authError } = await validateAuth(req);
  if (authError) return authError;

  const supabase = createSupabaseClient(req);

  try {
    const prescriptionId = extractIdFromPath(pathname, BASE_PATH);

    // Rota: POST /api-prescriptions/:id/deactivate
    if (prescriptionId && pathname.endsWith('/deactivate') && req.method === 'POST') {
      return await deactivatePrescription(supabase, prescriptionId, user!.organization_id);
    }

    // Rotas com ID
    if (prescriptionId && !pathname.includes('/deactivate')) {
      if (!isValidUUID(prescriptionId)) {
        return errorResponse('ID de prescrição inválido', 400);
      }

      switch (req.method) {
        case 'GET':
          return await getPrescription(supabase, prescriptionId, user!.organization_id);
        case 'PATCH':
          return await updatePrescription(req, supabase, prescriptionId, user!.organization_id);
        default:
          return methodNotAllowed(['GET', 'PATCH']);
      }
    }

    // Rotas sem ID (collection)
    switch (req.method) {
      case 'GET':
        return await listPrescriptions(url, supabase, user!.organization_id);
      case 'POST':
        return await createPrescription(req, supabase, user!);
      default:
        return methodNotAllowed(['GET', 'POST']);
    }
  } catch (error) {
    console.error('Prescriptions API Error:', error);
    return errorResponse('Erro interno do servidor', 500);
  }
});

// ========== LIST PRESCRIPTIONS ==========
async function listPrescriptions(url: URL, supabase: any, organizationId?: string) {
  const patientId = url.searchParams.get('patientId');
  const activeOnly = url.searchParams.get('active') !== 'false';

  let query = supabase
    .from('prescriptions')
    .select(`
      *,
      patient:patients(id, name),
      therapist:profiles(id, name),
      items:prescription_items(
        *,
        exercise:exercises(id, name, video_url, thumbnail_url)
      )
    `)
    .order('created_at', { ascending: false });

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  if (patientId) {
    query = query.eq('patient_id', patientId);
  }

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    return handleSupabaseError(error);
  }

  return successResponse(data || []);
}

// ========== GET PRESCRIPTION ==========
async function getPrescription(supabase: any, prescriptionId: string, organizationId?: string) {
  let query = supabase
    .from('prescriptions')
    .select(`
      *,
      patient:patients(id, name, email, phone),
      therapist:profiles(id, name),
      items:prescription_items(
        *,
        exercise:exercises(id, name, description, video_url, thumbnail_url, difficulty)
      )
    `)
    .eq('id', prescriptionId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Prescrição não encontrada', 404);
    }
    return handleSupabaseError(error);
  }

  return successResponse(data);
}

// ========== CREATE PRESCRIPTION ==========
async function createPrescription(req: Request, supabase: any, user: { id: string; organization_id?: string }) {
  const { data: body, error: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;

  const validation = validateSchema(prescriptionCreateSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  const { patient_id, frequency, items } = validation.data;

  // Desativar prescrições anteriores do paciente
  await supabase
    .from('prescriptions')
    .update({ is_active: false })
    .eq('patient_id', patient_id)
    .eq('organization_id', user.organization_id)
    .eq('is_active', true);

  // Criar nova prescrição
  const { data: prescription, error: prescError } = await supabase
    .from('prescriptions')
    .insert({
      patient_id,
      therapist_id: user.id,
      frequency,
      organization_id: user.organization_id,
      is_active: true,
    })
    .select()
    .single();

  if (prescError) {
    return handleSupabaseError(prescError);
  }

  // Criar itens da prescrição
  const itemsData = items.map((item: any, index: number) => ({
    prescription_id: prescription.id,
    exercise_id: item.exercise_id,
    sets: item.sets,
    reps: item.reps,
    hold_seconds: item.hold_seconds,
    notes: item.notes,
    order: index + 1,
  }));

  const { data: createdItems, error: itemsError } = await supabase
    .from('prescription_items')
    .insert(itemsData)
    .select(`
      *,
      exercise:exercises(id, name, video_url, thumbnail_url)
    `);

  if (itemsError) {
    // Rollback
    await supabase.from('prescriptions').delete().eq('id', prescription.id);
    return handleSupabaseError(itemsError);
  }

  return createdResponse({
    ...prescription,
    items: createdItems,
  });
}

// ========== UPDATE PRESCRIPTION ==========
async function updatePrescription(req: Request, supabase: any, prescriptionId: string, organizationId?: string) {
  const { data: body, error: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;

  // Atualizar dados básicos
  const updateData: any = { updated_at: new Date().toISOString() };
  if (body.frequency) updateData.frequency = body.frequency;

  let query = supabase
    .from('prescriptions')
    .update(updateData)
    .eq('id', prescriptionId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Prescrição não encontrada', 404);
    }
    return handleSupabaseError(error);
  }

  // Se items foram enviados, atualizar
  if (body.items && Array.isArray(body.items)) {
    // Deletar items existentes
    await supabase
      .from('prescription_items')
      .delete()
      .eq('prescription_id', prescriptionId);

    // Criar novos items
    const itemsData = body.items.map((item: any, index: number) => ({
      prescription_id: prescriptionId,
      exercise_id: item.exercise_id,
      sets: item.sets,
      reps: item.reps,
      hold_seconds: item.hold_seconds,
      notes: item.notes,
      order: index + 1,
    }));

    await supabase.from('prescription_items').insert(itemsData);
  }

  // Buscar prescrição atualizada com items
  const { data: updated } = await supabase
    .from('prescriptions')
    .select(`
      *,
      items:prescription_items(
        *,
        exercise:exercises(id, name, video_url, thumbnail_url)
      )
    `)
    .eq('id', prescriptionId)
    .single();

  return successResponse(updated);
}

// ========== DEACTIVATE PRESCRIPTION ==========
async function deactivatePrescription(supabase: any, prescriptionId: string, organizationId?: string) {
  let query = supabase
    .from('prescriptions')
    .update({ is_active: false, deactivated_at: new Date().toISOString() })
    .eq('id', prescriptionId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Prescrição não encontrada', 404);
    }
    return handleSupabaseError(error);
  }

  return successResponse(data);
}

