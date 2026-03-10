import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import type { Env } from '../types/env';

import * as exercises from '../../../src/server/db/schema/exercises';
import * as protocols from '../../../src/server/db/schema/protocols';
import * as wiki from '../../../src/server/db/schema/wiki';

const schema = { ...exercises, ...protocols, ...wiki };

export type Database = ReturnType<typeof createDb>;

export function createDb(env: Env) {
  const url = env.NEON_URL || env.HYPERDRIVE?.connectionString || process.env.DATABASE_URL;
  if (!url) throw new Error('DB URL missing');
  return drizzle(neon(url), { schema });
}

/**
 * Mock de Pool para compatibilidade total.
 * Usa o driver HTTP stateless do Neon.
 */
export function createPool(env: Env) {
  const url = env.NEON_URL || env.HYPERDRIVE?.connectionString || process.env.DATABASE_URL;
  if (!url) throw new Error('DB URL missing');
  const sql = neon(url);
  
  return {
    query: async (text: string, params: any[] = []) => {
      try {
        const rows = await sql(text, params);
        return { rows: Array.isArray(rows) ? rows : [rows], rowCount: Array.isArray(rows) ? rows.length : 1 };
      } catch (err) {
        console.error('[DB Query Error]', err);
        return { rows: [], rowCount: 0 };
      }
    },
    on: () => {},
    end: async () => {},
  };
}

export function getRawSql(env: Env) {
  const url = env.NEON_URL || env.HYPERDRIVE?.connectionString || process.env.DATABASE_URL;
  if (!url) throw new Error('DB URL missing');
  return neon(url);
}
