/**
 * API Functions: Patient Stats
 * Cloud Functions para estatísticas de pacientes
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { authorizeRequest } from '../middleware/auth';
import { verifyAppCheck } from '../middleware/app-check';
import { getPool, CORS_ORIGINS } from '../init';
import { logger } from '../lib/logger';

interface GetPatientStatsRequest {
  patientId?: string;
  period?: '7d' | '30d' | '90d' | 'all';
}

interface PatientStatsResponse {
  data: {
    totalSessions: number;
    upcomingAppointments: number;
    lastVisit?: string;
    averageSessionDuration?: number;
  };
}

/**
 * Obtém estatísticas de um paciente
 */
export const getPatientStats = onCall<GetPatientStatsRequest, Promise<PatientStatsResponse>>(
  { cors: CORS_ORIGINS },
  async (request) => {
    if (!request.auth || !request.auth.token) {
      throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    }

    verifyAppCheck(request);

    const authContext = await authorizeRequest(request.auth.token);
    const pool = getPool();

    try {
      const { patientId, period = '30d' } = request.data;
      const userId = patientId || authContext.userId;

      // Calculate date range
      let interval = '30 days';
      if (period === '7d') interval = '7 days';
      else if (period === '90d') interval = '90 days';
      else if (period === 'all') interval = '100 years';

      const result = await pool.query(`
        SELECT
          COALESCE(COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed'), 0) as total_sessions,
          COALESCE(SUM(CASE WHEN a.date >= CURRENT_DATE THEN 1 ELSE 0 END), 0) as upcoming_appointments,
          COALESCE(MAX(a.date)::text FILTER (WHERE a.status = 'completed'), NULL) as last_visit,
          COALESCE(AVG(EXTRACT(EPOCH FROM (a.end_time - a.start_time))/60), 0) as avg_duration
        FROM appointments a
        WHERE a.patient_id = $1
          AND a.created_at >= NOW() - INTERVAL '${interval}'
      `, [userId]);

      return {
        data: {
          totalSessions: parseInt(result.rows[0].total_sessions) || 0,
          upcomingAppointments: parseInt(result.rows[0].upcoming_appointments) || 0,
          lastVisit: result.rows[0].last_visit,
          averageSessionDuration: result.rows[0].avg_duration ? Math.round(result.rows[0].avg_duration) : undefined,
        },
      };
    } catch (error: unknown) {
      logger.error('[getPatientStats] Error:', error);
      if (error instanceof HttpsError) throw error;
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar estatísticas';
      throw new HttpsError('internal', errorMessage);
    }
  }
);
