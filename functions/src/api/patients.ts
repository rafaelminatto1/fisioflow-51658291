/**
 * API Functions: Patients
 * Cloud Functions para gestão de pacientes
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getPool } from '../init';
import { authorizeRequest } from '../middleware/auth';

/**
 * Lista pacientes com filtros opcionais
 */
export const listPatients = onCall(async (request) => {
  console.log('[listPatients] ===== START =====');

  if (!request.auth || !request.auth.token) {
    console.error('[listPatients] Unauthenticated request');
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }

  console.log('[listPatients] Auth token present, uid:', request.auth.uid);

  const auth = await authorizeRequest(request.auth.token);

  const { status, search, limit = 50, offset = 0 } = request.data || {};

  // DEBUG: Log organization_id e query params
  console.log('[listPatients] auth.organizationId:', auth.organizationId);
  console.log('[listPatients] auth.userId:', auth.userId);
  console.log('[listPatients] filters:', { status, search, limit, offset });

  const pool = getPool();
  console.log('[listPatients] Pool obtained');

  try {
    // DEBUG: Verificar todos os pacientes no banco (sem filtro) para debug
    console.log('[listPatients] Executing DEBUG query...');
    const debugResult = await pool.query(
      'SELECT id, name, organization_id, is_active FROM patients ORDER BY created_at DESC LIMIT 10'
    );
    console.log('[listPatients] DEBUG - All patients in DB:', JSON.stringify(debugResult.rows));
    console.log('[listPatients] DEBUG - Total patients:', debugResult.rows.length);

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
    const params: any[] = [auth.organizationId];
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
    const countParams: any[] = [auth.organizationId];
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
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      page: Math.floor(offset / limit) + 1,
      perPage: limit,
    };
  } catch (error: any) {
    console.error('Error in listPatients:', error);
    throw new HttpsError('internal', error.message || 'Erro interno ao listar pacientes');
  }
});

/**
 * Busca um paciente por ID
 */
export const getPatient = onCall(async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { patientId, profileId } = request.data || {};

  if (!patientId && !profileId) {
    throw new HttpsError('invalid-argument', 'patientId ou profileId é obrigatório');
  }

  const pool = getPool();

  try {
    let query = 'SELECT * FROM patients WHERE organization_id = $1';
    const params: any[] = [auth.organizationId];

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

    return { data: result.rows[0] };
  } catch (error: any) {
    console.error('Error in getPatient:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message || 'Erro interno ao buscar paciente');
  }
});

/**
 * Cria um novo paciente
 */
export const createPatient = onCall(async (request) => {
  console.log('[createPatient] ===== START =====');

  if (!request.auth || !request.auth.token) {
    console.error('[createPatient] Unauthenticated request');
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }

  console.log('[createPatient] Auth token present, uid:', request.auth.uid);

  const auth = await authorizeRequest(request.auth.token);
  const data = request.data || {};

  // DEBUG: Log organization_id ao criar paciente
  console.log('[createPatient] auth.organizationId:', auth.organizationId);
  console.log('[createPatient] auth.userId:', auth.userId);
  console.log('[createPatient] data:', JSON.stringify({ name: data.name, phone: data.phone, organization_id: data.organization_id }));

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
    await pool.query(
      `INSERT INTO organizations (id, name, slug, active)
       VALUES ($1, 'Clínica Principal', 'default-org', true)
       ON CONFLICT (id) DO NOTHING`,
      [auth.organizationId]
    );

    // Inserir paciente
    const result = await pool.query(
      `INSERT INTO patients (
        name, cpf, email, phone, birth_date, gender,
        address, emergency_contact, medical_history,
        main_condition, status, organization_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        data.status || 'active',
        auth.organizationId,
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

    return { data: patient };
  } catch (error: any) {
    console.error('Error in createPatient:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message || 'Erro interno ao criar paciente');
  }
});

/**
 * Atualiza um paciente existente
 */
export const updatePatient = onCall(async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { patientId, ...updates } = request.data || {};

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
    const values: any[] = [];
    let paramCount = 1;

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

    return { data: patient };
  } catch (error: any) {
    console.error('Error in updatePatient:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message || 'Erro interno ao atualizar paciente');
  }
});

/**
 * Remove (soft delete) um paciente
 */
export const deletePatient = onCall(async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { patientId } = request.data || {};

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
  } catch (error: any) {
    console.error('Error in deletePatient:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message || 'Erro interno ao excluir paciente');
  }
});

/**
 * Busca estatísticas de um paciente
 */
export const getPatientStats = onCall(async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { patientId } = request.data || {};

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

    return {
      data: {
        appointments: appointmentsResult.rows[0],
        treatment_sessions: parseInt(sessionsResult.rows[0].total_sessions),
        active_plans: parseInt(plansResult.rows[0].active_plans),
      },
    };
  } catch (error: any) {
    console.error('Error in getPatientStats:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message || 'Erro interno ao buscar estatísticas');
  }
});
