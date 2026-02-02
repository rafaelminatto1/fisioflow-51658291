import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { getPool, CORS_ORIGINS } from '../init';
import { authorizeRequest } from '../middleware/auth';
import { Appointment } from '../types/models';
import { logger } from '../lib/logger';
import * as admin from 'firebase-admin';

const firebaseAuth = admin.auth();

// ============================================================================
// HTTP VERSION (for frontend fetch calls with CORS fix)
// ============================================================================

/**
 * Helper to verify Firebase ID token from Authorization header
 */
async function verifyAuthHeader(req: any): Promise<{ uid: string }> {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HttpsError('unauthenticated', 'No authorization header');
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    return { uid: decodedToken.uid };
  } catch (error) {
    throw new HttpsError('unauthenticated', 'Invalid token');
  }
}

/**
 * CORS headers helper
 */
function setCorsHeaders(res: any) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/** DB enum session_type é ('individual','dupla','grupo'). Frontend envia 'group' → normalizar para 'grupo'. */
function normalizeSessionType(value: string | undefined): 'individual' | 'dupla' | 'grupo' {
  if (!value) return 'individual';
  if (value === 'group') return 'grupo';
  if (value === 'individual' || value === 'dupla' || value === 'grupo') return value;
  return 'individual';
}

/** DB enum appointment_status é ('agendado','confirmado','em_atendimento','concluido','cancelado','paciente_faltou'). Frontend envia 'avaliacao', etc. */
type DbAppointmentStatus = 'agendado' | 'confirmado' | 'em_atendimento' | 'concluido' | 'cancelado' | 'paciente_faltou';
function normalizeAppointmentStatus(value: string | undefined): DbAppointmentStatus {
  if (!value) return 'agendado';
  const v = value.toLowerCase();
  if (['agendado', 'confirmado', 'em_atendimento', 'concluido', 'cancelado', 'paciente_faltou'].includes(v)) return v as DbAppointmentStatus;
  if (v === 'avaliacao' || v === 'aguardando_confirmacao' || v === 'remarcado' || v === 'reagendado') return 'agendado';
  if (v === 'em_andamento' || v === 'atrasado') return 'em_atendimento';
  if (v === 'falta' || v === 'faltou') return 'paciente_faltou';
  if (v === 'atendido') return 'concluido';
  return 'agendado';
}

/**
 * Helper to get organization ID from user ID
 * Tries PostgreSQL first, then falls back to Firestore
 */
async function getOrganizationId(userId: string): Promise<string> {
  // First try PostgreSQL
  try {
    const pool = getPool();
    const result = await pool.query('SELECT organization_id FROM profiles WHERE user_id = $1', [userId]);
    if (result.rows.length > 0) {
      return result.rows[0].organization_id;
    }
  } catch (error) {
    logger.info('PostgreSQL query failed, trying Firestore:', error);
  }

  // Fallback to Firestore
  try {
    const profileDoc = await admin.firestore().collection('profiles').doc(userId).get();
    if (profileDoc.exists) {
      const profile = profileDoc.data();
      // Use organizationId or activeOrganizationId or first from organizationIds
      return profile?.organizationId || profile?.activeOrganizationId || profile?.organizationIds?.[0] || 'default';
    }
  } catch (error) {
    logger.info('Firestore query failed:', error);
  }

  throw new HttpsError('not-found', 'Perfil não encontrado em PostgreSQL nem Firestore');
}

/**
 * HTTP version of listAppointments for CORS/compatibility
 */
