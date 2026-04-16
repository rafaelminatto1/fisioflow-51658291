import { neon, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleServerless } from 'drizzle-orm/neon-serverless';
import * as schema from '@fisioflow/db';

const url = process.env.DATABASE_URL!;

// Helper para detectar se deve usar Pool (TCP) ou neon (HTTP)
const shouldUsePool = url.includes('postgres://') || url.includes('postgresql://') || url.includes('-pooler');

export const db = shouldUsePool 
  ? drizzleServerless(new Pool({ connectionString: url }), { schema })
  : drizzleHttp(neon(url), { schema });
