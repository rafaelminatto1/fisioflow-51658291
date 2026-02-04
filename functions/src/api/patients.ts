/**
 * API Functions: Patients
 * Cloud Functions para gestão de pacientes
 */

import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { getPool, CORS_ORIGINS } from '../init';
import { authorizeRequest } from '../middleware/auth';
import { verifyAppCheck } from '../middleware/app-check';
import { enforceRateLimit, RATE_LIMITS } from '../middleware/rate-limit';
import { Patient } from '../types/models';
import { logger } from '../lib/logger';
import * as admin from 'firebase-admin';

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

// ============================================================================
// HTTP VERSION (for frontend fetch calls with CORS fix)
// ============================================================================

const firebaseAuth = admin.auth();

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
 * CORS headers helper - reflete Origin para requests com Authorization (ex: localhost)
 */
function setCorsHeaders(req: any, res: any) {
  const origin = req.headers?.origin || req.headers?.Origin;
  const allowOrigin = (origin && (
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
    /moocafisio\.com\.br$/.test(origin)
  )) ? origin : '*';
  res.set('Access-Control-Allow-Origin', allowOrigin);
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '86400');
}

/**
 * Helper to get organization ID from user ID
 */
async function getOrganizationId(userId: string): Promise<string> {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT organization_id FROM profiles WHERE user_id = $1', [userId]);
    if (result.rows.length > 0) {
      return result.rows[0].organization_id;
    }
  } catch (error) {
    logger.info('PostgreSQL query failed, trying Firestore:', error);
  }

  try {
    const profileDoc = await admin.firestore().collection('profiles').doc(userId).get();
    if (profileDoc.exists) {
      const profile = profileDoc.data();
      return profile?.organizationId || profile?.activeOrganizationId || profile?.organizationIds?.[0] || 'default';
    }
  } catch (error) {
    logger.info('Firestore query failed:', error);
  }

  throw new HttpsError('not-found', 'Perfil não encontrado');
}

/**
 * HTTP version of listPatients for CORS/compatibility
 */
export const listPatientsHttp = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 100,
    cors: true,
  },
  async (req, res) => {
    setCorsHeaders(req, res);
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

      const { status, search, limit = 50, offset = 0 } = req.body || {};
      const pool = getPool();

      let query = `
        SELECT id, name, cpf, email, phone, birth_date, gender,
          main_condition, status, progress, is_active,
          created_at, updated_at
        FROM patients
        WHERE organization_id = $1 AND is_active = true
      `;
      const params: (string | number)[] = [organizationId];
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

      let countQuery = `
        SELECT COUNT(*) as total
        FROM patients
        WHERE organization_id = $1 AND is_active = true
      `;
      const countParams: (string | number)[] = [organizationId];
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

      // Fallback to Firestore if PostgreSQL returns no patients (migration support)
      let data = result.rows as Patient[];
      let total = parseInt(countResult.rows[0].total, 10);

      if (data.length === 0) {
        logger.info('[listPatientsHttp] No patients in PostgreSQL, checking Firestore...');
        const firestoreSnap = await admin.firestore().collection('patients')
          .where('organizationId', '==', organizationId)
          .where('isActive', '==', true)
          .limit(limit)
          .get();

        if (!firestoreSnap.empty) {
          data = firestoreSnap.docs.map(doc => {
            const p = doc.data();
            return {
              id: doc.id,
              name: p.name || p.full_name || '',
              cpf: p.cpf || '',
              email: p.email || '',
              phone: p.phone || '',
              birth_date: p.birth_date || null,
              gender: p.gender || '',
              main_condition: p.main_condition || '',
              status: p.status || 'active',
              progress: p.progress || 0,
              is_active: p.isActive !== false,
              created_at: p.createdAt || new Date().toISOString(),
              updated_at: p.updatedAt || new Date().toISOString(),
            } as Patient;
          });
          total = firestoreSnap.size;
          logger.info('[listPatientsHttp] Loaded ' + total + ' patients from Firestore fallback');
        }
      }

      res.json({
        data: data,
        total: total,
        page: Math.floor(offset / limit) + 1,
        perPage: limit,
      });
    } catch (error: unknown) {
      logger.error('Error in listPatientsHttp:', error);
      const statusCode = error instanceof HttpsError && error.code === 'unauthenticated' ? 401 : 500;
      setCorsHeaders(req, res);
      res.status(statusCode).json({ error: error instanceof Error ? error.message : 'Erro ao listar pacientes' });
    }
  }
);