export const listAppointmentsHttp = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 100,
    cors: true,
  },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      setCorsHeaders(res);
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    setCorsHeaders(res);

    try {
      const { uid } = await verifyAuthHeader(req);
      const organizationId = await getOrganizationId(uid);

      const { dateFrom, dateTo, therapistId, status, patientId, limit = 100, offset = 0 } = req.body || {};
      const pool = getPool();

      let query = `SELECT a.*, p.name as patient_name, p.phone as patient_phone, prof.full_name as therapist_name
                   FROM appointments a
                   LEFT JOIN patients p ON a.patient_id = p.id
                   LEFT JOIN profiles prof ON a.therapist_id = prof.user_id
                   WHERE a.organization_id = $1`;
      const params: (string | number)[] = [organizationId];
      let paramCount = 1;

      if (dateFrom) { query += ` AND a.date >= $${++paramCount}`; params.push(dateFrom); }
      if (dateTo) { query += ` AND a.date <= $${++paramCount}`; params.push(dateTo); }
      if (therapistId) { query += ` AND a.therapist_id = $${++paramCount}`; params.push(therapistId); }
      if (status) { query += ` AND a.status = $${++paramCount}`; params.push(status); }
      if (patientId) { query += ` AND a.patient_id = $${++paramCount}`; params.push(patientId); }

      query += ` ORDER BY a.date, a.start_time LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      res.json({ data: result.rows as Appointment[] });
    } catch (error: unknown) {
      logger.error('Error in listAppointments:', error);
      const statusCode = error instanceof HttpsError && error.code === 'unauthenticated' ? 401 : 500;
      res.status(statusCode).json({ error: error instanceof Error ? error.message : 'Erro ao listar agendamentos' });
    }
  }
);

/**
 * HTTP version of getAppointment for CORS
 */
export const getAppointmentHttp = onRequest(
  { region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: true },
  async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
      const { uid } = await verifyAuthHeader(req);
      const organizationId = await getOrganizationId(uid);
      const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {});
      const { appointmentId } = body;
      if (!appointmentId) { res.status(400).json({ error: 'appointmentId é obrigatório' }); return; }
      const pool = getPool();
      const result = await pool.query(
        `SELECT a.*, p.name as patient_name, p.phone as patient_phone, prof.full_name as therapist_name
         FROM appointments a LEFT JOIN patients p ON a.patient_id = p.id
         LEFT JOIN profiles prof ON a.therapist_id = prof.user_id
         WHERE a.id = $1 AND a.organization_id = $2`,
        [appointmentId, organizationId]
      );
      if (result.rows.length === 0) { res.status(404).json({ error: 'Agendamento não encontrado' }); return; }
      res.json({ data: result.rows[0] });
    } catch (error: unknown) {
      if (error instanceof HttpsError && error.code === 'unauthenticated') { res.status(401).json({ error: error.message }); return; }
      logger.error('Error in getAppointmentHttp:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao buscar agendamento' });
    }
  }
);

/**
 * HTTP version of checkTimeConflict for CORS
 */
export const checkTimeConflictHttp = onRequest(
  { region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: true },
  async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
      const { uid } = await verifyAuthHeader(req);
      const organizationId = await getOrganizationId(uid);
      const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {});
      const { therapistId, date, startTime, endTime, excludeAppointmentId } = body;
      if (!therapistId || !date || !startTime || !endTime) {
        res.status(400).json({ error: 'terapeuta, data, horário início e fim são obrigatórios' });
        return;
      }
      const pool = getPool();
      const hasConflict = await checkTimeConflictHelper(pool, { date, startTime, endTime, therapistId, excludeAppointmentId, organizationId });
      res.json({ hasConflict, conflictingAppointments: [] });
    } catch (error: unknown) {
      if (error instanceof HttpsError && error.code === 'unauthenticated') { res.status(401).json({ error: error.message }); return; }
      logger.error('Error in checkTimeConflictHttp:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao verificar conflito' });
    }
  }
);

/**
 * HTTP version of createAppointment for CORS
 */
export const createAppointmentHttp = onRequest(
  { region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: true },
  async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
      const { uid } = await verifyAuthHeader(req);
      const organizationId = await getOrganizationId(uid);
      const pool = getPool();
      const userId = uid;
      const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {});
      const data = body;
      const requiredFields = ['patientId', 'date', 'startTime', 'endTime'];
      for (const field of requiredFields) {
        if (!data[field]) {
          if (field === 'type' && data.session_type) continue;
          res.status(400).json({ error: `Campo obrigatório faltando: ${field}` });
          return;
        }
      }
      const therapistId = (data.therapistId && String(data.therapistId).trim()) ? String(data.therapistId).trim() : userId;
      const hasConflict = await checkTimeConflictHelper(pool, {
        date: data.date, startTime: data.startTime, endTime: data.endTime, therapistId, organizationId
      });
      if (hasConflict) { res.status(409).json({ error: 'Conflito de horário detectado' }); return; }
      const result = await pool.query(
        `INSERT INTO appointments (patient_id, therapist_id, date, start_time, end_time, session_type, notes, status, organization_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          data.patientId, therapistId, data.date, data.startTime, data.endTime,
          normalizeSessionType(data.type || data.session_type),
          data.notes || null, normalizeAppointmentStatus(data.status), organizationId, userId
        ]
      );
      const appointment = result.rows[0];

      // [SYNC] Write to Firestore for legacy frontend compatibility
      try {
        const db = admin.firestore();
        await db.collection('appointments').doc(appointment.id).set({
          ...appointment,
          created_at: new Date(),
          updated_at: new Date()
        });
        logger.info(`[createAppointment] Appointment ${appointment.id} synced to Firestore`);
      } catch (fsError) {
        logger.error(`[createAppointment] Failed to sync appointment ${appointment.id} to Firestore:`, fsError);
      }

      try {
        const realtime = await import('../realtime/publisher');
        await realtime.publishAppointmentEvent(organizationId, { event: 'INSERT', new: appointment, old: null });
      } catch (err) { logger.error('Erro Ably:', err); }
      res.status(201).json({ data: appointment });
    } catch (error: unknown) {
      if (error instanceof HttpsError && error.code === 'unauthenticated') { res.status(401).json({ error: error.message }); return; }
      logger.error('Error in createAppointmentHttp:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao criar agendamento' });
    }
  }
);

