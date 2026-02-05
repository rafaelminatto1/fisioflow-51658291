import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { getPool, CORS_ORIGINS } from '../init';
import { authorizeRequest, extractBearerToken } from '../middleware/auth';
import { MedicalRecord, TreatmentSession, PainRecord } from '../types/models';
import { logger } from '../lib/logger';
import { setCorsHeaders } from '../lib/cors';

function parseBody(req: any): any { return typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {}); }
function getAuthHeader(req: any): string | undefined { const h = req.headers?.authorization || req.headers?.Authorization; return Array.isArray(h) ? h[0] : h; }
const httpOpts = { region: 'southamerica-east1' as const, memory: '512MiB' as const, maxInstances: 10, cors: CORS_ORIGINS, invoker: 'public' as const };

export const getPatientRecordsHttp = onRequest(httpOpts, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { setCorsHeaders(res); res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    const { patientId, type, limit = 50 } = parseBody(req);
    if (!patientId) { res.status(400).json({ error: 'patientId é obrigatório' }); return; }
    const pool = getPool();
    const patientQuery = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
    if (patientQuery.rows.length === 0) { res.status(404).json({ error: 'Paciente não encontrado' }); return; }
    let query = `SELECT mr.*, p.full_name as created_by_name FROM medical_records mr LEFT JOIN profiles p ON mr.created_by = p.user_id WHERE mr.patient_id = $1 AND mr.organization_id = $2`;
    const params: (string | number)[] = [patientId, auth.organizationId];
    if (type) { query += ` AND mr.type = $3`; params.push(type); }
    query += ` ORDER BY mr.record_date DESC, mr.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (e: unknown) {
    setCorsHeaders(res);
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('getPatientRecordsHttp:', e); res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

export const createMedicalRecordHttp = onRequest(httpOpts, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    const { patientId, type, title, content, recordDate } = parseBody(req);
    if (!patientId || !type || !title) { res.status(400).json({ error: 'patientId, type e title são obrigatórios' }); return; }
    const pool = getPool();
    const patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
    if (patientCheck.rows.length === 0) { res.status(404).json({ error: 'Paciente não encontrado' }); return; }
    const result = await pool.query(`INSERT INTO medical_records (patient_id, created_by, organization_id, type, title, content, record_date) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [patientId, auth.userId, auth.organizationId, type, title, content || '', recordDate || new Date().toISOString().split('T')[0]]);
    try { const realtime = await import('../realtime/publisher'); await realtime.publishPatientUpdate(patientId, { type: 'medical_record_created', recordId: result.rows[0].id }); } catch (er) { logger.error('Ably:', er); }
    res.status(201).json({ data: result.rows[0] });
  } catch (e: unknown) {
    setCorsHeaders(res);
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('createMedicalRecordHttp:', e); res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

export const updateMedicalRecordHttp = onRequest(httpOpts, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    const { recordId, ...updates } = parseBody(req);
    if (!recordId) { res.status(400).json({ error: 'recordId é obrigatório' }); return; }
    const pool = getPool();
    const existing = await pool.query('SELECT id FROM medical_records WHERE id = $1 AND organization_id = $2', [recordId, auth.organizationId]);
    if (existing.rows.length === 0) { res.status(404).json({ error: 'Prontuário não encontrado' }); return; }
    const setClauses: string[] = []; const values: any[] = []; let pc = 0;
    for (const f of ['title', 'content']) { if (f in updates) { pc++; setClauses.push(`${f} = $${pc}`); values.push(updates[f]); } }
    if (setClauses.length === 0) { res.status(400).json({ error: 'Nenhum campo válido para atualizar' }); return; }
    pc++; setClauses.push(`updated_at = $${pc}`); values.push(new Date()); values.push(recordId, auth.organizationId);
    const result = await pool.query(`UPDATE medical_records SET ${setClauses.join(', ')} WHERE id = $${pc + 1} AND organization_id = $${pc + 2} RETURNING *`, values);
    res.json({ data: result.rows[0] });
  } catch (e: unknown) {
    setCorsHeaders(res);
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('updateMedicalRecordHttp:', e); res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

export const deleteMedicalRecordHttp = onRequest(httpOpts, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    const { recordId } = parseBody(req);
    if (!recordId) { res.status(400).json({ error: 'recordId é obrigatório' }); return; }
    const result = await getPool().query('DELETE FROM medical_records WHERE id = $1 AND organization_id = $2 RETURNING id', [recordId, auth.organizationId]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Prontuário não encontrado' }); return; }
    res.json({ success: true });
  } catch (e: unknown) {
    setCorsHeaders(res);
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('deleteMedicalRecordHttp:', e); res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

export const listTreatmentSessionsHttp = onRequest(httpOpts, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    const { patientId, limit = 20 } = parseBody(req);
    if (!patientId) { res.status(400).json({ error: 'patientId é obrigatório' }); return; }
    const result = await getPool().query(`SELECT ts.*, p.name as patient_name, prof.full_name as therapist_name, a.date as appointment_date FROM treatment_sessions ts LEFT JOIN patients p ON ts.patient_id=p.id LEFT JOIN profiles prof ON ts.therapist_id=prof.user_id LEFT JOIN appointments a ON ts.appointment_id=a.id WHERE ts.patient_id=$1 AND ts.organization_id=$2 ORDER BY ts.session_date DESC, ts.created_at DESC LIMIT $3`, [patientId, auth.organizationId, limit]);
    res.json({ data: result.rows });
  } catch (e: unknown) {
    setCorsHeaders(res);
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('listTreatmentSessionsHttp:', e); res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

export const createTreatmentSessionHttp = onRequest(httpOpts, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    const { patientId, appointmentId, painLevelBefore, painLevelAfter, observations, evolution, nextGoals } = parseBody(req);
    if (!patientId) { res.status(400).json({ error: 'patientId é obrigatório' }); return; }
    const pool = getPool();
    let appointmentDate = null; let therapistId = auth.userId;
    if (appointmentId) {
      const apt = await pool.query('SELECT date, therapist_id FROM appointments WHERE id = $1 AND organization_id = $2', [appointmentId, auth.organizationId]);
      if (apt.rows.length > 0) { appointmentDate = apt.rows[0].date; therapistId = apt.rows[0].therapist_id; }
    }
    const result = await pool.query(`INSERT INTO treatment_sessions (patient_id, therapist_id, appointment_id, organization_id, pain_level_before, pain_level_after, observations, evolution, next_session_goals, session_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [patientId, therapistId, appointmentId || null, auth.organizationId, painLevelBefore || null, painLevelAfter || null, observations || null, evolution || null, nextGoals || null, appointmentDate || new Date().toISOString().split('T')[0]]);
    res.status(201).json({ data: result.rows[0] });
  } catch (e: unknown) {
    setCorsHeaders(res);
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('createTreatmentSessionHttp:', e); res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

export const getPainRecordsHttp = onRequest(httpOpts, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    const { patientId } = parseBody(req);
    if (!patientId) { res.status(400).json({ error: 'patientId é obrigatório' }); return; }
    const pool = getPool();
    const patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
    if (patientCheck.rows.length === 0) { res.status(404).json({ error: 'Paciente não encontrado' }); return; }
    const result = await pool.query('SELECT * FROM pain_records WHERE patient_id = $1 AND organization_id = $2 ORDER BY record_date DESC', [patientId, auth.organizationId]);
    res.json({ data: result.rows });
  } catch (e: unknown) {
    setCorsHeaders(res);
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('getPainRecordsHttp:', e); res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

export const savePainRecordHttp = onRequest(httpOpts, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    const { patientId, painLevel, recordDate, notes } = parseBody(req);
    if (!patientId || painLevel === undefined) { res.status(400).json({ error: 'patientId e painLevel são obrigatórios' }); return; }
    const pool = getPool();
    const patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
    if (patientCheck.rows.length === 0) { res.status(404).json({ error: 'Paciente não encontrado' }); return; }
    const result = await pool.query('INSERT INTO pain_records (patient_id, organization_id, pain_level, record_date, notes, recorded_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [patientId, auth.organizationId, painLevel, recordDate || new Date().toISOString().split('T')[0], notes || null, auth.userId]);
    res.status(201).json({ data: result.rows[0] });
  } catch (e: unknown) {
    setCorsHeaders(res);
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('savePainRecordHttp:', e); res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

// ============================================================================
// CALLABLE
// ============================================================================

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

/**
 * Busca prontuários de um paciente
 */
export const getPatientRecordsHandler = async (request: any) => {
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
    logger.error('Error in getPatientRecords:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar prontuários';
    throw new HttpsError('internal', errorMessage);
  }
};

export const getPatientRecords = onCall<GetPatientRecordsRequest, Promise<GetPatientRecordsResponse>>(
  { cors: CORS_ORIGINS },
  getPatientRecordsHandler
);

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

/**
 * Cria um novo prontuário
 */
export const createMedicalRecordHandler = async (request: any) => {
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
      logger.error('Error publishing to Ably:', e);
    }

    return { data: result.rows[0] as MedicalRecord };
  } catch (error: unknown) {
    logger.error('Error in createMedicalRecord:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao criar prontuário';
    throw new HttpsError('internal', errorMessage);
  }
};

export const createMedicalRecord = onCall<CreateMedicalRecordRequest, Promise<CreateMedicalRecordResponse>>(
  { cors: CORS_ORIGINS },
  createMedicalRecordHandler
);

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

/**
 * Atualiza um prontuário
 */
export const updateMedicalRecordHandler = async (request: any) => {
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
    logger.error('Error in updateMedicalRecord:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar prontuário';
    throw new HttpsError('internal', errorMessage);
  }
};

export const updateMedicalRecord = onCall<UpdateMedicalRecordRequest, Promise<UpdateMedicalRecordResponse>>(
  { cors: CORS_ORIGINS },
  updateMedicalRecordHandler
);

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

/**
 * Lista sessões de tratamento de um paciente
 */
export const listTreatmentSessionsHandler = async (request: any) => {
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
    logger.error('Error in listTreatmentSessions:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao listar sessões';
    throw new HttpsError('internal', errorMessage);
  }
};

export const listTreatmentSessions = onCall<ListTreatmentSessionsRequest, Promise<ListTreatmentSessionsResponse>>(
  { cors: CORS_ORIGINS },
  listTreatmentSessionsHandler
);

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

/**
 * Cria uma nova sessão de tratamento
 */
export const createTreatmentSessionHandler = async (request: any) => {
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
        logger.error('Error recording patient progress:', e);
      }
    }

    return { data: result.rows[0] as TreatmentSession };
  } catch (error: unknown) {
    logger.error('Error in createTreatmentSession:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao criar sessão';
    throw new HttpsError('internal', errorMessage);
  }
};

export const createTreatmentSession = onCall<CreateTreatmentSessionRequest, Promise<CreateTreatmentSessionResponse>>(
  { cors: CORS_ORIGINS },
  createTreatmentSessionHandler
);

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

/**
 * Atualiza uma sessão de tratamento
 */
export const updateTreatmentSessionHandler = async (request: any) => {
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
    const values: (string | number | Date | null)[] = [];
    let paramCount = 0;

    const allowedFields = ['pain_level_before', 'pain_level_after', 'observations', 'evolution', 'next_session_goals'];

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
    logger.error('Error in updateTreatmentSession:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar sessão';
    throw new HttpsError('internal', errorMessage);
  }
};

export const updateTreatmentSession = onCall<UpdateTreatmentSessionRequest, Promise<UpdateTreatmentSessionResponse>>(
  { cors: CORS_ORIGINS },
  updateTreatmentSessionHandler
);

/**
 * Busca registros de dor de um paciente
 */
interface GetPainRecordsRequest {
  patientId: string;
}

interface GetPainRecordsResponse {
  data: PainRecord[];
}

/**
 * Busca registros de dor de um paciente
 */
export const getPainRecordsHandler = async (request: any) => {
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
    logger.error('Error in getPainRecords:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar registros de dor';
    throw new HttpsError('internal', errorMessage);
  }
};

export const getPainRecords = onCall<GetPainRecordsRequest, Promise<GetPainRecordsResponse>>(
  { cors: CORS_ORIGINS },
  getPainRecordsHandler
);

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

/**
 * Registra um novo evento de dor
 */
export const savePainRecordHandler = async (request: any) => {
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
    logger.error('Error in savePainRecord:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar registro de dor';
    throw new HttpsError('internal', errorMessage);
  }
};

export const savePainRecord = onCall<SavePainRecordRequest, Promise<SavePainRecordResponse>>(
  { cors: CORS_ORIGINS },
  savePainRecordHandler
);
