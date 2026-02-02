"use strict";
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
exports.savePainRecord = exports.getPainRecords = exports.updateTreatmentSession = exports.createTreatmentSession = exports.listTreatmentSessions = exports.updateMedicalRecord = exports.createMedicalRecord = exports.getPatientRecords = exports.savePainRecordHttp = exports.getPainRecordsHttp = exports.createTreatmentSessionHttp = exports.listTreatmentSessionsHttp = exports.deleteMedicalRecordHttp = exports.updateMedicalRecordHttp = exports.createMedicalRecordHttp = exports.getPatientRecordsHttp = void 0;
const https_1 = require("firebase-functions/v2/https");
const init_1 = require("../init");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../lib/logger");
function setCorsHeaders(res) { res.set('Access-Control-Allow-Origin', '*'); res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization'); }
function parseBody(req) { return typeof req.body === 'string' ? (() => { try {
    return JSON.parse(req.body || '{}');
}
catch {
    return {};
} })() : (req.body || {}); }
const httpOpts = { region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: true };
exports.getPatientRecordsHttp = (0, https_1.onRequest)(httpOpts, async (req, res) => {
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
        const auth = await (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(req.headers.authorization || req.headers.Authorization));
        const { patientId, type, limit = 50 } = parseBody(req);
        if (!patientId) {
            res.status(400).json({ error: 'patientId é obrigatório' });
            return;
        }
        const pool = (0, init_1.getPool)();
        const patientQuery = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
        if (patientQuery.rows.length === 0) {
            res.status(404).json({ error: 'Paciente não encontrado' });
            return;
        }
        let query = `SELECT mr.*, p.full_name as created_by_name FROM medical_records mr LEFT JOIN profiles p ON mr.created_by = p.user_id WHERE mr.patient_id = $1 AND mr.organization_id = $2`;
        const params = [patientId, auth.organizationId];
        if (type) {
            query += ` AND mr.type = $3`;
            params.push(type);
        }
        query += ` ORDER BY mr.record_date DESC, mr.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);
        const result = await pool.query(query, params);
        res.json({ data: result.rows });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('getPatientRecordsHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
    }
});
exports.createMedicalRecordHttp = (0, https_1.onRequest)(httpOpts, async (req, res) => {
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
        const auth = await (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(req.headers.authorization || req.headers.Authorization));
        const { patientId, type, title, content, recordDate } = parseBody(req);
        if (!patientId || !type || !title) {
            res.status(400).json({ error: 'patientId, type e title são obrigatórios' });
            return;
        }
        const pool = (0, init_1.getPool)();
        const patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
        if (patientCheck.rows.length === 0) {
            res.status(404).json({ error: 'Paciente não encontrado' });
            return;
        }
        const result = await pool.query(`INSERT INTO medical_records (patient_id, created_by, organization_id, type, title, content, record_date) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [patientId, auth.userId, auth.organizationId, type, title, content || '', recordDate || new Date().toISOString().split('T')[0]]);
        try {
            const realtime = await Promise.resolve().then(() => __importStar(require('../realtime/publisher')));
            await realtime.publishPatientUpdate(patientId, { type: 'medical_record_created', recordId: result.rows[0].id });
        }
        catch (er) {
            logger_1.logger.error('Ably:', er);
        }
        res.status(201).json({ data: result.rows[0] });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('createMedicalRecordHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
    }
});
exports.updateMedicalRecordHttp = (0, https_1.onRequest)(httpOpts, async (req, res) => {
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
        const auth = await (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(req.headers.authorization || req.headers.Authorization));
        const { recordId, ...updates } = parseBody(req);
        if (!recordId) {
            res.status(400).json({ error: 'recordId é obrigatório' });
            return;
        }
        const pool = (0, init_1.getPool)();
        const existing = await pool.query('SELECT id FROM medical_records WHERE id = $1 AND organization_id = $2', [recordId, auth.organizationId]);
        if (existing.rows.length === 0) {
            res.status(404).json({ error: 'Prontuário não encontrado' });
            return;
        }
        const setClauses = [];
        const values = [];
        let pc = 0;
        for (const f of ['title', 'content']) {
            if (f in updates) {
                pc++;
                setClauses.push(`${f} = $${pc}`);
                values.push(updates[f]);
            }
        }
        if (setClauses.length === 0) {
            res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
            return;
        }
        pc++;
        setClauses.push(`updated_at = $${pc}`);
        values.push(new Date());
        values.push(recordId, auth.organizationId);
        const result = await pool.query(`UPDATE medical_records SET ${setClauses.join(', ')} WHERE id = $${pc + 1} AND organization_id = $${pc + 2} RETURNING *`, values);
        res.json({ data: result.rows[0] });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('updateMedicalRecordHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
    }
});
exports.deleteMedicalRecordHttp = (0, https_1.onRequest)(httpOpts, async (req, res) => {
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
        const auth = await (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(req.headers.authorization || req.headers.Authorization));
        const { recordId } = parseBody(req);
        if (!recordId) {
            res.status(400).json({ error: 'recordId é obrigatório' });
            return;
        }
        const result = await (0, init_1.getPool)().query('DELETE FROM medical_records WHERE id = $1 AND organization_id = $2 RETURNING id', [recordId, auth.organizationId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Prontuário não encontrado' });
            return;
        }
        res.json({ success: true });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('deleteMedicalRecordHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
    }
});
exports.listTreatmentSessionsHttp = (0, https_1.onRequest)(httpOpts, async (req, res) => {
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
        const auth = await (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(req.headers.authorization || req.headers.Authorization));
        const { patientId, limit = 20 } = parseBody(req);
        if (!patientId) {
            res.status(400).json({ error: 'patientId é obrigatório' });
            return;
        }
        const result = await (0, init_1.getPool)().query(`SELECT ts.*, p.name as patient_name, prof.full_name as therapist_name, a.date as appointment_date FROM treatment_sessions ts LEFT JOIN patients p ON ts.patient_id=p.id LEFT JOIN profiles prof ON ts.therapist_id=prof.user_id LEFT JOIN appointments a ON ts.appointment_id=a.id WHERE ts.patient_id=$1 AND ts.organization_id=$2 ORDER BY ts.session_date DESC, ts.created_at DESC LIMIT $3`, [patientId, auth.organizationId, limit]);
        res.json({ data: result.rows });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('listTreatmentSessionsHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
    }
});
exports.createTreatmentSessionHttp = (0, https_1.onRequest)(httpOpts, async (req, res) => {
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
        const auth = await (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(req.headers.authorization || req.headers.Authorization));
        const { patientId, appointmentId, painLevelBefore, painLevelAfter, observations, evolution, nextGoals } = parseBody(req);
        if (!patientId) {
            res.status(400).json({ error: 'patientId é obrigatório' });
            return;
        }
        const pool = (0, init_1.getPool)();
        let appointmentDate = null;
        let therapistId = auth.userId;
        if (appointmentId) {
            const apt = await pool.query('SELECT date, therapist_id FROM appointments WHERE id = $1 AND organization_id = $2', [appointmentId, auth.organizationId]);
            if (apt.rows.length > 0) {
                appointmentDate = apt.rows[0].date;
                therapistId = apt.rows[0].therapist_id;
            }
        }
        const result = await pool.query(`INSERT INTO treatment_sessions (patient_id, therapist_id, appointment_id, organization_id, pain_level_before, pain_level_after, observations, evolution, next_session_goals, session_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [patientId, therapistId, appointmentId || null, auth.organizationId, painLevelBefore || null, painLevelAfter || null, observations || null, evolution || null, nextGoals || null, appointmentDate || new Date().toISOString().split('T')[0]]);
        res.status(201).json({ data: result.rows[0] });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('createTreatmentSessionHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
    }
});
exports.getPainRecordsHttp = (0, https_1.onRequest)(httpOpts, async (req, res) => {
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
        const auth = await (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(req.headers.authorization || req.headers.Authorization));
        const { patientId } = parseBody(req);
        if (!patientId) {
            res.status(400).json({ error: 'patientId é obrigatório' });
            return;
        }
        const pool = (0, init_1.getPool)();
        const patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
        if (patientCheck.rows.length === 0) {
            res.status(404).json({ error: 'Paciente não encontrado' });
            return;
        }
        const result = await pool.query('SELECT * FROM pain_records WHERE patient_id = $1 AND organization_id = $2 ORDER BY record_date DESC', [patientId, auth.organizationId]);
        res.json({ data: result.rows });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('getPainRecordsHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
    }
});
exports.savePainRecordHttp = (0, https_1.onRequest)(httpOpts, async (req, res) => {
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
        const auth = await (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(req.headers.authorization || req.headers.Authorization));
        const { patientId, painLevel, recordDate, notes } = parseBody(req);
        if (!patientId || painLevel === undefined) {
            res.status(400).json({ error: 'patientId e painLevel são obrigatórios' });
            return;
        }
        const pool = (0, init_1.getPool)();
        const patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
        if (patientCheck.rows.length === 0) {
            res.status(404).json({ error: 'Paciente não encontrado' });
            return;
        }
        const result = await pool.query('INSERT INTO pain_records (patient_id, organization_id, pain_level, record_date, notes, recorded_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [patientId, auth.organizationId, painLevel, recordDate || new Date().toISOString().split('T')[0], notes || null, auth.userId]);
        res.status(201).json({ data: result.rows[0] });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('savePainRecordHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
    }
});
exports.getPatientRecords = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { patientId, type, limit = 50 } = request.data;
    if (!patientId) {
        throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        // Verificar se paciente pertence à organização
        const patientQuery = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
        if (patientQuery.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
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
        const params = [patientId, auth.organizationId];
        if (type) {
            query += ` AND mr.type = $3`;
            params.push(type);
        }
        query += ` ORDER BY mr.record_date DESC, mr.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);
        const result = await pool.query(query, params);
        return { data: result.rows };
    }
    catch (error) {
        logger_1.logger.error('Error in getPatientRecords:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar prontuários';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
exports.createMedicalRecord = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { patientId, type, title, content, recordDate, } = request.data;
    if (!patientId || !type || !title) {
        throw new https_1.HttpsError('invalid-argument', 'patientId, type e title são obrigatórios');
    }
    const pool = (0, init_1.getPool)();
    try {
        // Verificar se paciente existe
        const patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
        if (patientCheck.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
        }
        // Inserir prontuário
        const result = await pool.query(`INSERT INTO medical_records (
        patient_id, created_by, organization_id,
        type, title, content, record_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`, [
            patientId,
            auth.userId,
            auth.organizationId,
            type,
            title,
            content || '',
            recordDate || new Date().toISOString().split('T')[0],
        ]);
        // Publicar no Ably
        try {
            const realtime = await Promise.resolve().then(() => __importStar(require('../realtime/publisher')));
            await realtime.publishPatientUpdate(patientId, {
                type: 'medical_record_created',
                recordId: result.rows[0].id,
            });
        }
        catch (e) {
            logger_1.logger.error('Error publishing to Ably:', e);
        }
        return { data: result.rows[0] };
    }
    catch (error) {
        logger_1.logger.error('Error in createMedicalRecord:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao criar prontuário';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
exports.updateMedicalRecord = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { recordId, ...updates } = request.data;
    if (!recordId) {
        throw new https_1.HttpsError('invalid-argument', 'recordId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        // Verificar se prontuário existe
        const existing = await pool.query('SELECT id FROM medical_records WHERE id = $1 AND organization_id = $2', [recordId, auth.organizationId]);
        if (existing.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Prontuário não encontrado');
        }
        // Construir SET dinâmico
        const setClauses = [];
        const values = [];
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
            throw new https_1.HttpsError('invalid-argument', 'Nenhum campo válido para atualizar');
        }
        paramCount++;
        setClauses.push(`updated_at = $${paramCount}`);
        values.push(new Date());
        values.push(recordId, auth.organizationId);
        const result = await pool.query(`UPDATE medical_records
       SET ${setClauses.join(', ')}
       WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2}
       RETURNING *`, values);
        return { data: result.rows[0] };
    }
    catch (error) {
        logger_1.logger.error('Error in updateMedicalRecord:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar prontuário';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
exports.listTreatmentSessions = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { patientId, limit = 20 } = request.data;
    if (!patientId) {
        throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        const result = await pool.query(`SELECT
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
      LIMIT $3`, [patientId, auth.organizationId, limit]);
        return { data: result.rows };
    }
    catch (error) {
        logger_1.logger.error('Error in listTreatmentSessions:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao listar sessões';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
exports.createTreatmentSession = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { patientId, appointmentId, painLevelBefore, painLevelAfter, observations, evolution, nextGoals, } = request.data;
    if (!patientId) {
        throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        // Buscar dados do appointment se fornecido
        let appointmentDate = null;
        let therapistId = auth.userId;
        if (appointmentId) {
            const apt = await pool.query('SELECT date, therapist_id FROM appointments WHERE id = $1 AND organization_id = $2', [appointmentId, auth.organizationId]);
            if (apt.rows.length > 0) {
                appointmentDate = apt.rows[0].date;
                therapistId = apt.rows[0].therapist_id;
            }
        }
        // Inserir sessão
        const result = await pool.query(`INSERT INTO treatment_sessions (
        patient_id, therapist_id, appointment_id,
        organization_id, pain_level_before, pain_level_after,
        observations, evolution, next_session_goals,
        session_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`, [
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
        ]);
        // Atualizar progresso se houver mudança na dor
        if (painLevelAfter !== undefined && painLevelBefore !== undefined) {
            try {
                await pool.query(`INSERT INTO patient_progress (
            patient_id, assessment_date, pain_level,
            organization_id, recorded_by
          ) VALUES ($1, CURRENT_DATE, $2, $3, $4)`, [
                    patientId,
                    painLevelAfter,
                    auth.organizationId,
                    auth.userId,
                ]);
            }
            catch (e) {
                logger_1.logger.error('Error recording patient progress:', e);
            }
        }
        return { data: result.rows[0] };
    }
    catch (error) {
        logger_1.logger.error('Error in createTreatmentSession:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao criar sessão';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
exports.updateTreatmentSession = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { sessionId, ...updates } = request.data;
    if (!sessionId) {
        throw new https_1.HttpsError('invalid-argument', 'sessionId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        // Verificar se sessão existe
        const existing = await pool.query('SELECT id FROM treatment_sessions WHERE id = $1 AND organization_id = $2', [sessionId, auth.organizationId]);
        if (existing.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Sessão não encontrada');
        }
        // Construir SET dinâmico
        const setClauses = [];
        const values = [];
        let paramCount = 0;
        const allowedFields = ['pain_level_before', 'pain_level_after', 'observations', 'evolution', 'next_session_goals'];
        // Map camelCase to snake_case if necessary, but here keys match allowedFields logic except for case if mismatched.
        // However, input keys seem to be camelCase in previous file but allowedFields were snake_case.
        // Let's standardise on expecting camelCase in request but mapping to snake_case db columns.
        const fieldMap = {
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
            throw new https_1.HttpsError('invalid-argument', 'Nenhum campo válido para atualizar');
        }
        paramCount++;
        setClauses.push(`updated_at = $${paramCount}`);
        values.push(new Date());
        values.push(sessionId, auth.organizationId);
        const result = await pool.query(`UPDATE treatment_sessions
       SET ${setClauses.join(', ')}
       WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2}
       RETURNING *`, values);
        return { data: result.rows[0] };
    }
    catch (error) {
        logger_1.logger.error('Error in updateTreatmentSession:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar sessão';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
exports.getPainRecords = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    await (0, auth_1.authorizeRequest)(request.auth.token);
    const { patientId } = request.data;
    if (!patientId) {
        throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        const result = await pool.query(`SELECT
        id, patient_id, pain_level, pain_type,
        body_part, notes, created_at, updated_at
      FROM patient_pain_records
      WHERE patient_id = $1
      ORDER BY created_at DESC`, [patientId]);
        return { data: result.rows };
    }
    catch (error) {
        logger_1.logger.error('Error in getPainRecords:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar registros de dor';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
exports.savePainRecord = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { patientId, level, type, bodyPart, notes } = request.data;
    if (!patientId || level === undefined || !type || !bodyPart) {
        throw new https_1.HttpsError('invalid-argument', 'patientId, level, type e bodyPart são obrigatórios');
    }
    const pool = (0, init_1.getPool)();
    try {
        const result = await pool.query(`INSERT INTO patient_pain_records (
        patient_id, pain_level, pain_type,
        body_part, notes, organization_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`, [
            patientId,
            level,
            type,
            bodyPart,
            notes || null,
            auth.organizationId,
            auth.userId
        ]);
        return { data: result.rows[0] };
    }
    catch (error) {
        logger_1.logger.error('Error in savePainRecord:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar registro de dor';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
//# sourceMappingURL=medical-records.js.map