import { createMiddleware } from 'hono/factory';
import type { Env } from '../types/env';
import type { AuthVariables } from '../lib/auth';

type RateLimitOptions = {
  /** Max requests per window */
  limit: number;
  /** Window size in seconds (default: 3600 = 1h) */
  windowSeconds?: number;
  /** Label for the rate limit key (e.g. "ai", "whatsapp") */
  endpoint: string;
};

/**
 * Rate limiting middleware usando D1 (fisioflow-edge-cache).
 * Contadores atômicos por organização + endpoint + janela de tempo.
 *
 * Se EDGE_CACHE não estiver disponível (local dev), permite tudo.
 * Em produção: retorna 429 com Retry-After header.
 */
export function rateLimit(opts: RateLimitOptions) {
  const windowSeconds = opts.windowSeconds ?? 3600;

  return createMiddleware<{ Bindings: Env; Variables: AuthVariables }>(async (c, next) => {
    const db = c.env.EDGE_CACHE;
    if (!db) return next(); // local dev: sem cache

    const user = c.get('user');
    const orgId = user?.organizationId ?? 'anon';

    // Janela atual: ex. "2026-03-31:14" para window de 1h
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % windowSeconds);
    const key = `rl:${orgId}:${opts.endpoint}:${windowStart}`;

    try {
      // Upsert atômico — D1 SQLite garante atomicidade por statement
      const result = await db.prepare(`
        INSERT INTO rate_limits (id, count, window_start)
        VALUES (?, 1, ?)
        ON CONFLICT(id) DO UPDATE SET count = count + 1
        RETURNING count
      `).bind(key, windowStart).first<{ count: number }>();

      const count = Number(result?.count ?? 1);

      c.header('X-RateLimit-Limit', String(opts.limit));
      c.header('X-RateLimit-Remaining', String(Math.max(0, opts.limit - count)));
      c.header('X-RateLimit-Reset', String(windowStart + windowSeconds));

      if (count > opts.limit) {
        const retryAfter = Math.max(1, windowStart + windowSeconds - now);
        c.header('Retry-After', String(retryAfter));
        return c.json(
          { error: 'Rate limit exceeded', retryAfter },
          429,
        );
      }
    } catch (err) {
      // Falha silenciosa — não bloquear requisição por erro de cache
      console.warn('[RateLimit] D1 error, bypassing:', err);
    }

    return next();
  });
}

/**
 * Limpa entradas expiradas da tabela rate_limits.
 * Chamar periodicamente (ex: no cron de manutenção diário).
 */
export async function cleanupRateLimits(db: D1Database): Promise<number> {
  const cutoff = Math.floor(Date.now() / 1000) - 7200; // mais de 2h atrás
  const result = await db.prepare(
    'DELETE FROM rate_limits WHERE window_start < ?'
  ).bind(cutoff).run();
  return result.meta.changes ?? 0;
}
