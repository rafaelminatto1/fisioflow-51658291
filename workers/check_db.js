import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function check() {
    try {
        const res = await sql`
      SELECT id, name, is_active, is_public, created_by, created_at 
      FROM exercises 
      ORDER BY created_at DESC 
      LIMIT 10;
    `;
        console.log(JSON.stringify(res, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

check();
