import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL!);

async function introspect() {
  try {
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'patients'
    `;
    console.log("Patients columns:", JSON.stringify(columns, null, 2));
  } catch (e: any) {
    console.log(`[Error] ${e.message}`);
  }
}

introspect();
