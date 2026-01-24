/**
 * API Functions: Medical Records
 * Cloud Functions para gestão de prontuários médicos
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { Pool } from 'pg';
import { authorizeRequest } from '../middleware/auth';

/**
 * Helper para verificar auth
 */
async function getAuth(request: any) {
  if (!request.auth?.token) {
    throw new HttpsError('unauthenticated', 'Autenticação necessária');
  }
  return authorizeRequest(request.auth.token);
}

/**
 * Busca prontuários de um paciente
 */
export const getPatientRecords = onCall(async (request) => {
  const auth = await getAuth(request);
  const { patientId, type, limit = 50 } = request.data || {};

  if (!patientId) {
    throw new HttpsError('invalid-argument', 'patientId é obrigatório');
  }

  const pool = new Pool({
    connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Verificar se paciente pertence à organização
    const patient = await pool.query(
      'SELECT id FROM patients WHERE id = $1 AND organization_id = $2',
      [patientId, auth.organizationId]
    );

    if (patient.rows.length === 0) {
      throw new HttpsError('not-found', 'Paciente não encontrado');
    }

    let query = `
      SELECT
        mr.*,
        p.full_name as created_by_name
      FROM medical_records mr
      LEFT JOIN profiles p ON mr.created_by = p.user_id
      WHERE mr.patient_id = $1
        AND mr.organization_id = $2
    `;
    const params: any[] = [patientId, auth.organizationId];

    if (type) {
      query += ` AND mr.type = $3`;
      params.push(type);
    }

    query += ` ORDER BY mr.record_date DESC, mr.created_at DESC LIMIT $4`;
    params.push(limit);

    const result = await pool.query(query, params);

    return { data: result.rows };
  } finally {
    await pool.end();
  }
});

/**
 * Cria um novo prontuário
 */
export const createMedicalRecord = onCall(async (request) => {
  const auth = await getAuth(request);
  const {
    patientId,
    type,
    title,
    content,
    recordDate,
  } = request.data || {};

  if (!patientId || !type || !title) {
    throw new HttpsError('invalid-argument', 'patientId, type e title são obrigatórios');
  }

  const pool = new Pool({
    connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Verificar se paciente existe
    const patient = await pool.query(
      'SELECT id FROM patients WHERE id = $1 AND organization_id = $2',
      [patientId, auth.organizationId]
    );

    if (patient.rows.length === 0) {
      throw new HttpsError('not-found', 'Paciente não encontrado');
    }

    // Inserir prontuário
    const result = await pool.query(
      `INSERT INTO medical_records (
        patient_id, created_by, organization_id,
        type, title, content, record_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        patientId,
        auth.userId,
        auth.organizationId,
        type,
        title,
        content || '',
        recordDate || new Date().toISOString().split('T')[0],
      ]
    );

    // Publicar no Ably
    const realtime = await import('../realtime/publisher');
    await realtime.publishPatientUpdate(patientId, {
      type: 'medical_record_created',
      recordId: result.rows[0].id,
    });

    return { data: result.rows[0] };
  } finally {
    await pool.end();
  }
});

/**
 * Atualiza um prontuário
 */
export const updateMedicalRecord = onCall(async (request) => {
  const auth = await getAuth(request);
  const { recordId, ...updates } = request.data || {};

  if (!recordId) {
    throw new HttpsError('invalid-argument', 'recordId é obrigatório');
  }

  const pool = new Pool({
    connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Verificar se prontuário existe
    const existing = await pool.query(
      'SELECT * FROM medical_records WHERE id = $1 AND organization_id = $2',
      [recordId, auth.organizationId]
    );

    if (existing.rows.length === 0) {
      throw new HttpsError('not-found', 'Prontuário não encontrado');
    }

    // Construir SET dinâmico
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    const allowedFields = ['title', 'content'];

    for (const field of allowedFields) {
      if (field in updates) {
        paramCount++;
        setClauses.push(`${field} = $${paramCount}`);
        values.push(updates[field]);
      }
    }

    if (setClauses.length === 0) {
      throw new HttpsError('invalid-argument', 'Nenhum campo válido para atualizar');
    }

    paramCount++;
    setClauses.push(`updated_at = $${paramCount}`);
    values.push(new Date());

    values.push(recordId, auth.organizationId);

    const query = `
      UPDATE medical_records
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    return { data: result.rows[0] };
  } finally {
    await pool.end();
  }
});

/**
 * Lista sessões de tratamento de um paciente
 */
export const listTreatmentSessions = onCall(async (request) => {
  const auth = await getAuth(request);
  const { patientId, limit = 20 } = request.data || {};

  if (!patientId) {
    throw new HttpsError('invalid-argument', 'patientId é obrigatório');
  }

  const pool = new Pool({
    connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const result = await pool.query(
      `SELECT
        ts.*,
        p.name as patient_name,
        prof.full_name as therapist_name,
        a.date as appointment_date
      FROM treatment_sessions ts
      LEFT JOIN patients p ON ts.patient_id = p.id
      LEFT JOIN profiles prof ON ts.therapist_id = prof.user_id
      LEFT JOIN appointments a ON ts.appointment_id = a.id
      WHERE ts.patient_id = $1
        AND ts.organization_id = $2
      ORDER BY ts.session_date DESC, ts.created_at DESC
      LIMIT $3`,
      [patientId, auth.organizationId, limit]
    );

    return { data: result.rows };
  } finally {
    await pool.end();
  }
});

/**
 * Cria uma nova sessão de tratamento
 */
export const createTreatmentSession = onCall(async (request) => {
  const auth = await getAuth(request);
  const {
    patientId,
    appointmentId,
    painLevelBefore,
    painLevelAfter,
    observations,
    evolution,
    nextGoals,
  } = request.data || {};

  if (!patientId) {
    throw new HttpsError('invalid-argument', 'patientId é obrigatório');
  }

  const pool = new Pool({
    connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Buscar dados do appointment se fornecido
    let appointmentDate = null;
    let therapistId = auth.userId;

    if (appointmentId) {
      const apt = await pool.query(
        'SELECT date, therapist_id FROM appointments WHERE id = $1 AND organization_id = $2',
        [appointmentId, auth.organizationId]
      );

      if (apt.rows.length > 0) {
        appointmentDate = apt.rows[0].date;
        therapistId = apt.rows[0].therapist_id;
      }
    }

    // Inserir sessão
    const result = await pool.query(
      `INSERT INTO treatment_sessions (
        patient_id, therapist_id, appointment_id,
        organization_id, pain_level_before, pain_level_after,
        observations, evolution, next_session_goals,
        session_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        patientId,
        therapistId,
        appointmentId || null,
        auth.organizationId,
        painLevelBefore || null,
        painLevelAfter || null,
        observations || null,
        evolution || null,
        nextGoals || null,
        appointmentDate || new Date().toISOString().split('T')[0],
      ]
    );

    // Atualizar progresso se houver mudança na dor
    if (painLevelAfter !== undefined && painLevelBefore !== undefined) {
      await pool.query(
        `INSERT INTO patient_progress (
          patient_id, assessment_date, pain_level,
          organization_id, recorded_by
        ) VALUES ($1, CURRENT_DATE, $2, $3, $4)`,
        [
          patientId,
          painLevelAfter,
          auth.organizationId,
          auth.userId,
        ]
      );
    }

    return { data: result.rows[0] };
  } finally {
    await pool.end();
  }
});

/**
 * Atualiza uma sessão de tratamento
 */
export const updateTreatmentSession = onCall(async (request) => {
  const auth = await getAuth(request);
  const { sessionId, ...updates } = request.data || {};

  if (!sessionId) {
    throw new HttpsError('invalid-argument', 'sessionId é obrigatório');
  }

  const pool = new Pool({
    connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Verificar se sessão existe
    const existing = await pool.query(
      'SELECT * FROM treatment_sessions WHERE id = $1 AND organization_id = $2',
      [sessionId, auth.organizationId]
    );

    if (existing.rows.length === 0) {
      throw new HttpsError('not-found', 'Sessão não encontrada');
    }

    // Construir SET dinâmico
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    const allowedFields = ['pain_level_before', 'pain_level_after', 'observations', 'evolution', 'next_session_goals'];

    for (const field of allowedFields) {
      if (field in updates) {
        paramCount++;
        setClauses.push(`${field} = $${paramCount}`);
        values.push(updates[field]);
      }
    }

    if (setClauses.length === 0) {
      throw new HttpsError('invalid-argument', 'Nenhum campo válido para atualizar');
    }

    paramCount++;
    setClauses.push(`updated_at = $${paramCount}`);
    values.push(new Date());

    values.push(sessionId, auth.organizationId);

    const query = `
      UPDATE treatment_sessions
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    return { data: result.rows[0] };
  } finally {
    await pool.end();
  }
});

/**
 * Busca registros de dor de um paciente
 */
export const getPainRecords = onCall(async (request) => {
  const auth = await getAuth(request);
  const { patientId } = request.data || {};

  if (!patientId) {
    throw new HttpsError('invalid-argument', 'patientId é obrigatório');
  }

  const pool = new Pool({
    connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const result = await pool.query(
      `SELECT
        id, patient_id, pain_level, pain_type,
        body_part, notes, created_at, updated_at
      FROM patient_pain_records
      WHERE patient_id = $1
      ORDER BY created_at DESC`,
      [patientId]
    );

    return { data: result.rows };
  } finally {
    await pool.end();
  }
});

/**
 * Registra um novo evento de dor
 */
export const savePainRecord = onCall(async (request) => {
  const auth = await getAuth(request);
  const { patientId, level, type, bodyPart, notes } = request.data || {};

  if (!patientId || level === undefined || !type || !bodyPart) {
    throw new HttpsError('invalid-argument', 'patientId, level, type e bodyPart são obrigatórios');
  }

  const pool = new Pool({
    connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const result = await pool.query(
      `INSERT INTO patient_pain_records (
        patient_id, pain_level, pain_type,
        body_part, notes, organization_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        patientId,
        level,
        type,
        bodyPart,
        notes || null,
        auth.organizationId,
        auth.userId
      ]
    );

    return { data: result.rows[0] };
  } finally {
    await pool.end();
  }
});