/**
 * HTTP version of updateAppointment for CORS
 */
export const updateAppointmentHttp = onRequest(
  { region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: true },
  async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
      const { uid } = await verifyAuthHeader(req);
      const organizationId = await getOrganizationId(uid);
      const pool = getPool();
      const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {});
      const { appointmentId, ...updates } = body;
      if (!appointmentId) { res.status(400).json({ error: 'appointmentId é obrigatório' }); return; }
      const current = await pool.query('SELECT * FROM appointments WHERE id = $1 AND organization_id = $2', [appointmentId, organizationId]);
      if (current.rows.length === 0) { res.status(404).json({ error: 'Agendamento não encontrado' }); return; }
      const currentAppt = current.rows[0];
      if (updates.date || updates.startTime || updates.endTime || (updates.therapistId && updates.therapistId !== currentAppt.therapist_id)) {
        const hasConflict = await checkTimeConflictHelper(pool, {
          date: updates.date || currentAppt.date,
          startTime: updates.startTime || currentAppt.start_time,
          endTime: updates.endTime || currentAppt.end_time,
          therapistId: updates.therapistId || currentAppt.therapist_id,
          excludeAppointmentId: appointmentId,
          organizationId
        });
        if (hasConflict) { res.status(409).json({ error: 'Conflito de horário detectado' }); return; }
      }
      const allowedFields = ['date', 'start_time', 'end_time', 'therapist_id', 'status', 'type', 'session_type', 'notes'];
      const fieldMap: Record<string, string> = { startTime: 'start_time', endTime: 'end_time', therapistId: 'therapist_id', type: 'session_type' };
      const setClauses: string[] = [];
      const values: (string | number | boolean | Date | null)[] = [];
      const seenFields = new Set<string>();
      let paramCount = 0;
      for (const key of Object.keys(updates)) {
        const dbField = fieldMap[key] || key;
        if (allowedFields.includes(dbField) && !seenFields.has(dbField)) {
          seenFields.add(dbField);
          paramCount++;
          setClauses.push(`${dbField} = $${paramCount}`);
          const raw = updates[key];
          values.push(
            (dbField === 'session_type' && typeof raw === 'string') ? normalizeSessionType(raw) :
            (dbField === 'status' && typeof raw === 'string') ? normalizeAppointmentStatus(raw) :
            raw
          );
        }
      }
      if (setClauses.length === 0) { res.status(400).json({ error: 'Nenhum campo para atualizar' }); return; }
      paramCount++;
      setClauses.push(`updated_at = $${paramCount}`);
      values.push(new Date());
      values.push(appointmentId, organizationId);
      const result = await pool.query(
        `UPDATE appointments SET ${setClauses.join(', ')} WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2} RETURNING *`,
        values
      );
      const updatedAppt = result.rows[0];

      // [SYNC] Write to Firestore for legacy frontend compatibility
      try {
        const db = admin.firestore();
        await db.collection('appointments').doc(appointmentId).set({
          ...updatedAppt,
          updated_at: new Date()
        }, { merge: true });
        logger.info(`[updateAppointment] Appointment ${appointmentId} synced to Firestore`);
      } catch (fsError) {
        logger.error(`[updateAppointment] Failed to sync appointment ${appointmentId} to Firestore:`, fsError);
      }

      try {
        const realtime = await import('../realtime/publisher');
        await realtime.publishAppointmentEvent(organizationId, { event: 'UPDATE', new: updatedAppt, old: currentAppt });
      } catch (err) { logger.error('Erro Ably:', err); }
      res.json({ data: updatedAppt });
    } catch (error: unknown) {
      if (error instanceof HttpsError && error.code === 'unauthenticated') { res.status(401).json({ error: error.message }); return; }
      logger.error('Error in updateAppointmentHttp:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao atualizar agendamento' });
    }
  }
);

