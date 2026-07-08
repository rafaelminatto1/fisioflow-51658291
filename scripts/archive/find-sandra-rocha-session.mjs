import { Client } from 'pg';
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const res = await client.query(`
    SELECT s.id, p.full_name, s.session_number, s.date::text AS date, s.observacao,
           s.procedures, s.exercises
    FROM sessions s
    JOIN patients p ON p.id = s.patient_id
    WHERE p.full_name ILIKE '%Sandra%Rocha%'
       OR s.observacao ILIKE '%Lib Mio em MMII%'
       OR s.observacao ILIKE '%Acup em Joelho D%'
    ORDER BY s.date DESC
    LIMIT 10
  `);
  console.log(JSON.stringify(res.rows.map(r => ({
    id: r.id,
    full_name: r.full_name,
    session_number: r.session_number,
    date: r.date,
    obs_preview: String(r.observacao ?? '').slice(0, 260),
    procedures: (r.procedures ?? []).map(x => x.name),
    exercises: (r.exercises ?? []).map(x => x.name),
  })), null, 2));
} finally {
  await client.end();
}
