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
import { packageCreateSchema, patientPackageCreateSchema, validateSchema } from '../_shared/schemas.ts';
import { checkRateLimit, createRateLimitResponse } from '../_shared/rate-limit.ts';

const BASE_PATH = '/api-packages';

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  logRequest(req, 'Packages API');

  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }

  // Rate limiting
  const rateLimitResult = await checkRateLimit(req, 'api-packages', { maxRequests: 100, windowMinutes: 1 });
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult, {});
  }

  // Autenticação
  const { user, error: authError } = await validateAuth(req);
  if (authError) return authError;

  const supabase = createSupabaseClient(req);

  try {
    // Rota: GET/POST /api-packages/patient/:patientId
    const patientMatch = pathname.match(/\/patient\/([^/]+)/);
    if (patientMatch) {
      const patientId = patientMatch[1];
      if (!isValidUUID(patientId)) {
        return errorResponse('ID de paciente inválido', 400);
      }

      if (req.method === 'GET') {
        return await listPatientPackages(supabase, patientId, user!.organization_id);
      }
      if (req.method === 'POST') {
        return await purchasePackage(req, supabase, patientId, user!);
      }
      return methodNotAllowed(['GET', 'POST']);
    }

    // Rota: POST /api-packages/:id/use (usar sessão do pacote)
    if (pathname.includes('/use') && req.method === 'POST') {
      const packageId = extractIdFromPath(pathname, BASE_PATH);
      if (!packageId || !isValidUUID(packageId)) {
        return errorResponse('ID de pacote inválido', 400);
      }
      return await usePackageSession(req, supabase, packageId, user!);
    }

    const packageId = extractIdFromPath(pathname, BASE_PATH);

    // Rotas com ID
    if (packageId && !pathname.includes('/patient') && !pathname.includes('/use')) {
      if (!isValidUUID(packageId)) {
        return errorResponse('ID de pacote inválido', 400);
      }

      switch (req.method) {
        case 'GET':
          return await getPackage(supabase, packageId, user!.organization_id);
        case 'PATCH':
          return await updatePackage(req, supabase, packageId, user!.organization_id);
        default:
          return methodNotAllowed(['GET', 'PATCH']);
      }
    }

    // Rotas sem ID (collection)
    switch (req.method) {
      case 'GET':
        return await listPackages(supabase, user!.organization_id);
      case 'POST':
        return await createPackage(req, supabase, user!);
      default:
        return methodNotAllowed(['GET', 'POST']);
    }
  } catch (error) {
    console.error('Packages API Error:', error);
    return errorResponse('Erro interno do servidor', 500);
  }
});

// ========== LIST PACKAGES (TEMPLATES) ==========
async function listPackages(supabase: any, organizationId?: string) {
  let query = supabase
    .from('session_packages')
    .select('*')
    .eq('is_active', true)
    .order('sessions_count', { ascending: true });

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query;

  if (error) {
    return handleSupabaseError(error);
  }

  return successResponse(data || []);
}

// ========== GET PACKAGE ==========
async function getPackage(supabase: any, packageId: string, organizationId?: string) {
  let query = supabase
    .from('session_packages')
    .select('*')
    .eq('id', packageId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Pacote não encontrado', 404);
    }
    return handleSupabaseError(error);
  }

  return successResponse(data);
}

// ========== CREATE PACKAGE (TEMPLATE) ==========
async function createPackage(req: Request, supabase: any, user: { id: string; organization_id?: string }) {
  const { data: body, error: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;

  const validation = validateSchema(packageCreateSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  const packageData = {
    ...validation.data,
    organization_id: user.organization_id,
    created_by: user.id,
    is_active: true,
  };

  const { data, error } = await supabase
    .from('session_packages')
    .insert(packageData)
    .select()
    .single();

  if (error) {
    return handleSupabaseError(error);
  }

  return createdResponse(data);
}

// ========== UPDATE PACKAGE ==========
async function updatePackage(req: Request, supabase: any, packageId: string, organizationId?: string) {
  const { data: body, error: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;

  let query = supabase
    .from('session_packages')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', packageId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Pacote não encontrado', 404);
    }
    return handleSupabaseError(error);
  }

  return successResponse(data);
}

