import { Client } from 'pg';
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const schema = await client.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name='sessions' AND column_name IN ('id','patient_id','organization_id','date','created_at','updated_at','observacao')
    ORDER BY ordinal_position
  `);
  console.log('schema', JSON.stringify(schema.rows, null, 2));
  const rows = await client.query(`
    SELECT p.full_name, s.id, s.date::text AS date_text, s.created_at::text AS created_at_text, length(coalesce(s.observacao,'')) AS obs_len, s.session_number
    FROM sessions s
    JOIN patients p ON p.id = s.patient_id
    WHERE p.full_name IN ('Vinicius Rodrigues Marcili','Mayara Antunes','Samuel Antunes Sertão')
      AND s.date::date BETWEEN DATE '2026-07-06' AND DATE '2026-07-08'
    ORDER BY p.full_name, s.date, s.created_at
  `);
  console.log('rows', JSON.stringify(rows.rows, null, 2));
} finally { await client.end(); }
