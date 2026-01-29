/**
 * API Functions: Patients
 * Cloud Functions para gestão de pacientes
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getPool, DB_PASS_SECRET, DB_USER_SECRET, DB_NAME_SECRET, DB_HOST_IP_SECRET, DB_HOST_IP_PUBLIC_SECRET } from '../init';
import { authorizeRequest } from '../middleware/auth';
import { verifyAppCheck } from '../middleware/app-check';
import { enforceRateLimit, RATE_LIMITS } from '../middleware/rate-limit';
import { Patient } from '../types/models';

/**
 * Lista pacientes com filtros opcionais
 */
interface ListPatientsRequest {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

interface ListPatientsResponse {
  data: Patient[];
  total: number;
  page: number;
  perPage: number;
}

/**
 * Lista pacientes com filtros opcionais
 */
export const listPatients = onCall<ListPatientsRequest, Promise<ListPatientsResponse>>(
  { secrets: [DB_PASS_SECRET, DB_USER_SECRET, DB_NAME_SECRET, DB_HOST_IP_SECRET, DB_HOST_IP_PUBLIC_SECRET],
  vpcConnector: "cloudsql-connector",
  vpcConnectorEgressSettings: "PRIVATE_RANGES_ONLY" },
  async (request) => {
  console.log('[listPatients] ===== START =====');

  if (!request.auth || !request.auth.token) {
    console.error('[listPatients] Unauthenticated request');
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }

  console.log('[listPatients] Auth token present, uid:', request.auth.uid);

  // Verificar App Check
  verifyAppCheck(request);
  console.log('[listPatients] App Check verified');

  // Verificar rate limit
  await enforceRateLimit(request, RATE_LIMITS.callable);
  console.log('[listPatients] Rate limit check passed');

  const auth = await authorizeRequest(request.auth.token);
  const { status, search, limit = 50, offset = 0 } = request.data;

  const pool = getPool();

  try {
    // Construir query dinâmica
    let query = `
      SELECT
        id, name, cpf, email, phone, birth_date, gender,
        main_condition, status, progress, is_active,
        created_at, updated_at
      FROM patients
      WHERE organization_id = $1
        AND is_active = true
    `;
    const params: (string | number)[] = [auth.organizationId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR cpf ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY name ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Buscar total
    let countQuery = `
      SELECT COUNT(*) as total
      FROM patients
      WHERE organization_id = $1 AND is_active = true
    `;
    const countParams: (string | number)[] = [auth.organizationId];
    let countParamCount = 1;

    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND (name ILIKE $${countParamCount} OR cpf ILIKE $${countParamCount} OR email ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);

    return {
      data: result.rows as Patient[],
      total: parseInt(countResult.rows[0].total, 10),
      page: Math.floor(offset / limit) + 1,
      perPage: limit,
    };
  } catch (error: unknown) {
    console.error('Error in listPatients:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : 'Erro interno ao listar pacientes';
    throw new HttpsError('internal', errorMessage);
  }
});

/**
 * Busca um paciente por ID
 */
interface GetPatientRequest {
  patientId?: string;
  profileId?: string;
}

interface GetPatientResponse {
  data: Patient;
}

/**
 * Busca um paciente por ID
 */
export const getPatient = onCall<GetPatientRequest, Promise<GetPatientResponse>>(
  { secrets: [DB_PASS_SECRET, DB_USER_SECRET, DB_NAME_SECRET, DB_HOST_IP_SECRET, DB_HOST_IP_PUBLIC_SECRET],
  vpcConnector: "cloudsql-connector",
  vpcConnectorEgressSettings: "PRIVATE_RANGES_ONLY" },
  async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  verifyAppCheck(request);
  console.log('App Check verified');
  verifyAppCheck(request);
  console.log("App Check verified");
  const { patientId, profileId } = request.data;

  if (!patientId && !profileId) {
    throw new HttpsError('invalid-argument', 'patientId ou profileId é obrigatório');
  }

  const pool = getPool();

  try {
    let query = 'SELECT * FROM patients WHERE organization_id = $1';
    const params: (string | number)[] = [auth.organizationId];

    if (patientId) {
      query += ' AND id = $2';
      params.push(patientId);
    } else if (profileId) {
      query += ' AND profile_id = $2';
      params.push(profileId);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      throw new HttpsError('not-found', 'Paciente não encontrado');
    }

    return { data: result.rows[0] as Patient };
  } catch (error: unknown) {
    console.error('Error in getPatient:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro interno ao buscar paciente';
    throw new HttpsError('internal', errorMessage);
  }
});

interface CreatePatientRequest {
  name: string;
  phone?: string;
  cpf?: string;
  email?: string;
  birth_date?: string;
  gender?: string;
  address?: any;
  emergency_contact?: any;
  medical_history?: string;
  main_condition?: string;
  status?: string;
  organization_id?: string;
  incomplete_registration?: boolean; // Added for quick registration
}

interface CreatePatientResponse {
  data: Patient;
}

/**
 * Cria um novo paciente
 */
export const createPatient = onCall<CreatePatientRequest, Promise<CreatePatientResponse>>(
  { secrets: [DB_PASS_SECRET, DB_USER_SECRET, DB_NAME_SECRET, DB_HOST_IP_SECRET, DB_HOST_IP_PUBLIC_SECRET],
  vpcConnector: "cloudsql-connector",
  vpcConnectorEgressSettings: "PRIVATE_RANGES_ONLY" },
  async (request) => {
  console.log('[createPatient] ===== START =====');

  if (!request.auth || !request.auth.token) {
    console.error('[createPatient] Unauthenticated request');
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }

  console.log('[createPatient] Auth token present, uid:', request.auth.uid);

  // Verificar App Check
  verifyAppCheck(request);
  console.log('[createPatient] App Check verified');

  // Verificar rate limit
  await enforceRateLimit(request, RATE_LIMITS.callable);
  console.log('[createPatient] Rate limit check passed');

  const auth = await authorizeRequest(request.auth.token);
  const data = request.data;

  // DEBUG: Log organization_id ao criar paciente
  console.log('[createPatient] auth.organizationId:', auth.organizationId);
  console.log('[createPatient] auth.userId:', auth.userId);
  console.log('[createPatient] data:', JSON.stringify({ name: data.name, phone: data.phone }));

  // Validar campos obrigatórios
  if (!data.name) {
    throw new HttpsError('invalid-argument', 'name é obrigatório');
  }

  const pool = getPool();

  try {
    // Verificar duplicidade de CPF
    if (data.cpf) {
      const existing = await pool.query(
        'SELECT id FROM patients WHERE cpf = $1 AND organization_id = $2',
        [data.cpf.replace(/\D/g, ''), auth.organizationId]
      );

      if (existing.rows.length > 0) {
        throw new HttpsError('already-exists', 'Já existe um paciente com este CPF');
      }
    }

    // [AUTO-FIX] Ensure organization exists to satisfy FK constraint
    console.log('[createPatient] Target Org ID:', auth.organizationId);
    const orgInsertSql = `INSERT INTO organizations (id, name, slug, active, email)
       VALUES ($1, 'Clínica Principal', 'default-org', true, 'admin@fisioflow.com.br')
       ON CONFLICT (id) DO NOTHING`;
    console.log('[createPatient] Org Insert SQL:', orgInsertSql);
    await pool.query(orgInsertSql, [auth.organizationId]);

    // Inserir paciente
    const result = await pool.query(
      `INSERT INTO patients (
        name, cpf, email, phone, birth_date, gender,
        address, emergency_contact, medical_history,
        main_condition, status, organization_id, incomplete_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        data.name,
        data.cpf?.replace(/\D/g, '') || null,
        data.email || null,
        data.phone || null,
        data.birth_date || null,
        data.gender || null,
        data.address ? JSON.stringify(data.address) : null,
        data.emergency_contact ? JSON.stringify(data.emergency_contact) : null,
        data.medical_history || null,
        data.main_condition || null,
        data.status || 'Inicial',
        auth.organizationId,
        data.incomplete_registration || false
      ]
    );

    const patient = result.rows[0];

    console.log('[createPatient] Patient created:', JSON.stringify({
      id: patient.id,
      name: patient.name,
      organization_id: patient.organization_id,
      is_active: patient.is_active
    }));

    // Publicar no Ably para atualização em tempo real
    try {
      const realtime = await import('../realtime/publisher');
      await realtime.publishPatientEvent(auth.organizationId, {
        event: 'INSERT',
        new: patient,
        old: null,
      });
    } catch (err) {
      console.error('Erro ao publicar evento no Ably:', err);
    }

    return { data: patient as Patient };
  } catch (error: unknown) {
    console.error('Error in createPatient:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro interno ao criar paciente';
    throw new HttpsError('internal', errorMessage);
  }
});

/**
 * Atualiza um paciente existente
 */
interface UpdatePatientRequest {
  patientId: string;
  name?: string;
  cpf?: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
  medical_history?: string;
  main_condition?: string;
  status?: string;
  progress?: number;
  [key: string]: any; // Allow dynamic fields for now, but explicit is better
}

interface UpdatePatientResponse {
  data: Patient;
}

/**
 * Atualiza um paciente existente
 */
export const updatePatient = onCall<UpdatePatientRequest, Promise<UpdatePatientResponse>>(
  { secrets: [DB_PASS_SECRET, DB_USER_SECRET, DB_NAME_SECRET, DB_HOST_IP_SECRET, DB_HOST_IP_PUBLIC_SECRET],
  vpcConnector: "cloudsql-connector",
  vpcConnectorEgressSettings: "PRIVATE_RANGES_ONLY" },
  async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  verifyAppCheck(request);
  console.log('App Check verified');
  verifyAppCheck(request);
  console.log("App Check verified");
  const { patientId, ...updates } = request.data;

  if (!patientId) {
    throw new HttpsError('invalid-argument', 'patientId é obrigatório');
  }

  const pool = getPool();

  try {
    // Verificar se paciente existe e pertence à organização
    const existing = await pool.query(
      'SELECT * FROM patients WHERE id = $1 AND organization_id = $2',
      [patientId, auth.organizationId]
    );

    if (existing.rows.length === 0) {
      throw new HttpsError('not-found', 'Paciente não encontrado');
    }

    // Construir SET dinâmico
    const setClauses: string[] = [];
    const values: (string | number | boolean | Date | null)[] = [];
    let paramCount = 0;

    const allowedFields = [
      'name',
      'cpf',
      'email',
      'phone',
      'birth_date',
      'gender',
      'medical_history',
      'main_condition',
      'status',
      'progress',
    ];

    for (const field of allowedFields) {
      if (field in updates) {
        paramCount++;
        setClauses.push(`${field} = $${paramCount}`);
        if (field === 'cpf') {
          values.push(updates[field]?.replace(/\D/g, '') || null);
        } else {
          values.push(updates[field]);
        }
      }
    }

    if (setClauses.length === 0) {
      throw new HttpsError('invalid-argument', 'Nenhum campo válido para atualizar');
    }

    // Adicionar updated_at
    paramCount++;
    setClauses.push(`updated_at = $${paramCount}`);
    values.push(new Date());

    // Adicionar WHERE params
    values.push(patientId, auth.organizationId);

    const query = `
      UPDATE patients
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    const patient = result.rows[0];

    // Publicar no Ably
    try {
      const realtime = await import('../realtime/publisher');
      await realtime.publishPatientEvent(auth.organizationId, {
        event: 'UPDATE',
        new: patient,
        old: existing.rows[0],
      });
    } catch (err) {
      console.error('Erro ao publicar evento no Ably:', err);
    }

    return { data: patient as Patient };
  } catch (error: unknown) {
    console.error('Error in updatePatient:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro interno ao atualizar paciente';
    throw new HttpsError('internal', errorMessage);
  }
});

interface DeletePatientRequest {
  patientId: string;
}

interface DeletePatientResponse {
  success: boolean;
}

/**
 * Remove (soft delete) um paciente
 */
export const deletePatient = onCall<DeletePatientRequest, Promise<DeletePatientResponse>>(
  { secrets: [DB_PASS_SECRET, DB_USER_SECRET, DB_NAME_SECRET, DB_HOST_IP_SECRET, DB_HOST_IP_PUBLIC_SECRET],
  vpcConnector: "cloudsql-connector",
  vpcConnectorEgressSettings: "PRIVATE_RANGES_ONLY" },
  async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  verifyAppCheck(request);
  console.log('App Check verified');
  verifyAppCheck(request);
  console.log("App Check verified");
  const { patientId } = request.data;

  if (!patientId) {
    throw new HttpsError('invalid-argument', 'patientId é obrigatório');
  }

  const pool = getPool();

  try {
    // Soft delete
    const result = await pool.query(
      `UPDATE patients
       SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [patientId, auth.organizationId]
    );

    if (result.rows.length === 0) {
      throw new HttpsError('not-found', 'Paciente não encontrado');
    }

    // Publicar no Ably
    try {
      const realtime = await import('../realtime/publisher');
      await realtime.publishPatientEvent(auth.organizationId, {
        event: 'DELETE',
        new: null,
        old: result.rows[0],
      });
    } catch (err) {
      console.error('Erro ao publicar evento no Ably:', err);
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error in deletePatient:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro interno ao excluir paciente';
    throw new HttpsError('internal', errorMessage);
  }
});

interface GetPatientStatsRequest {
  patientId: string;
}

interface GetPatientStatsResponse {
  data: {
    appointments: {
      total: number;
      completed: number;
      scheduled: number;
      upcoming: number;
    };
    treatment_sessions: number;
    active_plans: number;
  };
}

/**
 * Busca estatísticas de um paciente
 */
export const getPatientStats = onCall<GetPatientStatsRequest, Promise<GetPatientStatsResponse>>(
  { secrets: [DB_PASS_SECRET, DB_USER_SECRET, DB_NAME_SECRET, DB_HOST_IP_SECRET, DB_HOST_IP_PUBLIC_SECRET],
  vpcConnector: "cloudsql-connector",
  vpcConnectorEgressSettings: "PRIVATE_RANGES_ONLY" },
  async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  verifyAppCheck(request);
  console.log('App Check verified');
  verifyAppCheck(request);
  console.log("App Check verified");
  const { patientId } = request.data;

  if (!patientId) {
    throw new HttpsError('invalid-argument', 'patientId é obrigatório');
  }

  const pool = getPool();

  try {
    // Verificar se paciente pertence à organização
    const patient = await pool.query(
      'SELECT id FROM patients WHERE id = $1 AND organization_id = $2',
      [patientId, auth.organizationId]
    );

    if (patient.rows.length === 0) {
      throw new HttpsError('not-found', 'Paciente não encontrado');
    }

    // Buscar estatísticas
    const [
      appointmentsResult,
      sessionsResult,
      plansResult,
    ] = await Promise.all([
      pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'concluido') as completed,
          COUNT(*) FILTER (WHERE status = 'agendado') as scheduled,
          COUNT(*) FILTER (WHERE date >= CURRENT_DATE) as upcoming
        FROM appointments
        WHERE patient_id = $1`,
        [patientId]
      ),
      pool.query(
        `SELECT COUNT(*) as total_sessions
        FROM treatment_sessions
        WHERE patient_id = $1`,
        [patientId]
      ),
      pool.query(
        `SELECT COUNT(*) as active_plans
        FROM exercise_plans
        WHERE patient_id = $1 AND status = 'ativo'`,
        [patientId]
      ),
    ]);

    const apptStats = appointmentsResult.rows[0];

    return {
      data: {
        appointments: {
          total: parseInt(apptStats.total || '0', 10),
          completed: parseInt(apptStats.completed || '0', 10),
          scheduled: parseInt(apptStats.scheduled || '0', 10),
          upcoming: parseInt(apptStats.upcoming || '0', 10),
        },
        treatment_sessions: parseInt(sessionsResult.rows[0].total_sessions || '0', 10),
        active_plans: parseInt(plansResult.rows[0].active_plans || '0', 10),
      },
    };
  } catch (error: unknown) {
    console.error('Error in getPatientStats:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro interno ao buscar estatísticas';
    throw new HttpsError('internal', errorMessage);
  }
});
