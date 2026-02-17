/**
 * Callables for gamification / patient quests (checkPatientAppointments, getLastPainMapDate).
 * Used by the frontend quest-generator via httpsCallable.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getPool } from '../init';
import { CORS_ORIGINS } from '../lib/cors';
import { authorizeRequest } from '../middleware/auth';
import { logger } from '../lib/logger';

interface CheckPatientAppointmentsRequest {
  patientId: string;
  startDate: string;
  endDate: string;
}

interface CheckPatientAppointmentsResponse {
  hasAppointments: boolean;
}

/**
 * Check if patient has appointments in the given date range.
 * Used by quest-generator for "Comparecer à Sessão" quest.
 */
export const checkPatientAppointments = onCall<
  CheckPatientAppointmentsRequest,
  Promise<CheckPatientAppointmentsResponse>
>(
  { cors: CORS_ORIGINS },
  async (request) => {
    if (!request.auth?.token) {
      throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await authorizeRequest(request.auth.token);
    const { patientId, startDate, endDate } = request.data ?? {};
    if (!patientId || !startDate || !endDate) {
      throw new HttpsError(
        'invalid-argument',
        'patientId, startDate e endDate são obrigatórios'
      );
    }
    const pool = getPool();
    try {
      const result = await pool.query(
        `SELECT 1 FROM appointments
         WHERE patient_id = $1 AND organization_id = $2
           AND date >= $3 AND date <= $4
         LIMIT 1`,
        [patientId, auth.organizationId, startDate, endDate]
      );
      return { hasAppointments: result.rows.length > 0 };
    } catch (error) {
      logger.error('checkPatientAppointments:', error);
      const message = error instanceof Error ? error.message : 'Erro ao verificar agendamentos';
      throw new HttpsError('internal', message);
    }
  }
);

interface GetLastPainMapDateRequest {
  patientId: string;
}

interface GetLastPainMapDateResponse {
  lastDate?: string;
}

/**
 * Get the last pain record date for a patient (pain map).
 * Used by quest-generator for pain map quests.
 */
export const getLastPainMapDate = onCall<
  GetLastPainMapDateRequest,
  Promise<GetLastPainMapDateResponse>
>(
  { cors: CORS_ORIGINS },
  async (request) => {
    if (!request.auth?.token) {
      throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await authorizeRequest(request.auth.token);
    const { patientId } = request.data ?? {};
    if (!patientId) {
      throw new HttpsError('invalid-argument', 'patientId é obrigatório');
    }
    const pool = getPool();
    try {
      const result = await pool.query(
        `SELECT record_date FROM patient_pain_records
         WHERE patient_id = $1 AND organization_id = $2
         ORDER BY record_date DESC
         LIMIT 1`,
        [patientId, auth.organizationId]
      );
      const row = result.rows[0];
      return row?.record_date != null ? { lastDate: String(row.record_date) } : {};
    } catch (error) {
      logger.error('getLastPainMapDate:', error);
      const message = error instanceof Error ? error.message : 'Erro ao buscar última data do mapa de dor';
      throw new HttpsError('internal', message);
    }
  }
);
