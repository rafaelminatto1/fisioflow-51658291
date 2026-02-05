import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { getPool, CORS_ORIGINS } from '../init';
import { authorizeRequest } from '../middleware/auth';
import { Appointment } from '../types/models';
import { logger } from '../lib/logger';
import * as admin from 'firebase-admin';
import { rtdb } from '../lib/rtdb';
import { setCorsHeaders } from '../lib/cors';

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


/** DB enum session_type é ('individual','dupla','grupo'). Frontend envia 'group' → normalizar para 'grupo'. */
function normalizeSessionType(value: string | undefined): 'individual' | 'dupla' | 'grupo' {
  if (!value) return 'individual';
  if (value === 'group') return 'grupo';
  if (value === 'individual' || value === 'dupla' || value === 'grupo') return value;
  return 'individual';
}

/** DB enum appointment_status é ('agendado','confirmado','em_atendimento','concluido','cancelado','paciente_faltou'). Frontend envia 'avaliacao', 'realizado', etc. */
type DbAppointmentStatus = 'agendado' | 'confirmado' | 'em_atendimento' | 'concluido' | 'cancelado' | 'paciente_faltou';
function normalizeAppointmentStatus(value: string | undefined): DbAppointmentStatus {
  if (!value) return 'agendado';
  const v = value.toLowerCase();
  if (['agendado', 'confirmado', 'em_atendimento', 'concluido', 'cancelado', 'paciente_faltou'].includes(v)) return v as DbAppointmentStatus;
  if (v === 'avaliacao' || v === 'aguardando_confirmacao' || v === 'remarcado' || v === 'reagendado' || v === 'em_espera') return 'agendado';
  if (v === 'em_andamento' || v === 'atrasado') return 'em_atendimento';
  if (v === 'falta' || v === 'faltou') return 'paciente_faltou';
  if (v === 'atendido' || v === 'realizado') return 'concluido';
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
    maxInstances: 10,
    cors: CORS_ORIGINS,
    invoker: 'public',
  },
  async (req, res) => {
    setCorsHeaders(res, req);
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

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
  { region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: CORS_ORIGINS, invoker: 'public' },
  async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res, req); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res, req);
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
  { region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: CORS_ORIGINS, invoker: 'public' },
  async (req, res) => {
    setCorsHeaders(res, req);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
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
  { region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: CORS_ORIGINS, invoker: 'public' },
  async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res, req); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res, req);
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
      // Fisioterapeuta opcional: quando não informado, usa o usuário logado como responsável
      const therapistIdRaw = (data.therapistId != null && data.therapistId !== '') ? String(data.therapistId).trim() : '';
      const therapistId = therapistIdRaw || userId;
      // Conflito por capacidade do slot (0/4 = livre), não por terapeuta
      const hasConflict = await checkTimeConflictByCapacity(pool, {
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        organizationId
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
        logger.info(`[createAppointmentHttp] Appointment ${appointment.id} synced to Firestore`);
      } catch (fsError) {
        logger.error(`[createAppointmentHttp] Failed to sync appointment ${appointment.id} to Firestore:`, fsError);
      }

      try {
        const realtime = await import('../realtime/publisher');
        // Usar RTDB em paralelo com Ably (migração gradual)
        await Promise.allSettled([
          realtime.publishAppointmentEvent(organizationId, { event: 'INSERT', new: appointment as any, old: null }),
          rtdb.refreshAppointments(organizationId)
        ]);
      } catch (err) { logger.error('Erro Realtime:', err); }
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
  { region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: CORS_ORIGINS, invoker: 'public' },
  async (req, res) => {
    setCorsHeaders(res, req);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
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
      const newDate = updates.date ?? updates.appointment_date ?? currentAppt.date;
      const newStartTime = updates.startTime ?? updates.start_time ?? updates.appointment_time ?? currentAppt.start_time;
      let newEndTime = updates.endTime ?? updates.end_time ?? currentAppt.end_time;

      // Se o horário de início mudou mas o de fim não foi enviado explicitamente,
      // ajustamos o fim para manter a duração original. Isso evita violação de valid_end_time.
      if ((updates.startTime || updates.start_time || updates.appointment_time) && !updates.endTime && !updates.end_time) {
        const parseToMin = (t: string) => {
          if (!t) return 0;
          const [h, m] = t.split(':').map(Number);
          return h * 60 + (m || 0);
        };
        const minToStr = (m: number) => {
          const hh = Math.floor(m / 60).toString().padStart(2, '0');
          const mm = (m % 60).toString().padStart(2, '0');
          return `${hh}:${mm}`;
        };
        const duration = parseToMin(String(currentAppt.end_time)) - parseToMin(String(currentAppt.start_time));
        if (duration > 0) {
          newEndTime = minToStr(parseToMin(newStartTime) + duration);
          updates.end_time = newEndTime;
        }
      }

      const runConflictCheck = (updates.date || updates.appointment_date || updates.startTime || updates.start_time || updates.appointment_time || updates.endTime || updates.end_time) || (updates.therapistId && updates.therapistId !== currentAppt.therapist_id);
      if (runConflictCheck) {
        const hasConflict = await checkTimeConflictByCapacity(pool, {
          date: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
          excludeAppointmentId: appointmentId,
          organizationId
        });
        if (hasConflict) { res.status(409).json({ error: 'Conflito de horário detectado' }); return; }
      }
      const allowedFields = ['date', 'start_time', 'end_time', 'therapist_id', 'status', 'type', 'session_type', 'notes'];
      const fieldMap: Record<string, string> = { startTime: 'start_time', endTime: 'end_time', therapistId: 'therapist_id', type: 'session_type', appointment_date: 'date', appointment_time: 'start_time' };
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

      if (!updatedAppt) {
        logger.error(`[updateAppointmentHttp] UPDATE did not return row for appointmentId=${appointmentId}`);
        res.status(500).json({ error: 'Atualização não retornou o agendamento. Tente novamente.' });
        return;
      }

      // [SYNC] Write to Firestore for legacy frontend compatibility
      try {
        const db = admin.firestore();
        const safeDoc: Record<string, unknown> = { ...updatedAppt, updated_at: new Date() };
        await db.collection('appointments').doc(appointmentId).set(safeDoc, { merge: true });
        logger.info(`[updateAppointmentHttp] Appointment ${appointmentId} synced to Firestore`);
      } catch (fsError) {
        logger.error(`[updateAppointmentHttp] Failed to sync appointment ${appointmentId} to Firestore:`, fsError);
      }

      try {
        const realtime = await import('../realtime/publisher');
        await Promise.allSettled([
          realtime.publishAppointmentEvent(organizationId, { event: 'UPDATE', new: updatedAppt, old: currentAppt }),
          rtdb.refreshAppointments(organizationId)
        ]);
      } catch (err) { logger.error('Erro Realtime:', err); }
      res.json({ data: updatedAppt });
    } catch (error: unknown) {
      if (error instanceof HttpsError && error.code === 'unauthenticated') { setCorsHeaders(res, req); res.status(401).json({ error: error.message }); return; }
      if (error instanceof HttpsError && error.code === 'not-found') { setCorsHeaders(res, req); res.status(404).json({ error: error.message }); return; }
      const errMsg = error instanceof Error ? error.message : 'Erro ao atualizar agendamento';
      const errStack = error instanceof Error ? error.stack : undefined;
      logger.error('Error in updateAppointmentHttp:', { message: errMsg, stack: errStack, error });
      setCorsHeaders(res, req);
      res.status(500).json({ error: errMsg });
    }
  }
);

