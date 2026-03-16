import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import type { Env } from '../types/env';

import * as schema from './worker-schema';

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
