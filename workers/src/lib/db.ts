import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import * as schema from '@fisioflow/db';
import type { Env } from '../types/env';

function getUrl(env: Env): string {
  // Prioriza NEON_URL (direto ao Neon HTTP API) sobre Hyperdrive (TCP-only, não funciona com neon() HTTP)
  const url = env.NEON_URL || process.env.DATABASE_URL || env.HYPERDRIVE?.connectionString;
  if (!url) throw new Error('Database configuration error: URL missing');
  return url;
}

/**
 * Cria uma instância do Drizzle ORM via Neon HTTP driver.
 * Neon HTTP é o driver recomendado para Cloudflare Workers.
 */
export function createDb(env: Env) {
  return drizzleHttp(neon(getUrl(env)), { schema });
}

/**
 * Retorna um objeto compatível com pg.Pool.query({ rows }).
 * fullResults: true → retorna { rows, rowCount, fields } como pg.
 * Sem TCP, sem conexões persistentes — usa Neon HTTP.
 */
export function createPool(env: Env) {
  const sql = neon(getUrl(env), { fullResults: true });
  // Compatibilidade com rotas que chamam pool.end() — no-op
  (sql as any).end = async () => {};
  return sql as typeof sql & { end: () => Promise<void> };
}

/**
 * Helper para SQL bruto via Neon HTTP (tagged template ou .query()).
 */
export function getRawSql(env: Env) {
  return neon(getUrl(env));
}

/**
 * Retorna um pool com pré-configuração de RLS para organização específica.
 * Define current_setting('app.org_id') antes de cada query para compatibilidade com RLS.
 */
export function createPoolForOrg(env: Env, organizationId: string) {
  const sql = neon(getUrl(env), { fullResults: true });
  
  // Wrapper que executa SET LOCAL antes de cada query
  const queryWithRls = async (queryText: string, params: any[] = []) => {
    try {
      // Executa SET LOCAL antes da query para RLS
      await sql`SELECT set_config('app.org_id', ${organizationId}::text, true)`;
      return await sql.query(queryText, params);
    } catch (error) {
      console.error('[DB Error with RLS]:', error);
      throw error;
    }
  };
  
  (queryWithRls as any).end = async () => {};
  return queryWithRls as typeof sql & { end: () => Promise<void> };
}