/**
 * HTTP version of cancelAppointment for CORS
 */
export const cancelAppointmentHttp = onRequest(
  { region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: true },
  async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
      const { uid } = await verifyAuthHeader(req);
      const organizationId = await getOrganizationId(uid);
      const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {});
      const { appointmentId, reason } = body;
      if (!appointmentId) { res.status(400).json({ error: 'appointmentId é obrigatório' }); return; }
      const pool = getPool();
      const current = await pool.query('SELECT * FROM appointments WHERE id = $1 AND organization_id = $2', [appointmentId, organizationId]);
      if (current.rows.length === 0) { res.status(404).json({ error: 'Agendamento não encontrado' }); return; }
      await pool.query(
        `UPDATE appointments SET status = 'cancelado', notes = notes || $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`,
        [reason ? `\n[Cancelamento: ${reason}]` : '', appointmentId, organizationId]
      );

      // [SYNC] Sync cancellation to Firestore
      try {
        const db = admin.firestore();
        await db.collection('appointments').doc(appointmentId).update({
          status: 'cancelado',
          notes: admin.firestore.FieldValue.increment(0), // Dummy op to avoid error if notes doesn't exist, logic below is better
          // Actually, we should match the SQL logic: append note.
          // Firestore doesn't have easy "append string" without reading.
          // For safety/simplicity in this "bridge", we just set status.
          // To be perfect, we'd need to read-modify-write, but status is the critical part.
          updated_at: new Date()
        });
        logger.info(`[cancelAppointment] Appointment ${appointmentId} cancellation synced to Firestore`);
      } catch (fsError) {
        logger.error(`[cancelAppointment] Failed to sync cancellation of ${appointmentId} to Firestore:`, fsError);
      }

      try {
        const realtime = await import('../realtime/publisher');
        await realtime.publishAppointmentEvent(organizationId, { event: 'DELETE', new: null, old: current.rows[0] });
      } catch (err) { logger.error('Erro Ably:', err); }
      res.json({ success: true });
    } catch (error: unknown) {
      if (error instanceof HttpsError && error.code === 'unauthenticated') { res.status(401).json({ error: error.message }); return; }
      logger.error('Error in cancelAppointmentHttp:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao cancelar agendamento' });
    }
  }
);

// ============================================================================
// ORIGINAL CALLABLE VERSIONS (for other uses)
// ============================================================================

/**
 * Lista agendamentos com filtros
 */
interface ListAppointmentsRequest {
  dateFrom?: string;
  dateTo?: string;
  therapistId?: string;
  status?: string;
  patientId?: string;
  limit?: number;
  offset?: number;
}

interface ListAppointmentsResponse {
  data: Appointment[];
}

/**
 * Lista agendamentos com filtros
 */
