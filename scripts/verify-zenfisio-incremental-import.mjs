import { Client } from 'pg';
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const summary = await client.query(`
    SELECT
      COUNT(*)::int AS sessions_0607_0707,
      COUNT(*) FILTER (WHERE NULLIF(trim(observacao), '') IS NOT NULL)::int AS with_observacao,
      COUNT(DISTINCT patient_id)::int AS patients
    FROM sessions
    WHERE organization_id = '00000000-0000-0000-0000-000000000001'
      AND date::date BETWEEN DATE '2026-07-06' AND DATE '2026-07-07'
      AND created_at::date BETWEEN DATE '2026-07-06' AND DATE '2026-07-07'
  `);
  const duplicates = await client.query(`
    SELECT p.full_name, s.date::text, COUNT(*)::int AS count
    FROM sessions s
    JOIN patients p ON p.id=s.patient_id
    WHERE s.organization_id = '00000000-0000-0000-0000-000000000001'
      AND s.date::date BETWEEN DATE '2026-07-06' AND DATE '2026-07-07'
    GROUP BY p.full_name, s.patient_id, s.date
    HAVING COUNT(*) > 1
    ORDER BY count DESC, p.full_name
    LIMIT 20
  `);
  const samples = await client.query(`
    SELECT p.full_name, s.date::text AS date, length(coalesce(s.observacao,'')) AS observacao_chars, left(s.observacao, 120) AS preview
    FROM sessions s
    JOIN patients p ON p.id=s.patient_id
    WHERE s.organization_id = '00000000-0000-0000-0000-000000000001'
      AND s.date::date BETWEEN DATE '2026-07-06' AND DATE '2026-07-07'
      AND NULLIF(trim(s.observacao), '') IS NOT NULL
    ORDER BY s.created_at DESC
    LIMIT 10
  `);
  console.log(JSON.stringify({ summary: summary.rows[0], duplicates: duplicates.rows, samples: samples.rows }, null, 2));
} finally { await client.end(); }