/**
 * HTTP version of getPatient for CORS/compatibility
 */
export const getPatientHttp = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 100,
    cors: true,
  },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      setCorsHeaders(req, res);
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    setCorsHeaders(req, res);

    try {
      const { uid } = await verifyAuthHeader(req);
      const organizationId = await getOrganizationId(uid);
      const { patientId } = req.body || {};

      if (!patientId) {
        res.status(400).json({ error: 'patientId é obrigatório' });
        return;
      }

      const pool = getPool();

      const result = await pool.query(
        `SELECT id, name, cpf, email, phone, birth_date, gender,
          main_condition, status, progress, is_active,
          created_at, updated_at
        FROM patients
        WHERE id = $1 AND organization_id = $2`,
        [patientId, organizationId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Paciente não encontrado' });
        return;
      }

      res.json({ data: result.rows[0] });
    } catch (error: unknown) {
      logger.error('Error in getPatientHttp:', error);
      const statusCode = error instanceof HttpsError && error.code === 'unauthenticated' ? 401 : 500;
      res.status(statusCode).json({ error: error instanceof Error ? error.message : 'Erro ao buscar paciente' });
    }
  }
);

/**
 * HTTP version of getPatientStats for CORS/compatibility
 */
export const getPatientStatsHttp = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 100,
    cors: true, // Habilita CORS na plataforma (preflight OPTIONS)
  },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      setCorsHeaders(req, res);
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    setCorsHeaders(req, res);

    const emptyStats = () => ({
      data: {
        totalSessions: 0,
        upcomingAppointments: 0,
        lastVisit: undefined as string | undefined,
      },
    });

    try {
      const { uid } = await verifyAuthHeader(req);
      let organizationId: string;
      try {
        organizationId = await getOrganizationId(uid);
      } catch (orgError) {
        logger.warn('getPatientStatsHttp: getOrganizationId failed, returning empty stats', { uid, error: orgError });
        res.status(200).json(emptyStats());
        return;
      }

      // 'default' não é UUID válido; evita erro ao queryar patients
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!organizationId || organizationId === 'default' || !uuidRegex.test(organizationId)) {
        logger.warn('getPatientStatsHttp: invalid organizationId, returning empty stats', { organizationId });
        res.status(200).json(emptyStats());
        return;
      }

      const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {});
      const { patientId } = body;

      if (!patientId) {
        res.status(400).json({ error: 'patientId é obrigatório' });
        return;
      }

      const pool = getPool();

      // Verificar se paciente pertence à organização
      let patientCheck: { rows: { id: string }[] };
      try {
        patientCheck = await pool.query(
          'SELECT id FROM patients WHERE id = $1 AND organization_id = $2',
          [patientId, organizationId]
        );
      } catch (dbError) {
        logger.warn('getPatientStatsHttp: patient check failed, returning empty stats', { patientId, error: dbError });
        res.status(200).json(emptyStats());
        return;
      }
      if (patientCheck.rows.length === 0) {
        res.status(404).json({ error: 'Paciente não encontrado' });
        return;
      }

      // Buscar estatísticas (formato compatível com PatientApi.Stats)
      let row: { completed?: string; upcoming?: string; last_visit?: string } | null = null;
      try {
        const statsResult = await pool.query(
          `SELECT
            COUNT(*) FILTER (WHERE status = 'concluido') as completed,
            COUNT(*) FILTER (WHERE date >= CURRENT_DATE) as upcoming,
            MAX(date)::text FILTER (WHERE status = 'concluido') as last_visit
          FROM appointments
          WHERE patient_id = $1`,
          [patientId]
        );
        row = statsResult.rows[0] || null;
      } catch (sqlError) {
        logger.warn('getPatientStatsHttp: appointments query failed, returning empty stats', {
          patientId,
          error: sqlError,
        });
      }

      res.json({
        data: {
          totalSessions: parseInt(row?.completed || '0', 10),
          upcomingAppointments: parseInt(row?.upcoming || '0', 10),
          lastVisit: row?.last_visit || undefined,
        },
      });
    } catch (error: unknown) {
      if (error instanceof HttpsError && error.code === 'unauthenticated') {
        res.status(401).json({ error: error.message });
        return;
      }
      logger.error('Error in getPatientStatsHttp:', error);
      // Retorna stats vazios em vez de 500 para não quebrar o prefetch
      res.status(200).json(emptyStats());
    }
  }
);