// ========== LIST PATIENT PACKAGES ==========
async function listPatientPackages(supabase: any, patientId: string, organizationId?: string) {
  let query = supabase
    .from('patient_packages')
    .select(`
      *,
      package:session_packages(id, name, sessions_count, price)
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query;

  if (error) {
    return handleSupabaseError(error);
  }

  // Calcular saldo e status de cada pacote
  const enrichedData = (data || []).map((pp: any) => {
    const remaining = pp.sessions_purchased - pp.sessions_used;
    const isExpired = pp.expires_at && new Date(pp.expires_at) < new Date();
    
    return {
      ...pp,
      sessions_remaining: remaining,
      is_expired: isExpired,
      status: isExpired ? 'expired' : remaining <= 0 ? 'depleted' : 'active',
    };
  });

  return successResponse(enrichedData);
}

// ========== PURCHASE PACKAGE ==========
async function purchasePackage(req: Request, supabase: any, patientId: string, user: { id: string; organization_id?: string }) {
  const { data: body, error: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;

  if (!body?.package_id) {
    return errorResponse('package_id é obrigatório', 400);
  }

  // Buscar detalhes do pacote template
  const { data: packageTemplate, error: packageError } = await supabase
    .from('session_packages')
    .select('*')
    .eq('id', body.package_id)
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .single();

  if (packageError || !packageTemplate) {
    return errorResponse('Pacote não encontrado ou inativo', 404);
  }

  // Calcular data de expiração
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + packageTemplate.validity_days);

  const patientPackageData = {
    patient_id: patientId,
    package_id: body.package_id,
    sessions_purchased: packageTemplate.sessions_count,
    sessions_used: 0,
    price_paid: packageTemplate.price,
    purchased_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
    organization_id: user.organization_id,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from('patient_packages')
    .insert(patientPackageData)
    .select(`
      *,
      package:session_packages(id, name, sessions_count)
    `)
    .single();

  if (error) {
    return handleSupabaseError(error);
  }

  return createdResponse({
    ...data,
    sessions_remaining: data.sessions_purchased,
    status: 'active',
    message: `Pacote "${packageTemplate.name}" adquirido com sucesso!`,
  });
}

// ========== USE PACKAGE SESSION ==========
async function usePackageSession(req: Request, supabase: any, patientPackageId: string, user: { id: string; organization_id?: string }) {
  const { data: body } = await parseJsonBody(req);

  // Buscar pacote do paciente
  let query = supabase
    .from('patient_packages')
    .select('*')
    .eq('id', patientPackageId);

  if (user.organization_id) {
    query = query.eq('organization_id', user.organization_id);
  }

  const { data: patientPackage, error: fetchError } = await query.single();

  if (fetchError || !patientPackage) {
    return errorResponse('Pacote não encontrado', 404);
  }

  // Verificar se pacote está válido
  const now = new Date();
  if (patientPackage.expires_at && new Date(patientPackage.expires_at) < now) {
    return errorResponse('Pacote expirado', 400, 'PACKAGE_EXPIRED');
  }

  // Verificar se há sessões disponíveis
  const remaining = patientPackage.sessions_purchased - patientPackage.sessions_used;
  if (remaining <= 0) {
    return errorResponse('Sem sessões disponíveis neste pacote', 400, 'NO_SESSIONS_REMAINING');
  }

  // Usar uma sessão
  const { data: updated, error: updateError } = await supabase
    .from('patient_packages')
    .update({
      sessions_used: patientPackage.sessions_used + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', patientPackageId)
    .select()
    .single();

  if (updateError) {
    return handleSupabaseError(updateError);
  }

  // Registrar uso
  await supabase.from('package_usage').insert({
    patient_package_id: patientPackageId,
    patient_id: patientPackage.patient_id,
    appointment_id: body?.appointment_id,
    used_at: new Date().toISOString(),
    used_by: user.id,
    organization_id: user.organization_id,
  });

  return successResponse({
    ...updated,
    sessions_remaining: updated.sessions_purchased - updated.sessions_used,
    message: `Sessão utilizada. Restam ${updated.sessions_purchased - updated.sessions_used} sessões.`,
  });
}

