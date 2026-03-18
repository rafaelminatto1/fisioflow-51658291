import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const patientId = '81d9608b-1f57-4512-9c11-8fc70ff3c854';
  const organizationId = '00000000-0000-0000-0000-000000000001';

  console.log('--- TESTING STATS QUERY ---');
  console.log('Patient ID:', patientId);
  console.log('Organization ID:', organizationId);

  try {
    const start = Date.now();
    const result = await sql`
      SELECT
        COUNT(*) FILTER (
          WHERE status = 'completed'
        )::int AS total_sessions,
        COUNT(*) FILTER (
          WHERE date >= CURRENT_DATE
            AND (status NOT IN ('cancelled', 'completed') OR status IS NULL)
        )::int AS upcoming_appointments,
        MAX(date) FILTER (WHERE date <= CURRENT_DATE) AS last_visit
      FROM appointments
      WHERE patient_id = ${patientId}::uuid
        AND organization_id = ${organizationId}::uuid
    `;
    const end = Date.now();
    
    console.log('Query took:', end - start, 'ms');
    console.table(result);
    
    // Also explain the query to see if indexes are used
    console.log('\n--- EXPLAIN ANALYZE ---');
    const explainRes = await sql`
      EXPLAIN ANALYZE
      SELECT
        COUNT(*) FILTER (
          WHERE status = 'completed'
        )::int AS total_sessions,
        COUNT(*) FILTER (
          WHERE date >= CURRENT_DATE
            AND (status NOT IN ('cancelled', 'completed') OR status IS NULL)
        )::int AS upcoming_appointments,
        MAX(date) FILTER (WHERE date <= CURRENT_DATE) AS last_visit
      FROM appointments
      WHERE patient_id = ${patientId}::uuid
        AND organization_id = ${organizationId}::uuid
    `;
    
    // Explain result is typically an array of objects with 'QUERY PLAN' key
    console.log(explainRes.map(r => r['QUERY PLAN']).join('\n'));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}
run();