/**
 * HTTP version of createPatient for CORS/compatibility
 */
export const createPatientHttp = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 100,
    cors: true,
  },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      setCorsHeaders(req, res);
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      setCorsHeaders(req, res);
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    setCorsHeaders(req, res);

    try {
      const { uid } = await verifyAuthHeader(req);
      const organizationId = await getOrganizationId(uid);
      const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {});
      const data = body as CreatePatientRequest;

      if (!data.name) {
        setCorsHeaders(req, res);
        res.status(400).json({ error: 'name é obrigatório' });
        return;
      }

      const pool = getPool();

      // Verificar duplicidade de CPF
      if (data.cpf) {
        const existing = await pool.query(
          'SELECT id FROM patients WHERE cpf = $1 AND organization_id = $2',
          [data.cpf.replace(/\D/g, ''), organizationId]
        );
        if (existing.rows.length > 0) {
          setCorsHeaders(req, res);
          res.status(409).json({ error: 'Já existe um paciente com este CPF' });
          return;
        }
      }

      // Garantir organização existe
      await pool.query(
        `INSERT INTO organizations (id, name, email)
         VALUES ($1, 'Clínica Principal', 'admin@fisioflow.com.br')
         ON CONFLICT (id) DO NOTHING`,
        [organizationId]
      );

      const birthDate = data.birth_date || '1900-01-01';
      const mainCondition = data.main_condition || 'A definir';
      const validStatuses = ['Inicial', 'Em_Tratamento', 'Recuperacao', 'Concluido'] as const;
      const rawStatus = data.status || 'Inicial';
      const status = validStatuses.includes(rawStatus as any) ? rawStatus : 'Inicial';

      let result;
      try {
        result = await pool.query(
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
            birthDate,
            data.gender || null,
            data.address ? JSON.stringify(data.address) : null,
            data.emergency_contact ? JSON.stringify(data.emergency_contact) : null,
            data.medical_history || null,
            mainCondition,
            status,
            organizationId,
            data.incomplete_registration ?? false
          ]
        );
      } catch (insertErr: unknown) {
        const errMsg = insertErr instanceof Error ? insertErr.message : String(insertErr);
        if (/incomplete_registration|column.*does not exist/i.test(errMsg)) {
          result = await pool.query(
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
              birthDate,
              data.gender || null,
              data.address ? JSON.stringify(data.address) : null,
              data.emergency_contact ? JSON.stringify(data.emergency_contact) : null,
              data.medical_history || null,
              mainCondition,
              status,
              organizationId
            ]
          );
        } else {
          throw insertErr;
        }
      }

      const patient = result.rows[0];

      // [SYNC] Write to Firestore for legacy frontend compatibility
      try {
        const db = admin.firestore();
        await db.collection('patients').doc(patient.id).set({
          ...patient,
          created_at: new Date(),
          updated_at: new Date()
        });
        logger.info(`[createPatientHttp] Patient ${patient.id} synced to Firestore`);
      } catch (fsError) {
        logger.error(`[createPatientHttp] Failed to sync patient ${patient.id} to Firestore:`, fsError);
      }

      // Publicar no Ably
      try {
        const realtime = await import('../realtime/publisher');
        await realtime.publishPatientEvent(organizationId, {
          event: 'INSERT',
          new: patient,
          old: null,
        });
      } catch (err) {
        logger.error('Erro ao publicar evento no Ably:', err);
      }

      setCorsHeaders(req, res);
      res.status(201).json({ data: patient });
    } catch (error: unknown) {
      setCorsHeaders(req, res);
      if (error instanceof HttpsError && error.code === 'unauthenticated') {
        res.status(401).json({ error: error.message });
        return;
      }
      logger.error('Error in createPatientHttp:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao criar paciente' });
    }
  }
);

/**
 * HTTP version of updatePatient for CORS/compatibility
 */
