import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Client, Pool } from 'pg';
import type { Env } from '../types/env';

import * as schema from './worker-schema';

let pool: Pool | null = null;

export async function createDb(env: Env) {
  const url = env.HYPERDRIVE?.connectionString || env.NEON_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('DB URL missing');

  // Use pool for Hyperdrive (TCP) to keep connections warm
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    if (!pool) {
      pool = new Pool({ 
        connectionString: url,
        max: 1, // Workers handle one request at a time, but Hyperdrive pools them at the edge
      });
    }
    return drizzlePg(pool, { schema });
  }

  // Fallback para HTTP (Neon)
  return drizzleHttp(neon(url), { schema });
}

export async function createPool(env: Env) {
  const url = env.HYPERDRIVE?.connectionString || env.NEON_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('DB URL missing');

  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    if (!pool) {
      pool = new Pool({ connectionString: url, max: 1 });
    }
    return pool;
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
