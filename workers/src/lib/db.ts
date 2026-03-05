/**
 * Conexão Neon PostgreSQL via Cloudflare Hyperdrive
 *
 * Prod: env.HYPERDRIVE.connectionString → pg Pool → drizzle/node-postgres
 *       (Hyperdrive mantém conexões warm nos PoPs do Cloudflare, latência ~20-50ms)
 *
 * Local: wrangler injeta HYPERDRIVE.connectionString = WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE
 *        (definido no dev.sh via DATABASE_URL do .env)
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Env } from '../types/env';

import * as exercises from '../../../src/server/db/schema/exercises';
import * as protocols from '../../../src/server/db/schema/protocols';
import * as wiki from '../../../src/server/db/schema/wiki';

const schema = { ...exercises, ...protocols, ...wiki };

export type Database = ReturnType<typeof createDb>;

export function createPool(env: Env) {
  return new Pool({
    connectionString: env.HYPERDRIVE.connectionString,
  });
}

export function createDb(env: Env, orgId?: string) {
  const pool = createPool(env);

  // Se tiver orgId, seta no contexto da sessão do Postgres para o RLS funcionar
  if (orgId) {
    pool.on('connect', (client) => {
      client.query('SELECT set_config($1, $2, false)', ['app.org_id', orgId]);
    });
  }

  return drizzle(pool, { schema });
}
