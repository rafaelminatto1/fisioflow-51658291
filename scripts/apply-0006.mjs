import pg from 'pg';
import fs from 'fs';
import path from 'path';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL is not set.');
  process.exit(1);
}

const cleanUrl = dbUrl.replace(/[?&]channel_binding=[^&]*/g, '').replace(/\?$/, '');
const client = new pg.Client({ connectionString: cleanUrl });

async function main() {
  await client.connect();
  console.log('✅ Connected to database');
  
  const sql = fs.readFileSync('drizzle/0006_ambiguous_vin_gonzales.sql', 'utf-8');
  const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
  
  for (const statement of statements) {
    try {
      console.log(`Executing: ${statement.slice(0, 100)}...`);
      await client.query(statement);
      console.log('✅ Success');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('⏭️ Already exists, skipping');
      } else {
        console.error('❌ Error executing statement:', e.message);
        throw e;
      }
    }
  }
}

main()
  .then(() => {
    console.log('🎉 Migration applied successfully!');
    process.exit(0);
  })
  .catch(e => {
    console.error('Migration failed', e);
    process.exit(1);
  });
