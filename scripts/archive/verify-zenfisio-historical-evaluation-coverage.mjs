import { Client } from 'pg';
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const org = '00000000-0000-0000-0000-000000000001';
  const coverage = await client.query(`
    WITH eval_appointments AS (
      SELECT id, patient_id, status, type::text AS type, date, start_time, notes
      FROM appointments
      WHERE organization_id = $1
        AND deleted_at IS NULL
        AND type::text = 'evaluation'
    )
    SELECT
      COUNT(*)::int AS evaluation_appointments,
      COUNT(*) FILTER (WHERE a.status = 'avaliacao')::int AS evaluation_status_ok,
      COUNT(r.id)::int AS with_response,
      COUNT(*) FILTER (WHERE r.id IS NULL)::int AS missing_response,
      COUNT(r.id) FILTER (WHERE r.status = 'completed')::int AS completed_responses,
      COUNT(r.id) FILTER (WHERE r.status = 'scheduled')::int AS scheduled_responses
    FROM eval_appointments a
    LEFT JOIN patient_evaluation_responses r
      ON r.appointment_id = a.id
     AND r.organization_id = $1
  `, [org]);
  const statusCounts = await client.query(`
    SELECT status, type::text AS type, COUNT(*)::int AS count
    FROM appointments
    WHERE organization_id = $1 AND deleted_at IS NULL
    GROUP BY status, type
    ORDER BY count DESC
  `, [org]);
  const missing = await client.query(`
    SELECT p.full_name, a.date::text, a.start_time::text, a.status, a.notes
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    LEFT JOIN patient_evaluation_responses r
      ON r.appointment_id = a.id
     AND r.organization_id = a.organization_id
    WHERE a.organization_id = $1
      AND a.deleted_at IS NULL
      AND a.type::text = 'evaluation'
      AND r.id IS NULL
    ORDER BY a.date, a.start_time
    LIMIT 20
  `, [org]);
  const sample = await client.query(`
    SELECT p.full_name, a.date::text, a.start_time::text, a.status AS appointment_status,
           r.status AS response_status, ef.nome AS form_name,
           jsonb_array_length(jsonb_path_query_array(r.responses, '$.*'))::int AS response_field_count
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN patient_evaluation_responses r ON r.appointment_id = a.id AND r.organization_id = a.organization_id
    JOIN evaluation_forms ef ON ef.id = r.form_id
    WHERE a.organization_id = $1
      AND a.deleted_at IS NULL
      AND a.type::text = 'evaluation'
    ORDER BY a.date DESC, a.start_time DESC
    LIMIT 12
  `, [org]);
  console.log(JSON.stringify({ coverage: coverage.rows[0], statusCounts: statusCounts.rows, missing: missing.rows, sample: sample.rows }, null, 2));
} finally {
  await client.end();
}
