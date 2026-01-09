import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  successResponse,
  errorResponse,
  createdResponse,
  noContentResponse,
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
import { waitlistCreateSchema, waitlistOfferSchema, validateSchema } from '../_shared/schemas.ts';
import { checkRateLimit, createRateLimitResponse } from '../_shared/rate-limit.ts';
import { findWaitlistCandidate, processWaitlistOffer } from '../_shared/waitlist-utils.ts';

const BASE_PATH = '/api-waitlist';

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  logRequest(req, 'Waitlist API');

  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }

  // Rate limiting
  const rateLimitResult = await checkRateLimit(req, 'api-waitlist', { maxRequests: 100, windowMinutes: 1 });
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult, {});
  }

  // Autenticação
  const { user, error: authError } = await validateAuth(req);
  if (authError) return authError;

  const supabase = createSupabaseClient(req);

  try {
    const waitlistId = extractIdFromPath(pathname, BASE_PATH);

    // Rota: POST /api-waitlist/:id/offer
    if (waitlistId && pathname.endsWith('/offer') && req.method === 'POST') {
      return await offerSlot(req, supabase, waitlistId, user!);
    }

    // Rotas com ID
    if (waitlistId && !pathname.includes('/offer')) {
      if (!isValidUUID(waitlistId)) {
        return errorResponse('ID de lista de espera inválido', 400);
      }

      switch (req.method) {
        case 'GET':
          return await getWaitlistEntry(supabase, waitlistId, user!.organization_id);
        case 'DELETE':
          return await removeFromWaitlist(supabase, waitlistId, user!.organization_id);
        default:
          return methodNotAllowed(['GET', 'DELETE']);
      }
    }

    // Rotas sem ID (collection)
    switch (req.method) {
      case 'GET':
        return await listWaitlist(url, supabase, user!.organization_id);
      case 'POST':
        return await addToWaitlist(req, supabase, user!);
      default:
        return methodNotAllowed(['GET', 'POST']);
    }
  } catch (error) {
    console.error('Waitlist API Error:', error);
    return errorResponse('Erro interno do servidor', 500);
  }
});

// ========== LIST WAITLIST ==========
async function listWaitlist(url: URL, supabase: any, organizationId?: string) {
  const priority = url.searchParams.get('priority');
  const status = url.searchParams.get('status') || 'waiting';

  let query = supabase
    .from('waitlist')
    .select(`
      *,
      patient:patients(id, name, phone, email)
    `)
    .order('created_at', { ascending: true });

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (priority) {
    query = query.eq('priority', priority);
  }

  // Ordenar por prioridade (urgent > high > normal) depois por data
  query = query
    .order('priority', { ascending: false }) // urgent vem primeiro
    .order('created_at', { ascending: true });

  const { data, error } = await query;

  if (error) {
    return handleSupabaseError(error);
  }

  // Reordenar manualmente para garantir prioridade correta
  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2 };
  const sortedData = (data || []).sort((a: any, b: any) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return successResponse(sortedData);
}

// ========== GET WAITLIST ENTRY ==========
async function getWaitlistEntry(supabase: any, waitlistId: string, organizationId?: string) {
  let query = supabase
    .from('waitlist')
    .select(`
      *,
      patient:patients(id, name, phone, email),
      preferred_therapist:profiles(id, name)
    `)
    .eq('id', waitlistId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Entrada não encontrada', 404);
    }
    return handleSupabaseError(error);
  }

  return successResponse(data);
}

// ========== ADD TO WAITLIST ==========
async function addToWaitlist(req: Request, supabase: any, user: { id: string; organization_id?: string }) {
  const { data: body, error: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;

  const validation = validateSchema(waitlistCreateSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  // Verificar se paciente já está na lista de espera
  const { data: existing } = await supabase
    .from('waitlist')
    .select('id')
    .eq('patient_id', validation.data.patient_id)
    .eq('organization_id', user.organization_id)
    .eq('status', 'waiting')
    .single();

  if (existing) {
    return errorResponse('Paciente já está na lista de espera', 409, 'ALREADY_IN_WAITLIST');
  }

  const waitlistData = {
    ...validation.data,
    organization_id: user.organization_id,
    created_by: user.id,
    status: 'waiting',
    refusal_count: 0,
  };

  const { data, error } = await supabase
    .from('waitlist')
    .insert(waitlistData)
    .select(`
      *,
      patient:patients(id, name, phone)
    `)
    .single();

  if (error) {
    return handleSupabaseError(error);
  }

  return createdResponse(data);
}

// ========== REMOVE FROM WAITLIST ==========
async function removeFromWaitlist(supabase: any, waitlistId: string, organizationId?: string) {
  let query = supabase
    .from('waitlist')
    .update({ status: 'removed', removed_at: new Date().toISOString() })
    .eq('id', waitlistId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { error } = await query;

  if (error) {
    return handleSupabaseError(error);
  }

  return noContentResponse();
}

// ========== OFFER SLOT ==========
async function offerSlot(req: Request, supabase: any, waitlistId: string, user: { id: string; organization_id?: string }) {
  const { data: body, error: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;

  const validation = validateSchema(waitlistOfferSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  // Buscar entrada da lista de espera
  const { data: entry, error: entryError } = await supabase
    .from('waitlist')
    .select(`
      *,
      patient:patients(id, name, phone, email)
    `)
    .eq('id', waitlistId)
    .eq('organization_id', user.organization_id)
    .eq('status', 'waiting')
    .single();

  if (entryError || !entry) {
    return errorResponse('Entrada não encontrada ou não está aguardando', 404);
  }

  try {
    const updated = await processWaitlistOffer(
      waitlistId,
      new Date(validation.data.appointment_slot),
      user.id,
      user.organization_id!,
      entry.patient,
      supabase
    );

    return successResponse({
      ...updated,
      message: `Vaga oferecida para ${entry.patient.name}. Aguardando resposta em até 24h.`,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return handleSupabaseError({ message: err.message });
  }

}

// ========== AUTO OFFER (para uso interno) ==========
export async function autoOfferSlots(organizationId: string, cancelledSlot: Date) {
  return await findWaitlistCandidate(organizationId, cancelledSlot);
}

