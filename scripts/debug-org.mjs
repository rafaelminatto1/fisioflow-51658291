import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
let dbUrl = '';

if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const [key, ...v] = line.split('=');
    if (key?.trim() === 'DATABASE_URL') dbUrl = v.join('=').trim().replace(/^["']|["']$/g, '');
  });
}

const sql = neon(dbUrl);

async function check() {
  const orgCount = await sql`SELECT count(*) FROM exercises WHERE organization_id IS NOT NULL`;
  console.log('Exercícios com organization_id:', orgCount[0].count);
  const nullOrgCount = await sql`SELECT count(*) FROM exercises WHERE organization_id IS NULL`;
  console.log('Exercícios com organization_id NULL:', nullOrgCount[0].count);
  
  const publicCount = await sql`SELECT count(*) FROM exercises WHERE is_public = true`;
  console.log('Exercícios públicos:', publicCount[0].count);
}

check().catch(console.error);
