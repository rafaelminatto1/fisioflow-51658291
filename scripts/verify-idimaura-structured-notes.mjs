import { Client } from 'pg';
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const res = await client.query(`
    SELECT p.full_name, s.date::text AS date, s.procedures, s.exercises, s.home_exercises
    FROM sessions s
    JOIN patients p ON p.id = s.patient_id
    WHERE p.full_name ILIKE '%Idimaura%'
      AND s.date::date = DATE '2026-07-06'
      AND s.deleted_at IS NULL
    ORDER BY s.date DESC
    LIMIT 1
  `);
  console.log(JSON.stringify(res.rows[0] ?? null, null, 2));
} finally {
  await client.end();
}
