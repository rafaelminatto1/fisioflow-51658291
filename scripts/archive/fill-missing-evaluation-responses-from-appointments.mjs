import { Client } from 'pg';

const client = new Client({ connectionString: process.env.DATABASE_URL });
const APPLY = process.argv.includes('--apply') || process.env.APPLY_IMPORT === '1';
const ORG = '00000000-0000-0000-0000-000000000001';
const FORM_NAME = 'ZenFisio - Anamnese importada';

await client.connect();
try {
  const form = await client.query(`SELECT id FROM evaluation_forms WHERE organization_id=$1 AND nome=$2 LIMIT 1`, [ORG, FORM_NAME]);
  if (!form.rows.length) throw new Error(`Formulário não encontrado: ${FORM_NAME}`);
  const formId = form.rows[0].id;
  const fields = await client.query(`SELECT id, label FROM evaluation_form_fields WHERE form_id=$1`, [formId]);
  const byLabel = Object.fromEntries(fields.rows.map((row) => [row.label, row.id]));
  const rawTextField = byLabel['Texto original da avaliação ZenFisio'];
  const metadataField = byLabel['Metadados da importação'];
  if (!rawTextField || !metadataField) throw new Error('Campos do formulário não encontrados');

  const missing = await client.query(`
    SELECT a.id, a.patient_id, p.full_name, a.date, a.start_time, a.notes
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    LEFT JOIN patient_evaluation_responses r
      ON r.appointment_id = a.id
     AND r.organization_id = a.organization_id
    WHERE a.organization_id = $1
      AND a.deleted_at IS NULL
      AND a.type::text = 'evaluation'
      AND r.id IS NULL
    ORDER BY a.date, a.start_time, p.full_name
  `, [ORG]);

  const state = { apply: APPLY, missing: missing.rows.length, created: 0, rows: [] };
  for (const row of missing.rows) {
    const scheduledFor = `${row.date.toISOString().slice(0, 10)} ${row.start_time}`;
    const responses = {
      [rawTextField]: 'Avaliação existente na agenda importada do ZenFisio sem conteúdo clínico/anamnese disponível no export local.',
      [metadataField]: [
        `Paciente: ${row.full_name}`,
        `Appointment MoocaFisio: ${row.id}`,
        `Origem: appointment histórico ZenFisio sem response vinculada`,
        `Data: ${scheduledFor}`,
        row.notes ? `Notas: ${row.notes}` : null,
      ].filter(Boolean).join('\n'),
    };
    state.rows.push({ patient: row.full_name, appointmentId: row.id, scheduledFor });
    if (APPLY) {
      await client.query(`
        INSERT INTO patient_evaluation_responses
          (organization_id, patient_id, form_id, appointment_id, responses, status, scheduled_for, created_by, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5::jsonb,'scheduled',$6::timestamp,NULL,NOW(),NOW())
      `, [ORG, row.patient_id, formId, row.id, JSON.stringify(responses), scheduledFor]);
      state.created += 1;
    }
  }
  console.log(JSON.stringify(state, null, 2));
} finally {
  await client.end();
}
