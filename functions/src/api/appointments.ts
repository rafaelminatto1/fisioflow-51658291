import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { getPool, getAdminDb, getAdminAuth } from '../init';
import { authorizeRequest } from '../middleware/auth';
import { Appointment } from '../types/models';
import { logger } from '../lib/logger';
import { rtdb } from '../lib/rtdb';
import { getOrganizationIdCached } from '../lib/cache-helpers';
import { dispatchAppointmentNotification } from '../workflows/notifications';
import { withErrorHandling } from '../lib/error-handler';
import { CORS_ORIGINS } from '../lib/cors';

import { isValidUuid } from '../lib/uuid';

// OTIMIZADO: Configurações com mais instâncias
const APPOINTMENT_HTTP_OPTS = {
  region: 'southamerica-east1',
  maxInstances: 2,
  invoker: 'public',
  cors: CORS_ORIGINS,
};

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
  const auth = getAdminAuth();

  try {
    const decodedToken = await auth.verifyIdToken(token);
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
 * OTIMIZADO: Usa cache para evitar queries repetidas
 * ATENÇÃO: Sempre usar getOrganizationIdCached diretamente para máxima performance
 */
const getOrganizationId = getOrganizationIdCached;

function normalizeDateOnly(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value || '').slice(0, 10);
}

function normalizeTimeOnly(value: unknown): string {
  return String(value || '').slice(0, 5);
}

const UUID_FILTER_BYPASS_VALUES = new Set(['', 'all', 'default', 'todos', 'none']);

function normalizeOptionalUuidFilter(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (UUID_FILTER_BYPASS_VALUES.has(raw.toLowerCase())) return null;
  if (!isValidUuid(raw)) {
    throw new HttpsError('invalid-argument', `${fieldName} inválido`);
  }
  return raw;
}

function requireUuidField(value: unknown, fieldName: string): string {
  const raw = String(value || '').trim();
  if (!raw) {
    throw new HttpsError('invalid-argument', `${fieldName} é obrigatório`);
  }
  if (!isValidUuid(raw)) {
    throw new HttpsError('invalid-argument', `${fieldName} inválido`);
  }
  return raw;
}

/**
 * HTTP version of listAppointments for CORS/compatibility
 * OTIMIZADO - Usa cache de organização
 */
