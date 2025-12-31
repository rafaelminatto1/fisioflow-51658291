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
  getSearchParam,
} from '../_shared/api-helpers.ts';
import { exerciseCreateSchema, validateSchema } from '../_shared/schemas.ts';
import { checkRateLimit, createRateLimitResponse } from '../_shared/rate-limit.ts';
import { captureException } from '../_shared/sentry.ts';

const BASE_PATH = '/api-exercises';

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  logRequest(req, 'Exercises API');

  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }

  // Rate limiting
  const rateLimitResult = await checkRateLimit(req, 'api-exercises', { maxRequests: 100, windowMinutes: 1 });
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult, {});
  }

  // Autenticação
  const { user, error: authError } = await validateAuth(req);
  if (authError) return authError;

  const supabase = createSupabaseClient(req);

  try {
    // Rota: GET /api-exercises/categories
    if (pathname.endsWith('/categories')) {
      return await listCategories(supabase, user!.organization_id);
    }

    const exerciseId = extractIdFromPath(pathname, BASE_PATH);

    // Rotas com ID
    if (exerciseId && !pathname.includes('/categories')) {
      if (!isValidUUID(exerciseId)) {
        return errorResponse('ID de exercício inválido', 400);
      }

      switch (req.method) {
        case 'GET':
          return await getExercise(supabase, exerciseId, user!.organization_id);
        case 'PATCH':
          return await updateExercise(req, supabase, exerciseId, user!.organization_id);
        case 'DELETE':
          return await deleteExercise(supabase, exerciseId, user!.organization_id);
        default:
          return methodNotAllowed(['GET', 'PATCH', 'DELETE']);
      }
    }

    // Rotas sem ID (collection)
    switch (req.method) {
      case 'GET':
        return await listExercises(url, supabase, user!.organization_id);
      case 'POST':
        return await createExercise(req, supabase, user!);
      default:
        return methodNotAllowed(['GET', 'POST']);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await captureException(err, { function: 'api-exercises' });
    return errorResponse('Erro interno do servidor', 500);
  }
});

// ========== LIST EXERCISES ==========
async function listExercises(url: URL, supabase: any, organizationId?: string) {
  const categoryId = url.searchParams.get('categoryId');
  const search = getSearchParam(url);
  const difficulty = url.searchParams.get('difficulty');

      const query = supabase
    .from('exercises')
    .select(`
      *,
      category:exercise_categories(id, name)
    `)
    .eq('is_active', true)
    .order('name', { ascending: true });

  // Exercícios podem ser globais (null) ou da organização
  if (organizationId) {
    query = query.or(`organization_id.is.null,organization_id.eq.${organizationId}`);
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (difficulty) {
    query = query.eq('difficulty', difficulty);
  }

  const { data, error } = await query;

  if (error) {
    return handleSupabaseError(error);
  }

  return successResponse(data || []);
}

// ========== GET EXERCISE ==========
async function getExercise(supabase: any, exerciseId: string, organizationId?: string) {
  const query = supabase
    .from('exercises')
    .select(`
      *,
      category:exercise_categories(id, name)
    `)
    .eq('id', exerciseId);

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Exercício não encontrado', 404);
    }
    return handleSupabaseError(error);
  }

  return successResponse(data);
}

// ========== CREATE EXERCISE ==========
async function createExercise(req: Request, supabase: any, user: { id: string; organization_id?: string }) {
  const { data: body, error: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;

  const validation = validateSchema(exerciseCreateSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  const exerciseData = {
    ...validation.data,
    organization_id: user.organization_id,
    created_by: user.id,
    is_active: true,
  };

  const { data, error } = await supabase
    .from('exercises')
    .insert(exerciseData)
    .select(`
      *,
      category:exercise_categories(id, name)
    `)
    .single();

  if (error) {
    return handleSupabaseError(error);
  }

  return createdResponse(data);
}

// ========== UPDATE EXERCISE ==========
async function updateExercise(req: Request, supabase: any, exerciseId: string, organizationId?: string) {
  const { data: body, error: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;

      const query = supabase
    .from('exercises')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', exerciseId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Exercício não encontrado', 404);
    }
    return handleSupabaseError(error);
  }

  return successResponse(data);
}

// ========== DELETE EXERCISE ==========
async function deleteExercise(supabase: any, exerciseId: string, organizationId?: string) {
      const query = supabase
    .from('exercises')
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq('id', exerciseId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { error } = await query;

  if (error) {
    return handleSupabaseError(error);
  }

  return successResponse({ message: 'Exercício removido' });
}

// ========== LIST CATEGORIES ==========
async function listCategories(supabase: any, organizationId?: string) {
      const query = supabase
    .from('exercise_categories')
    .select(`
      *,
      exercises_count:exercises(count)
    `)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (organizationId) {
    query = query.or(`organization_id.is.null,organization_id.eq.${organizationId}`);
  }

  const { data, error } = await query;

  if (error) {
    return handleSupabaseError(error);
  }

  return successResponse(data || []);
}

