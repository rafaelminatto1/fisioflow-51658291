/**
 * Health Check API
 * Função simples para verificar conectividade com Cloud SQL
 */

import { onRequest } from 'firebase-functions/v2/https';
import {
  DB_PASS_SECRET,
  DB_USER_SECRET,
  DB_NAME_SECRET,
  DB_HOST_IP_SECRET,
  DB_HOST_IP_PUBLIC_SECRET,
  CLOUD_SQL_CONNECTION_NAME_SECRET,
  getPool
} from '../init';

// Import secrets to register them with the functions framework
import '../init';

/**
 * Handler HTTP para healthCheck
 */
export const healthCheckHandler = async (req: any, res: any) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const pool = getPool();
    const result = await pool.query('SELECT COUNT(*) as count FROM exercises WHERE is_active = true');
    const dbTime = await pool.query('SELECT NOW() as server_time');

    res.json({
      status: 'healthy',
      database: 'connected (centralized pool)',
      exercises_count: parseInt(result.rows[0].count),
      server_time: dbTime.rows[0].server_time,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      hint: 'Configure VPC connector for Cloud SQL access'
    });
  }
};

export const healthCheck = onRequest({
  memory: '256MiB',
  maxInstances: 1,
  invoker: 'public',
  secrets: [
    DB_PASS_SECRET,
    DB_USER_SECRET,
    DB_NAME_SECRET,
    DB_HOST_IP_SECRET,
    DB_HOST_IP_PUBLIC_SECRET,
    CLOUD_SQL_CONNECTION_NAME_SECRET
  ],
}, healthCheckHandler);
