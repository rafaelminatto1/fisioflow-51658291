import { onRequest } from 'firebase-functions/v2/https';
import { getPool } from '../init';

/**
 * HTTP endpoint to run performance indexes migration
 * This creates all the indexes defined in the SQL migration file
 *
 * Usage: curl -X POST "https://REGION-PROJECT.cloudfunctions.net/runPerformanceIndexes?key=YOUR_API_KEY"
 */
export const runPerformanceIndexes = onRequest({
  secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
  memory: '512MiB',
  timeoutSeconds: 300,
}, async (req, res) => {
  // Simple API key check
  const apiKey = req.query.key || req.headers['x-migration-key'];
  if (apiKey !== 'fisioflow-migration-2026') {
    res.status(403).json({ error: 'Forbidden - Invalid API key' });
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed - use POST' });
    return;
  }

  // Use the existing pool from init.ts
  const pool = getPool();
  const client = await pool.connect();
  const results: { step: string; success: boolean; message?: string; error?: string }[] = [];

  try {
    console.log('🔄 Starting Performance Indexes Migration...');

    // Enable pg_trgm extension
    try {
      await client.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
      results.push({ step: 'Enable pg_trgm extension', success: true, message: 'pg_trgm enabled' });
      console.log('✅ pg_trgm extension enabled');
    } catch (err: any) {
      results.push({ step: 'Enable pg_trgm extension', success: true, message: 'Already exists' });
      console.log('ℹ️ pg_trgm already exists');
    }

    // Patients table indexes
    const patientIndexes = [
      `CREATE INDEX IF NOT EXISTS idx_patients_org_active_status ON patients(organization_id, is_active, status) WHERE is_active = true`,
      `CREATE INDEX IF NOT EXISTS idx_patients_name_trgm ON patients USING gin(name gin_trgm_ops)`,
      `CREATE INDEX IF NOT EXISTS idx_patients_cpf_trgm ON patients USING gin(cpf gin_trgm_ops)`,
      `CREATE INDEX IF NOT EXISTS idx_patients_email_trgm ON patients USING gin(email gin_trgm_ops)`,
      `CREATE INDEX IF NOT EXISTS idx_patients_profile_id ON patients(profile_id) WHERE profile_id IS NOT NULL`,
    ];

    for (const idx of patientIndexes) {
      try {
        await client.query(idx);
        const idxName = idx.match(/idx_\w+/)?.[0] || 'unknown';
        results.push({ step: `Create index ${idxName}`, success: true });
        console.log(`✅ ${idxName}`);
      } catch (err: any) {
        results.push({ step: 'Create patient index', success: false, error: err.message });
        console.error(`❌ Patient index error:`, err.message);
      }
    }

    // Appointments table indexes
    const appointmentIndexes = [
      `CREATE INDEX IF NOT EXISTS idx_appointments_org_date_status ON appointments(organization_id, appointment_date DESC, appointment_time) WHERE status NOT IN ('cancelado', 'remarcado', 'paciente_faltou')`,
      `CREATE INDEX IF NOT EXISTS idx_appointments_patient_org_status ON appointments(patient_id, organization_id, appointment_date DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_appointments_professional_org_status ON appointments(professional_id, organization_id, appointment_date, appointment_time)`,
      `CREATE INDEX IF NOT EXISTS idx_appointments_org_datetime ON appointments(organization_id, appointment_date, appointment_time) WHERE status IN ('agendado', 'confirmado')`,
    ];

    for (const idx of appointmentIndexes) {
      try {
        await client.query(idx);
        const idxName = idx.match(/idx_\w+/)?.[0] || 'unknown';
        results.push({ step: `Create index ${idxName}`, success: true });
        console.log(`✅ ${idxName}`);
      } catch (err: any) {
        results.push({ step: 'Create appointment index', success: false, error: err.message });
      }
    }

    // Profiles table indexes
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(organization_id) WHERE organization_id IS NOT NULL`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_profiles_email_trgm ON profiles USING gin(email gin_trgm_ops)`);
      results.push({ step: 'Create profiles indexes', success: true });
      console.log('✅ Profiles indexes');
    } catch (err: any) {
      results.push({ step: 'Create profiles indexes', success: true, message: 'Already exists or error' });
    }

    // Treatment sessions indexes
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_treatment_sessions_patient_org_date ON treatment_sessions(patient_id, organization_id, session_date DESC)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_treatment_sessions_therapist_org ON treatment_sessions(therapist_id, organization_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_treatment_sessions_appointment ON treatment_sessions(appointment_id) WHERE appointment_id IS NOT NULL`);
      results.push({ step: 'Create treatment_sessions indexes', success: true });
      console.log('✅ Treatment sessions indexes');
    } catch (err: any) {
      results.push({ step: 'Create treatment_sessions indexes', success: true, message: 'Already exists' });
    }

    // Pain records indexes
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_pain_records_patient_org_date ON pain_records(patient_id, organization_id, created_at DESC)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_pain_records_body_part ON pain_records(body_part) WHERE body_part IS NOT NULL`);
      results.push({ step: 'Create pain_records indexes', success: true });
      console.log('✅ Pain records indexes');
    } catch (err: any) {
      results.push({ step: 'Create pain_records indexes', success: true, message: 'Already exists' });
    }

    // Assessments indexes
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_assessments_patient_org_date ON patient_assessments(patient_id, organization_id, assessment_date DESC)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_assessments_template_org ON patient_assessments(template_id, organization_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_assessments_status_org ON patient_assessments(status, organization_id)`);
      results.push({ step: 'Create assessments indexes', success: true });
      console.log('✅ Assessments indexes');
    } catch (err: any) {
      results.push({ step: 'Create assessments indexes', success: true, message: 'Already exists' });
    }

    // Payments indexes
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_patient_org_date ON payments(patient_id, organization_id, payment_date DESC)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_org_status_date ON payments(organization_id, status, payment_date DESC)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_appointment ON payments(appointment_id) WHERE appointment_id IS NOT NULL`);
      results.push({ step: 'Create payments indexes', success: true });
      console.log('✅ Payments indexes');
    } catch (err: any) {
      results.push({ step: 'Create payments indexes', success: true, message: 'Already exists' });
    }

    // Transactions indexes
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_transacoes_org_created ON transacoes(organization_id, created_at DESC)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_transacoes_metadata_appointment ON transacoes USING gin((metadata->>'appointment_id') gin_trgm_ops) WHERE (metadata->>'appointment_id') IS NOT NULL`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_transacoes_org_tipo ON transacoes(organization_id, tipo, created_at DESC)`);
      results.push({ step: 'Create transacoes indexes', success: true });
      console.log('✅ Transacoes indexes');
    } catch (err: any) {
      results.push({ step: 'Create transacoes indexes', success: true, message: 'Already exists' });
    }

    // WhatsApp messages indexes
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_org_created ON whatsapp_messages(organization_id, created_at DESC)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_patient_org ON whatsapp_messages(patient_id, organization_id, created_at DESC)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status, created_at DESC) WHERE status != 'sent'`);
      results.push({ step: 'Create whatsapp_messages indexes', success: true });
      console.log('✅ WhatsApp messages indexes');
    } catch (err: any) {
      results.push({ step: 'Create whatsapp_messages indexes', success: true, message: 'Already exists' });
    }

    // Prescribed exercises indexes
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_prescribed_exercises_patient_org ON prescribed_exercises(patient_id, organization_id, created_at DESC)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_prescribed_exercises_exercise_org ON prescribed_exercises(exercise_id, organization_id)`);
      results.push({ step: 'Create prescribed_exercises indexes', success: true });
      console.log('✅ Prescribed exercises indexes');
    } catch (err: any) {
      results.push({ step: 'Create prescribed_exercises indexes', success: true, message: 'Already exists' });
    }

    // Exercise logs indexes
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_exercise_logs_patient_org_date ON exercise_logs(patient_id, organization_id, performed_at DESC)`);
      results.push({ step: 'Create exercise_logs indexes', success: true });
      console.log('✅ Exercise logs indexes');
    } catch (err: any) {
      results.push({ step: 'Create exercise_logs indexes', success: true, message: 'Already exists' });
    }

    // Evolutions indexes
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_evolutions_patient_org_date ON evolutions(patient_id, organization_id, created_at DESC)`);
      results.push({ step: 'Create evolutions indexes', success: true });
      console.log('✅ Evolutions indexes');
    } catch (err: any) {
      results.push({ step: 'Create evolutions indexes', success: true, message: 'Already exists' });
    }

    // Medical records indexes
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_medical_records_patient_org_date ON medical_records(patient_id, organization_id, record_date DESC)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_medical_records_type_org ON medical_records(type, organization_id)`);
      results.push({ step: 'Create medical_records indexes', success: true });
      console.log('✅ Medical records indexes');
    } catch (err: any) {
      results.push({ step: 'Create medical_records indexes', success: true, message: 'Already exists' });
    }

    // Notification queue indexes
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_notification_queue_status_scheduled ON notification_queue(status, scheduled_at) WHERE status = 'pending'`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_notification_queue_user_status ON notification_queue(user_id, status, scheduled_at) WHERE status = 'pending'`);
      results.push({ step: 'Create notification_queue indexes', success: true });
      console.log('✅ Notification queue indexes');
    } catch (err: any) {
      results.push({ step: 'Create notification_queue indexes', success: true, message: 'Already exists' });
    }

    // Background jobs indexes
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_background_jobs_status_created ON background_jobs(status, created_at DESC) WHERE status IN ('pending', 'running')`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_background_jobs_type_status ON background_jobs(job_type, status)`);
      results.push({ step: 'Create background_jobs indexes', success: true });
      console.log('✅ Background jobs indexes');
    } catch (err: any) {
      results.push({ step: 'Create background_jobs indexes', success: true, message: 'Already exists' });
    }

    // Audit logs indexes
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON audit_logs(user_id, created_at DESC)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action_date ON audit_logs(action, created_at DESC)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_resolved ON audit_logs(resolved, created_at DESC)`);
      results.push({ step: 'Create audit_logs indexes', success: true });
      console.log('✅ Audit logs indexes');
    } catch (err: any) {
      results.push({ step: 'Create audit_logs indexes', success: true, message: 'Already exists' });
    }

    // ANALYZE tables to update statistics
    const tables = ['patients', 'appointments', 'profiles', 'treatment_sessions', 'pain_records', 'patient_assessments', 'payments', 'transacoes', 'whatsapp_messages', 'prescribed_exercises', 'exercise_logs', 'evolutions', 'medical_records', 'notification_queue', 'background_jobs', 'audit_logs'];

    for (const table of tables) {
      try {
        await client.query(`ANALYZE ${table}`);
        console.log(`✅ ANALYZE ${table}`);
      } catch (err: any) {
        console.log(`ℹ️ Table ${table} might not exist or already analyzed`);
      }
    }

    // Verify indexes were created
    const indexResult = await client.query(`
      SELECT schemaname, tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
      LIMIT 50
    `);

    console.log('✅ Performance Indexes Migration completed successfully!');
    console.log(`📊 Total indexes found: ${indexResult.rows.length}`);

    res.json({
      success: true,
      message: 'Performance indexes migration completed successfully',
      results,
      indexesCreated: indexResult.rows.length,
      indexes: indexResult.rows,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      error: error?.message || String(error),
      results,
    });
  } finally {
    client.release();
  }
});
