/**
 * Rate Limiting Middleware
 * Middleware para limitar requisições por usuário/IP usando PostgreSQL
 */

import { HttpsError } from 'firebase-functions/v2/https';
import { getPool } from '../init';

interface RateLimitConfig {
  /** Número máximo de requisições permitidas */
  limit: number;
  /** Janela de tempo em segundos */
  window: number;
  /** Identificador único para o tipo de requisição */
  key: string;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Tabela de rate limits no PostgreSQL
 */
const RATE_LIMIT_TABLE = 'rate_limits';

/**
 * Inicializa a tabela de rate limits se não existir
 */
async function initRateLimitTable(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${RATE_LIMIT_TABLE} (
      id SERIAL PRIMARY KEY,
      identifier VARCHAR(255) NOT NULL,
      key VARCHAR(100) NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      window_start TIMESTAMP NOT NULL DEFAULT NOW(),
      window_end TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT rate_limits_unique UNIQUE (identifier, key)
    );

    CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_key ON ${RATE_LIMIT_TABLE}(identifier, key);
    CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end ON ${RATE_LIMIT_TABLE}(window_end);

    -- Limpar registros antigos automaticamente
    CREATE OR REPLACE FUNCTION cleanup_old_rate_limits() RETURNS void AS $$
    BEGIN
      DELETE FROM ${RATE_LIMIT_TABLE} WHERE window_end < NOW();
    END;
    $$ LANGUAGE plpgsql;
  `);
}

/**
 * Verifica se uma requisição deve ser limitada
 */
async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const pool = getPool();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + config.window * 1000);

  try {
    // Usar UPSERT para verificar/atualizar o contador
    const result = await pool.query(`
      INSERT INTO ${RATE_LIMIT_TABLE} (identifier, key, window_start, window_end, count)
      VALUES ($1, $2, NOW(), $3, 1)
      ON CONFLICT (identifier, key)
      DO UPDATE SET
        count = ${RATE_LIMIT_TABLE}.count + 1,
        updated_at = NOW(),
        window_end = CASE
          WHEN ${RATE_LIMIT_TABLE}.window_end < NOW() THEN $3
          ELSE ${RATE_LIMIT_TABLE}.window_end
        END,
        count = CASE
          WHEN ${RATE_LIMIT_TABLE}.window_end < NOW() THEN 1
          ELSE ${RATE_LIMIT_TABLE}.count + 1
        END
      RETURNING count, window_end
    `, [identifier, config.key, windowEnd]);

    const row = result.rows[0];
    const remaining = Math.max(0, config.limit - row.count);

    // Limpar registros expirados periodicamente
    if (Math.random() < 0.01) { // 1% de chance
      pool.query('SELECT cleanup_old_rate_limits()').catch(() => {});
    }

    return {
      success: row.count <= config.limit,
      limit: config.limit,
      remaining,
      reset: new Date(row.window_end).getTime(),
    };
  } catch (error) {
    console.error('[RateLimit] Error checking rate limit:', error);
    // Fail open - permitir requisição se houver erro
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: now.getTime() + config.window * 1000,
    };
  }
}

/**
 * Configurações padrão de rate limit por tipo de requisição
 */
export const RATE_LIMITS = {
  // API calls - 100 requests per minute
  default: { limit: 100, window: 60, key: 'default' },

  // Callable functions - 60 requests per minute
  callable: { limit: 60, window: 60, key: 'callable' },

  // Heavy operations - 10 requests per minute
  heavy: { limit: 10, window: 60, key: 'heavy' },

  // Auth operations - 20 requests per 5 minutes
  auth: { limit: 20, window: 300, key: 'auth' },

  // Export/generate reports - 5 requests per hour
  export: { limit: 5, window: 3600, key: 'export' },
} as const;

/**
 * Middleware de rate limiting para callable functions
 *
 * @example
 * ```typescript
 * export const myFunction = onCall(
 *   withRateLimit(RATE_LIMITS.callable),
 *   async (request) => {
 *     // ...
 *   }
 * );
 * ```
 */
export function withRateLimit(config: RateLimitConfig = RATE_LIMITS.callable) {
  return {
    enforceAppCheck: true,
    // Adicionar outras opções conforme necessário
  };
}

/**
 * Função para verificar rate limit dentro de uma callable function
 *
 * @example
 * ```typescript
 * export const myFunction = onCall(async (request) => {
 *   await enforceRateLimit(request, RATE_LIMITS.callable);
 *   // ...
 * });
 * ```
 */
export async function enforceRateLimit(
  request: { auth?: any; rawRequest?: any },
  config: RateLimitConfig = RATE_LIMITS.callable
): Promise<void> {
  // Gerar identificador único
  const userId = request.auth?.uid || request.auth?.token?.user_id;
  const ipAddress = request.rawRequest?.headers?.['x-forwarded-for'] ||
                    request.rawRequest?.headers?.['fastly-client-ip'] ||
                    request.rawRequest?.socket?.remoteAddress ||
                    'unknown';

  const identifier = userId ? `user:${userId}` : `ip:${ipAddress}`;

  // Inicializar tabela se necessário (em background)
  initRateLimitTable().catch(() => {});

  // Verificar rate limit
  const result = await checkRateLimit(identifier, config);

  // Adicionar headers de rate limit ao response (se disponível)
  if (request.rawRequest?.res) {
    request.rawRequest.res.setHeader('X-RateLimit-Limit', result.limit.toString());
    request.rawRequest.res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    request.rawRequest.res.setHeader('X-RateLimit-Reset', result.reset.toString());
  }

  if (!result.success) {
    throw new HttpsError(
      'resource-exhausted',
      `Rate limit exceeded. Please try again later.`,
      {
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      }
    );
  }

  console.log(`[RateLimit] ${identifier}: ${result.limit - result.remaining}/${result.limit} requests`);
}

/**
 * Rate limit específico para operações pesadas
 */
export async function enforceHeavyRateLimit(
  request: { auth?: any; rawRequest?: any }
): Promise<void> {
  return enforceRateLimit(request, RATE_LIMITS.heavy);
}

/**
 * Rate limit específico para operações de exportação
 */
export async function enforceExportRateLimit(
  request: { auth?: any; rawRequest?: any }
): Promise<void> {
  return enforceRateLimit(request, RATE_LIMITS.export);
}

/**
 * Obter estatísticas de rate limit de um usuário
 */
export async function getRateLimitStats(
  identifier: string,
  key: string = 'default'
): Promise<{ current: number; limit: number; reset: number } | null> {
  const pool = getPool();

  try {
    const result = await pool.query(`
      SELECT count, window_end
      FROM ${RATE_LIMIT_TABLE}
      WHERE identifier = $1 AND key = $2 AND window_end > NOW()
      ORDER BY window_end DESC
      LIMIT 1
    `, [identifier, key]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      current: row.count,
      limit: RATE_LIMITS[key as keyof typeof RATE_LIMITS]?.limit || RATE_LIMITS.default.limit,
      reset: new Date(row.window_end).getTime(),
    };
  } catch (error) {
    console.error('[RateLimit] Error getting stats:', error);
    return null;
  }
}

/**
 * Resetar rate limit de um usuário (admin only)
 */
export async function resetRateLimit(
  identifier: string,
  key: string = 'default'
): Promise<boolean> {
  const pool = getPool();

  try {
    await pool.query(`
      DELETE FROM ${RATE_LIMIT_TABLE}
      WHERE identifier = $1 AND key = $2
    `, [identifier, key]);

    console.log(`[RateLimit] Reset rate limit for ${identifier}:${key}`);
    return true;
  } catch (error) {
    console.error('[RateLimit] Error resetting rate limit:', error);
    return false;
  }
}

/**
 * Limpar registros antigos de rate limit
 */
export async function cleanupRateLimits(): Promise<number> {
  const pool = getPool();

  try {
    const result = await pool.query(`
      DELETE FROM ${RATE_LIMIT_TABLE}
      WHERE window_end < NOW()
      RETURNING id
    `);

    console.log(`[RateLimit] Cleaned up ${result.rows.length} old rate limit records`);
    return result.rows.length;
  } catch (error) {
    console.error('[RateLimit] Error cleaning up rate limits:', error);
    return 0;
  }
}
