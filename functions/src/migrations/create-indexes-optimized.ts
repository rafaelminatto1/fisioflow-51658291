/**
 * Migration: Create Optimized Performance Indexes
 * Versão HTTP para execução direta via curl/gcloud
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getPool } from '../init';
import { CORS_ORIGINS } from '../lib/cors';
import { logger } from '../lib/logger';

/**
 * Handler HTTP para criar índices otimizados no PostgreSQL
 * Não requer autenticação (executado apenas por admin)
 */
export const createOptimizedIndexesHandler = async (req: any, res: any) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Simple API key check (opcional)
  const apiKey = req.headers['x-api-key'] || req.body?.apiKey;
  if (apiKey !== 'FISIOFLOW_MIGRATION_2026') {
    res.status(403).json({ error: 'Forbidden: Invalid API key' });
    return;
  }

  const pool = getPool();

  try {
    logger.info('[Migration] Starting optimized indexes creation...');

    // Índices críticos para performance
    const criticalIndexes = [
      // Pacientes - busca principal
      'CREATE INDEX IF NOT EXISTS idx_patients_org_active ON patients(organization_id) WHERE is_active = true;',
      'CREATE INDEX IF NOT EXISTS idx_patients_org_name ON patients(organization_id, LOWER(name));',
      'CREATE INDEX IF NOT EXISTS idx_patients_cpf ON patients(cpf) WHERE cpf IS NOT NULL;',

      // Agendamentos - listagem e conflitos
      'CREATE INDEX IF NOT EXISTS idx_appointments_org_date ON appointments(organization_id, date, start_time);',
      'CREATE INDEX IF NOT EXISTS idx_appointments_patient_date ON appointments(patient_id, date);',
      'CREATE INDEX IF NOT EXISTS idx_appointments_org_status ON appointments(organization_id, status) WHERE status != \'cancelado\';',
      'CREATE INDEX IF NOT EXISTS idx_appointments_therapist_date ON appointments(therapist_id, date, start_time);',

      // Financeiro - relatórios
      'CREATE INDEX IF NOT EXISTS idx_transactions_org_date ON transacoes(organization_id, created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_payments_org_date ON pagamentos(organization_id, payment_date DESC);',
      'CREATE INDEX IF NOT EXISTS idx_payments_patient ON pagamentos(patient_id, organization_id);',

      // Perfis - autenticação
      'CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(organization_id) WHERE is_active = true;',
    ];

    const results: { index: string; status: string }[] = [];

    for (const indexSql of criticalIndexes) {
      try {
        await pool.query(indexSql);
        const indexName = indexSql.match(/idx_\w+/)?.[0] || 'unknown';
        logger.info(`[Migration] ✓ Created index: ${indexName}`);
        results.push({ index: indexName, status: 'created' });
      } catch (err: any) {
        const indexName = indexSql.match(/idx_\w+/)?.[0] || 'unknown';
        if (err.message.includes('already exists') || err.code === '42P07') {
          logger.info(`[Migration] - Index already exists: ${indexName}`);
          results.push({ index: indexName, status: 'exists' });
        } else {
          logger.error(`[Migration] ✗ Error creating index ${indexName}:`, err.message);
          results.push({ index: indexName, status: `error: ${err.message}` });
        }
      }
    }

    // Analisar tabelas para atualizar estatísticas do query planner
    logger.info('[Migration] Analyzing tables...');
    const tables = ['patients', 'appointments', 'transacoes', 'pagamentos', 'profiles'];

    for (const table of tables) {
      try {
        await pool.query(`ANALYZE ${table};`);
        logger.info(`[Migration] ✓ Analyzed table: ${table}`);
      } catch (err: any) {
        logger.warn(`[Migration] - Could not analyze ${table}:`, err.message);
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

    logger.info(`[Migration] ✓ Total indexes: ${results.length}`);
    logger.info(`[Migration] ✓ Created: ${results.filter(r => r.status === 'created').length}`);
    logger.info(`[Migration] ✓ Already existed: ${results.filter(r => r.status === 'exists').length}`);

    res.json({
      success: true,
      message: 'Indexes created/verified successfully',
      results,
      summary: {
        total: results.length,
        created: results.filter(r => r.status === 'created').length,
        existed: results.filter(r => r.status === 'exists').length,
        errors: results.filter(r => r.status.startsWith('error')).length,
      },
      allIndexes: indexCheck.rows,
    });
  } catch (error: any) {
    logger.error('[Migration] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const createOptimizedIndexes = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
    cors: CORS_ORIGINS,
    secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
  },
  createOptimizedIndexesHandler
);
