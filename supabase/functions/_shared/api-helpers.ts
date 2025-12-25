import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// CORS Headers padrão
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://fisioflow.vercel.app',
  'https://*.vercel.app',
];

export function getCorsHeaders(origin?: string | null): Record<string, string> {
  const allowedOrigin = ALLOWED_ORIGINS.some(allowed => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace('*', '.*');
      return origin && new RegExp(pattern).test(origin);
    }
    return origin === allowed;
  }) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// CORS Headers padrão (retrocompatibilidade)
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

// Códigos de erro padronizados conforme OpenAPI
export const ErrorCodes = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Interface de erro padronizado
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Interface de paginação
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Interface de resposta paginada
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// Resposta de sucesso
export function successResponse<T>(
  data: T,
  status: number = 200,
  headers?: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

// Resposta de erro padronizada
export function errorResponse(
  message: string,
  status: number = 400,
  code?: string,
  details?: Record<string, unknown>
): Response {
  const error: ApiError = {
    code: code || getErrorCodeFromStatus(status),
    message,
    ...(details && { details }),
  };

  return new Response(JSON.stringify(error), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

// Mapear status para código de erro
function getErrorCodeFromStatus(status: number): string {
  const codeMap: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMIT_EXCEEDED',
    500: 'INTERNAL_ERROR',
  };
  return codeMap[status] || 'UNKNOWN_ERROR';
}

// Resposta de criação (201)
export function createdResponse<T>(data: T): Response {
  return successResponse(data, 201);
}

// Resposta sem conteúdo (204)
export function noContentResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// Resposta de OPTIONS (CORS preflight)
export function optionsResponse(): Response {
  return new Response(null, { headers: corsHeaders });
}

// Resposta paginada
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): Response {
  const pagination: Pagination = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };

  return successResponse<PaginatedResponse<T>>({
    data,
    pagination,
  });
}

// Obter parâmetros de paginação da query string
export function getPaginationParams(url: URL): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

// Obter parâmetro de busca
export function getSearchParam(url: URL): string | null {
  return url.searchParams.get('search');
}

// Obter parâmetro de ordenação
export function getSortParams(url: URL): { sortBy: string; sortOrder: 'asc' | 'desc' } {
  const sortBy = url.searchParams.get('sortBy') || 'created_at';
  const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  return { sortBy, sortOrder };
}

// Criar cliente Supabase autenticado
export function createSupabaseClient(req: Request): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const authHeader = req.headers.get('Authorization');

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Criar cliente Supabase com service role
export function createSupabaseServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Validar autenticação e obter usuário
export async function validateAuth(req: Request): Promise<{
  user: { id: string; email: string; organization_id?: string } | null;
  error: Response | null;
}> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return {
      user: null,
      error: errorResponse('Token de autenticação não fornecido', 401),
    };
  }

  const supabase = createSupabaseClient(req);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      error: errorResponse('Token inválido ou expirado', 401),
    };
  }

  // Buscar organization_id do perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  return {
    user: {
      id: user.id,
      email: user.email!,
      organization_id: profile?.organization_id,
    },
    error: null,
  };
}

// Extrair ID do path (ex: /patients/123 -> 123)
export function extractIdFromPath(pathname: string, basePath: string): string | null {
  const regex = new RegExp(`^${basePath}/([^/]+)/?`);
  const match = pathname.match(regex);
  return match ? match[1] : null;
}

// Validar UUID
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Handler de método não permitido
export function methodNotAllowed(allowedMethods: string[]): Response {
  return new Response(
    JSON.stringify({
      code: 'METHOD_NOT_ALLOWED',
      message: `Método não permitido. Use: ${allowedMethods.join(', ')}`,
    }),
    {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        Allow: allowedMethods.join(', '),
      },
    }
  );
}

// Parsear body JSON com tratamento de erro
export async function parseJsonBody<T>(req: Request): Promise<{ data: T | null; error: Response | null }> {
  try {
    const body = await req.json();
    return { data: body as T, error: null };
  } catch {
    return {
      data: null,
      error: errorResponse('Corpo da requisição inválido - JSON esperado', 400),
    };
  }
}

// Logging estruturado
export interface LogContext {
  requestId?: string;
  userId?: string;
  organizationId?: string;
  duration?: number;
  statusCode?: number;
}

export function logRequest(req: Request, context?: string, extra?: LogContext) {
  const url = new URL(req.url);
  const timestamp = new Date().toISOString();
  const requestId = extra?.requestId || crypto.randomUUID().slice(0, 8);
  
  const logEntry = {
    timestamp,
    requestId,
    level: 'info',
    context: context || 'API',
    method: req.method,
    path: url.pathname,
    query: url.search || undefined,
    userId: extra?.userId,
    organizationId: extra?.organizationId,
  };
  
  console.log(JSON.stringify(logEntry));
  return requestId;
}

export function logError(error: Error, context?: string, requestId?: string) {
  const timestamp = new Date().toISOString();
  
  console.error(JSON.stringify({
    timestamp,
    requestId,
    level: 'error',
    context: context || 'API',
    error: error.message,
    stack: error.stack,
  }));
}

export function logMetric(name: string, value: number, tags?: Record<string, string>) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'metric',
    name,
    value,
    tags,
  }));
}

// Wrapper para tratar erros do Supabase
export function handleSupabaseError(error: { code?: string; message: string }): Response {
  const statusMap: Record<string, number> = {
    PGRST116: 404,  // Not found
    '23505': 409,   // Unique violation (conflict)
    '23503': 400,   // Foreign key violation
    '22P02': 400,   // Invalid input syntax
  };

  const status = error.code ? (statusMap[error.code] || 500) : 500;
  
  if (error.code === '23505') {
    return errorResponse('Registro duplicado - dados já existem', 409, 'DUPLICATE_ENTRY');
  }
  
  if (error.code === 'PGRST116') {
    return errorResponse('Recurso não encontrado', 404, 'NOT_FOUND');
  }

  console.error('Supabase Error:', error);
  return errorResponse('Erro interno do servidor', status);
}

