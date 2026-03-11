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
  const res = await sql`SELECT id, name, image_url, video_url FROM exercises WHERE image_url IS NOT NULL LIMIT 5`;
  console.log(JSON.stringify(res, null, 2));
  
  const legacyStorageHost = ['firebase', 'storage'].join('');
  const legacyStorageCount = await sql`SELECT COUNT(*) FROM exercises WHERE image_url LIKE ${'%' + legacyStorageHost + '%'}`;
  console.log('Legacy storage URLs restantes:', legacyStorageCount[0].count);

  const r2Count = await sql`SELECT COUNT(*) FROM exercises WHERE image_url LIKE '%moocafisio%'`;
  console.log('R2 URLs:', r2Count[0].count);
}

check().catch(console.error);