export const updatePatientHttp = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 100,
    cors: true,
  },
  async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(req, res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(req, res);
    try {
      const { uid } = await verifyAuthHeader(req);
      const organizationId = await getOrganizationId(uid);
      const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {});
      const { patientId, ...updates } = body;
      if (!patientId) { res.status(400).json({ error: 'patientId é obrigatório' }); return; }
      const pool = getPool();
      const existing = await pool.query('SELECT * FROM patients WHERE id = $1 AND organization_id = $2', [patientId, organizationId]);
      if (existing.rows.length === 0) { res.status(404).json({ error: 'Paciente não encontrado' }); return; }
      const allowedFields = ['name', 'cpf', 'email', 'phone', 'birth_date', 'gender', 'medical_history', 'main_condition', 'status', 'progress'];
      const setClauses: string[] = [];
      const values: (string | number | boolean | Date | null)[] = [];
      let paramCount = 0;
      for (const field of allowedFields) {
        if (field in updates) {
          paramCount++;
          setClauses.push(`${field} = $${paramCount}`);
          values.push(field === 'cpf' ? (updates[field]?.replace?.(/\D/g, '') || null) : updates[field]);
        }
      }
      if (setClauses.length === 0) { res.status(400).json({ error: 'Nenhum campo válido para atualizar' }); return; }
      paramCount++;
      setClauses.push(`updated_at = $${paramCount}`);
      values.push(new Date());
      values.push(patientId, organizationId);
      const result = await pool.query(
        `UPDATE patients SET ${setClauses.join(', ')} WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2} RETURNING *`,
        values
      );
      const patient = result.rows[0];

      // [SYNC] Write to Firestore for legacy frontend compatibility
      try {
        const db = admin.firestore();
        await db.collection('patients').doc(patientId).set({
          ...patient,
          updated_at: new Date()
        }, { merge: true });
        logger.info(`[updatePatientHttp] Patient ${patientId} synced to Firestore`);
      } catch (fsError) {
        logger.error(`[updatePatientHttp] Failed to sync patient ${patientId} to Firestore:`, fsError);
      }

      try {
        const realtime = await import('../realtime/publisher');
        await realtime.publishPatientEvent(organizationId, { event: 'UPDATE', new: patient, old: existing.rows[0] });
      } catch (err) { logger.error('Erro ao publicar evento no Ably:', err); }
      res.json({ data: patient });
    } catch (error: unknown) {
      if (error instanceof HttpsError && error.code === 'unauthenticated') { res.status(401).json({ error: error.message }); return; }
      logger.error('Error in updatePatientHttp:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao atualizar paciente' });
    }
  }
);

/**
 * HTTP version of deletePatient for CORS/compatibility
 */
export const deletePatientHttp = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 100,
    cors: true,
  },
  async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(req, res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(req, res);
    try {
      const { uid } = await verifyAuthHeader(req);
      const organizationId = await getOrganizationId(uid);
      const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {});
      const { patientId } = body;
      if (!patientId) { res.status(400).json({ error: 'patientId é obrigatório' }); return; }
      const pool = getPool();
      const result = await pool.query(
        'UPDATE patients SET is_active = false, updated_at = NOW() WHERE id = $1 AND organization_id = $2 RETURNING *',
        [patientId, organizationId]
      );
      if (result.rows.length === 0) { res.status(404).json({ error: 'Paciente não encontrado' }); return; }

      // [SYNC] Sync soft-delete to Firestore
      try {
        const db = admin.firestore();
        await db.collection('patients').doc(patientId).update({
          is_active: false,
          updated_at: new Date()
        });
        logger.info(`[deletePatientHttp] Patient ${patientId} soft-deleted in Firestore`);
      } catch (fsError) {
        logger.error(`[deletePatientHttp] Failed to sync deletion of ${patientId} to Firestore:`, fsError);
      }

      try {
        const realtime = await import('../realtime/publisher');
        await realtime.publishPatientEvent(organizationId, { event: 'DELETE', new: null, old: result.rows[0] });
      } catch (err) { logger.error('Erro ao publicar evento no Ably:', err); }
      res.json({ success: true });
    } catch (error: unknown) {
      if (error instanceof HttpsError && error.code === 'unauthenticated') { res.status(401).json({ error: error.message }); return; }
      logger.error('Error in deletePatientHttp:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao excluir paciente' });
    }
  }
);

// ============================================================================
// ORIGINAL CALLABLE VERSION
// ============================================================================

