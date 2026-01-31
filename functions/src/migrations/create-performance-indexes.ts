/**
 * Migration: Create Performance Indexes
 * Otimiza queries comuns no PostgreSQL
 */

import { onCall } from 'firebase-functions/v2/https';
import { getPool, DB_PASS_SECRET, DB_USER_SECRET, DB_NAME_SECRET, DB_HOST_IP_SECRET, DB_HOST_IP_PUBLIC_SECRET, CORS_ORIGINS } from '../init';

/**
 * Migration para criar índices de performance no PostgreSQL
 */
export const createPerformanceIndexes = onCall(
  {
    cors: CORS_ORIGINS,
    secrets: [DB_PASS_SECRET, DB_USER_SECRET, DB_NAME_SECRET, DB_HOST_IP_SECRET, DB_HOST_IP_PUBLIC_SECRET],
  },
  async (request) => {
    if (!request.auth || !request.auth.token) {
      throw new Error('Unauthorized');
    }

    // Verifica se é admin
    const admin = await import('firebase-admin/auth');
    const user = await admin.getAuth().getUser(request.auth.uid);
    if (!user.customClaims || (user.customClaims as any).role !== 'admin') {
      throw new Error('Forbidden: Admin only');
    }

    const pool = getPool();

    try {
      console.log('[Migration] Starting performance indexes creation...');

      // Índices para pacientes
      const patientIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_patients_org_id ON patients(organization_id) WHERE is_active = true;',
        'CREATE INDEX IF NOT EXISTS idx_patients_cpf_org ON patients(cpf, organization_id);',
        'CREATE INDEX IF NOT EXISTS idx_patients_name_org ON patients(LOWER(name), organization_id);',
        'CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at DESC);',
      ];

      // Índices para appointments
      const appointmentIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_appointments_org_date ON appointments(organization_id, date, start_time);',
        'CREATE INDEX IF NOT EXISTS idx_appointments_patient_org ON appointments(patient_id, organization_id);',
        'CREATE INDEX IF NOT EXISTS idx_appointments_therapist_org ON appointments(therapist_id, organization_id);',
        'CREATE INDEX IF NOT EXISTS idx_appointments_status_org ON appointments(status, organization_id);',
      ];

      // Índices para exercises
      const exerciseIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_exercises_active ON exercises(is_active) WHERE is_active = true;',
        'CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category_id);',
        'CREATE INDEX IF NOT EXISTS idx_exercises_patient_prescribed ON patient_exercises(patient_id, prescribed_at DESC);',
      ];

      // Índices para assessments
      const assessmentIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_assessments_patient_org ON patient_assessments(patient_id, organization_id);',
        'CREATE INDEX IF NOT EXISTS idx_assessments_date_org ON patient_assessments(assessment_date DESC, organization_id);',
        'CREATE INDEX IF NOT EXISTS idx_assessments_responses_assessment ON assessment_responses(assessment_id);',
      ];

      // Índices para medical_records
      const medicalRecordIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_medical_records_patient_org ON medical_records(patient_id, organization_id);',
        'CREATE INDEX IF NOT EXISTS idx_medical_records_date_org ON medical_records(record_date DESC, organization_id);',
        'CREATE INDEX IF NOT EXISTS idx_treatment_sessions_patient_org ON treatment_sessions(patient_id, organization_id);',
        'CREATE INDEX IF NOT EXISTS idx_treatment_sessions_date_org ON treatment_sessions(session_date DESC, organization_id);',
      ];

      // Índices para financial
      const financialIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_transactions_org ON transacoes(organization_id, created_at DESC);',
        'CREATE INDEX IF NOT EXISTS idx_payments_org_date ON pagamentos(organization_id, payment_date DESC);',
        'CREATE INDEX IF NOT EXISTS idx_payments_patient ON pagamentos(patient_id, organization_id);',
      ];

      // Índices para profiles
      const profileIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);',
      ];

      // Executar todos os índices
      const allIndexes = [
        ...patientIndexes,
        ...appointmentIndexes,
        ...exerciseIndexes,
        ...assessmentIndexes,
        ...medicalRecordIndexes,
        ...financialIndexes,
        ...profileIndexes,
      ];

      const results: { index: string; status: string }[] = [];

      for (const indexSql of allIndexes) {
        try {
          await pool.query(indexSql);
          const indexName = indexSql.match(/idx_\w+/)?.[0] || 'unknown';
          console.log(`[Migration] ✓ Created index: ${indexName}`);
          results.push({ index: indexName, status: 'created' });
        } catch (err: any) {
          const indexName = indexSql.match(/idx_\w+/)?.[0] || 'unknown';
          if (err.message.includes('already exists')) {
            console.log(`[Migration] - Index already exists: ${indexName}`);
            results.push({ index: indexName, status: 'exists' });
          } else {
            console.error(`[Migration] ✗ Error creating index ${indexName}:`, err.message);
            results.push({ index: indexName, status: `error: ${err.message}` });
          }
        }
      }

      // Analisar tabelas para atualizar estatísticas
      console.log('[Migration] Analyzing tables...');
      const tables = ['patients', 'appointments', 'exercises', 'patient_exercises', 'patient_assessments',
        'assessment_responses', 'medical_records', 'treatment_sessions', 'transacoes', 'pagamentos', 'profiles'];

      for (const table of tables) {
        try {
          await pool.query(`ANALYZE ${table};`);
          console.log(`[Migration] ✓ Analyzed table: ${table}`);
        } catch (err: any) {
          console.warn(`[Migration] - Could not analyze ${table}:`, err.message);
        }
      }

      // Verificar índices criados
      const indexCheck = await pool.query(`
        SELECT
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE indexname LIKE 'idx_%'
        ORDER BY tablename, indexname;
      `);

      console.log(`[Migration] ✓ Total indexes created/verified: ${results.filter(r => r.status === 'created').length}`);
      console.log(`[Migration] ✓ Total indexes already existing: ${results.filter(r => r.status === 'exists').length}`);

      return {
        success: true,
        results,
        totalIndexes: results.length,
        existingIndexes: indexCheck.rows.length,
        indexes: indexCheck.rows,
      };
    } catch (error: any) {
      console.error('[Migration] Error:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }
);
