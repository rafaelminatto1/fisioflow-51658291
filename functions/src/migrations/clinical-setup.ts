
/**
 * Migration: Create clinical tables (goals, pathologies)
 */

import { onCall } from 'firebase-functions/v2/https';
import { getPool } from '../init';
import { CORS_ORIGINS } from '../lib/cors';
import { logger } from '../lib/logger';

export const migrateClinicalSchema = onCall({ cors: CORS_ORIGINS }, async (request) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    logger.info('🔄 Starting clinical tables migration...');
    await client.query('BEGIN');

    // 1. Patient Goals Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        organization_id UUID NOT NULL,
        description TEXT NOT NULL,
        target_date TIMESTAMP WITH TIME ZONE,
        status TEXT NOT NULL DEFAULT 'em_andamento',
        priority TEXT DEFAULT 'media',
        achieved_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    logger.info('✅ patient_goals table created');

    // 2. Patient Pathologies Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_pathologies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        organization_id UUID NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        diagnosed_at TIMESTAMP WITH TIME ZONE,
        status TEXT NOT NULL DEFAULT 'ativo',
        is_primary BOOLEAN DEFAULT false,
        icd_code TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    logger.info('✅ patient_pathologies table created');

    // Create Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_patient_goals_patient ON patient_goals(patient_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_patient_pathologies_patient ON patient_pathologies(patient_id);`);

    await client.query('COMMIT');
    logger.info('✅ Clinical migration completed successfully!');

    return { success: true, message: 'Clinical tables created successfully' };
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('❌ Clinical migration failed:', error);
    throw new Error(`Migration failed: ${error?.message || String(error)}`);
  } finally {
    client.release();
  }
});
