import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://neondb_owner:npg_u1vFj3IbxnDB@ep-holy-snow-a590p82u-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require" });
pool.query("SELECT id, status, type FROM appointments WHERE status = 'avaliacao' LIMIT 5", (err, res) => {
  if (err) console.error(err);
  else console.log(res.rows);
  pool.end();
});
