import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.NEON_URL || process.env.DATABASE_URL);

async function check() {
    try {
        const res = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'session' OR table_name = 'user';
    `;
        console.log(JSON.stringify(res, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

check();
