"use strict";
/**
 * API Functions: Patients
 * Cloud Functions para gestão de pacientes
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPatientStats = exports.deletePatient = exports.updatePatient = exports.createPatient = exports.getPatient = exports.listPatients = exports.deletePatientHttp = exports.updatePatientHttp = exports.createPatientHttp = exports.getPatientStatsHttp = exports.getPatientHttp = exports.listPatientsHttp = void 0;
const https_1 = require("firebase-functions/v2/https");
const init_1 = require("../init");
const auth_1 = require("../middleware/auth");
const app_check_1 = require("../middleware/app-check");
const rate_limit_1 = require("../middleware/rate-limit");
const logger_1 = require("../lib/logger");
const admin = __importStar(require("firebase-admin"));
// ============================================================================
// HTTP VERSION (for frontend fetch calls with CORS fix)
// ============================================================================
const firebaseAuth = admin.auth();
/**
 * Helper to verify Firebase ID token from Authorization header
 */
async function verifyAuthHeader(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new https_1.HttpsError('unauthenticated', 'No authorization header');
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await firebaseAuth.verifyIdToken(token);
        return { uid: decodedToken.uid };
    }
    catch (error) {
        throw new https_1.HttpsError('unauthenticated', 'Invalid token');
    }
}
/**
 * CORS headers helper
 */
function setCorsHeaders(res) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
/**
 * Helper to get organization ID from user ID
 */
async function getOrganizationId(userId) {
    try {
        const pool = (0, init_1.getPool)();
        const result = await pool.query('SELECT organization_id FROM profiles WHERE user_id = $1', [userId]);
        if (result.rows.length > 0) {
            return result.rows[0].organization_id;
        }
    }
    catch (error) {
        logger_1.logger.info('PostgreSQL query failed, trying Firestore:', error);
    }
    try {
        const profileDoc = await admin.firestore().collection('profiles').doc(userId).get();
        if (profileDoc.exists) {
            const profile = profileDoc.data();
            return profile?.organizationId || profile?.activeOrganizationId || profile?.organizationIds?.[0] || 'default';
        }
    }
    catch (error) {
        logger_1.logger.info('Firestore query failed:', error);
    }
    throw new https_1.HttpsError('not-found', 'Perfil não encontrado');
}
/**
 * HTTP version of listPatients for CORS/compatibility
 */
exports.listPatientsHttp = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 100,
    cors: true,
}, async (req, res) => {
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
        const { status, search, limit = 50, offset = 0 } = req.body || {};
        const pool = (0, init_1.getPool)();
        let query = `
        SELECT id, name, cpf, email, phone, birth_date, gender,
          main_condition, status, progress, is_active,
          created_at, updated_at
        FROM patients
        WHERE organization_id = $1 AND is_active = true
      `;
        const params = [organizationId];
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
        const countParams = [organizationId];
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
        res.json({
            data: result.rows,
            total: parseInt(countResult.rows[0].total, 10),
            page: Math.floor(offset / limit) + 1,
            perPage: limit,
        });
    }
    catch (error) {
        logger_1.logger.error('Error in listPatientsHttp:', error);
        const statusCode = error instanceof https_1.HttpsError && error.code === 'unauthenticated' ? 401 : 500;
        res.status(statusCode).json({ error: error instanceof Error ? error.message : 'Erro ao listar pacientes' });
    }
});
/**
 * HTTP version of getPatient for CORS/compatibility
 */
exports.getPatientHttp = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 100,
    cors: true,
}, async (req, res) => {
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
        const { patientId } = req.body || {};
        if (!patientId) {
            res.status(400).json({ error: 'patientId é obrigatório' });
            return;
        }
        const pool = (0, init_1.getPool)();
        const result = await pool.query(`SELECT id, name, cpf, email, phone, birth_date, gender,
          main_condition, status, progress, is_active,
          created_at, updated_at
        FROM patients
        WHERE id = $1 AND organization_id = $2`, [patientId, organizationId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Paciente não encontrado' });
            return;
        }
        res.json({ data: result.rows[0] });
    }
    catch (error) {
        logger_1.logger.error('Error in getPatientHttp:', error);
        const statusCode = error instanceof https_1.HttpsError && error.code === 'unauthenticated' ? 401 : 500;
        res.status(statusCode).json({ error: error instanceof Error ? error.message : 'Erro ao buscar paciente' });
    }
});
/**
 * HTTP version of getPatientStats for CORS/compatibility
 */
