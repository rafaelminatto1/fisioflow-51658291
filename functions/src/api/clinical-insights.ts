import { onRequest } from 'firebase-functions/v2/https';
import { getPool } from '../init';
import { setCorsHeaders } from '../lib/cors';
import { authorizeRequest, extractBearerToken } from '../middleware/auth';
import { logger } from '../lib/logger';

const httpOpts = { region: 'southamerica-east1' as const, memory: '512MiB' as const, maxInstances: 10, cors: true };

/**
 * Fornece insights analíticos profundos baseados em dados SQL
 * Útil para dashboards de IA e relatórios de gestão
 */
/**
 * Fornece insights analíticos profundos baseados em dados SQL
 */
export const getClinicalInsightsHttpHandler = async (req: any, res: any) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const auth = await authorizeRequest(extractBearerToken(token));

    const pool = getPool();

    // 1. Estatísticas de Metas (Goals)
    const goalsStats = await pool.query(`
      SELECT 
        status, 
        COUNT(*) as count,
        ROUND(AVG(EXTRACT(EPOCH FROM (achieved_at - created_at))/86400)::numeric, 1) as avg_days_to_achieve
      FROM patient_goals 
      WHERE organization_id = $1
      GROUP BY status
    `, [auth.organizationId]);

    // 2. Distribuição de Patologias
    const pathologyDist = await pool.query(`
      SELECT 
        name, 
        COUNT(*) as patient_count
      FROM patient_pathologies
      WHERE organization_id = $1 AND status = 'ativo'
      GROUP BY name
      ORDER BY patient_count DESC
      LIMIT 10
    `, [auth.organizationId]);

    // 3. Evolução de Dor (Pain Trend) por Patologia
    const painEvolution = await pool.query(`
      SELECT 
        path.name as pathology,
        ROUND(AVG(pr.pain_level)::numeric, 2) as avg_pain_level,
        COUNT(pr.id) as record_count
      FROM patient_pathologies path
      JOIN patient_pain_records pr ON path.patient_id = pr.patient_id
      WHERE path.organization_id = $1
      GROUP BY path.name
      HAVING COUNT(pr.id) > 2
      ORDER BY avg_pain_level DESC
    `, [auth.organizationId]);

    res.json({
      data: {
        goals: goalsStats.rows,
        pathologies: pathologyDist.rows,
        painTrend: painEvolution.rows,
        timestamp: new Date().toISOString()
      }
    });

  } catch (e: any) {
    logger.error('getClinicalInsights error:', e);
    res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
};

export const getClinicalInsightsHttp = onRequest(httpOpts, getClinicalInsightsHttpHandler);
