import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkRateLimitUpstash, getIdentifierForRateLimit } from './rate-limit-upstash.ts';

interface RateLimitConfig {
  maxRequests: number;
  windowMinutes: number;
}

interface RateLimitResult {
  allowed: boolean;
  current_count: number;
  limit: number;
  window_minutes: number;
  retry_after_seconds: number;
}

// Configurações padrão por endpoint
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Chat IA
  'ai-chat': { maxRequests: 30, windowMinutes: 5 },
  
  // Funções de IA
  'ai-treatment-assistant': { maxRequests: 20, windowMinutes: 5 },
  'ai-exercise-prescription': { maxRequests: 20, windowMinutes: 5 },
  'ai-transcribe-session': { maxRequests: 10, windowMinutes: 5 },
  'ai-suggest-conduct': { maxRequests: 20, windowMinutes: 5 },
  'intelligent-reports': { maxRequests: 15, windowMinutes: 5 },
  
  // Funções de pagamento
  'create-checkout': { maxRequests: 10, windowMinutes: 5 },
  'create-voucher-checkout': { maxRequests: 10, windowMinutes: 5 },
  'verify-voucher-payment': { maxRequests: 20, windowMinutes: 5 },
  
  // Funções de comunicação
  'send-whatsapp': { maxRequests: 10, windowMinutes: 5 },
  'send-notification': { maxRequests: 50, windowMinutes: 5 },
  'send-appointment-email': { maxRequests: 30, windowMinutes: 5 },
  'send-mfa-otp': { maxRequests: 5, windowMinutes: 5 },
  
  // Funções de notificação/agendamento
  'schedule-notifications': { maxRequests: 20, windowMinutes: 5 },
  'notification-status': { maxRequests: 100, windowMinutes: 5 },
  'smart-reminders': { maxRequests: 30, windowMinutes: 5 },
  'schedule-reminders': { maxRequests: 20, windowMinutes: 5 },
  'send-birthday-message': { maxRequests: 10, windowMinutes: 60 }, // Cron job
  'send-expiring-vouchers-reminder': { maxRequests: 10, windowMinutes: 60 }, // Cron job
  'send-nps-survey': { maxRequests: 30, windowMinutes: 5 },
  
  // Funções administrativas
  'backup-manager': { maxRequests: 5, windowMinutes: 5 },
  'weekly-report': { maxRequests: 10, windowMinutes: 5 },
  
  // Default
  'default': { maxRequests: 60, windowMinutes: 5 },
};

/**
 * Verifica rate limit para uma requisição
 * Usa IP ou user_id como identificador
 */
export async function checkRateLimit(
  req: Request,
  endpoint: string,
  customConfig?: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    // Obter identificador (IP ou user_id)
    const identifier = await getIdentifierForRateLimit(req);
    
    // Obter configuração
    const config = customConfig || RATE_LIMITS[endpoint] || RATE_LIMITS['default'];
    
    // Tentar usar Upstash primeiro (se configurado)
    const upstashResult = await checkRateLimitUpstash(identifier, config);
    
    // Se Upstash estiver funcionando, usar resultado
    if (upstashResult.limit > 0) {
      return upstashResult;
    }
    
    // Fallback para implementação via banco de dados
    // Criar cliente Supabase com service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Chamar função do banco
    const { data, error } = await supabase.rpc('check_rate_limit', {
      _identifier: identifier,
      _endpoint: endpoint,
      _max_requests: config.maxRequests,
      _window_minutes: config.windowMinutes,
    });

    if (error) {
      console.error('Erro ao verificar rate limit:', error);
      // Em caso de erro, permitir request (fail open)
      return {
        allowed: true,
        current_count: 0,
        limit: config.maxRequests,
        window_minutes: config.windowMinutes,
        retry_after_seconds: 0,
      };
    }

    return data as RateLimitResult;
  } catch (error) {
    console.error('Erro no rate limiting:', error);
    // Em caso de erro, permitir request (fail open)
    return {
      allowed: true,
      current_count: 0,
      limit: 60,
      window_minutes: 5,
      retry_after_seconds: 0,
    };
  }
}

// Funções getIdentifier, parseJwt e getClientIP foram movidas para rate-limit-upstash.ts
// Mantidas aqui apenas para compatibilidade, mas devem usar as de rate-limit-upstash.ts

/**
 * Cria resposta de rate limit excedido
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'Limite de requisições excedido',
      message: `Você excedeu o limite de ${result.limit} requisições por ${result.window_minutes} minutos.`,
      current_count: result.current_count,
      limit: result.limit,
      retry_after_seconds: result.retry_after_seconds,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': result.retry_after_seconds.toString(),
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': Math.max(0, result.limit - result.current_count).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + result.retry_after_seconds * 1000).toISOString(),
      },
    }
  );
}

/**
 * Adiciona headers de rate limit na resposta
 */
export function addRateLimitHeaders(
  headers: Record<string, string>,
  result: RateLimitResult
): Record<string, string> {
  return {
    ...headers,
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': Math.max(0, result.limit - result.current_count).toString(),
    'X-RateLimit-Reset': new Date(Date.now() + result.window_minutes * 60 * 1000).toISOString(),
  };
}