exports.getPatientStatsHttp = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 100,
    cors: true, // Habilita CORS na plataforma (preflight OPTIONS)
}, async (req, res) => {
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
    const emptyStats = () => ({
        data: {
            totalSessions: 0,
            upcomingAppointments: 0,
            lastVisit: undefined,
        },
    });
    try {
        const { uid } = await verifyAuthHeader(req);
        let organizationId;
        try {
            organizationId = await getOrganizationId(uid);
        }
        catch (orgError) {
            logger_1.logger.warn('getPatientStatsHttp: getOrganizationId failed, returning empty stats', { uid, error: orgError });
            res.status(200).json(emptyStats());
            return;
        }
        // 'default' não é UUID válido; evita erro ao queryar patients
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!organizationId || organizationId === 'default' || !uuidRegex.test(organizationId)) {
            logger_1.logger.warn('getPatientStatsHttp: invalid organizationId, returning empty stats', { organizationId });
            res.status(200).json(emptyStats());
            return;
        }
        const body = typeof req.body === 'string' ? (() => { try {
            return JSON.parse(req.body || '{}');
        }
        catch {
            return {};
        } })() : (req.body || {});
        const { patientId } = body;
        if (!patientId) {
            res.status(400).json({ error: 'patientId é obrigatório' });
            return;
        }
        const pool = (0, init_1.getPool)();
        // Verificar se paciente pertence à organização
        let patientCheck;
        try {
            patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, organizationId]);
        }
        catch (dbError) {
            logger_1.logger.warn('getPatientStatsHttp: patient check failed, returning empty stats', { patientId, error: dbError });
            res.status(200).json(emptyStats());
            return;
        }
        if (patientCheck.rows.length === 0) {
            res.status(404).json({ error: 'Paciente não encontrado' });
            return;
        }
        // Buscar estatísticas (formato compatível com PatientApi.Stats)
        let row = null;
        try {
            const statsResult = await pool.query(`SELECT
            COUNT(*) FILTER (WHERE status = 'concluido') as completed,
            COUNT(*) FILTER (WHERE date >= CURRENT_DATE) as upcoming,
            MAX(date)::text FILTER (WHERE status = 'concluido') as last_visit
          FROM appointments
          WHERE patient_id = $1`, [patientId]);
            row = statsResult.rows[0] || null;
        }
        catch (sqlError) {
            logger_1.logger.warn('getPatientStatsHttp: appointments query failed, returning empty stats', {
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
    }
    catch (error) {
        if (error instanceof https_1.HttpsError && error.code === 'unauthenticated') {
            res.status(401).json({ error: error.message });
            return;
        }
        logger_1.logger.error('Error in getPatientStatsHttp:', error);
        // Retorna stats vazios em vez de 500 para não quebrar o prefetch
        res.status(200).json(emptyStats());
    }
});
/**
 * HTTP version of createPatient for CORS/compatibility
 */
exports.createPatientHttp = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 100,
    cors: true,
}, async (req, res) => {
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
        const body = typeof req.body === 'string' ? (() => { try {
            return JSON.parse(req.body || '{}');
        }
        catch {
            return {};
        } })() : (req.body || {});
        const data = body;
        if (!data.name) {
            res.status(400).json({ error: 'name é obrigatório' });
            return;
        }
        const pool = (0, init_1.getPool)();
        // Verificar duplicidade de CPF
        if (data.cpf) {
            const existing = await pool.query('SELECT id FROM patients WHERE cpf = $1 AND organization_id = $2', [data.cpf.replace(/\D/g, ''), organizationId]);
            if (existing.rows.length > 0) {
                res.status(409).json({ error: 'Já existe um paciente com este CPF' });
                return;
            }
        }
        // Garantir organização existe
        await pool.query(`INSERT INTO organizations (id, name, email)
         VALUES ($1, 'Clínica Principal', 'admin@fisioflow.com.br')
         ON CONFLICT (id) DO NOTHING`, [organizationId]);
        const birthDate = data.birth_date || '1900-01-01';
        const mainCondition = data.main_condition || 'A definir';
        const validStatuses = ['Inicial', 'Em_Tratamento', 'Recuperacao', 'Concluido'];
        const rawStatus = data.status || 'Inicial';
        const status = validStatuses.includes(rawStatus) ? rawStatus : 'Inicial';
        let result;
        try {
            result = await pool.query(`INSERT INTO patients (
            name, cpf, email, phone, birth_date, gender,
            address, emergency_contact, medical_history,
            main_condition, status, organization_id, incomplete_registration
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *`, [
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
            ]);
        }
        catch (insertErr) {
            const errMsg = insertErr instanceof Error ? insertErr.message : String(insertErr);
            if (/incomplete_registration|column.*does not exist/i.test(errMsg)) {
                result = await pool.query(`INSERT INTO patients (
              name, cpf, email, phone, birth_date, gender,
              address, emergency_contact, medical_history,
              main_condition, status, organization_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`, [
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
                ]);
            }
            else {
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
            logger_1.logger.info(`[createPatientHttp] Patient ${patient.id} synced to Firestore`);
        }
        catch (fsError) {
            logger_1.logger.error(`[createPatientHttp] Failed to sync patient ${patient.id} to Firestore:`, fsError);
        }
        // Publicar no Ably
        try {
            const realtime = await Promise.resolve().then(() => __importStar(require('../realtime/publisher')));
            await realtime.publishPatientEvent(organizationId, {
                event: 'INSERT',
                new: patient,
                old: null,
            });
        }
        catch (err) {
            logger_1.logger.error('Erro ao publicar evento no Ably:', err);
        }
        res.status(201).json({ data: patient });
    }
    catch (error) {
        if (error instanceof https_1.HttpsError && error.code === 'unauthenticated') {
            res.status(401).json({ error: error.message });
            return;
        }
        logger_1.logger.error('Error in createPatientHttp:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao criar paciente' });
    }
});
/**
 * HTTP version of updatePatient for CORS/compatibility
 */
