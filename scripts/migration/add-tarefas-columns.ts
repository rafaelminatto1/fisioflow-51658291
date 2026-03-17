import { neon } from '@neondatabase/serverless';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log('Connecting to Neon DB...');
  const sql = neon(process.env.DATABASE_URL);

  console.log('Adding "requires_acknowledgment" and "acknowledgments" columns to "tarefas" table...');
  try {
    await sql`
      ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS requires_acknowledgment BOOLEAN DEFAULT FALSE NOT NULL;
    `;
    await sql`
      ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS acknowledgments JSONB DEFAULT '[]'::jsonb NOT NULL;
    `;
    console.log('✅ Columns added successfully!');
  } catch (err) {
    console.error('❌ Failed to run SQL:', err);
  }
}

main().catch(console.error);