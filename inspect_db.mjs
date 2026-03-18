import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function inspect() {
  try {
    console.log('--- TABLES IN PUBLIC SCHEMA ---');
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log(tables.map(t => t.table_name).join(', '));

    console.log('\n--- PATIENTS COLUMNS ---');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'patients'
    `;
    console.table(columns);

    console.log('\n--- SAMPLE COUNT BY ORG ---');
    const counts = await sql`SELECT organization_id, count(*) FROM patients GROUP BY organization_id`;
    console.table(counts);

  } catch (error) {
    console.error('Error:', error);
  }
}

inspect();
