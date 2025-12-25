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
import { paymentCreateSchema, checkoutCreateSchema, validateSchema } from '../_shared/schemas.ts';
import { checkRateLimit, createRateLimitResponse } from '../_shared/rate-limit.ts';

const BASE_PATH = '/api-payments';

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  logRequest(req, 'Payments API');

  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }

  // Rate limiting
  const rateLimitResult = await checkRateLimit(req, 'api-payments', { maxRequests: 60, windowMinutes: 1 });
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult, {});
  }

  // Autenticação
  const { user, error: authError } = await validateAuth(req);
  if (authError) return authError;

  const supabase = createSupabaseClient(req);

  try {
    // Rota: POST /api-payments/checkout
    if (pathname.endsWith('/checkout') && req.method === 'POST') {
      return await createCheckout(req, user!);
    }

    const paymentId = extractIdFromPath(pathname, BASE_PATH);

    // Rotas com ID
    if (paymentId && !pathname.includes('/checkout')) {
      if (!isValidUUID(paymentId)) {
        return errorResponse('ID de pagamento inválido', 400);
      }

      switch (req.method) {
        case 'GET':
          return await getPayment(supabase, paymentId, user!.organization_id);
        default:
          return methodNotAllowed(['GET']);
      }
    }

    // Rotas sem ID (collection)
    switch (req.method) {
      case 'GET':
        return await listPayments(url, supabase, user!.organization_id);
      case 'POST':
        return await createPayment(req, supabase, user!);
      default:
        return methodNotAllowed(['GET', 'POST']);
    }
  } catch (error) {
    console.error('Payments API Error:', error);
    return errorResponse('Erro interno do servidor', 500);
  }
});

// ========== LIST PAYMENTS ==========
async function listPayments(url: URL, supabase: any, organizationId?: string) {
  const { page, limit, offset } = getPaginationParams(url);
  const patientId = url.searchParams.get('patientId');
  const status = url.searchParams.get('status');
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  let query = supabase
    .from('payments')
    .select(`
      *,
      patient:patients(id, name)
    `, { count: 'exact' });

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  if (patientId) {
    query = query.eq('patient_id', patientId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (startDate) {
    query = query.gte('created_at', startDate);
  }

  if (endDate) {
    query = query.lte('created_at', endDate + 'T23:59:59');
  }

  query = query.order('created_at', { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return handleSupabaseError(error);
  }

  return paginatedResponse(data || [], count || 0, page, limit);
}

// ========== GET PAYMENT ==========
async function getPayment(supabase: any, paymentId: string, organizationId?: string) {
  let query = supabase
    .from('payments')
    .select(`
      *,
      patient:patients(id, name, email, phone),
      transaction:transactions(*)
    `)
    .eq('id', paymentId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Pagamento não encontrado', 404);
    }
    return handleSupabaseError(error);
  }

  return successResponse(data);
}

// ========== CREATE PAYMENT (MANUAL) ==========
async function createPayment(req: Request, supabase: any, user: { id: string; organization_id?: string }) {
  const { data: body, error: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;

  const validation = validateSchema(paymentCreateSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  const paymentData = {
    ...validation.data,
    organization_id: user.organization_id,
    created_by: user.id,
    status: 'completed', // Pagamento manual já é considerado pago
    paid_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('payments')
    .insert(paymentData)
    .select()
    .single();

  if (error) {
    return handleSupabaseError(error);
  }

  // Criar transação financeira
  await supabase.from('transactions').insert({
    payment_id: data.id,
    patient_id: validation.data.patient_id,
    type: 'income',
    amount: validation.data.amount,
    method: validation.data.method,
    description: 'Pagamento manual',
    organization_id: user.organization_id,
    created_by: user.id,
  });

  return createdResponse(data);
}

// ========== CREATE CHECKOUT (STRIPE) ==========
async function createCheckout(req: Request, user: { id: string; organization_id?: string }) {
  const { data: body, error: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;

  const validation = validateSchema(checkoutCreateSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  // Chamar Edge Function de checkout do Stripe
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        ...validation.data,
        organization_id: user.organization_id,
        created_by: user.id,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return errorResponse(result.error || 'Erro ao criar checkout', response.status);
    }

    return successResponse(result);
  } catch (error) {
    console.error('Checkout Error:', error);
    return errorResponse('Erro ao criar checkout', 500);
  }
}