/**
 * HTTP version of cancelAppointment for CORS
 */
export const cancelAppointmentHttp = onRequest(
  { region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: CORS_ORIGINS, invoker: 'public' },
  async (req, res) => {
    setCorsHeaders(res, req);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
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
          updated_at: new Date()
        });
        logger.info(`[cancelAppointmentHttp] Appointment ${appointmentId} cancellation synced to Firestore`);
      } catch (fsError) {
        logger.error(`[cancelAppointmentHttp] Failed to sync cancellation of ${appointmentId} to Firestore:`, fsError);
      }

      try {
        const realtime = await import('../realtime/publisher');
        await Promise.allSettled([
          realtime.publishAppointmentEvent(organizationId, { event: 'DELETE', new: null, old: current.rows[0] }),
          rtdb.refreshAppointments(organizationId)
        ]);
      } catch (err) { logger.error('Erro Realtime:', err); }
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
export const listAppointmentsHandler = async (request: any) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { patientId, therapistId, startDate, endDate, limit = 50, offset = 0 } = request.data;

  const pool = getPool();

  try {
    let query = `
      SELECT a.*, p.name as patient_name, prof.full_name as therapist_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN profiles prof ON a.therapist_id = prof.user_id
      WHERE a.organization_id = $1
    `;
    const params: (string | number)[] = [auth.organizationId];

    if (patientId) {
      query += ` AND a.patient_id = $${params.length + 1}`;
      params.push(patientId);
    }
    if (therapistId) {
      query += ` AND a.therapist_id = $${params.length + 1}`;
      params.push(therapistId);
    }
    if (startDate) {
      query += ` AND a.date >= $${params.length + 1}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND a.date <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` ORDER BY a.date DESC, a.start_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return { data: result.rows as Appointment[] };
  } catch (error: unknown) {
    logger.error('Error in listAppointments:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao listar agendamentos';
    throw new HttpsError('internal', errorMessage);
  }
};

export const listAppointments = onCall<ListAppointmentsRequest, Promise<ListAppointmentsResponse>>(
  { cors: CORS_ORIGINS },
  listAppointmentsHandler
);

interface GetAppointmentRequest {
  id: string;
}

interface GetAppointmentResponse {
  data: Appointment;
}

/**
 * Busca um agendamento por ID
 */
export const getAppointmentHandler = async (request: any) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { id } = request.data;

  if (!id) {
    throw new HttpsError('invalid-argument', 'id é obrigatório');
  }

  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT a.*, p.name as patient_name, prof.full_name as therapist_name
       FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.id
       LEFT JOIN profiles prof ON a.therapist_id = prof.user_id
       WHERE a.id = $1 AND a.organization_id = $2`,
      [id, auth.organizationId]
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
};

export const getAppointment = onCall<GetAppointmentRequest, Promise<GetAppointmentResponse>>(
  { cors: CORS_ORIGINS },
  getAppointmentHandler
);

interface CheckTimeConflictRequest {
  date: string;
  startTime: string;
  endTime: string;
  therapistId: string;
  excludeAppointmentId?: string;
  organizationId: string;
}

const DEFAULT_SLOT_CAPACITY = 4;

/**
 * Obtém capacidade do slot (max_patients) a partir do Firestore schedule_capacity_config.
 * day_of_week: 0=domingo, 1=segunda, ..., 6=sábado.
 */
async function getSlotCapacity(organizationId: string, dateStr: string, startTime: string): Promise<number> {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    const dayOfWeek = d.getDay();
    const db = admin.firestore();
    const snap = await db.collection('schedule_capacity_config')
      .where('organization_id', '==', organizationId)
      .where('day_of_week', '==', dayOfWeek)
      .get();
    for (const doc of snap.docs) {
      const data = doc.data();
      const start = (data.start_time as string) || '00:00';
      const end = (data.end_time as string) || '23:59';
      if (start <= startTime && startTime < end) {
        const max = Number(data.max_patients);
        return Number.isFinite(max) && max >= 1 ? max : DEFAULT_SLOT_CAPACITY;
      }
    }
  } catch (e) {
    logger.warn('[getSlotCapacity] Firestore read failed, using default', { organizationId, dateStr, startTime, error: e });
  }
  return DEFAULT_SLOT_CAPACITY;
}

/**
 * Verifica conflito por capacidade: slot cheio quando count >= capacity.
 * Não considera therapist_id; conta todos os agendamentos no horário da organização.
 */
async function checkTimeConflictByCapacity(
  pool: any,
  params: { date: string; startTime: string; endTime: string; excludeAppointmentId?: string; organizationId: string }
): Promise<boolean> {
  const { date, startTime, endTime, excludeAppointmentId, organizationId } = params;
  const capacity = await getSlotCapacity(organizationId, date, startTime);

  let query = `
    SELECT id FROM appointments
    WHERE organization_id = $1
      AND date = $2
      AND status NOT IN ('cancelado', 'remarcado', 'paciente_faltou')
      AND (
        (start_time <= $3 AND end_time > $3) OR
        (start_time < $4 AND end_time >= $4) OR
        (start_time >= $3 AND end_time <= $4)
      )
  `;
  const sqlParams: (string | number)[] = [organizationId, date, startTime, endTime];
  if (excludeAppointmentId) {
    query += ` AND id != $5`;
    sqlParams.push(excludeAppointmentId);
  }
  const result = await pool.query(query, sqlParams);
  const count = result.rows.length;
  logger.info('[checkTimeConflictByCapacity]', { organizationId, date, startTime, capacity, count, hasConflict: count >= capacity });
  return count >= capacity;
}

/**
 * Verifica conflito de horário (Internal helper) - legado: 1 agendamento por terapeuta por slot.
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
 * Verifica conflitos de horário
 */
export const checkTimeConflictHandler = async (request: any) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { date, startTime, duration, therapistId, appointmentId } = request.data;

  if (!date || !startTime || !duration || !therapistId) {
    throw new HttpsError('invalid-argument', 'date, startTime, duration e therapistId são obrigatórios');
  }

  const pool = getPool();

  try {
    let query = `
      SELECT id 
      FROM appointments 
      WHERE organization_id = $1 
        AND therapist_id = $2 
        AND date = $3 
        AND status != 'cancelado'
        AND (
          (start_time <= $4 AND (EXTRACT(EPOCH FROM start_time) + duration * 60) > EXTRACT(EPOCH FROM $4::time))
          OR ($4 <= start_time AND (EXTRACT(EPOCH FROM $4::time) + $5 * 60) > EXTRACT(EPOCH FROM start_time))
        )
    `;
    const params: any[] = [auth.organizationId, therapistId, date, startTime, duration];

    if (appointmentId) {
      query += ` AND id != $6`;
      params.push(appointmentId);
    }

    const result = await pool.query(query, params);

    return { hasConflict: result.rows.length > 0, conflicts: result.rows };
  } catch (error: unknown) {
    logger.error('Error in checkTimeConflict:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao verificar conflito';
    throw new HttpsError('internal', errorMessage);
  }
};

export const checkTimeConflict = onCall({ cors: CORS_ORIGINS }, checkTimeConflictHandler);

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
/**
 * Cria um novo agendamento
 */
export const createAppointmentHandler = async (request: any) => {
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
      logger.info(`[createAppointment] Appointment ${appointment.id} synced to Firestore`);
    } catch (fsError) {
      logger.error(`[createAppointment] Failed to sync appointment ${appointment.id} to Firestore:`, fsError);
    }

    // Publicar Evento
    try {
      const realtime = await import('../realtime/publisher');
      await Promise.allSettled([
        realtime.publishAppointmentEvent(auth.organizationId, { event: 'INSERT', new: appointment, old: null }),
        rtdb.refreshAppointments(auth.organizationId)
      ]);
    } catch (err) {
      logger.error('Erro Realtime:', err);
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
};

export const createAppointment = onCall<CreateAppointmentRequest, Promise<CreateAppointmentResponse>>(
  { cors: CORS_ORIGINS },
  createAppointmentHandler
);

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
/**
 * Atualiza um agendamento
 */
export const updateAppointmentHandler = async (request: any) => {
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
      logger.info(`[updateAppointment] Appointment ${appointmentId} synced to Firestore`);
    } catch (fsError) {
      logger.error(`[updateAppointment] Failed to sync appointment ${appointmentId} to Firestore:`, fsError);
    }

    // Publicar Evento
    try {
      const realtime = await import('../realtime/publisher');
      await Promise.allSettled([
        realtime.publishAppointmentEvent(auth.organizationId, { event: 'UPDATE', new: updatedAppt, old: currentAppt }),
        rtdb.refreshAppointments(auth.organizationId)
      ]);
    } catch (err) {
      logger.error('Erro Realtime:', err);
    }

    return { data: updatedAppt as Appointment };
  } catch (error: unknown) {
    logger.error('Error in updateAppointment:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar agendamento';
    throw new HttpsError('internal', errorMessage);
  }
};

export const updateAppointment = onCall<UpdateAppointmentRequest, Promise<UpdateAppointmentResponse>>(
  { cors: CORS_ORIGINS },
  updateAppointmentHandler
);

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
/**
 * Cancela um agendamento
 */
export const cancelAppointmentHandler = async (request: any) => {
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
       WHERE id = $2 AND organization_id = $3`,
      [reason ? `\n[Cancelamento: ${reason}]` : '', appointmentId, auth.organizationId]
    );

    // [SYNC] Sync cancellation to Firestore
    try {
      const db = admin.firestore();
      await db.collection('appointments').doc(appointmentId).update({
        status: 'cancelado',
        updated_at: new Date()
      });
      logger.info(`[cancelAppointment] Appointment ${appointmentId} cancellation synced to Firestore`);
    } catch (fsError) {
      logger.error(`[cancelAppointment] Failed to sync cancellation of ${appointmentId} to Firestore:`, fsError);
    }

    // Publicar Evento
    try {
      const realtime = await import('../realtime/publisher');
      await Promise.allSettled([
        realtime.publishAppointmentEvent(auth.organizationId, { event: 'UPDATE', new: result.rows[0], old: current.rows[0] }),
        rtdb.refreshAppointments(auth.organizationId)
      ]);
    } catch (err) {
      logger.error('Erro Realtime:', err);
    }

    return { success: true };
  } catch (error: unknown) {
    logger.error('Error in cancelAppointment:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao cancelar agendamento';
    throw new HttpsError('internal', errorMessage);
  }
};

export const cancelAppointment = onCall<CancelAppointmentRequest, Promise<CancelAppointmentResponse>>(
  { cors: CORS_ORIGINS },
  cancelAppointmentHandler
);