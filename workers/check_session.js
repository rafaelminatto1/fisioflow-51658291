import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function check() {
    try {
        const res = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'session';
    `;
        console.log(JSON.stringify(res, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

check();