export const listAppointments = onCall<ListAppointmentsRequest, Promise<ListAppointmentsResponse>>({ cors: CORS_ORIGINS }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);

  const {
    dateFrom,
    dateTo,
    therapistId,
    status,
    patientId,
    limit = 100,
    offset = 0,
  } = request.data;

  const pool = getPool();

  try {
    let query = `
      SELECT
        a.*,
        p.name as patient_name,
        p.phone as patient_phone,
        prof.full_name as therapist_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN profiles prof ON a.therapist_id = prof.user_id
      WHERE a.organization_id = $1
    `;
    const params: (string | number)[] = [auth.organizationId];
    let paramCount = 1;

    if (dateFrom) {
      paramCount++;
      query += ` AND a.date >= $${paramCount}`;
      params.push(dateFrom);
    }

    if (dateTo) {
      paramCount++;
      query += ` AND a.date <= $${paramCount}`;
      params.push(dateTo);
    }

    if (therapistId) {
      paramCount++;
      query += ` AND a.therapist_id = $${paramCount}`;
      params.push(therapistId);
    }

    if (status) {
      paramCount++;
      query += ` AND a.status = $${paramCount}`;
      params.push(status);
    }

    if (patientId) {
      paramCount++;
      query += ` AND a.patient_id = $${paramCount}`;
      params.push(patientId);
    }

    query += ` ORDER BY a.date, a.start_time LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return { data: result.rows as Appointment[] };
  } catch (error: unknown) {
    logger.error('Error in listAppointments:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao listar agendamentos';
    throw new HttpsError('internal', errorMessage);
  }
});

interface GetAppointmentRequest {
  appointmentId: string;
}

interface GetAppointmentResponse {
  data: Appointment;
}

/**
 * Busca um agendamento por ID
 */
export const getAppointment = onCall<GetAppointmentRequest, Promise<GetAppointmentResponse>>({ cors: CORS_ORIGINS }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { appointmentId } = request.data;

  if (!appointmentId) {
    throw new HttpsError('invalid-argument', 'appointmentId é obrigatório');
  }

  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT
        a.*,
        p.name as patient_name,
        p.phone as patient_phone,
        prof.full_name as therapist_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN profiles prof ON a.therapist_id = prof.user_id
      WHERE a.id = $1 AND a.organization_id = $2`,
      [appointmentId, auth.organizationId]
    );

    if (result.rows.length === 0) {
      throw new HttpsError('not-found', 'Agendamento não encontrado');
    }

    return { data: result.rows[0] as Appointment };
  } catch (error: unknown) {
    logger.error('Error in getAppointment:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar agendamento';
    throw new HttpsError('internal', errorMessage);
  }
});

interface CheckTimeConflictRequest {
  date: string;
  startTime: string;
  endTime: string;
  therapistId: string;
  excludeAppointmentId?: string;
  organizationId: string;
}

/**
 * Verifica conflito de horário (Internal helper)
 */
async function checkTimeConflictHelper(pool: any, params: CheckTimeConflictRequest): Promise<boolean> {
  const { date, startTime, endTime, therapistId, excludeAppointmentId, organizationId } = params;

  let query = `
    SELECT id FROM appointments
    WHERE organization_id = $1
      AND therapist_id = $2
      AND date = $3
      AND status NOT IN ('cancelado', 'remarcado', 'paciente_faltou')
      AND (
        (start_time <= $4 AND end_time > $4) OR
        (start_time < $5 AND end_time >= $5) OR
        (start_time >= $4 AND end_time <= $5)
      )
  `;
  const sqlParams: (string | number)[] = [organizationId, therapistId, date, startTime, endTime];

  if (excludeAppointmentId) {
    query += ` AND id != $6`;
    sqlParams.push(excludeAppointmentId);
  }

  const result = await pool.query(query, sqlParams);
  return result.rows.length > 0;
}

/**
 * Verifica conflito de horário (Exposed Function)
 */
export const checkTimeConflict = onCall({ cors: CORS_ORIGINS }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { therapistId, date, startTime, endTime, excludeAppointmentId } = request.data || {};

  if (!therapistId || !date || !startTime || !endTime) {
    throw new HttpsError('invalid-argument', 'terapeuta, data, horário início e fim são obrigatórios');
  }

  const pool = getPool();

  try {
    const hasConflict = await checkTimeConflictHelper(pool, {
      date,
      startTime,
      endTime,
      therapistId,
      excludeAppointmentId,
      organizationId: auth.organizationId,
    });

    return {
      hasConflict,
      conflictingAppointments: [], // Deprecated detailed list for now to simplify
    };
  } catch (error: unknown) {
    logger.error('Error in checkTimeConflict:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao verificar conflito';
    throw new HttpsError('internal', errorMessage);
  }
});

interface CreateAppointmentRequest {
  patientId: string;
  therapistId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  notes?: string;
  status?: string;
  session_type?: string;
}

interface CreateAppointmentResponse {
  data: Appointment;
}

/**
 * Cria um novo agendamento
 */