export const listAppointmentsHttp = onRequest(
  APPOINTMENT_HTTP_OPTS,
  withErrorHandling(async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { uid } = await verifyAuthHeader(req);
    // OTIMIZADO: Usa cache para evitar queries repetidas
    const organizationId = await getOrganizationIdCached(uid);

    const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {});
    const { dateFrom, dateTo, therapistId, status, patientId, limit = 100, offset = 0 } = body;
    const pool = getPool();
    const normalizedPatientId = normalizeOptionalUuidFilter(patientId, 'patientId');

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
    if (normalizedPatientId) { query += ` AND a.patient_id = $${++paramCount}`; params.push(normalizedPatientId); }

    query += ` ORDER BY a.date, a.start_time LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    // Disable cache for list to ensure immediate updates after creation
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json({ data: result.rows as Appointment[] });
  }, 'listAppointmentsHttp')
);

/**
 * HTTP version of getAppointment for CORS
 */
export const getAppointmentHttp = onRequest(
  APPOINTMENT_HTTP_OPTS,
  withErrorHandling(async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const { uid } = await verifyAuthHeader(req);
    const organizationId = await getOrganizationId(uid);
    const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {});
    const appointmentId = requireUuidField(body.appointmentId, 'appointmentId');
    const pool = getPool();
    const result = await pool.query(
      `SELECT 
        a.*, 
        to_jsonb(p.*) as patient,
        prof.full_name as therapist_name
       FROM appointments a 
       LEFT JOIN patients p ON a.patient_id = p.id
       LEFT JOIN profiles prof ON a.therapist_id = prof.user_id
       WHERE a.id = $1 AND a.organization_id = $2`,
      [appointmentId, organizationId]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'Agendamento não encontrado' }); return; }

    // Adjust response structure if needed, or just return row
    const row = result.rows[0];
    res.json({ data: { ...row, patient: row.patient } });
  }, 'getAppointmentHttp')
);

/**
 * HTTP version of checkTimeConflict for CORS
 */
export const checkTimeConflictHttp = onRequest(
  APPOINTMENT_HTTP_OPTS,
  withErrorHandling(async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

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
  }, 'checkTimeConflictHttp')
);

/**
 * HTTP version of createAppointment for CORS/compatibility
 */
export const createAppointmentHttp = onRequest(
  {
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 10,
    cpu: 1,
    concurrency: 80,
    invoker: 'public'
  },
  withErrorHandling(async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const { uid } = await verifyAuthHeader(req);

    // Parallelize initial fetch of metadata
    const [organizationId, body] = await Promise.all([
      getOrganizationId(uid),
      Promise.resolve(typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {}))
    ]);

    const pool = getPool();
    const userId = uid;
    const data = body;
    const requiredFields = ['patientId', 'date', 'startTime', 'endTime'];
    for (const field of requiredFields) {
      if (!data[field]) {
        if (field === 'type' && data.session_type) continue;
        res.status(400).json({ error: `Campo obrigatório faltando: ${field}` });
        return;
      }
    }
    const patientId = requireUuidField(data.patientId, 'patientId');
    // Fisioterapeuta opcional: quando não informado, usa o usuário logado como responsável
    const therapistIdRaw = (data.therapistId != null && data.therapistId !== '') ? String(data.therapistId).trim() : '';
    const therapistId = therapistIdRaw || userId;
    // Conflito por capacidade do slot (0/4 = livre), não por terapeuta
    const conflictResult = await checkTimeConflictByCapacity(pool, {
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      organizationId
    });
    if (conflictResult.hasConflict) {
      res.status(409).json({
        error: 'Conflito de horário detectado',
        conflicts: conflictResult.conflicts,
        total: conflictResult.total,
        capacity: conflictResult.capacity
      });
      return;
    }
    const result = await pool.query(
      `INSERT INTO appointments (patient_id, therapist_id, date, start_time, end_time, session_type, notes, status, organization_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        patientId, therapistId, data.date, data.startTime, data.endTime,
        normalizeSessionType(data.type || data.session_type),
        data.notes || null, normalizeAppointmentStatus(data.status), organizationId, userId
      ]
    );
    const appointment = result.rows[0];

    // NON-BLOCKING BACKGROUND TASKS
    // We start these but don't 'await' them before responding to the user
    (async () => {
      try {
        const db = getAdminDb();
        await Promise.all([
          // 1. Sync to Firestore
          db.collection('appointments').doc(appointment.id).set({
            ...appointment,
            notification_origin: 'api_appointments_v2_optimized',
            created_at: new Date(),
            updated_at: new Date()
          }),
          // 2. Update RTDB
          rtdb.refreshAppointments(organizationId),
          // 3. Dispatch Notification
          dispatchAppointmentNotification({
            kind: 'scheduled',
            organizationId,
            patientId: String(appointment.patient_id),
            appointmentId: String(appointment.id),
            date: normalizeDateOnly(appointment.date),
            time: normalizeTimeOnly(appointment.start_time),
          })
        ]);
        logger.info(`[createAppointmentHttp] Background tasks completed for ${appointment.id}`);
      } catch (bgError) {
        logger.error(`[createAppointmentHttp] Background tasks failed for ${appointment.id}:`, bgError);
      }
    })();

    // Optional: Add to event loop to ensure completion in some environments
    // In Gen 2, if the function returns, CPU might be throttled, but concurrency helps.

    res.status(201).json({ data: appointment });
  }, 'createAppointmentHttp')
);

/**
 * HTTP version of updateAppointment for CORS
 */
