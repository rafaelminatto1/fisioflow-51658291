// Rate Limiting usando Upstash Redis
// Substitui a implementação em memória por uma solução distribuída

import { Ratelimit } from 'https://esm.sh/@upstash/ratelimit@1.0.0';
import { Redis } from 'https://esm.sh/@upstash/redis@1.0.0';

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

// Inicializar Redis do Upstash
let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

function initUpstash() {
  const upstashUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const upstashToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

  if (!upstashUrl || !upstashToken) {
    console.warn('Upstash Redis não configurado. Rate limiting desabilitado.');
    return null;
  }

  try {
    redis = new Redis({
      url: upstashUrl,
      token: upstashToken,
    });

    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow,
      analytics: true,
    });

    console.log('Upstash Redis inicializado para rate limiting');
    return ratelimit;
  } catch (error) {
    console.error('Erro ao inicializar Upstash Redis:', error);
    return null;
  }
}

// Inicializar na primeira chamada
if (!ratelimit) {
  initUpstash();
}

/**
 * Verifica rate limit usando Upstash Redis
 */
export async function checkRateLimitUpstash(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Se Upstash não estiver configurado, permitir todas as requisições
  if (!ratelimit) {
    return {
      allowed: true,
      current_count: 0,
      limit: config.maxRequests,
      window_minutes: config.windowMinutes,
      retry_after_seconds: 0,
    };
  }

  try {
    // Converter windowMinutes para segundos
    const windowSeconds = config.windowMinutes * 60;

    // Usar sliding window limiter
    const result = await ratelimit.limit(identifier, {
      limit: config.maxRequests,
      window: `${windowSeconds}s`,
    });

    // Calcular retry_after_seconds
    const retryAfter = result.reset
      ? Math.max(0, Math.floor((result.reset - Date.now()) / 1000))
      : 0;

    return {
      allowed: result.success,
      current_count: result.limit - (result.remaining ?? 0),
      limit: config.maxRequests,
      window_minutes: config.windowMinutes,
      retry_after_seconds: retryAfter,
    };
  } catch (error) {
    console.error('Erro ao verificar rate limit no Upstash:', error);
    // Fail open - permitir requisição em caso de erro
    return {
      allowed: true,
      current_count: 0,
      limit: config.maxRequests,
      window_minutes: config.windowMinutes,
      retry_after_seconds: 0,
    };
  }
}

/**
 * Obtém identificador único para rate limiting
 */
export async function getIdentifierForRateLimit(req: Request): Promise<string> {
  // Tentar obter user_id do JWT
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const payload = parseJwt(token);
      if (payload?.sub) {
        return `user:${payload.sub}`;
      }
    } catch (e) {
      // Ignora erro de parse
    }
  }

  // Fallback para IP
  const ip = getClientIP(req);
  return `ip:${ip}`;
}

/**
 * Parse simples de JWT (não valida assinatura)
 */
function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/**
 * Obtém IP do cliente
 */
function getClientIP(req: Request): string {
  // Tentar headers comuns de proxy
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfIP = req.headers.get('cf-connecting-ip');
  if (cfIP) {
    return cfIP;
  }

  // Fallback
  return 'unknown';
}

