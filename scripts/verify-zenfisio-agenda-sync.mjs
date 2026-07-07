import { Client } from 'pg';
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const org = '00000000-0000-0000-0000-000000000001';
  const summary = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE notes ILIKE '%Importado do ZenFisio%')::int AS zenfisio_appointments,
      COUNT(*) FILTER (WHERE notes ILIKE '%Importado do ZenFisio%' AND status = 'agendado')::int AS agendados,
      COUNT(*) FILTER (WHERE notes ILIKE '%Importado do ZenFisio%' AND status = 'atendido')::int AS atendidos,
      COUNT(*) FILTER (WHERE notes ILIKE '%Importado do ZenFisio%' AND type = 'evaluation')::int AS avaliacoes,
      COUNT(*) FILTER (WHERE notes ILIKE '%Importado do ZenFisio%' AND type = 'session')::int AS sessoes
    FROM appointments
    WHERE organization_id = $1
      AND date BETWEEN DATE '2026-07-06' AND DATE '2026-07-07'
      AND deleted_at IS NULL
  `, [org]);
  const linked = await client.query(`
    SELECT
      COUNT(*)::int AS clinical_sessions,
      COUNT(*) FILTER (WHERE appointment_id IS NOT NULL)::int AS linked_to_appointment,
      COUNT(*) FILTER (WHERE appointment_id IS NULL)::int AS not_linked
    FROM sessions
    WHERE organization_id = $1
      AND date::date BETWEEN DATE '2026-07-06' AND DATE '2026-07-07'
      AND NULLIF(trim(COALESCE(observacao, '')), '') IS NOT NULL
      AND deleted_at IS NULL
  `, [org]);
  const dupes = await client.query(`
    SELECT p.full_name, a.date::text, a.start_time::text, COUNT(*)::int AS count
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.organization_id = $1
      AND a.date BETWEEN DATE '2026-07-06' AND DATE '2026-07-07'
      AND a.deleted_at IS NULL
      AND a.notes ILIKE '%Importado do ZenFisio%'
    GROUP BY p.full_name, a.date, a.start_time
    HAVING COUNT(*) > 1
    ORDER BY count DESC, p.full_name
  `, [org]);
  console.log(JSON.stringify({ summary: summary.rows[0], linked: linked.rows[0], duplicateImportedAppointments: dupes.rows }, null, 2));
} finally {
  await client.end();
}
