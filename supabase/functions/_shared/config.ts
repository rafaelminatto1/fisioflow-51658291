// =====================================================
// FisioFlow v3.0 - Configuração Centralizada
// =====================================================

// URLs de ambiente
export const Config = {
  // URLs
  FRONTEND_URL: Deno.env.get('FRONTEND_URL') || 'http://localhost:5173',
  SUPABASE_URL: Deno.env.get('SUPABASE_URL') || '',

  // Admin
  ADMIN_PHONE: Deno.env.get('ADMIN_PHONE') || '',
  
  // Rate Limiting
  RATE_LIMIT_MAX_REQUESTS: parseInt(Deno.env.get('RATE_LIMIT_MAX_REQUESTS') || '100'),
  RATE_LIMIT_WINDOW_MINUTES: parseInt(Deno.env.get('RATE_LIMIT_WINDOW_MINUTES') || '1'),
  
  // Waitlist
  WAITLIST_OFFER_EXPIRY_HOURS: parseInt(Deno.env.get('WAITLIST_OFFER_EXPIRY_HOURS') || '24'),
  WAITLIST_MAX_REFUSALS: parseInt(Deno.env.get('WAITLIST_MAX_REFUSALS') || '3'),
  
  // WhatsApp (Evolution API)
  EVOLUTION_API_URL: Deno.env.get('EVOLUTION_API_URL') || '',
  EVOLUTION_API_KEY: Deno.env.get('EVOLUTION_API_KEY') || '',
  EVOLUTION_INSTANCE: Deno.env.get('EVOLUTION_INSTANCE') || 'fisioflow',
  
  // Stripe
  STRIPE_SECRET_KEY: Deno.env.get('STRIPE_SECRET_KEY') || '',
  STRIPE_WEBHOOK_SECRET: Deno.env.get('STRIPE_WEBHOOK_SECRET') || '',
  
  // Clerk
  CLERK_SECRET_KEY: Deno.env.get('CLERK_SECRET_KEY') || '',
  CLERK_WEBHOOK_SECRET: Deno.env.get('CLERK_WEBHOOK_SECRET') || '',
  
  // AI
  OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY') || '',
  
  // Features (Feature Flags)
  FEATURE_AI_ENABLED: Deno.env.get('FEATURE_AI_ENABLED') === 'true',
  FEATURE_WHATSAPP_ENABLED: Deno.env.get('FEATURE_WHATSAPP_ENABLED') === 'true',
  FEATURE_PACKAGES_ENABLED: Deno.env.get('FEATURE_PACKAGES_ENABLED') === 'true',
} as const;

// Validar configurações obrigatórias
export function validateConfig(): { valid: boolean; missing: string[] } {
  const required = [
    'SUPABASE_URL',
  ];
  
  const missing = required.filter(key => !Config[key as keyof typeof Config]);
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

// Helper para verificar feature flags
export function isFeatureEnabled(feature: 'ai' | 'whatsapp' | 'packages'): boolean {
  switch (feature) {
    case 'ai':
      return Config.FEATURE_AI_ENABLED && !!Config.OPENAI_API_KEY;
    case 'whatsapp':
      return Config.FEATURE_WHATSAPP_ENABLED && !!Config.EVOLUTION_API_URL;
    case 'packages':
      return Config.FEATURE_PACKAGES_ENABLED;
    default:
      return false;
  }
}

// Constantes de negócio
export const BusinessRules = {
  // Agendamentos
  APPOINTMENT_DURATIONS: [30, 60, 90] as const,
  DEFAULT_APPOINTMENT_DURATION: 60,
  MIN_ADVANCE_BOOKING_HOURS: 2,
  MAX_ADVANCE_BOOKING_DAYS: 60,
  
  // Sessões
  SESSION_STATUSES: ['draft', 'completed'] as const,
  EVA_SCORE_MIN: 0,
  EVA_SCORE_MAX: 10,
  
  // Pain Maps
  PAIN_INTENSITY_MIN: 0,
  PAIN_INTENSITY_MAX: 10,
  PAIN_TYPES: ['sharp', 'throbbing', 'burning', 'tingling', 'numbness', 'stiffness'] as const,
  
  // Waitlist
  PRIORITIES: ['normal', 'high', 'urgent'] as const,
  DAYS_OF_WEEK: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const,
  PERIODS: ['morning', 'afternoon', 'evening'] as const,
  
  // Pagamentos
  PAYMENT_METHODS: ['pix', 'credit_card', 'debit_card', 'cash', 'transfer'] as const,
  
  // Pacotes
  MIN_SESSIONS_PER_PACKAGE: 5,
  MAX_SESSIONS_PER_PACKAGE: 50,
  DEFAULT_VALIDITY_DAYS: 90,
} as const;

// Mensagens de erro padronizadas
export const ErrorMessages = {
  // Auth
  AUTH_REQUIRED: 'Autenticação necessária',
  AUTH_INVALID_TOKEN: 'Token inválido ou expirado',
  AUTH_FORBIDDEN: 'Acesso não autorizado',
  
  // Validation
  INVALID_UUID: 'ID inválido - formato UUID esperado',
  INVALID_JSON: 'Corpo da requisição inválido - JSON esperado',
  VALIDATION_ERROR: 'Erro de validação nos dados enviados',
  
  // Resources
  NOT_FOUND: 'Recurso não encontrado',
  DUPLICATE: 'Registro duplicado - dados já existem',
  CONFLICT: 'Conflito - operação não pode ser concluída',
  
  // Rate Limit
  RATE_LIMITED: 'Limite de requisições excedido. Aguarde antes de tentar novamente.',
  
  // Server
  INTERNAL_ERROR: 'Erro interno do servidor',
  SERVICE_UNAVAILABLE: 'Serviço temporariamente indisponível',
} as const;

// Mapeamento de códigos HTTP
export const HttpStatusCodes = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;


