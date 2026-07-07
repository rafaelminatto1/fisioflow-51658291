import { Client } from 'pg';
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const org = '00000000-0000-0000-0000-000000000001';
  const agenda = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE notes ILIKE '%Importado do ZenFisio%')::int AS appointments,
      COUNT(*) FILTER (WHERE notes ILIKE '%Importado do ZenFisio%' AND status = 'agendado')::int AS agendados,
      COUNT(*) FILTER (WHERE notes ILIKE '%Importado do ZenFisio%' AND status = 'atendido')::int AS atendidos,
      COUNT(*) FILTER (WHERE notes ILIKE '%Importado do ZenFisio%' AND type = 'evaluation')::int AS avaliacoes,
      COUNT(*) FILTER (WHERE notes ILIKE '%Importado do ZenFisio%' AND type = 'session')::int AS sessoes
    FROM appointments
    WHERE organization_id = $1 AND date BETWEEN DATE '2026-07-06' AND DATE '2026-07-07' AND deleted_at IS NULL
  `, [org]);
  const sess = await client.query(`
    SELECT
      COUNT(*)::int AS clinical_sessions,
      COUNT(*) FILTER (WHERE appointment_id IS NOT NULL)::int AS linked,
      COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(procedures, '[]'::jsonb)) > 0)::int AS with_procedures,
      COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(exercises, '[]'::jsonb)) > 0)::int AS with_exercises,
      COUNT(*) FILTER (WHERE NULLIF(trim(COALESCE(observacao, '')), '') IS NOT NULL)::int AS with_observacao
    FROM sessions
    WHERE organization_id = $1 AND date::date BETWEEN DATE '2026-07-06' AND DATE '2026-07-07' AND deleted_at IS NULL
  `, [org]);
  const records = await client.query(`
    SELECT COUNT(*)::int AS zenfisio_medical_records
    FROM medical_records
    WHERE organization_id = $1
      AND record_date BETWEEN DATE '2026-07-06' AND DATE '2026-07-07'
      AND deleted_at IS NULL
      AND physical_exam @> '{"source":"zenfisio"}'::jsonb
  `, [org]);
  const dirty = await client.query(`
    SELECT COUNT(*)::int AS dirty
    FROM sessions
    WHERE organization_id = $1
      AND date::date BETWEEN DATE '2026-07-06' AND DATE '2026-07-07'
      AND COALESCE(observacao, '') ~* '(Navegação principal|Boleto gerado|\\$\\.widget\\.bridge|Indicações por e-mail)'
  `, [org]);
  console.log(JSON.stringify({ agenda: agenda.rows[0], sessions: sess.rows[0], medicalRecords: records.rows[0], dirtyObservacoes: dirty.rows[0] }, null, 2));
} finally {
  await client.end();
}