/**
 * Lista pacientes com filtros opcionais
 */
export const listPatients = onCall<ListPatientsRequest, Promise<ListPatientsResponse>>({ cors: CORS_ORIGINS }, async (request) => {
  console.log('[listPatients] ===== START =====');

  if (!request.auth || !request.auth.token) {
    logger.error('[listPatients] Unauthenticated request');
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }

  console.log('[listPatients] Auth token present, uid:', request.auth.uid);

  // App Check temporariamente desabilitado - deve ser configurado no frontend primeiro
  // verifyAppCheck(request);
  console.log('[listPatients] App Check check skipped (not configured)');

  // Verificar rate limit
  await enforceRateLimit(request, RATE_LIMITS.callable);
  console.log('[listPatients] Rate limit check passed');

  // Obter organization_id do usuário via Firestore (mais confiável que PostgreSQL)
  let organizationId: string;
  try {
    const profileDoc = await admin.firestore().collection('profiles').doc(request.auth.uid).get();
    if (!profileDoc.exists) {
      throw new HttpsError('not-found', 'Perfil não encontrado');
    }
    const profile = profileDoc.data();
    organizationId = profile?.organizationId || profile?.activeOrganizationId || profile?.organizationIds?.[0];

    if (!organizationId) {
      throw new HttpsError('not-found', 'Organization ID não encontrado no perfil');
    }
  } catch (error) {
    logger.error('[listPatients] Error getting organization:', error);
    throw new HttpsError('not-found', 'Perfil não encontrado');
  }

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
    const params: (string | number)[] = [organizationId];
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
    const countParams: (string | number)[] = [organizationId];
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
    logger.error('Error in listPatients:', error);
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
export const getPatient = onCall<GetPatientRequest, Promise<GetPatientResponse>>({ cors: CORS_ORIGINS }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }

  // Verificar App Check
  verifyAppCheck(request);

  const auth = await authorizeRequest(request.auth.token);
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
    logger.error('Error in getPatient:', error);
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
export const createPatient = onCall<CreatePatientRequest, Promise<CreatePatientResponse>>({ cors: CORS_ORIGINS }, async (request) => {
  logger.debug('[createPatient] ===== START =====');

  if (!request.auth || !request.auth.token) {
    logger.error('[createPatient] Unauthenticated request');
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }

  logger.debug('[createPatient] Auth token present, uid:', request.auth.uid);

  let auth;
  let data;
  try {
    // Verificar App Check
    verifyAppCheck(request);
    logger.debug('[createPatient] App Check verified');

    // Verificar rate limit
    await enforceRateLimit(request, RATE_LIMITS.callable);
    logger.debug('[createPatient] Rate limit check passed');

    auth = await authorizeRequest(request.auth.token);
    data = request.data;
  } catch (earlyError: unknown) {
    const msg = earlyError instanceof Error ? earlyError.message : String(earlyError);
    logger.error('[createPatient] Error before try block:', earlyError);
    if (earlyError instanceof HttpsError) throw earlyError;
    throw new HttpsError('invalid-argument', `[createPatient] ${msg}`);
  }

  // DEBUG: Log organization_id ao criar paciente
  logger.debug('[createPatient] auth.organizationId:', auth.organizationId);
  logger.debug('[createPatient] auth.userId:', auth.userId);
  logger.debug('[createPatient] data:', JSON.stringify({ name: data.name, phone: data.phone }));

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
    logger.debug('[createPatient] Target Org ID:', auth.organizationId);
    const orgInsertSql = `INSERT INTO organizations (id, name, email)
       VALUES ($1, 'Clínica Principal', 'admin@fisioflow.com.br')
       ON CONFLICT (id) DO NOTHING`;
    logger.debug('[createPatient] Org Insert SQL:', orgInsertSql);
    await pool.query(orgInsertSql, [auth.organizationId]);

    // Valores padrão para cadastro rápido (birth_date e main_condition NOT NULL em alguns schemas)
    const birthDate = data.birth_date || '1900-01-01';
    const mainCondition = data.main_condition || 'A definir';

    // Normalizar status para enum patient_status (Inicial, Em_Tratamento, Recuperacao, Concluido)
    const validStatuses = ['Inicial', 'Em_Tratamento', 'Recuperacao', 'Concluido'] as const;
    const rawStatus = data.status || 'Inicial';
    const status = validStatuses.includes(rawStatus as any) ? rawStatus : 'Inicial';

    // Inserir paciente
    let result;
    try {
      result = await pool.query(
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
          birthDate,
          data.gender || null,
          data.address ? JSON.stringify(data.address) : null,
          data.emergency_contact ? JSON.stringify(data.emergency_contact) : null,
          data.medical_history || null,
          mainCondition,
          status,
          auth.organizationId,
          data.incomplete_registration ?? false
        ]
      );
    } catch (insertErr: unknown) {
      const errMsg = insertErr instanceof Error ? insertErr.message : String(insertErr);
      if (/incomplete_registration|column.*does not exist/i.test(errMsg)) {
        result = await pool.query(
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
            birthDate,
            data.gender || null,
            data.address ? JSON.stringify(data.address) : null,
            data.emergency_contact ? JSON.stringify(data.emergency_contact) : null,
        data.medical_history || null,
          mainCondition,
          status,
          auth.organizationId
        ]
        );
      } else {
        throw insertErr;
      }
    }

    const patient = result.rows[0];

    // [SYNC] Write to Firestore for legacy frontend compatibility
    try {
      const db = admin.firestore();
      await db.collection('patients').doc(patient.id).set({
        ...patient,
        created_at: new Date(),
        updated_at: new Date()
      });
      logger.info(`[createPatient] Patient ${patient.id} synced to Firestore`);
    } catch (fsError) {
      logger.error(`[createPatient] Failed to sync patient ${patient.id} to Firestore:`, fsError);
    }

    logger.debug('[createPatient] Patient created:', JSON.stringify({
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
      logger.error('Erro ao publicar evento no Ably:', err);
    }

    return { data: patient as Patient };
  } catch (error: unknown) {
    logger.error('Error in createPatient:', error);
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
export const updatePatient = onCall<UpdatePatientRequest, Promise<UpdatePatientResponse>>({ cors: CORS_ORIGINS }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }

  // Verificar App Check
  verifyAppCheck(request);

  const auth = await authorizeRequest(request.auth.token);
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

    // [SYNC] Write to Firestore for legacy frontend compatibility
    try {
      const db = admin.firestore();
      await db.collection('patients').doc(patientId).set({
        ...patient,
        updated_at: new Date()
      }, { merge: true });
      logger.info(`[updatePatient] Patient ${patientId} synced to Firestore`);
    } catch (fsError) {
      logger.error(`[updatePatient] Failed to sync patient ${patientId} to Firestore:`, fsError);
    }

    // Publicar no Ably
    try {
      const realtime = await import('../realtime/publisher');
      await realtime.publishPatientEvent(auth.organizationId, {
        event: 'UPDATE',
        new: patient,
        old: existing.rows[0],
      });
    } catch (err) {
      logger.error('Erro ao publicar evento no Ably:', err);
    }

    return { data: patient as Patient };
  } catch (error: unknown) {
    logger.error('Error in updatePatient:', error);
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
export const deletePatient = onCall<DeletePatientRequest, Promise<DeletePatientResponse>>({ cors: CORS_ORIGINS }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }

  // Verificar App Check
  verifyAppCheck(request);

  const auth = await authorizeRequest(request.auth.token);
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

    // [SYNC] Sync soft-delete to Firestore
    try {
      const db = admin.firestore();
      await db.collection('patients').doc(patientId).update({
        is_active: false,
        updated_at: new Date()
      });
      logger.info(`[deletePatient] Patient ${patientId} soft-deleted in Firestore`);
    } catch (fsError) {
      logger.error(`[deletePatient] Failed to sync deletion of ${patientId} to Firestore:`, fsError);
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
      logger.error('Erro ao publicar evento no Ably:', err);
    }

    return { success: true };
  } catch (error: unknown) {
    logger.error('Error in deletePatient:', error);
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
export const getPatientStats = onCall<GetPatientStatsRequest, Promise<GetPatientStatsResponse>>({ cors: CORS_ORIGINS }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  verifyAppCheck(request);
  console.log('App Check verified');
  verifyAppCheck(request);
  // App Check verified");
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
    logger.error('Error in getPatientStats:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro interno ao buscar estatísticas';
    throw new HttpsError('internal', errorMessage);
  }
});