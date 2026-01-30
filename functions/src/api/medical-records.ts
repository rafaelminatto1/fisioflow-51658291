import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getPool } from '../init';
import { authorizeRequest } from '../middleware/auth';
import { MedicalRecord, TreatmentSession, PainRecord } from '../types/models';

/**
 * Busca prontuários de um paciente
 */
interface GetPatientRecordsRequest {
  patientId: string;
  type?: string;
  limit?: number;
}

interface GetPatientRecordsResponse {
  data: MedicalRecord[];
}

export const getPatientRecords = onCall<GetPatientRecordsRequest, Promise<GetPatientRecordsResponse>>({ cors: true }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { patientId, type, limit = 50 } = request.data;

  if (!patientId) {
    throw new HttpsError('invalid-argument', 'patientId é obrigatório');
  }

  const pool = getPool();

  try {
    // Verificar se paciente pertence à organização
    const patientQuery = await pool.query(
      'SELECT id FROM patients WHERE id = $1 AND organization_id = $2',
      [patientId, auth.organizationId]
    );

    if (patientQuery.rows.length === 0) {
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
    const params: (string | number)[] = [patientId, auth.organizationId];

    if (type) {
      query += ` AND mr.type = $3`;
      params.push(type);
    }

    query += ` ORDER BY mr.record_date DESC, mr.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    return { data: result.rows as MedicalRecord[] };
  } catch (error: unknown) {
    console.error('Error in getPatientRecords:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar prontuários';
    throw new HttpsError('internal', errorMessage);
  }
});

/**
 * Cria um novo prontuário
 */
interface CreateMedicalRecordRequest {
  patientId: string;
  type: string;
  title: string;
  content?: string;
  recordDate?: string;
}

interface CreateMedicalRecordResponse {
  data: MedicalRecord;
}

export const createMedicalRecord = onCall<CreateMedicalRecordRequest, Promise<CreateMedicalRecordResponse>>({ cors: true }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const {
    patientId,
    type,
    title,
    content,
    recordDate,
  } = request.data;

  if (!patientId || !type || !title) {
    throw new HttpsError('invalid-argument', 'patientId, type e title são obrigatórios');
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
    try {
      const realtime = await import('../realtime/publisher');
      await realtime.publishPatientUpdate(patientId, {
        type: 'medical_record_created',
        recordId: result.rows[0].id,
      });
    } catch (e) {
      console.error('Error publishing to Ably:', e);
    }

    return { data: result.rows[0] as MedicalRecord };
  } catch (error: unknown) {
    console.error('Error in createMedicalRecord:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao criar prontuário';
    throw new HttpsError('internal', errorMessage);
  }
});

/**
 * Atualiza um prontuário
 */
interface UpdateMedicalRecordRequest {
  recordId: string;
  title?: string;
  content?: string;
  [key: string]: any;
}

interface UpdateMedicalRecordResponse {
  data: MedicalRecord;
}

export const updateMedicalRecord = onCall<UpdateMedicalRecordRequest, Promise<UpdateMedicalRecordResponse>>({ cors: true }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { recordId, ...updates } = request.data;

  if (!recordId) {
    throw new HttpsError('invalid-argument', 'recordId é obrigatório');
  }

  const pool = getPool();

  try {
    // Verificar se prontuário existe
    const existing = await pool.query(
      'SELECT id FROM medical_records WHERE id = $1 AND organization_id = $2',
      [recordId, auth.organizationId]
    );

    if (existing.rows.length === 0) {
      throw new HttpsError('not-found', 'Prontuário não encontrado');
    }

    // Construir SET dinâmico
    const setClauses: string[] = [];
    const values: (string | number | Date)[] = [];
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

    const result = await pool.query(
      `UPDATE medical_records
       SET ${setClauses.join(', ')}
       WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2}
       RETURNING *`,
      values
    );

    return { data: result.rows[0] as MedicalRecord };
  } catch (error: unknown) {
    console.error('Error in updateMedicalRecord:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar prontuário';
    throw new HttpsError('internal', errorMessage);
  }
});

/**
 * Lista sessões de tratamento de um paciente
 */
interface ListTreatmentSessionsRequest {
  patientId: string;
  limit?: number;
}

interface ListTreatmentSessionsResponse {
  data: TreatmentSession[];
}

export const listTreatmentSessions = onCall<ListTreatmentSessionsRequest, Promise<ListTreatmentSessionsResponse>>({ cors: true }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { patientId, limit = 20 } = request.data;

  if (!patientId) {
    throw new HttpsError('invalid-argument', 'patientId é obrigatório');
  }

  const pool = getPool();

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

    return { data: result.rows as TreatmentSession[] };
  } catch (error: unknown) {
    console.error('Error in listTreatmentSessions:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao listar sessões';
    throw new HttpsError('internal', errorMessage);
  }
});

/**
 * Cria uma nova sessão de tratamento
 */
interface CreateTreatmentSessionRequest {
  patientId: string;
  appointmentId?: string;
  painLevelBefore?: number;
  painLevelAfter?: number;
  observations?: string;
  evolution?: string;
  nextGoals?: string;
}

interface CreateTreatmentSessionResponse {
  data: TreatmentSession;
}

export const createTreatmentSession = onCall<CreateTreatmentSessionRequest, Promise<CreateTreatmentSessionResponse>>({ cors: true }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const {
    patientId,
    appointmentId,
    painLevelBefore,
    painLevelAfter,
    observations,
    evolution,
    nextGoals,
  } = request.data;

  if (!patientId) {
    throw new HttpsError('invalid-argument', 'patientId é obrigatório');
  }

  const pool = getPool();

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
      try {
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
      } catch (e) {
        console.error('Error recording patient progress:', e);
      }
    }

    return { data: result.rows[0] as TreatmentSession };
  } catch (error: unknown) {
    console.error('Error in createTreatmentSession:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao criar sessão';
    throw new HttpsError('internal', errorMessage);
  }
});

/**
 * Atualiza uma sessão de tratamento
 */
interface UpdateTreatmentSessionRequest {
  sessionId: string;
  painLevelBefore?: number;
  painLevelAfter?: number;
  observations?: string;
  evolution?: string;
  nextGoals?: string;
  [key: string]: any;
}

interface UpdateTreatmentSessionResponse {
  data: TreatmentSession;
}

export const updateTreatmentSession = onCall<UpdateTreatmentSessionRequest, Promise<UpdateTreatmentSessionResponse>>({ cors: true }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { sessionId, ...updates } = request.data;

  if (!sessionId) {
    throw new HttpsError('invalid-argument', 'sessionId é obrigatório');
  }

  const pool = getPool();

  try {
    // Verificar se sessão existe
    const existing = await pool.query(
      'SELECT id FROM treatment_sessions WHERE id = $1 AND organization_id = $2',
      [sessionId, auth.organizationId]
    );

    if (existing.rows.length === 0) {
      throw new HttpsError('not-found', 'Sessão não encontrada');
    }

    // Construir SET dinâmico
    const setClauses: string[] = [];
    const values: (string | number | Date)[] = [];
    let paramCount = 0;

    const allowedFields = ['pain_level_before', 'pain_level_after', 'observations', 'evolution', 'next_session_goals'];

    // Map camelCase to snake_case if necessary, but here keys match allowedFields logic except for case if mismatched.
    // However, input keys seem to be camelCase in previous file but allowedFields were snake_case.
    // Let's standardise on expecting camelCase in request but mapping to snake_case db columns.

    const fieldMap: Record<string, string> = {
      painLevelBefore: 'pain_level_before',
      painLevelAfter: 'pain_level_after',
      nextGoals: 'next_session_goals'
    };

    for (const key of Object.keys(updates)) {
      const dbField = fieldMap[key] || key;
      if (allowedFields.includes(dbField)) {
        paramCount++;
        setClauses.push(`${dbField} = $${paramCount}`);
        values.push(updates[key]);
      }
    }

    if (setClauses.length === 0) {
      throw new HttpsError('invalid-argument', 'Nenhum campo válido para atualizar');
    }

    paramCount++;
    setClauses.push(`updated_at = $${paramCount}`);
    values.push(new Date());

    values.push(sessionId, auth.organizationId);

    const result = await pool.query(
      `UPDATE treatment_sessions
       SET ${setClauses.join(', ')}
       WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2}
       RETURNING *`,
      values
    );

    return { data: result.rows[0] as TreatmentSession };
  } catch (error: unknown) {
    console.error('Error in updateTreatmentSession:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar sessão';
    throw new HttpsError('internal', errorMessage);
  }
});

/**
 * Busca registros de dor de um paciente
 */
interface GetPainRecordsRequest {
  patientId: string;
}

interface GetPainRecordsResponse {
  data: PainRecord[];
}

export const getPainRecords = onCall<GetPainRecordsRequest, Promise<GetPainRecordsResponse>>({ cors: true }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  await authorizeRequest(request.auth.token);
  const { patientId } = request.data;

  if (!patientId) {
    throw new HttpsError('invalid-argument', 'patientId é obrigatório');
  }

  const pool = getPool();

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

    return { data: result.rows as PainRecord[] };
  } catch (error: unknown) {
    console.error('Error in getPainRecords:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar registros de dor';
    throw new HttpsError('internal', errorMessage);
  }
});

/**
 * Registra um novo evento de dor
 */
interface SavePainRecordRequest {
  patientId: string;
  level: number;
  type: string;
  bodyPart: string;
  notes?: string;
}

interface SavePainRecordResponse {
  data: PainRecord;
}

export const savePainRecord = onCall<SavePainRecordRequest, Promise<SavePainRecordResponse>>({ cors: true }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { patientId, level, type, bodyPart, notes } = request.data;

  if (!patientId || level === undefined || !type || !bodyPart) {
    throw new HttpsError('invalid-argument', 'patientId, level, type e bodyPart são obrigatórios');
  }

  const pool = getPool();

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

    return { data: result.rows[0] as PainRecord };
  } catch (error: unknown) {
    console.error('Error in savePainRecord:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar registro de dor';
    throw new HttpsError('internal', errorMessage);
  }
});