export const updateAppointmentHttp = onRequest(
  async (req, res) => {
    // Defines handler with error handling
    const handler = withErrorHandling(async (req, res) => {
      // Only accept POST requests
      if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

      const { uid } = await verifyAuthHeader(req);
      const organizationId = await getOrganizationId(uid);
      const pool = getPool();
      const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {});
      const { ...updates } = body;
      const appointmentId = requireUuidField(body.appointmentId, 'appointmentId');
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
        const conflictResult = await checkTimeConflictByCapacity(pool, {
          date: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
          excludeAppointmentId: appointmentId,
          organizationId
        });
        if (conflictResult.hasConflict) {
          res.status(409).json({
            error: 'Conflito de horário detectado',
            conflicts: conflictResult.conflicts,
            total: conflictResult.total,
            capacity: conflictResult.capacity
          });
          return;
        }
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
        const db = getAdminDb();
        const safeDoc: Record<string, unknown> = { ...updatedAppt, updated_at: new Date() };
        await db.collection('appointments').doc(appointmentId).set(safeDoc, { merge: true });
        logger.info(`[updateAppointmentHttp] Appointment ${appointmentId} synced to Firestore`);
      } catch (fsError) {
        logger.error(`[updateAppointmentHttp] Failed to sync appointment ${appointmentId} to Firestore:`, fsError);
      }

      try {
        await rtdb.refreshAppointments(organizationId);
      } catch (err) { logger.error('Erro Realtime RTDB:', err); }

      const previousStatus = normalizeAppointmentStatus(String(currentAppt.status || 'agendado'));
      const nextStatus = normalizeAppointmentStatus(String(updatedAppt.status || currentAppt.status || 'agendado'));
      const statusChangedToCancelled = previousStatus !== 'cancelado' && nextStatus === 'cancelado';
      const dateChanged = normalizeDateOnly(updatedAppt.date) !== normalizeDateOnly(currentAppt.date);
      const startTimeChanged = normalizeTimeOnly(updatedAppt.start_time) !== normalizeTimeOnly(currentAppt.start_time);

      try {
        if (statusChangedToCancelled) {
          await dispatchAppointmentNotification({
            kind: 'cancelled',
            organizationId,
            patientId: String(updatedAppt.patient_id || currentAppt.patient_id),
            appointmentId: String(updatedAppt.id || appointmentId),
            date: normalizeDateOnly(updatedAppt.date || currentAppt.date),
            time: normalizeTimeOnly(updatedAppt.start_time || currentAppt.start_time),
          });
        } else if (dateChanged || startTimeChanged) {
          await dispatchAppointmentNotification({
            kind: 'rescheduled',
            organizationId,
            patientId: String(updatedAppt.patient_id || currentAppt.patient_id),
            appointmentId: String(updatedAppt.id || appointmentId),
            date: normalizeDateOnly(updatedAppt.date || currentAppt.date),
            time: normalizeTimeOnly(updatedAppt.start_time || currentAppt.start_time),
          });
        }
      } catch (notifyError) {
        logger.error('[updateAppointmentHttp] Notification dispatch failed (non-blocking):', notifyError);
      }
      res.json({ data: updatedAppt });
    }, 'updateAppointmentHttp');

    return handler(req, res);
  }
);

/**
 * HTTP version of cancelAppointment for CORS
 */
