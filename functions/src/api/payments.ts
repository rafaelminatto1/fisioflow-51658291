
/**
 * Lista pagamentos de um paciente
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getPool, CORS_ORIGINS } from '../init';
import { authorizeRequest } from '../middleware/auth';
import { Payment, PatientSessionPackage } from '../types/models';
import { logger } from '../lib/logger';

interface ListPaymentsRequest {
  patientId?: string;
  limit?: number;
  offset?: number;
}

interface ListPaymentsResponse {
  data: Payment[];
}

/**
 * Lista pagamentos de um paciente
 */
export const listPaymentsHandler = async (request: any) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { patientId, limit = 50, offset = 0 } = request.data;

  const pool = getPool();

  try {
    let query = `
      SELECT p.*,
        pat.name as patient_name,
        prof.full_name as therapist_name
      FROM payments p
      LEFT JOIN patients pat ON p.patient_id = pat.id
      LEFT JOIN profiles prof ON p.therapist_id = prof.user_id
      WHERE p.organization_id = $1
    `;
    const params: (string | number)[] = [auth.organizationId];

    if (patientId) {
      query += ` AND p.patient_id = $${params.length + 1}`;
      params.push(patientId);
    }

    query += ` ORDER BY p.payment_date DESC, p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return { data: result.rows as Payment[] };
  } catch (error: unknown) {
    logger.error('Error in listPayments:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao listar pagamentos';
    throw new HttpsError('internal', errorMessage);
  }
};

export const listPayments = onCall<ListPaymentsRequest, Promise<ListPaymentsResponse>>(
  { cors: CORS_ORIGINS },
  listPaymentsHandler
);

/**
 * Busca resumo financeiro do paciente
 */
interface GetPatientFinancialSummaryRequest {
  patientId: string;
}

interface GetPatientFinancialSummaryResponse {
  summary: {
    total_paid_cents: number;
    individual_sessions_paid: number;
    package_sessions_total: number;
    package_sessions_used: number;
    package_sessions_available: number;
  };
  active_packages: PatientSessionPackage[];
}

/**
 * Busca resumo financeiro do paciente
 */
export const getPatientFinancialSummaryHandler = async (request: any) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { patientId } = request.data;

  if (!patientId) {
    throw new HttpsError('invalid-argument', 'patientId é obrigatório');
  }

  const pool = getPool();

  try {
    // Verificar se paciente pertence à organização
    const patientCheck = await pool.query(
      'SELECT id FROM patients WHERE id = $1 AND organization_id = $2',
      [patientId, auth.organizationId]
    );

    if (patientCheck.rows.length === 0) {
      throw new HttpsError('not-found', 'Paciente não encontrado');
    }

    // Buscar resumo
    const result = await pool.query(
      `SELECT
        COALESCE(SUM(p.amount_cents) FILTER (p.status = 'completed'), 0) as total_paid_cents,
        COUNT(p.id) FILTER (p.status = 'completed') as individual_sessions_paid,
        COALESCE(SUM(pkg.sessions_count), 0) as package_sessions_total,
        COALESCE(SUM(pkg.sessions_used), 0) as package_sessions_used,
        COALESCE(SUM(pkg.sessions_count - pkg.sessions_used) FILTER (pkg.is_active = true), 0) as package_sessions_available
      FROM payments p
      LEFT JOIN patient_session_packages pkg ON pkg.patient_id = $1 AND pkg.is_active = true
      WHERE p.patient_id = $1 AND p.organization_id = $2
      GROUP BY p.patient_id`,
      [patientId, auth.organizationId]
    );

    // Buscar pacotes ativos
    const packages = await pool.query(
      `SELECT
        id,
        sessions_count,
        sessions_used,
        amount_cents,
        purchase_date,
        valid_until,
        is_active
      FROM patient_session_packages
      WHERE patient_id = $1 AND is_active = true
        AND valid_until > CURRENT_DATE
      ORDER BY valid_until`,
      [patientId]
    );

    return {
      summary: result.rows[0] || {
        total_paid_cents: 0,
        individual_sessions_paid: 0,
        package_sessions_total: 0,
        package_sessions_used: 0,
        package_sessions_available: 0,
      },
      active_packages: packages.rows as PatientSessionPackage[],
    };
  } catch (error: unknown) {
    logger.error('Error in getPatientFinancialSummary:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar resumo financeiro';
    throw new HttpsError('internal', errorMessage);
  }
};

export const getPatientFinancialSummary = onCall<GetPatientFinancialSummaryRequest, Promise<GetPatientFinancialSummaryResponse>>(
  { cors: CORS_ORIGINS },
  getPatientFinancialSummaryHandler
);

/**
 * Cria um novo pagamento
 */
interface CreatePaymentRequest {
  patientId: string;
  appointmentId?: string;
  amountCents: number;
  method: string;
  paymentDate?: string;
  notes?: string;
}

interface CreatePaymentResponse {
  data: Payment;
}

/**
 * Cria um novo pagamento
 */
export const createPaymentHandler = async (request: any) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { patientId, appointmentId, amountCents, method, paymentDate, notes } = request.data;

  if (!patientId || !amountCents || !method) {
    throw new HttpsError('invalid-argument', 'patientId, amountCents e method são obrigatórios');
  }

  const pool = getPool();

  try {
    // Verificar se paciente existe
    const patientCheck = await pool.query(
      'SELECT id FROM patients WHERE id = $1 AND organization_id = $2',
      [patientId, auth.organizationId]
    );

    if (patientCheck.rows.length === 0) {
      throw new HttpsError('not-found', 'Paciente não encontrado');
    }

    // Verificar se appointment existe (se fornecido)
    if (appointmentId) {
      const apt = await pool.query(
        'SELECT id FROM appointments WHERE id = $1 AND organization_id = $2',
        [appointmentId, auth.organizationId]
      );

      if (apt.rows.length === 0) {
        throw new HttpsError('not-found', 'Agendamento não encontrado');
      }
    }

    // Inserir pagamento
    const result = await pool.query(
      `INSERT INTO payments (
        patient_id, appointment_id, amount_cents, method,
        payment_date, organization_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        patientId,
        appointmentId || null,
        amountCents,
        method,
        paymentDate || new Date().toISOString().split('T')[0],
        auth.organizationId,
        notes || null,
      ]
    );

    const payment = result.rows[0];

    // Publicar no Ably
    try {
      const realtime = await import('../realtime/publisher');
      await realtime.publishPatientUpdate(patientId, {
        type: 'payment_created',
        paymentId: payment.id,
      });
    } catch (e) {
      logger.error('Error publishing to Ably:', e);
    }

    return { data: payment as Payment };
  } catch (error: unknown) {
    logger.error('Error in createPayment:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao criar pagamento';
    throw new HttpsError('internal', errorMessage);
  }
};

export const createPayment = onCall<CreatePaymentRequest, Promise<CreatePaymentResponse>>(
  { cors: CORS_ORIGINS },
  createPaymentHandler
);
