import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import * as schema from '@fisioflow/db';
import type { Env } from '../types/env';
import { wrapQueryWithTimeout, DEFAULT_TIMEOUTS } from './dbWrapper';

function getUrl(env: Env): string {
  // Prioriza NEON_URL (direto ao Neon HTTP API) sobre Hyperdrive (TCP-only, não funciona com neon() HTTP)
  const url = env.NEON_URL || process.env.DATABASE_URL || env.HYPERDRIVE?.connectionString;
  if (!url) throw new Error('Database configuration error: URL missing');
  return url;
}

/**
 * Helper para executar queries com cache no Cloudflare D1.
 * Ideal para dados que mudam pouco (configurações, listas fixas).
 */
export async function queryWithCache<T>(
  env: Env,
  cacheKey: string,
  ttlSeconds: number,
  neonQuery: () => Promise<T>
): Promise<T> {
  if (!env.DB) return await neonQuery();

  try {
    // 1. Tenta buscar no D1
    const cached = await env.DB.prepare(
      'SELECT value, expires_at FROM query_cache WHERE id = ?'
    ).bind(cacheKey).first<{ value: string; expires_at: number }>();

    if (cached && cached.expires_at > Date.now()) {
      return JSON.parse(cached.value) as T;
    }

    // 2. Se não estiver no cache ou expirado, busca no Neon
    const result = await neonQuery();

    // 3. Salva no D1 para a próxima vez
    await env.DB.prepare(
      'INSERT OR REPLACE INTO query_cache (id, value, expires_at) VALUES (?, ?, ?)'
    ).bind(
      cacheKey,
      JSON.stringify(result),
      Date.now() + ttlSeconds * 1000
    ).run();

    return result;
  } catch (error) {
    console.error(`[D1 Cache Error]: ${cacheKey}`, error);
    return await neonQuery(); // Fallback para o Neon se o D1 falhar
  }
}

/**
 * Cria uma instância do Drizzle ORM via Neon HTTP driver.
 * Neon HTTP é o driver recomendado para Cloudflare Workers.
 */
export function createDb(env: Env) {
  return drizzleHttp(neon(getUrl(env)), { schema });
}

/**
 * @deprecated Use createDb(env) for Drizzle ORM instead.
 * Retorna um objeto compatível com pg.Pool.query({ rows }).
 */
export function createPool(env: Env, defaultTimeout: number = DEFAULT_TIMEOUTS.query) {
  const sql = neon(getUrl(env), { fullResults: true });
  
  const wrappedQuery = wrapQueryWithTimeout(sql.query.bind(sql), defaultTimeout);
  const wrappedSql = Object.assign(sql, { query: wrappedQuery });
  
  // Compatibilidade com rotas que chamam pool.end() — no-op
  (wrappedSql as any).end = async () => {};
  return wrappedSql as typeof wrappedSql & { end: () => Promise<void> };
}

/**
 * @deprecated Use createDb(env) for Drizzle ORM instead.
 * Helper para SQL bruto via Neon HTTP (tagged template ou .query()).
 */
export function getRawSql(env: Env) {
  return neon(getUrl(env));
}

/**
 * Retorna um pool com pré-configuração de RLS para organização específica.
 * Define current_setting('app.org_id') antes de cada query para compatibilidade com RLS.
 */
export function createPoolForOrg(env: Env, organizationId: string, defaultTimeout: number = DEFAULT_TIMEOUTS.query) {
  const sql = neon(getUrl(env), { fullResults: true });
  
  // Wrapper que executa SET LOCAL antes de cada query
  const queryWithRls = async (queryText: string, params: any[] = []) => {
    try {
      // Executa SET LOCAL antes da query para RLS
      await sql`SELECT set_config('app.org_id', ${organizationId}::text, true)`;
      
      // Apply timeout to the main query
      const wrappedQuery = wrapQueryWithTimeout(
        (qt: string, p: any[]) => sql.query(qt, p),
        defaultTimeout
      );
      
      return await wrappedQuery(queryText, params);
    } catch (error) {
      console.error('[DB Error with RLS]:', error);
      throw error;
    }
  };
  
  (queryWithRls as any).end = async () => {};
  (queryWithRls as any).query = queryWithRls;
  return queryWithRls as any;
}