exports.updatePatientHttp = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 100,
    cors: true,
}, async (req, res) => {
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
        const body = typeof req.body === 'string' ? (() => { try {
            return JSON.parse(req.body || '{}');
        }
        catch {
            return {};
        } })() : (req.body || {});
        const { patientId, ...updates } = body;
        if (!patientId) {
            res.status(400).json({ error: 'patientId é obrigatório' });
            return;
        }
        const pool = (0, init_1.getPool)();
        const existing = await pool.query('SELECT * FROM patients WHERE id = $1 AND organization_id = $2', [patientId, organizationId]);
        if (existing.rows.length === 0) {
            res.status(404).json({ error: 'Paciente não encontrado' });
            return;
        }
        const allowedFields = ['name', 'cpf', 'email', 'phone', 'birth_date', 'gender', 'medical_history', 'main_condition', 'status', 'progress'];
        const setClauses = [];
        const values = [];
        let paramCount = 0;
        for (const field of allowedFields) {
            if (field in updates) {
                paramCount++;
                setClauses.push(`${field} = $${paramCount}`);
                values.push(field === 'cpf' ? (updates[field]?.replace?.(/\D/g, '') || null) : updates[field]);
            }
        }
        if (setClauses.length === 0) {
            res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
            return;
        }
        paramCount++;
        setClauses.push(`updated_at = $${paramCount}`);
        values.push(new Date());
        values.push(patientId, organizationId);
        const result = await pool.query(`UPDATE patients SET ${setClauses.join(', ')} WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2} RETURNING *`, values);
        const patient = result.rows[0];
        // [SYNC] Write to Firestore for legacy frontend compatibility
        try {
            const db = admin.firestore();
            await db.collection('patients').doc(patientId).set({
                ...patient,
                updated_at: new Date()
            }, { merge: true });
            logger_1.logger.info(`[updatePatientHttp] Patient ${patientId} synced to Firestore`);
        }
        catch (fsError) {
            logger_1.logger.error(`[updatePatientHttp] Failed to sync patient ${patientId} to Firestore:`, fsError);
        }
        try {
            const realtime = await Promise.resolve().then(() => __importStar(require('../realtime/publisher')));
            await realtime.publishPatientEvent(organizationId, { event: 'UPDATE', new: patient, old: existing.rows[0] });
        }
        catch (err) {
            logger_1.logger.error('Erro ao publicar evento no Ably:', err);
        }
        res.json({ data: patient });
    }
    catch (error) {
        if (error instanceof https_1.HttpsError && error.code === 'unauthenticated') {
            res.status(401).json({ error: error.message });
            return;
        }
        logger_1.logger.error('Error in updatePatientHttp:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao atualizar paciente' });
    }
});
/**
 * HTTP version of deletePatient for CORS/compatibility
 */
