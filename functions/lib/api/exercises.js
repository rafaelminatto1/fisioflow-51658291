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
exports.mergeExercises = exports.deleteExercise = exports.updateExercise = exports.createExercise = exports.getPrescribedExercises = exports.logExercise = exports.getExerciseCategories = exports.searchSimilarExercises = exports.getExercise = exports.listExercises = exports.mergeExercisesHttp = exports.deleteExerciseHttp = exports.updateExerciseHttp = exports.createExerciseHttp = exports.logExerciseHttp = exports.getPrescribedExercisesHttp = exports.getExerciseCategoriesHttp = exports.getExerciseHttp = exports.searchSimilarExercisesHttp = exports.listExercisesHttp = void 0;
const init_1 = require("../init");
const https_1 = require("firebase-functions/v2/https");
const init_2 = require("../init");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../lib/logger");
const admin = __importStar(require("firebase-admin"));
const firebaseAuth = admin.auth();
function setCorsHeaders(res) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
async function verifyAuthHeader(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.startsWith('Bearer '))
        throw new https_1.HttpsError('unauthenticated', 'No authorization header');
    const token = authHeader.split('Bearer ')[1];
    try {
        const decoded = await firebaseAuth.verifyIdToken(token);
        return { uid: decoded.uid };
    }
    catch {
        throw new https_1.HttpsError('unauthenticated', 'Invalid token');
    }
}
function parseBody(req) {
    return typeof req.body === 'string' ? (() => { try {
        return JSON.parse(req.body || '{}');
    }
    catch {
        return {};
    } })() : (req.body || {});
}
// ============================================================================
// HTTP VERSIONS (CORS fix)
// ============================================================================
exports.listExercisesHttp = (0, https_1.onRequest)({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: true }, async (req, res) => {
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
        await (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(req.headers.authorization || req.headers.Authorization));
        const { category, difficulty, search, limit = 100, offset = 0 } = parseBody(req);
        const pool = (0, init_2.getPool)();
        let query = `SELECT id,name,slug,category,description,instructions,muscles,equipment,difficulty,video_url,thumbnail_url,duration_minutes,sets_recommended,reps_recommended,precautions,benefits,tags FROM exercises WHERE is_active = true`;
        const params = [];
        let paramCount = 0;
        if (category) {
            paramCount++;
            query += ` AND category = $${paramCount}`;
            params.push(category);
        }
        if (difficulty) {
            paramCount++;
            query += ` AND difficulty = $${paramCount}`;
            params.push(difficulty);
        }
        if (search) {
            paramCount++;
            query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }
        query += ` ORDER BY display_order, name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);
        const result = await pool.query(query, params);
        const categoriesResult = await pool.query('SELECT DISTINCT category FROM exercises WHERE is_active = true ORDER BY category');
        res.json({ data: result.rows, categories: categoriesResult.rows.map((r) => r.category) });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('listExercisesHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao listar exercícios' });
    }
});
exports.searchSimilarExercisesHttp = (0, https_1.onRequest)({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: true }, async (req, res) => {
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
        await (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(req.headers.authorization || req.headers.Authorization));
        const { exerciseId, query: searchQuery, limit = 10 } = parseBody(req);
        if (!exerciseId && !searchQuery) {
            res.status(400).json({ error: 'exerciseId ou query é obrigatório' });
            return;
        }
        const pool = (0, init_2.getPool)();
        let result;
        if (exerciseId) {
            const baseResult = await pool.query('SELECT category FROM exercises WHERE id = $1', [exerciseId]);
            if (baseResult.rows.length === 0) {
                res.status(404).json({ error: 'Exercício não encontrado' });
                return;
            }
            result = await pool.query(`SELECT * FROM exercises WHERE is_active = true AND id != $1 AND category = $2 ORDER BY display_order, name LIMIT $3`, [exerciseId, baseResult.rows[0].category, limit]);
        }
        else {
            result = await pool.query(`SELECT * FROM exercises WHERE is_active = true AND (name ILIKE $1 OR description ILIKE $1 OR $1 = ANY(tags)) ORDER BY display_order, name LIMIT $2`, [`%${searchQuery}%`, limit]);
        }
        res.json({ data: result.rows });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('searchSimilarExercisesHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao buscar similares' });
    }
});
exports.getExerciseHttp = (0, https_1.onRequest)({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: true }, async (req, res) => {
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
        await (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(req.headers.authorization || req.headers.Authorization));
        const { exerciseId } = parseBody(req);
        if (!exerciseId) {
            res.status(400).json({ error: 'exerciseId é obrigatório' });
            return;
        }
        const pool = (0, init_2.getPool)();
        const result = await pool.query('SELECT * FROM exercises WHERE id = $1 AND is_active = true', [exerciseId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Exercício não encontrado' });
            return;
        }
        res.json({ data: result.rows[0] });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('getExerciseHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao buscar exercício' });
    }
});
exports.getExerciseCategoriesHttp = (0, https_1.onRequest)({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: true }, async (req, res) => {
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
        await (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(req.headers.authorization || req.headers.Authorization));
        const pool = (0, init_2.getPool)();
        const result = await pool.query('SELECT DISTINCT category FROM exercises WHERE is_active = true ORDER BY category');
        res.json({ data: result.rows.map((r) => ({ id: r.category.toLowerCase().replace(/\s+/g, '-'), name: r.category })) });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('getExerciseCategoriesHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao listar categorias' });
    }
});
exports.getPrescribedExercisesHttp = (0, https_1.onRequest)({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: true }, async (req, res) => {
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
        const pool = (0, init_2.getPool)();
        const patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
        if (patientCheck.rows.length === 0) {
            res.status(404).json({ error: 'Paciente não encontrado' });
            return;
        }
        const result = await pool.query(`SELECT pe.id,pe.patient_id,pe.exercise_id,pe.sets,pe.reps,pe.duration,pe.frequency,pe.is_active,pe.created_at,e.id as exercise_data_id,e.name,e.category,e.difficulty,e.video_url,e.thumbnail_url FROM prescribed_exercises pe JOIN exercises e ON pe.exercise_id=e.id WHERE pe.patient_id=$1 AND pe.is_active=true`, [patientId]);
        const data = result.rows.map((row) => ({ id: row.id, patient_id: row.patient_id, exercise_id: row.exercise_id, sets: row.sets, reps: row.reps, duration: row.duration, frequency: row.frequency, is_active: row.is_active, created_at: row.created_at, exercise: { id: row.exercise_data_id, name: row.name, category: row.category, difficulty_level: row.difficulty, video_url: row.video_url, thumbnail_url: row.thumbnail_url } }));
        res.json({ data });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('getPrescribedExercisesHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao buscar prescrições' });
    }
});
exports.logExerciseHttp = (0, https_1.onRequest)({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: true }, async (req, res) => {
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
        const { patientId, prescriptionId, difficulty, notes } = parseBody(req);
        if (!patientId || !prescriptionId) {
            res.status(400).json({ error: 'patientId e prescriptionId são obrigatórios' });
            return;
        }
        const pool = (0, init_2.getPool)();
        const patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
        if (patientCheck.rows.length === 0) {
            res.status(404).json({ error: 'Paciente não encontrado' });
            return;
        }
        const result = await pool.query(`INSERT INTO exercise_logs (patient_id, prescribed_exercise_id, difficulty_rating, notes, complete_date) VALUES ($1,$2,$3,$4,NOW()) RETURNING *`, [patientId, prescriptionId, difficulty ?? 0, notes || null]);
        res.json({ data: result.rows[0] });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('logExerciseHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao registrar exercício' });
    }
});
exports.createExerciseHttp = (0, https_1.onRequest)({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: true }, async (req, res) => {
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
        if (auth.role !== 'admin' && auth.role !== 'fisioterapeuta') {
            res.status(403).json({ error: 'Permissão insuficiente' });
            return;
        }
        const exercise = parseBody(req);
        const pool = (0, init_2.getPool)();
        const result = await pool.query(`INSERT INTO exercises (name,category,difficulty,description,instructions,muscles,equipment,video_url,thumbnail_url,duration_minutes,sets_recommended,reps_recommended,precautions,benefits,tags,display_order,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,true) RETURNING *`, [exercise.name, exercise.category, exercise.difficulty || 'médio', exercise.description || null, exercise.instructions || null, exercise.muscles || [], exercise.equipment || [], exercise.video_url || null, exercise.thumbnail_url || null, exercise.duration_minutes || 0, exercise.sets_recommended || 3, exercise.reps_recommended || 10, exercise.precautions || null, exercise.benefits || null, exercise.tags || [], exercise.display_order || 0]);
        res.status(201).json({ data: result.rows[0] });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('createExerciseHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao criar exercício' });
    }
});
exports.updateExerciseHttp = (0, https_1.onRequest)({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: true }, async (req, res) => {
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
        if (auth.role !== 'admin' && auth.role !== 'fisioterapeuta') {
            res.status(403).json({ error: 'Permissão insuficiente' });
            return;
        }
        const { id, ...updates } = parseBody(req);
        if (!id) {
            res.status(400).json({ error: 'ID do exercício é obrigatório' });
            return;
        }
        const pool = (0, init_2.getPool)();
        const fields = Object.keys(updates).filter(k => k !== 'id');
        if (fields.length === 0) {
            const result = await pool.query('SELECT * FROM exercises WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                res.status(404).json({ error: 'Exercício não encontrado' });
                return;
            }
            res.json({ data: result.rows[0] });
            return;
        }
        const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
        const values = fields.map(f => updates[f]);
        const result = await pool.query(`UPDATE exercises SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`, [id, ...values]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Exercício não encontrado' });
            return;
        }
        res.json({ data: result.rows[0] });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('updateExerciseHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao atualizar exercício' });
    }
});
exports.deleteExerciseHttp = (0, https_1.onRequest)({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: true }, async (req, res) => {
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
        if (auth.role !== 'admin') {
            res.status(403).json({ error: 'Apenas administradores podem excluir' });
            return;
        }
        const { id } = parseBody(req);
        if (!id) {
            res.status(400).json({ error: 'ID do exercício é obrigatório' });
            return;
        }
        const pool = (0, init_2.getPool)();
        const result = await pool.query('UPDATE exercises SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Exercício não encontrado' });
            return;
        }
        res.json({ success: true });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('deleteExerciseHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao excluir exercício' });
    }
});
exports.mergeExercisesHttp = (0, https_1.onRequest)({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: true }, async (req, res) => {
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
        if (auth.role !== 'admin') {
            res.status(403).json({ error: 'Apenas administradores podem unir' });
            return;
        }
        const { keepId, mergeIds } = parseBody(req);
        if (!keepId || !mergeIds?.length) {
            res.status(400).json({ error: 'keepId e mergeIds são obrigatórios' });
            return;
        }
        const pool = (0, init_2.getPool)();
        for (const mid of mergeIds) {
            await pool.query('UPDATE prescribed_exercises SET exercise_id = $1 WHERE exercise_id = $2', [keepId, mid]);
            await pool.query('UPDATE exercises SET is_active = false WHERE id = $1', [mid]);
        }
        res.json({ success: true, deletedCount: mergeIds.length });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('mergeExercisesHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao unir exercícios' });
    }
});
exports.listExercises = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    await (0, auth_1.authorizeRequest)(request.auth.token);
    const { category, difficulty, search, limit = 100, offset = 0 } = request.data;
    const pool = (0, init_2.getPool)();
    try {
        let query = `
      SELECT
        id, name, slug, category, description,
        instructions, muscles, equipment, difficulty,
        video_url, thumbnail_url, duration_minutes,
        sets_recommended, reps_recommended, precautions,
        benefits, tags
      FROM exercises
      WHERE is_active = true
    `;
        const params = [];
        let paramCount = 0;
        if (category) {
            paramCount++;
            query += ` AND category = $${paramCount}`;
            params.push(category);
        }
        if (difficulty) {
            paramCount++;
            query += ` AND difficulty = $${paramCount}`;
            params.push(difficulty);
        }
        if (search) {
            paramCount++;
            query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }
        query += ` ORDER BY display_order, name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);
        const result = await pool.query(query, params);
        // Buscar categorias distintas
        const categoriesResult = await pool.query(`SELECT DISTINCT category FROM exercises WHERE is_active = true ORDER BY category`);
        return {
            data: result.rows,
            categories: categoriesResult.rows.map((r) => r.category),
        };
    }
    catch (error) {
        logger_1.logger.error('Error in listExercises:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao listar exercícios';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
exports.getExercise = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    await (0, auth_1.authorizeRequest)(request.auth.token);
    const { exerciseId } = request.data;
    if (!exerciseId) {
        throw new https_1.HttpsError('invalid-argument', 'exerciseId é obrigatório');
    }
    const pool = (0, init_2.getPool)();
    try {
        const result = await pool.query(`SELECT * FROM exercises WHERE id = $1 AND is_active = true`, [exerciseId]);
        if (result.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Exercício não encontrado');
        }
        return { data: result.rows[0] };
    }
    catch (error) {
        logger_1.logger.error('Error in getExercise:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar exercício';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
exports.searchSimilarExercises = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    await (0, auth_1.authorizeRequest)(request.auth.token);
    const { exerciseId, query: searchQuery, limit = 10 } = request.data;
    if (!exerciseId && !searchQuery) {
        throw new https_1.HttpsError('invalid-argument', 'exerciseId ou query é obrigatório');
    }
    const pool = (0, init_2.getPool)();
    try {
        let result;
        if (exerciseId) {
            // Buscar exercício base para pegar categoria
            const baseResult = await pool.query('SELECT category FROM exercises WHERE id = $1', [exerciseId]);
            if (baseResult.rows.length === 0) {
                throw new https_1.HttpsError('not-found', 'Exercício não encontrado');
            }
            const baseExercise = baseResult.rows[0];
            // Buscar exercícios similares da mesma categoria
            result = await pool.query(`SELECT * FROM exercises
         WHERE is_active = true
           AND id != $1
           AND category = $2
         ORDER BY display_order, name
         LIMIT $3`, [exerciseId, baseExercise.category, limit]);
        }
        else {
            // Busca textual
            result = await pool.query(`SELECT * FROM exercises
         WHERE is_active = true
           AND (name ILIKE $1 OR description ILIKE $1 OR $1 = ANY(tags))
         ORDER BY display_order, name
         LIMIT $2`, [`%${searchQuery}%`, limit]);
        }
        return { data: result.rows };
    }
    catch (error) {
        logger_1.logger.error('Error in searchSimilarExercises:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar exercícios similares';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
exports.getExerciseCategories = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    await (0, auth_1.authorizeRequest)(request.auth.token);
    const pool = (0, init_2.getPool)();
    try {
        const result = await pool.query(`SELECT DISTINCT category
       FROM exercises
       WHERE is_active = true
       ORDER BY category`);
        return {
            data: result.rows.map((r) => ({
                id: r.category.toLowerCase().replace(/\s+/g, '-'),
                name: r.category,
            })),
        };
    }
    catch (error) {
        logger_1.logger.error('Error in getExerciseCategories:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao listar categorias';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
exports.logExercise = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { patientId, prescriptionId, difficulty, notes } = request.data;
    if (!patientId || !prescriptionId) {
        throw new https_1.HttpsError('invalid-argument', 'patientId e prescriptionId são obrigatórios');
    }
    const pool = (0, init_2.getPool)();
    try {
        // Verificar se paciente pertence à organização
        const patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
        if (patientCheck.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
        }
        const result = await pool.query(`INSERT INTO exercise_logs (
        patient_id, prescribed_exercise_id,
        difficulty_rating, notes, complete_date
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING *`, [
            patientId,
            prescriptionId,
            difficulty,
            notes || null,
        ]);
        return { data: result.rows[0] };
    }
    catch (error) {
        logger_1.logger.error('Error in logExercise:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao registrar exercício';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
exports.getPrescribedExercises = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { patientId } = request.data;
    if (!patientId) {
        throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
    }
    const pool = (0, init_2.getPool)();
    try {
        // Verificar se paciente pertence à organização
        const patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
        if (patientCheck.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
        }
        const result = await pool.query(`SELECT
        pe.id, pe.patient_id, pe.exercise_id, pe.sets, pe.reps,
        pe.duration, pe.frequency, pe.is_active, pe.created_at,
        e.id as exercise_data_id, e.name, e.category, e.difficulty,
        e.video_url, e.thumbnail_url
      FROM prescribed_exercises pe
      JOIN exercises e ON pe.exercise_id = e.id
      WHERE pe.patient_id = $1
        AND pe.is_active = true`, [patientId]);
        const data = result.rows.map((row) => ({
            id: row.id,
            patient_id: row.patient_id,
            exercise_id: row.exercise_id,
            sets: row.sets,
            reps: row.reps,
            duration: row.duration,
            frequency: row.frequency,
            is_active: row.is_active,
            created_at: row.created_at,
            exercise: {
                id: row.exercise_data_id,
                name: row.name,
                category: row.category,
                difficulty_level: row.difficulty,
                video_url: row.video_url,
                thumbnail_url: row.thumbnail_url
            }
        }));
        return { data };
    }
    catch (error) {
        logger_1.logger.error('Error in getPrescribedExercises:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar prescrições';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
exports.createExercise = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    if (auth.role !== 'admin' && auth.role !== 'fisioterapeuta') {
        throw new https_1.HttpsError('permission-denied', 'Permissão insuficiente para criar exercícios');
    }
    const exercise = request.data;
    const pool = (0, init_2.getPool)();
    try {
        const result = await pool.query(`INSERT INTO exercises (
        name, category, difficulty, description, instructions,
        muscles, equipment, video_url, thumbnail_url,
        duration_minutes, sets_recommended, reps_recommended,
        precautions, benefits, tags, display_order, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, true)
      RETURNING *`, [
            exercise.name,
            exercise.category,
            exercise.difficulty || 'médio',
            exercise.description || null,
            exercise.instructions || null,
            exercise.muscles || [],
            exercise.equipment || [],
            exercise.video_url || null,
            exercise.thumbnail_url || null,
            exercise.duration_minutes || 0,
            exercise.sets_recommended || 3,
            exercise.reps_recommended || 10,
            exercise.precautions || null,
            exercise.benefits || null,
            exercise.tags || [],
            exercise.display_order || 0
        ]);
        return { data: result.rows[0] };
    }
    catch (error) {
        logger_1.logger.error('Error in createExercise:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao criar exercício';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
exports.updateExercise = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    if (auth.role !== 'admin' && auth.role !== 'fisioterapeuta') {
        throw new https_1.HttpsError('permission-denied', 'Permissão insuficiente para atualizar exercícios');
    }
    const { id, ...updates } = request.data;
    if (!id) {
        throw new https_1.HttpsError('invalid-argument', 'ID do exercício é obrigatório');
    }
    const pool = (0, init_2.getPool)();
    try {
        const fields = Object.keys(updates).filter(k => k !== 'id');
        if (fields.length === 0) {
            const result = await pool.query('SELECT * FROM exercises WHERE id = $1', [id]);
            return { data: result.rows[0] };
        }
        const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
        const values = fields.map(f => updates[f]);
        const result = await pool.query(`UPDATE exercises SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`, [id, ...values]);
        if (result.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Exercício não encontrado');
        }
        return { data: result.rows[0] };
    }
    catch (error) {
        logger_1.logger.error('Error in updateExercise:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar exercício';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
exports.deleteExercise = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    if (auth.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Apenas administradores podem excluir exercícios');
    }
    const { id } = request.data;
    if (!id) {
        throw new https_1.HttpsError('invalid-argument', 'ID do exercício é obrigatório');
    }
    const pool = (0, init_2.getPool)();
    try {
        // Soft delete preferencialmente
        const result = await pool.query(`UPDATE exercises SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`, [id]);
        if (result.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Exercício não encontrado');
        }
        return { success: true };
    }
    catch (error) {
        logger_1.logger.error('Error in deleteExercise:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao excluir exercício';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
exports.mergeExercises = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    if (auth.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Apenas administradores podem unir exercícios');
    }
    const { keepId, mergeIds } = request.data;
    if (!keepId || !Array.isArray(mergeIds) || mergeIds.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'keepId e mergeIds (array) são obrigatórios');
    }
    const pool = (0, init_2.getPool)();
    try {
        await pool.query('BEGIN');
        // 1. Atualizar todas as prescrições que usam os IDs a serem removidos
        await pool.query(`UPDATE prescribed_exercises SET exercise_id = $1 WHERE exercise_id = ANY($2)`, [keepId, mergeIds]);
        // 2. Atualizar todos os logs que usam os IDs a serem removidos
        await pool.query(`UPDATE exercise_logs SET prescribed_exercise_id = (
         SELECT id FROM prescribed_exercises WHERE exercise_id = $1 LIMIT 1
       ) WHERE prescribed_exercise_id IN (
         SELECT id FROM prescribed_exercises WHERE exercise_id = ANY($2)
       )`, [keepId, mergeIds]);
        // 3. Remover os exercícios duplicados
        const deleteResult = await pool.query(`DELETE FROM exercises WHERE id = ANY($1) AND id != $2`, [mergeIds, keepId]);
        await pool.query('COMMIT');
        return { success: true, deletedCount: deleteResult.rowCount || 0 };
    }
    catch (err) {
        await pool.query('ROLLBACK');
        logger_1.logger.error('Error in mergeExercises:', err);
        const errorMessage = err instanceof Error ? err.message : 'Erro ao unir exercícios';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
//# sourceMappingURL=exercises.js.map