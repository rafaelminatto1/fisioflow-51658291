import { Client } from 'pg';
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const dirty = await client.query(`
    SELECT p.full_name, s.id, s.date::text, length(coalesce(s.observacao,'')) AS len, left(s.observacao, 300) AS preview
    FROM sessions s
    JOIN patients p ON p.id=s.patient_id
    WHERE s.organization_id = '00000000-0000-0000-0000-000000000001'
      AND s.date::date BETWEEN DATE '2026-07-06' AND DATE '2026-07-07'
      AND (
        s.observacao ILIKE 'Navegação principal%'
        OR s.observacao ILIKE '%Toggle navigation%'
        OR s.observacao ILIKE '%Recomendação de segurança%'
        OR s.observacao ILIKE '%Activity Fisioterapia%Linha do tempo%'
      )
    ORDER BY p.full_name, s.date
  `);
  console.log(JSON.stringify(dirty.rows, null, 2));
} finally { await client.end(); }
