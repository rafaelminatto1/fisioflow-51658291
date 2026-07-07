import { Client } from 'pg';
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL não informado');
const APPLY = process.env.APPLY_FIX === '1';
const client = new Client({ connectionString: DATABASE_URL });
await client.connect();
try {
  const res = await client.query(`
    WITH dup AS (
      SELECT
        p.full_name,
        s.patient_id,
        s.date,
        COUNT(*) AS count,
        ARRAY_AGG(s.id ORDER BY COALESCE(length(NULLIF(trim(s.observacao), '')), 0) DESC, s.created_at ASC) AS ids,
        ARRAY_AGG(COALESCE(length(NULLIF(trim(s.observacao), '')), 0) ORDER BY COALESCE(length(NULLIF(trim(s.observacao), '')), 0) DESC, s.created_at ASC) AS obs_lengths
      FROM sessions s
      JOIN patients p ON p.id = s.patient_id
      WHERE p.full_name IN ('Mayara Antunes', 'Samuel Antunes Sertão')
        AND s.date::date = DATE '2026-07-07'
      GROUP BY p.full_name, s.patient_id, s.date
      HAVING COUNT(*) > 1
    )
    SELECT * FROM dup
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  if (APPLY) {
    for (const row of res.rows) {
      const ids = row.ids;
      const keep = ids[0];
      const remove = ids.slice(1);
      if (remove.length) {
        await client.query('DELETE FROM sessions WHERE id = ANY($1::uuid[])', [remove]);
        console.log(`Removidas ${remove.length} duplicadas de ${row.full_name}; mantida ${keep}`);
      }
    }
  }
} finally {
  await client.end();
}
