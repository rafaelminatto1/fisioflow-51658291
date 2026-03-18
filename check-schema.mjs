import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    const indexes = await sql`
      SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'appointments';
    `;
    console.log('\n--- INDEXES ---');
    console.table(indexes);
  } catch (error) {
    console.error('Error:', error);
  }
}
run();
