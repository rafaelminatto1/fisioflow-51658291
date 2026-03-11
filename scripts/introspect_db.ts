import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL!);

async function introspect() {
  console.log("Introspecting 'sessions' table column definitions...\n");

  try {
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sessions'
    `;
    console.log(JSON.stringify(columns, null, 2));

    const allTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log("All tables in public schema:");
    allTables.forEach(t => console.log(t.table_name));

  } catch (e: any) {
    console.log(`[Error] ${e.message}`);
  }
}

introspect();
