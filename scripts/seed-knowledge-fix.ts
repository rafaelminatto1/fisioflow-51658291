import { Pool } from 'pg';
import { GOLD_STANDARD_SEED } from '../src/features/wiki/utils/seedData';

const DATABASE_URL = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const orgRes = await pool.query('SELECT id FROM organizations LIMIT 1');
  const organizationId = orgRes.rows[0].id;

  console.log(`Seeding knowledge artifacts for org: ${organizationId}`);

  for (const item of GOLD_STANDARD_SEED) {
    try {
      await pool.query(`
        INSERT INTO knowledge_articles (
          organization_id, title, type, url, "group", subgroup, tags, 
          evidence_level, status, summary, metadata, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        ON CONFLICT (url, organization_id) DO UPDATE SET
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          tags = EXCLUDED.tags,
          updated_at = NOW()
      `, [
        organizationId,
        item.title,
        item.type,
        item.url,
        item.group,
        item.subgroup,
        item.tags,
        item.evidenceLevel,
        item.status,
        item.summary,
        JSON.stringify(item.metadata),
        'system'
      ]);
      console.log(`✅ Seeded article: ${item.title}`);
    } catch (e) {
      console.error(`❌ Failed to seed ${item.title}:`, e);
    }
  }
  await pool.end();
}

main();
