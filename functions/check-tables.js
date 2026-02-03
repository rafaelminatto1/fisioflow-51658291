const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('patient_goals', 'patient_pathologies')
    `);
    console.log('Tables found:', res.rows);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

check();