exports.deletePatientHttp = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 100,
    cors: true,
}, async (req, res) => {
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
        const body = typeof req.body === 'string' ? (() => { try {
            return JSON.parse(req.body || '{}');
        }
        catch {
            return {};
        } })() : (req.body || {});
        const { patientId } = body;
        if (!patientId) {
            res.status(400).json({ error: 'patientId é obrigatório' });
            return;
        }
        const pool = (0, init_1.getPool)();
        const result = await pool.query('UPDATE patients SET is_active = false, updated_at = NOW() WHERE id = $1 AND organization_id = $2 RETURNING *', [patientId, organizationId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Paciente não encontrado' });
            return;
        }
        // [SYNC] Sync soft-delete to Firestore
        try {
            const db = admin.firestore();
            await db.collection('patients').doc(patientId).update({
                is_active: false,
                updated_at: new Date()
            });
            logger_1.logger.info(`[deletePatientHttp] Patient ${patientId} soft-deleted in Firestore`);
        }
        catch (fsError) {
            logger_1.logger.error(`[deletePatientHttp] Failed to sync deletion of ${patientId} to Firestore:`, fsError);
        }
        try {
            const realtime = await Promise.resolve().then(() => __importStar(require('../realtime/publisher')));
            await realtime.publishPatientEvent(organizationId, { event: 'DELETE', new: null, old: result.rows[0] });
        }
        catch (err) {
            logger_1.logger.error('Erro ao publicar evento no Ably:', err);
        }
        res.json({ success: true });
    }
    catch (error) {
        if (error instanceof https_1.HttpsError && error.code === 'unauthenticated') {
            res.status(401).json({ error: error.message });
            return;
        }
        logger_1.logger.error('Error in deletePatientHttp:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao excluir paciente' });
    }
});
// ============================================================================
// ORIGINAL CALLABLE VERSION
// ============================================================================
/**
 * Lista pacientes com filtros opcionais
 */
