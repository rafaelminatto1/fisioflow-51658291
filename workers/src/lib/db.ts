import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import type { Env } from '../types/env';

import * as schema from './worker-schema';

export type Database = any; // ReturnType<typeof createDb> is now async

export async function createDb(env: Env) {
  const url = env.NEON_URL || env.HYPERDRIVE?.connectionString || process.env.DATABASE_URL;
  if (!url) throw new Error('DB URL missing');

  // Se for uma URL do Hyperdrive (TCP), usamos o driver 'pg'
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    const client = new Client({ connectionString: url });
    await client.connect();
    return drizzlePg(client, { schema });
  }

  // Fallback para HTTP (Neon)
  return drizzleHttp(neon(url), { schema });
}

/**
 * Mock de Pool para compatibilidade total.
 * Usa o driver 'pg' nativo para Hyperdrive.
 */
export async function createPool(env: Env) {
  const url = env.NEON_URL || env.HYPERDRIVE?.connectionString || process.env.DATABASE_URL;
  if (!url) throw new Error('DB URL missing');

  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    const client = new Client({ connectionString: url });
    await client.connect();
    return client; // Retorna o client diretamente que tem o método .query compatível
  }

  // Fallback para neon HTTP
  const sql = neon(url);
  return {
    query: async (text: string, params: any[] = []) => {
      const rows = await sql.query(text, params);
      return { rows: Array.isArray(rows) ? rows : [rows], rowCount: Array.isArray(rows) ? rows.length : 1 };
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
