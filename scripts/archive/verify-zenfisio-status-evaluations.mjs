import { Client } from 'pg';
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const org = '00000000-0000-0000-0000-000000000001';
  const evals = await client.query(`
    SELECT p.full_name, a.id, a.date::text, a.start_time::text, a.status, a.type, a.notes
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.organization_id = $1
      AND a.notes ILIKE '%Importado do ZenFisio%'
      AND (a.type::text = 'evaluation' OR a.notes ILIKE '%Tipo original: Avaliação%')
      AND a.deleted_at IS NULL
    ORDER BY a.date, a.start_time, p.full_name
  `, [org]);
  const med = await client.query(`
    SELECT p.full_name, mr.id, mr.record_date::text, length(COALESCE(mr.current_history,'')) AS history_len, mr.physical_exam
    FROM medical_records mr
    JOIN patients p ON p.id = mr.patient_id
    WHERE mr.organization_id = $1
      AND mr.deleted_at IS NULL
      AND mr.record_date BETWEEN DATE '2026-07-06' AND DATE '2026-07-07'
      AND mr.physical_exam @> '{"source":"zenfisio"}'::jsonb
    ORDER BY mr.record_date, p.full_name
  `, [org]);
  const statusCounts = await client.query(`
    SELECT status, type::text, COUNT(*)::int
    FROM appointments
    WHERE organization_id = $1 AND notes ILIKE '%Importado do ZenFisio%' AND deleted_at IS NULL
    GROUP BY status, type::text
    ORDER BY type::text, status
  `, [org]);
  console.log(JSON.stringify({ evaluations: evals.rows.map(r => ({full_name:r.full_name, date:r.date, start_time:r.start_time, status:r.status, type:r.type, notes:r.notes})), medicalRecords: med.rows.map(r => ({full_name:r.full_name, record_date:r.record_date, history_len:r.history_len, physical_exam:r.physical_exam})), statusCounts: statusCounts.rows }, null, 2));
} finally { await client.end(); }
