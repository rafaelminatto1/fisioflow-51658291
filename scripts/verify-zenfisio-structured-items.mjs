import { Client } from 'pg';
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const summary = await client.query(`
    SELECT
      COUNT(*)::int AS sessions_0607_0707,
      COUNT(*) FILTER (WHERE jsonb_array_length(procedures) > 0)::int AS with_procedures,
      COUNT(*) FILTER (WHERE jsonb_array_length(exercises) > 0)::int AS with_exercises,
      COUNT(*) FILTER (WHERE jsonb_array_length(home_exercises) > 0)::int AS with_home_exercises,
      SUM(jsonb_array_length(procedures))::int AS total_procedure_items,
      SUM(jsonb_array_length(exercises))::int AS total_exercise_items,
      SUM(jsonb_array_length(home_exercises))::int AS total_home_exercise_items
    FROM sessions
    WHERE organization_id = '00000000-0000-0000-0000-000000000001'
      AND date::date BETWEEN DATE '2026-07-06' AND DATE '2026-07-07'
      AND (
        jsonb_array_length(procedures) > 0
        OR jsonb_array_length(exercises) > 0
        OR jsonb_array_length(home_exercises) > 0
      )
  `);
  const samples = await client.query(`
    SELECT p.full_name, s.date::text, s.procedures, s.exercises, s.home_exercises
    FROM sessions s
    JOIN patients p ON p.id = s.patient_id
    WHERE s.organization_id = '00000000-0000-0000-0000-000000000001'
      AND s.date::date BETWEEN DATE '2026-07-06' AND DATE '2026-07-07'
      AND (jsonb_array_length(s.procedures) > 0 OR jsonb_array_length(s.exercises) > 0)
    ORDER BY s.date DESC
    LIMIT 5
  `);
  console.log(JSON.stringify({ summary: summary.rows[0], samples: samples.rows }, null, 2));
} finally {
  await client.end();
}