export const cancelAppointmentHttp = onRequest(
  async (req, res) => {
    // Defines handler with error handling
    const handler = withErrorHandling(async (req, res) => {
      // Only accept POST requests
      if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

      const { uid } = await verifyAuthHeader(req);
      const organizationId = await getOrganizationId(uid);
      const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {});
      const reason = body.reason;
      const appointmentId = requireUuidField(body.appointmentId, 'appointmentId');
      const pool = getPool();
      const current = await pool.query('SELECT * FROM appointments WHERE id = $1 AND organization_id = $2', [appointmentId, organizationId]);
      if (current.rows.length === 0) { res.status(404).json({ error: 'Agendamento não encontrado' }); return; }
      await pool.query(
        `UPDATE appointments SET status = 'cancelado', notes = notes || $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`,
        [reason ? `\n[Cancelamento: ${reason}]` : '', appointmentId, organizationId]
      );

      // [SYNC] Sync cancellation to Firestore
      try {
        const db = getAdminDb();
        await db.collection('appointments').doc(appointmentId).update({
          status: 'cancelado',
          updated_at: new Date()
        });
        logger.info(`[cancelAppointmentHttp] Appointment ${appointmentId} cancellation synced to Firestore`);
      } catch (fsError) {
        logger.error(`[cancelAppointmentHttp] Failed to sync cancellation of ${appointmentId} to Firestore:`, fsError);
      }

      try {
        await rtdb.refreshAppointments(organizationId);
      } catch (err) { logger.error('Erro Realtime RTDB:', err); }

      try {
        await dispatchAppointmentNotification({
          kind: 'cancelled',
          organizationId,
          patientId: String(current.rows[0].patient_id),
          appointmentId: String(appointmentId),
          date: normalizeDateOnly(current.rows[0].date),
          time: normalizeTimeOnly(current.rows[0].start_time),
        });
      } catch (notifyError) {
        logger.error('[cancelAppointmentHttp] Notification dispatch failed (non-blocking):', notifyError);
      }
      res.json({ success: true });
    }, 'cancelAppointmentHttp');

    return handler(req, res);
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
    const db = getAdminDb();
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
interface CapacityConflictRow {
  id: string;
  patient_id: string | null;
  patient_name: string | null;
  therapist_id: string | null;
  therapist_name: string | null;
  start_time: string | null;
  end_time: string | null;
  date: string | null;
}

interface CapacityConflictResult {
  hasConflict: boolean;
  total: number;
  conflicts: CapacityConflictRow[];
  capacity: number;
}

async function checkTimeConflictByCapacity(
  pool: any,
  params: { date: string; startTime: string; endTime: string; excludeAppointmentId?: string; organizationId: string }
): Promise<CapacityConflictResult> {
  const { date, startTime, endTime, excludeAppointmentId, organizationId } = params;
  const capacity = await getSlotCapacity(organizationId, date, startTime);

  let query = `
    SELECT a.id, a.patient_id, p.name AS patient_name, a.therapist_id, prof.full_name AS therapist_name, a.start_time, a.end_time, a.date
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    LEFT JOIN profiles prof ON a.therapist_id = prof.user_id
    WHERE a.organization_id = $1
      AND a.date = $2
      AND a.status NOT IN ('cancelado', 'remarcado', 'paciente_faltou')
      AND (
        (a.start_time <= $3 AND a.end_time > $3) OR
        (a.start_time < $4 AND a.end_time >= $4) OR
        (a.start_time >= $3 AND a.end_time <= $4)
      )
  `;
  const sqlParams: (string | number)[] = [organizationId, date, startTime, endTime];
  if (excludeAppointmentId) {
    query += ` AND a.id != $5`;
    sqlParams.push(excludeAppointmentId);
  }
  const result = await pool.query(query, sqlParams);
  const conflicts = result.rows as CapacityConflictRow[];
  const count = conflicts.length;
  logger.info('[checkTimeConflictByCapacity]', { organizationId, date, startTime, capacity, count, hasConflict: count >= capacity });
  return {
    hasConflict: count >= capacity,
    total: count,
    conflicts,
    capacity,
  };
}

/**
 * Verifica conflito de horário (Internal helper) - legado: 1 agendamento por terapeuta por slot.
 */
async function checkTimeConflictHelper(pool: any, params: CheckTimeConflictRequest): Promise<boolean> {
  const { date, startTime, endTime, therapistId, excludeAppointmentId, organizationId } = params;

  let query = `
    SELECT appointments.id FROM appointments
    WHERE appointments.organization_id = $1
      AND appointments.therapist_id = $2
      AND appointments.date = $3
      AND appointments.status NOT IN ('cancelado', 'remarcado', 'paciente_faltou')
      AND (
        (appointments.start_time <= $4 AND appointments.end_time > $4) OR
        (appointments.start_time < $5 AND appointments.end_time >= $5) OR
        (appointments.start_time >= $4 AND appointments.end_time <= $5)
      )
  `;
  const sqlParams: (string | number)[] = [organizationId, therapistId, date, startTime, endTime];

  if (excludeAppointmentId) {
    query += ` AND appointments.id != $6`;
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
      const db = getAdminDb();
      await db.collection('appointments').doc(appointment.id).set({
        ...appointment,
        notification_origin: 'api_appointments_v2',
        created_at: new Date(),
        updated_at: new Date()
      });
      logger.info(`[createAppointment] Appointment ${appointment.id} synced to Firestore`);
    } catch (fsError) {
      logger.error(`[createAppointment] Failed to sync appointment ${appointment.id} to Firestore:`, fsError);
    }

    // Publicar Evento
    try {
      await rtdb.refreshAppointments(auth.organizationId);
    } catch (err) {
      logger.error('Erro Realtime RTDB:', err);
    }

    try {
      await dispatchAppointmentNotification({
        kind: 'scheduled',
        organizationId: auth.organizationId,
        patientId: String(appointment.patient_id),
        appointmentId: String(appointment.id),
        date: normalizeDateOnly(appointment.date),
        time: normalizeTimeOnly(appointment.start_time),
      });
    } catch (notifyError) {
      logger.error('[createAppointment] Notification dispatch failed (non-blocking):', notifyError);
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
      const db = getAdminDb();
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
      await rtdb.refreshAppointments(auth.organizationId);
    } catch (err) {
      logger.error('Erro Realtime RTDB:', err);
    }

    const previousStatus = normalizeAppointmentStatus(String(currentAppt.status || 'agendado'));
    const nextStatus = normalizeAppointmentStatus(String(updatedAppt.status || currentAppt.status || 'agendado'));
    const statusChangedToCancelled = previousStatus !== 'cancelado' && nextStatus === 'cancelado';
    const dateChanged = normalizeDateOnly(updatedAppt.date) !== normalizeDateOnly(currentAppt.date);
    const startTimeChanged = normalizeTimeOnly(updatedAppt.start_time) !== normalizeTimeOnly(currentAppt.start_time);

    try {
      if (statusChangedToCancelled) {
        await dispatchAppointmentNotification({
          kind: 'cancelled',
          organizationId: auth.organizationId,
          patientId: String(updatedAppt.patient_id || currentAppt.patient_id),
          appointmentId: String(updatedAppt.id || appointmentId),
          date: normalizeDateOnly(updatedAppt.date || currentAppt.date),
          time: normalizeTimeOnly(updatedAppt.start_time || currentAppt.start_time),
        });
      } else if (dateChanged || startTimeChanged) {
        await dispatchAppointmentNotification({
          kind: 'rescheduled',
          organizationId: auth.organizationId,
          patientId: String(updatedAppt.patient_id || currentAppt.patient_id),
          appointmentId: String(updatedAppt.id || appointmentId),
          date: normalizeDateOnly(updatedAppt.date || currentAppt.date),
          time: normalizeTimeOnly(updatedAppt.start_time || currentAppt.start_time),
        });
      }
    } catch (notifyError) {
      logger.error('[updateAppointment] Notification dispatch failed (non-blocking):', notifyError);
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

    await pool.query(
      `UPDATE appointments
       SET status = 'cancelado', notes = notes || $1, updated_at = NOW()
       WHERE id = $2 AND organization_id = $3
       RETURNING *`,
      [reason ? `\n[Cancelamento: ${reason}]` : '', appointmentId, auth.organizationId]
    );

    // [SYNC] Sync cancellation to Firestore
    try {
      const db = getAdminDb();
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
      await rtdb.refreshAppointments(auth.organizationId);
    } catch (err) {
      logger.error('Erro Realtime RTDB:', err);
    }

    try {
      await dispatchAppointmentNotification({
        kind: 'cancelled',
        organizationId: auth.organizationId,
        patientId: String(current.rows[0].patient_id),
        appointmentId: String(appointmentId),
        date: normalizeDateOnly(current.rows[0].date),
        time: normalizeTimeOnly(current.rows[0].start_time),
      });
    } catch (notifyError) {
      logger.error('[cancelAppointment] Notification dispatch failed (non-blocking):', notifyError);
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
  cancelAppointmentHandler
);
