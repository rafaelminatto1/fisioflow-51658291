import { Client } from 'pg';
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const org = '00000000-0000-0000-0000-000000000001';
  const rows = await client.query(`
    SELECT p.full_name, a.date::text, a.start_time::text, a.status AS appointment_status, a.type::text AS appointment_type,
           r.id AS response_id, r.status AS response_status, r.scheduled_for::text, r.completed_at::text,
           ef.nome AS form_name,
           jsonb_object_keys(COALESCE(r.responses, '{}'::jsonb)) AS response_field_id
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    LEFT JOIN patient_evaluation_responses r ON r.appointment_id = a.id AND r.organization_id = a.organization_id
    LEFT JOIN evaluation_forms ef ON ef.id = r.form_id
    WHERE a.organization_id = $1
      AND a.notes ILIKE '%Tipo original: Avaliação%'
      AND a.deleted_at IS NULL
    ORDER BY a.date, a.start_time, p.full_name
  `, [org]);
  const grouped = new Map();
  for (const row of rows.rows) {
    const key = `${row.full_name}|${row.date}|${row.start_time}`;
    if (!grouped.has(key)) grouped.set(key, { full_name: row.full_name, date: row.date, start_time: row.start_time, appointment_status: row.appointment_status, appointment_type: row.appointment_type, response_id: row.response_id, response_status: row.response_status, scheduled_for: row.scheduled_for, completed_at: row.completed_at, form_name: row.form_name, response_fields: [] });
    if (row.response_field_id) grouped.get(key).response_fields.push(row.response_field_id);
  }
  const counts = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE a.type::text='evaluation' AND a.status='avaliacao')::int AS eval_appointments_ok,
      COUNT(*) FILTER (WHERE r.id IS NOT NULL)::int AS evals_with_response,
      COUNT(*)::int AS eval_appointments_total
    FROM appointments a
    LEFT JOIN patient_evaluation_responses r ON r.appointment_id = a.id AND r.organization_id = a.organization_id
    WHERE a.organization_id=$1 AND a.notes ILIKE '%Tipo original: Avaliação%' AND a.deleted_at IS NULL
  `, [org]);
  console.log(JSON.stringify({ counts: counts.rows[0], evaluations: Array.from(grouped.values()) }, null, 2));
} finally { await client.end(); }