exports.listPatients = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    console.log('[listPatients] ===== START =====');
    if (!request.auth || !request.auth.token) {
        logger_1.logger.error('[listPatients] Unauthenticated request');
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    console.log('[listPatients] Auth token present, uid:', request.auth.uid);
    // App Check temporariamente desabilitado - deve ser configurado no frontend primeiro
    // verifyAppCheck(request);
    console.log('[listPatients] App Check check skipped (not configured)');
    // Verificar rate limit
    await (0, rate_limit_1.enforceRateLimit)(request, rate_limit_1.RATE_LIMITS.callable);
    console.log('[listPatients] Rate limit check passed');
    // Obter organization_id do usuário via Firestore (mais confiável que PostgreSQL)
    let organizationId;
    try {
        const profileDoc = await admin.firestore().collection('profiles').doc(request.auth.uid).get();
        if (!profileDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Perfil não encontrado');
        }
        const profile = profileDoc.data();
        organizationId = profile?.organizationId || profile?.activeOrganizationId || profile?.organizationIds?.[0];
        if (!organizationId) {
            throw new https_1.HttpsError('not-found', 'Organization ID não encontrado no perfil');
        }
    }
    catch (error) {
        logger_1.logger.error('[listPatients] Error getting organization:', error);
        throw new https_1.HttpsError('not-found', 'Perfil não encontrado');
    }
    const { status, search, limit = 50, offset = 0 } = request.data;
    const pool = (0, init_1.getPool)();
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
        const params = [organizationId];
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
        const countParams = [organizationId];
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
            total: parseInt(countResult.rows[0].total, 10),
            page: Math.floor(offset / limit) + 1,
            perPage: limit,
        };
    }
    catch (error) {
        logger_1.logger.error('Error in listPatients:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        const errorMessage = error instanceof Error ? error.message : 'Erro interno ao listar pacientes';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Busca um paciente por ID
 */
exports.getPatient = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    // Verificar App Check
    (0, app_check_1.verifyAppCheck)(request);
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { patientId, profileId } = request.data;
    if (!patientId && !profileId) {
        throw new https_1.HttpsError('invalid-argument', 'patientId ou profileId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        let query = 'SELECT * FROM patients WHERE organization_id = $1';
        const params = [auth.organizationId];
        if (patientId) {
            query += ' AND id = $2';
            params.push(patientId);
        }
        else if (profileId) {
            query += ' AND profile_id = $2';
            params.push(profileId);
        }
        const result = await pool.query(query, params);
        if (result.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
        }
        return { data: result.rows[0] };
    }
    catch (error) {
        logger_1.logger.error('Error in getPatient:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro interno ao buscar paciente';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Cria um novo paciente
 */
exports.createPatient = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    logger_1.logger.debug('[createPatient] ===== START =====');
    if (!request.auth || !request.auth.token) {
        logger_1.logger.error('[createPatient] Unauthenticated request');
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    logger_1.logger.debug('[createPatient] Auth token present, uid:', request.auth.uid);
    let auth;
    let data;
    try {
        // Verificar App Check
        (0, app_check_1.verifyAppCheck)(request);
        logger_1.logger.debug('[createPatient] App Check verified');
        // Verificar rate limit
        await (0, rate_limit_1.enforceRateLimit)(request, rate_limit_1.RATE_LIMITS.callable);
        logger_1.logger.debug('[createPatient] Rate limit check passed');
        auth = await (0, auth_1.authorizeRequest)(request.auth.token);
        data = request.data;
    }
    catch (earlyError) {
        const msg = earlyError instanceof Error ? earlyError.message : String(earlyError);
        logger_1.logger.error('[createPatient] Error before try block:', earlyError);
        if (earlyError instanceof https_1.HttpsError)
            throw earlyError;
        throw new https_1.HttpsError('invalid-argument', `[createPatient] ${msg}`);
    }
    // DEBUG: Log organization_id ao criar paciente
    logger_1.logger.debug('[createPatient] auth.organizationId:', auth.organizationId);
    logger_1.logger.debug('[createPatient] auth.userId:', auth.userId);
    logger_1.logger.debug('[createPatient] data:', JSON.stringify({ name: data.name, phone: data.phone }));
    // Validar campos obrigatórios
    if (!data.name) {
        throw new https_1.HttpsError('invalid-argument', 'name é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        // Verificar duplicidade de CPF
        if (data.cpf) {
            const existing = await pool.query('SELECT id FROM patients WHERE cpf = $1 AND organization_id = $2', [data.cpf.replace(/\D/g, ''), auth.organizationId]);
            if (existing.rows.length > 0) {
                throw new https_1.HttpsError('already-exists', 'Já existe um paciente com este CPF');
            }
        }
        // [AUTO-FIX] Ensure organization exists to satisfy FK constraint
        logger_1.logger.debug('[createPatient] Target Org ID:', auth.organizationId);
        const orgInsertSql = `INSERT INTO organizations (id, name, email)
       VALUES ($1, 'Clínica Principal', 'admin@fisioflow.com.br')
       ON CONFLICT (id) DO NOTHING`;
        logger_1.logger.debug('[createPatient] Org Insert SQL:', orgInsertSql);
        await pool.query(orgInsertSql, [auth.organizationId]);
        // Valores padrão para cadastro rápido (birth_date e main_condition NOT NULL em alguns schemas)
        const birthDate = data.birth_date || '1900-01-01';
        const mainCondition = data.main_condition || 'A definir';
        // Normalizar status para enum patient_status (Inicial, Em_Tratamento, Recuperacao, Concluido)
        const validStatuses = ['Inicial', 'Em_Tratamento', 'Recuperacao', 'Concluido'];
        const rawStatus = data.status || 'Inicial';
        const status = validStatuses.includes(rawStatus) ? rawStatus : 'Inicial';
        // Inserir paciente
        let result;
        try {
            result = await pool.query(`INSERT INTO patients (
          name, cpf, email, phone, birth_date, gender,
          address, emergency_contact, medical_history,
          main_condition, status, organization_id, incomplete_registration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`, [
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
            ]);
        }
        catch (insertErr) {
            const errMsg = insertErr instanceof Error ? insertErr.message : String(insertErr);
            if (/incomplete_registration|column.*does not exist/i.test(errMsg)) {
                result = await pool.query(`INSERT INTO patients (
            name, cpf, email, phone, birth_date, gender,
            address, emergency_contact, medical_history,
            main_condition, status, organization_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *`, [
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
                ]);
            }
            else {
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
            logger_1.logger.info(`[createPatient] Patient ${patient.id} synced to Firestore`);
        }
        catch (fsError) {
            logger_1.logger.error(`[createPatient] Failed to sync patient ${patient.id} to Firestore:`, fsError);
        }
        logger_1.logger.debug('[createPatient] Patient created:', JSON.stringify({
            id: patient.id,
            name: patient.name,
            organization_id: patient.organization_id,
            is_active: patient.is_active
        }));
        // Publicar no Ably para atualização em tempo real
        try {
            const realtime = await Promise.resolve().then(() => __importStar(require('../realtime/publisher')));
            await realtime.publishPatientEvent(auth.organizationId, {
                event: 'INSERT',
                new: patient,
                old: null,
            });
        }
        catch (err) {
            logger_1.logger.error('Erro ao publicar evento no Ably:', err);
        }
        return { data: patient };
    }
    catch (error) {
        logger_1.logger.error('Error in createPatient:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro interno ao criar paciente';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Atualiza um paciente existente
 */
exports.updatePatient = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    // Verificar App Check
    (0, app_check_1.verifyAppCheck)(request);
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { patientId, ...updates } = request.data;
    if (!patientId) {
        throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        // Verificar se paciente existe e pertence à organização
        const existing = await pool.query('SELECT * FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
        if (existing.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
        }
        // Construir SET dinâmico
        const setClauses = [];
        const values = [];
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
                }
                else {
                    values.push(updates[field]);
                }
            }
        }
        if (setClauses.length === 0) {
            throw new https_1.HttpsError('invalid-argument', 'Nenhum campo válido para atualizar');
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
            logger_1.logger.info(`[updatePatient] Patient ${patientId} synced to Firestore`);
        }
        catch (fsError) {
            logger_1.logger.error(`[updatePatient] Failed to sync patient ${patientId} to Firestore:`, fsError);
        }
        // Publicar no Ably
        try {
            const realtime = await Promise.resolve().then(() => __importStar(require('../realtime/publisher')));
            await realtime.publishPatientEvent(auth.organizationId, {
                event: 'UPDATE',
                new: patient,
                old: existing.rows[0],
            });
        }
        catch (err) {
            logger_1.logger.error('Erro ao publicar evento no Ably:', err);
        }
        return { data: patient };
    }
    catch (error) {
        logger_1.logger.error('Error in updatePatient:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro interno ao atualizar paciente';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Remove (soft delete) um paciente
 */
exports.deletePatient = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    // Verificar App Check
    (0, app_check_1.verifyAppCheck)(request);
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { patientId } = request.data;
    if (!patientId) {
        throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        // Soft delete
        const result = await pool.query(`UPDATE patients
       SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *`, [patientId, auth.organizationId]);
        if (result.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
        }
        // [SYNC] Sync soft-delete to Firestore
        try {
            const db = admin.firestore();
            await db.collection('patients').doc(patientId).update({
                is_active: false,
                updated_at: new Date()
            });
            logger_1.logger.info(`[deletePatient] Patient ${patientId} soft-deleted in Firestore`);
        }
        catch (fsError) {
            logger_1.logger.error(`[deletePatient] Failed to sync deletion of ${patientId} to Firestore:`, fsError);
        }
        // Publicar no Ably
        try {
            const realtime = await Promise.resolve().then(() => __importStar(require('../realtime/publisher')));
            await realtime.publishPatientEvent(auth.organizationId, {
                event: 'DELETE',
                new: null,
                old: result.rows[0],
            });
        }
        catch (err) {
            logger_1.logger.error('Erro ao publicar evento no Ably:', err);
        }
        return { success: true };
    }
    catch (error) {
        logger_1.logger.error('Error in deletePatient:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro interno ao excluir paciente';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Busca estatísticas de um paciente
 */
exports.getPatientStats = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    (0, app_check_1.verifyAppCheck)(request);
    console.log('App Check verified');
    (0, app_check_1.verifyAppCheck)(request);
    // App Check verified");
    const { patientId } = request.data;
    if (!patientId) {
        throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        // Verificar se paciente pertence à organização
        const patient = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
        if (patient.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
        }
        // Buscar estatísticas
        const [appointmentsResult, sessionsResult, plansResult,] = await Promise.all([
            pool.query(`SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'concluido') as completed,
          COUNT(*) FILTER (WHERE status = 'agendado') as scheduled,
          COUNT(*) FILTER (WHERE date >= CURRENT_DATE) as upcoming
        FROM appointments
        WHERE patient_id = $1`, [patientId]),
            pool.query(`SELECT COUNT(*) as total_sessions
        FROM treatment_sessions
        WHERE patient_id = $1`, [patientId]),
            pool.query(`SELECT COUNT(*) as active_plans
        FROM exercise_plans
        WHERE patient_id = $1 AND status = 'ativo'`, [patientId]),
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
    }
    catch (error) {
        logger_1.logger.error('Error in getPatientStats:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro interno ao buscar estatísticas';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
//# sourceMappingURL=patients.js.map