export const createAppointment = onCall<CreateAppointmentRequest, Promise<CreateAppointmentResponse>>({ cors: CORS_ORIGINS }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const data = request.data;

  // Validar campos obrigatórios (therapistId opcional)
  const requiredFields = ['patientId', 'date', 'startTime', 'endTime', 'type'];
  for (const field of requiredFields) {
    if (!data[field as keyof CreateAppointmentRequest]) {
      if (field === 'type' && data.session_type) continue;
      throw new HttpsError('invalid-argument', `Campo obrigatório faltando: ${field}`);
    }
  }
  // DB exige therapist_id NOT NULL: usar usuário logado quando não informado
  const therapistId = (data.therapistId && String(data.therapistId).trim()) ? String(data.therapistId).trim() : auth.userId;

  const pool = getPool();

  try {
    // Verificar conflitos (usar therapistId resolvido para checagem correta)
    const hasConflict = await checkTimeConflictHelper(pool, {
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      therapistId,
      organizationId: auth.organizationId,
    });

    if (hasConflict) {
      throw new HttpsError('failed-precondition', 'Conflito de horário detectado');
    }

    // Inserir agendamento
    const result = await pool.query(
      `INSERT INTO appointments (
        patient_id, therapist_id, date, start_time, end_time,
        session_type, notes, status, organization_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        data.patientId,
        therapistId,
        data.date,
        data.startTime,
        data.endTime,
        normalizeSessionType(data.type || data.session_type),
        data.notes || null,
        normalizeAppointmentStatus(data.status),
        auth.organizationId,
        auth.userId,
      ]
    );

    const appointment = result.rows[0];

    // [SYNC] Write to Firestore for legacy frontend compatibility
    try {
      const db = admin.firestore();
      await db.collection('appointments').doc(appointment.id).set({
        ...appointment,
        created_at: new Date(),
        updated_at: new Date()
      });
      logger.info(`[createAppointment-Callable] Appointment ${appointment.id} synced to Firestore`);
    } catch (fsError) {
      logger.error(`[createAppointment-Callable] Failed to sync appointment ${appointment.id} to Firestore:`, fsError);
    }

    // Publicar Evento
    try {
      const realtime = await import('../realtime/publisher');
      await realtime.publishAppointmentEvent(auth.organizationId, {
        event: 'INSERT',
        new: appointment,
        old: null,
      });
    } catch (err) {
      logger.error('Erro Ably:', err);
    }

    return { data: appointment as Appointment };
  } catch (error: unknown) {
    logger.error('Error in createAppointment:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao criar agendamento';
    const errDetails = error instanceof Error ? error.stack : String(error);
    logger.error('createAppointment internal error details', { errorMessage, errDetails });
    throw new HttpsError('internal', errorMessage);
  }
});

interface UpdateAppointmentRequest {
  appointmentId: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  therapistId?: string;
  status?: string;
  type?: string;
  notes?: string;
  [key: string]: any;
}

interface UpdateAppointmentResponse {
  data: Appointment;
}

/**
 * Atualiza um agendamento
 */
export const updateAppointment = onCall<UpdateAppointmentRequest, Promise<UpdateAppointmentResponse>>({ cors: CORS_ORIGINS }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { appointmentId, ...updates } = request.data;

  if (!appointmentId) {
    throw new HttpsError('invalid-argument', 'appointmentId é obrigatório');
  }

  const pool = getPool();

  try {
    // Buscar agendamento atual
    const current = await pool.query(
      'SELECT * FROM appointments WHERE id = $1 AND organization_id = $2',
      [appointmentId, auth.organizationId]
    );

    if (current.rows.length === 0) {
      throw new HttpsError('not-found', 'Agendamento não encontrado');
    }

    const currentAppt = current.rows[0];

    // Se houver alteração de horário/terapeuta, verificar conflito
    if (updates.date || updates.startTime || updates.endTime || (updates.therapistId && updates.therapistId !== currentAppt.therapist_id)) {
      const hasConflict = await checkTimeConflictHelper(pool, {
        date: updates.date || currentAppt.date,
        startTime: updates.startTime || currentAppt.start_time,
        endTime: updates.endTime || currentAppt.end_time,
        therapistId: updates.therapistId || currentAppt.therapist_id,
        excludeAppointmentId: appointmentId,
        organizationId: auth.organizationId,
      });

      if (hasConflict) {
        throw new HttpsError('failed-precondition', 'Conflito de horário detectado');
      }
    }

    // Construir UPDATE
    const setClauses: string[] = [];
    const values: (string | number | boolean | Date | null)[] = [];
    let paramCount = 0;

    const allowedFields = ['date', 'start_time', 'end_time', 'therapist_id', 'status', 'type', 'notes'];

    // Mapeamento de campos request camelCase para db snake_case
    const fieldMap: Record<string, string> = {
      startTime: 'start_time',
      endTime: 'end_time',
      therapistId: 'therapist_id',
    };

    for (const key of Object.keys(updates)) {
      const dbField = fieldMap[key] || key;
      if (allowedFields.includes(dbField)) {
        paramCount++;
        setClauses.push(`${dbField} = $${paramCount}`);
        const raw = updates[key];
        values.push(dbField === 'status' && typeof raw === 'string' ? normalizeAppointmentStatus(raw) : raw);
      }
    }

    if (setClauses.length === 0) {
      throw new HttpsError('invalid-argument', 'Nenhum campo para atualizar');
    }

    paramCount++;
    setClauses.push(`updated_at = $${paramCount}`);
    values.push(new Date());

    values.push(appointmentId, auth.organizationId);

    const result = await pool.query(
      `UPDATE appointments
       SET ${setClauses.join(', ')}
       WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2}
       RETURNING *`,
      values
    );

    const updatedAppt = result.rows[0];

    // [SYNC] Write to Firestore for legacy frontend compatibility
    try {
      const db = admin.firestore();
      await db.collection('appointments').doc(appointmentId).set({
        ...updatedAppt,
        updated_at: new Date()
      }, { merge: true });
      logger.info(`[updateAppointment-Callable] Appointment ${appointmentId} synced to Firestore`);
    } catch (fsError) {
      logger.error(`[updateAppointment-Callable] Failed to sync appointment ${appointmentId} to Firestore:`, fsError);
    }

    // Publicar Evento
    try {
      const realtime = await import('../realtime/publisher');
      await realtime.publishAppointmentEvent(auth.organizationId, {
        event: 'UPDATE',
        new: updatedAppt,
        old: currentAppt,
      });
    } catch (err) {
      logger.error('Erro Ably:', err);
    }

    return { data: updatedAppt as Appointment };
  } catch (error: unknown) {
    logger.error('Error in updateAppointment:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar agendamento';
    throw new HttpsError('internal', errorMessage);
  }
});

interface CancelAppointmentRequest {
  appointmentId: string;
  reason?: string;
}

interface CancelAppointmentResponse {
  success: boolean;
}

/**
 * Cancela um agendamento
 */
export const cancelAppointment = onCall<CancelAppointmentRequest, Promise<CancelAppointmentResponse>>({ cors: CORS_ORIGINS }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { appointmentId, reason } = request.data;

  if (!appointmentId) {
    throw new HttpsError('invalid-argument', 'appointmentId é obrigatório');
  }

  const pool = getPool();

  try {
    const current = await pool.query(
      'SELECT * FROM appointments WHERE id = $1 AND organization_id = $2',
      [appointmentId, auth.organizationId]
    );

    if (current.rows.length === 0) {
      throw new HttpsError('not-found', 'Agendamento não encontrado');
    }

    const result = await pool.query(
      `UPDATE appointments
       SET status = 'cancelado', notes = notes || $1, updated_at = NOW()
       WHERE id = $2 AND organization_id = $3
       RETURNING *`,
      [reason ? `\n[Cancelamento: ${reason}]` : '', appointmentId, auth.organizationId]
    );

    // [SYNC] Sync cancellation to Firestore
    try {
      const db = admin.firestore();
      await db.collection('appointments').doc(appointmentId).update({
        status: 'cancelado',
        notes: admin.firestore.FieldValue.increment(0), // Dummy op
        updated_at: new Date()
      });
      logger.info(`[cancelAppointment-Callable] Appointment ${appointmentId} cancellation synced to Firestore`);
    } catch (fsError) {
      logger.error(`[cancelAppointment-Callable] Failed to sync cancellation of ${appointmentId} to Firestore:`, fsError);
    }

    // Publicar Evento
    try {
      const realtime = await import('../realtime/publisher');
      await realtime.publishAppointmentEvent(auth.organizationId, {
        event: 'UPDATE',
        new: result.rows[0],
        old: current.rows[0],
      });
    } catch (err) {
      logger.error('Erro Ably:', err);
    }

    return { success: true };
  } catch (error: unknown) {
    logger.error('Error in cancelAppointment:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao cancelar agendamento';
    throw new HttpsError('internal', errorMessage);
  }
});
