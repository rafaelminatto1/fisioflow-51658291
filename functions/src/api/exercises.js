"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeExercises = exports.mergeExercisesHandler = exports.deleteExercise = exports.deleteExerciseHandler = exports.updateExercise = exports.updateExerciseHandler = exports.createExercise = exports.createExerciseHandler = exports.getPrescribedExercises = exports.getPrescribedExercisesHandler = exports.logExercise = exports.getExerciseCategories = exports.getExerciseCategoriesHandler = exports.searchSimilarExercises = exports.searchSimilarExercisesHandler = exports.logExerciseHandler = exports.getExercise = exports.getExerciseHandler = exports.listExercises = exports.listExercisesHandler = exports.mergeExercisesHttp = exports.deleteExerciseHttp = exports.updateExerciseHttp = exports.createExerciseHttp = exports.logExerciseHttp = exports.getPrescribedExercisesHttp = exports.getExerciseCategoriesHttp = exports.getExerciseHttp = exports.searchSimilarExercisesHttp = exports.listExercisesHttp = void 0;
var init_1 = require("../init");
var https_1 = require("firebase-functions/v2/https");
var auth_1 = require("../middleware/auth");
var logger_1 = require("../lib/logger");
var cors_1 = require("../lib/cors");
var error_handler_1 = require("../lib/error-handler");
function getAuthHeader(req) {
    var _a, _b;
    var h = ((_a = req.headers) === null || _a === void 0 ? void 0 : _a.authorization) || ((_b = req.headers) === null || _b === void 0 ? void 0 : _b.Authorization);
    return Array.isArray(h) ? h[0] : h;
}
function parseBody(req) {
    return typeof req.body === 'string' ? (function () { try {
        return JSON.parse(req.body || '{}');
    }
    catch (_a) {
        return {};
    } })() : (req.body || {});
}
// ============================================================================
// HTTP VERSIONS (CORS fix)
// ============================================================================
// Configuração manual de CORS para evitar conflitos
// Usando any para evitar erros de tipagem estrita no HttpsOptions
var EXERCISE_HTTP_OPTS = {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
    invoker: 'public',
};
exports.listExercisesHttp = (0, https_1.onRequest)(EXERCISE_HTTP_OPTS, (0, error_handler_1.withErrorHandling)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, category, difficulty, search, _b, limit, _c, offset, pool, query, params, paramCount, result, categoriesResult;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    (0, cors_1.setCorsHeaders)(res);
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                (0, cors_1.setCorsHeaders)(res);
                _a = parseBody(req), category = _a.category, difficulty = _a.difficulty, search = _a.search, _b = _a.limit, limit = _b === void 0 ? 100 : _b, _c = _a.offset, offset = _c === void 0 ? 0 : _c;
                pool = (0, init_1.getPool)();
                query = "SELECT id,name,slug,category,description,instructions,muscles,equipment,difficulty,video_url,image_url,duration_minutes,sets_recommended,reps_recommended,precautions,benefits,tags FROM exercises WHERE is_active = true";
                params = [];
                paramCount = 0;
                if (category) {
                    paramCount++;
                    query += " AND category = $".concat(paramCount);
                    params.push(category);
                }
                if (difficulty) {
                    paramCount++;
                    query += " AND difficulty = $".concat(paramCount);
                    params.push(difficulty);
                }
                if (search) {
                    paramCount++;
                    query += " AND (name ILIKE $".concat(paramCount, " OR description ILIKE $").concat(paramCount, ")");
                    params.push("%".concat(search, "%"));
                }
                query += " ORDER BY name LIMIT $".concat(paramCount + 1, " OFFSET $").concat(paramCount + 2);
                params.push(limit, offset);
                return [4 /*yield*/, pool.query(query, params)];
            case 1:
                result = _d.sent();
                return [4 /*yield*/, pool.query('SELECT DISTINCT category FROM exercises WHERE is_active = true ORDER BY category')];
            case 2:
                categoriesResult = _d.sent();
                res.json({ data: result.rows, categories: categoriesResult.rows.map(function (r) { return r.category; }) });
                return [2 /*return*/];
        }
    });
}); }, 'listExercisesHttp'));
exports.searchSimilarExercisesHttp = (0, https_1.onRequest)(EXERCISE_HTTP_OPTS, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, exerciseId, searchQuery, _b, limit, pool, result, baseResult, e_1;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    (0, cors_1.setCorsHeaders)(res);
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                (0, cors_1.setCorsHeaders)(res);
                _c.label = 1;
            case 1:
                _c.trys.push([1, 8, , 9]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)))];
            case 2:
                _c.sent();
                _a = parseBody(req), exerciseId = _a.exerciseId, searchQuery = _a.query, _b = _a.limit, limit = _b === void 0 ? 10 : _b;
                if (!exerciseId && !searchQuery) {
                    res.status(400).json({ error: 'exerciseId ou query é obrigatório' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                result = void 0;
                if (!exerciseId) return [3 /*break*/, 5];
                return [4 /*yield*/, pool.query('SELECT category FROM exercises WHERE id = $1', [exerciseId])];
            case 3:
                baseResult = _c.sent();
                if (baseResult.rows.length === 0) {
                    res.status(404).json({ error: 'Exercício não encontrado' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, pool.query("SELECT * FROM exercises WHERE is_active = true AND id != $1 AND category = $2 ORDER BY name LIMIT $3", [exerciseId, baseResult.rows[0].category, limit])];
            case 4:
                result = _c.sent();
                return [3 /*break*/, 7];
            case 5: return [4 /*yield*/, pool.query("SELECT * FROM exercises WHERE is_active = true AND (name ILIKE $1 OR description ILIKE $1 OR $1 = ANY(tags)) ORDER BY name LIMIT $2", ["%".concat(searchQuery, "%"), limit])];
            case 6:
                result = _c.sent();
                _c.label = 7;
            case 7:
                res.json({ data: result.rows });
                return [3 /*break*/, 9];
            case 8:
                e_1 = _c.sent();
                if (e_1 instanceof https_1.HttpsError && e_1.code === 'unauthenticated') {
                    res.status(401).json({ error: e_1.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('searchSimilarExercisesHttp:', e_1);
                res.status(500).json({ error: e_1 instanceof Error ? e_1.message : 'Erro ao buscar similares' });
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
exports.getExerciseHttp = (0, https_1.onRequest)(EXERCISE_HTTP_OPTS, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var exerciseId, pool, result, e_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    (0, cors_1.setCorsHeaders)(res);
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                (0, cors_1.setCorsHeaders)(res);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)))];
            case 2:
                _a.sent();
                exerciseId = parseBody(req).exerciseId;
                if (!exerciseId) {
                    res.status(400).json({ error: 'exerciseId é obrigatório' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query('SELECT * FROM exercises WHERE id = $1 AND is_active = true', [exerciseId])];
            case 3:
                result = _a.sent();
                if (result.rows.length === 0) {
                    res.status(404).json({ error: 'Exercício não encontrado' });
                    return [2 /*return*/];
                }
                res.json({ data: result.rows[0] });
                return [3 /*break*/, 5];
            case 4:
                e_2 = _a.sent();
                if (e_2 instanceof https_1.HttpsError && e_2.code === 'unauthenticated') {
                    res.status(401).json({ error: e_2.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('getExerciseHttp:', e_2);
                res.status(500).json({ error: e_2 instanceof Error ? e_2.message : 'Erro ao buscar exercício' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.getExerciseCategoriesHttp = (0, https_1.onRequest)(EXERCISE_HTTP_OPTS, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var pool, result, e_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    (0, cors_1.setCorsHeaders)(res);
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                (0, cors_1.setCorsHeaders)(res);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)))];
            case 2:
                _a.sent();
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query('SELECT DISTINCT category FROM exercises WHERE is_active = true ORDER BY category')];
            case 3:
                result = _a.sent();
                res.json({ data: result.rows.map(function (r) { return ({ id: r.category.toLowerCase().replace(/\s+/g, '-'), name: r.category }); }) });
                return [3 /*break*/, 5];
            case 4:
                e_3 = _a.sent();
                if (e_3 instanceof https_1.HttpsError && e_3.code === 'unauthenticated') {
                    res.status(401).json({ error: e_3.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('getExerciseCategoriesHttp:', e_3);
                res.status(500).json({ error: e_3 instanceof Error ? e_3.message : 'Erro ao listar categorias' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.getPrescribedExercisesHttp = (0, https_1.onRequest)(EXERCISE_HTTP_OPTS, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, patientId, pool, patientCheck, result, data, e_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    (0, cors_1.setCorsHeaders)(res);
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                (0, cors_1.setCorsHeaders)(res);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)))];
            case 2:
                auth = _a.sent();
                patientId = parseBody(req).patientId;
                if (!patientId) {
                    res.status(400).json({ error: 'patientId é obrigatório' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId])];
            case 3:
                patientCheck = _a.sent();
                if (patientCheck.rows.length === 0) {
                    res.status(404).json({ error: 'Paciente não encontrado' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, pool.query("SELECT pe.id,pe.patient_id,pe.exercise_id,pe.sets,pe.reps,pe.duration,pe.frequency,pe.is_active,pe.created_at,e.id as exercise_data_id,e.name,e.category,e.difficulty,e.video_url,e.image_url FROM prescribed_exercises pe JOIN exercises e ON pe.exercise_id=e.id WHERE pe.patient_id=$1 AND pe.is_active=true", [patientId])];
            case 4:
                result = _a.sent();
                data = result.rows.map(function (row) { return ({ id: row.id, patient_id: row.patient_id, exercise_id: row.exercise_id, sets: row.sets, reps: row.reps, duration: row.duration, frequency: row.frequency, is_active: row.is_active, created_at: row.created_at, exercise: { id: row.exercise_data_id, name: row.name, category: row.category, difficulty_level: row.difficulty, video_url: row.video_url, thumbnail_url: row.image_url, image_url: row.image_url } }); });
                res.json({ data: data });
                return [3 /*break*/, 6];
            case 5:
                e_4 = _a.sent();
                if (e_4 instanceof https_1.HttpsError && e_4.code === 'unauthenticated') {
                    res.status(401).json({ error: e_4.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('getPrescribedExercisesHttp:', e_4);
                res.status(500).json({ error: e_4 instanceof Error ? e_4.message : 'Erro ao buscar prescrições' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
exports.logExerciseHttp = (0, https_1.onRequest)(EXERCISE_HTTP_OPTS, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, patientId, prescriptionId, difficulty, notes, pool, patientCheck, result, e_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    (0, cors_1.setCorsHeaders)(res);
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                (0, cors_1.setCorsHeaders)(res);
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)))];
            case 2:
                auth = _b.sent();
                _a = parseBody(req), patientId = _a.patientId, prescriptionId = _a.prescriptionId, difficulty = _a.difficulty, notes = _a.notes;
                if (!patientId || !prescriptionId) {
                    res.status(400).json({ error: 'patientId e prescriptionId são obrigatórios' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId])];
            case 3:
                patientCheck = _b.sent();
                if (patientCheck.rows.length === 0) {
                    res.status(404).json({ error: 'Paciente não encontrado' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, pool.query("INSERT INTO exercise_logs (patient_id, prescribed_exercise_id, difficulty_rating, notes, complete_date) VALUES ($1,$2,$3,$4,NOW()) RETURNING *", [patientId, prescriptionId, difficulty !== null && difficulty !== void 0 ? difficulty : 0, notes || null])];
            case 4:
                result = _b.sent();
                res.json({ data: result.rows[0] });
                return [3 /*break*/, 6];
            case 5:
                e_5 = _b.sent();
                if (e_5 instanceof https_1.HttpsError && e_5.code === 'unauthenticated') {
                    res.status(401).json({ error: e_5.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('logExerciseHttp:', e_5);
                res.status(500).json({ error: e_5 instanceof Error ? e_5.message : 'Erro ao registrar exercício' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
exports.createExerciseHttp = (0, https_1.onRequest)(EXERCISE_HTTP_OPTS, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, exercise, imageUrl, pool, result, e_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    (0, cors_1.setCorsHeaders)(res);
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                (0, cors_1.setCorsHeaders)(res);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)))];
            case 2:
                auth = _a.sent();
                if (auth.role !== 'admin' && auth.role !== 'fisioterapeuta') {
                    res.status(403).json({ error: 'Permissão insuficiente' });
                    return [2 /*return*/];
                }
                exercise = parseBody(req);
                imageUrl = exercise.image_url || exercise.thumbnail_url || null;
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query("INSERT INTO exercises (name,category,difficulty,description,instructions,muscles,equipment,video_url,image_url,duration_minutes,sets_recommended,reps_recommended,precautions,benefits,tags,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true) RETURNING *", [exercise.name, exercise.category, exercise.difficulty || 'médio', exercise.description || null, exercise.instructions || null, exercise.muscles || [], exercise.equipment || [], exercise.video_url || null, imageUrl, exercise.duration_minutes || 0, exercise.sets_recommended || 3, exercise.reps_recommended || 10, exercise.precautions || null, exercise.benefits || null, exercise.tags || []])];
            case 3:
                result = _a.sent();
                res.status(201).json({ data: result.rows[0] });
                return [3 /*break*/, 5];
            case 4:
                e_6 = _a.sent();
                if (e_6 instanceof https_1.HttpsError && e_6.code === 'unauthenticated') {
                    res.status(401).json({ error: e_6.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('createExerciseHttp:', e_6);
                res.status(500).json({ error: e_6 instanceof Error ? e_6.message : 'Erro ao criar exercício' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.updateExerciseHttp = (0, https_1.onRequest)(EXERCISE_HTTP_OPTS, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, id, updates_1, pool, fields, result_1, setClause, values, result, e_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    (0, cors_1.setCorsHeaders)(res);
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                (0, cors_1.setCorsHeaders)(res);
                _b.label = 1;
            case 1:
                _b.trys.push([1, 6, , 7]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)))];
            case 2:
                auth = _b.sent();
                if (auth.role !== 'admin' && auth.role !== 'fisioterapeuta') {
                    res.status(403).json({ error: 'Permissão insuficiente' });
                    return [2 /*return*/];
                }
                _a = parseBody(req), id = _a.id, updates_1 = __rest(_a, ["id"]);
                if (!id) {
                    res.status(400).json({ error: 'ID do exercício é obrigatório' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                fields = Object.keys(updates_1).filter(function (k) { return k !== 'id'; });
                if (!(fields.length === 0)) return [3 /*break*/, 4];
                return [4 /*yield*/, pool.query('SELECT * FROM exercises WHERE id = $1', [id])];
            case 3:
                result_1 = _b.sent();
                if (result_1.rows.length === 0) {
                    res.status(404).json({ error: 'Exercício não encontrado' });
                    return [2 /*return*/];
                }
                res.json({ data: result_1.rows[0] });
                return [2 /*return*/];
            case 4:
                setClause = fields.map(function (f, i) { return "".concat(f, " = $").concat(i + 2); }).join(', ');
                values = fields.map(function (f) { return updates_1[f]; });
                return [4 /*yield*/, pool.query("UPDATE exercises SET ".concat(setClause, ", updated_at = NOW() WHERE id = $1 RETURNING *"), __spreadArray([id], values, true))];
            case 5:
                result = _b.sent();
                if (result.rows.length === 0) {
                    res.status(404).json({ error: 'Exercício não encontrado' });
                    return [2 /*return*/];
                }
                res.json({ data: result.rows[0] });
                return [3 /*break*/, 7];
            case 6:
                e_7 = _b.sent();
                if (e_7 instanceof https_1.HttpsError && e_7.code === 'unauthenticated') {
                    res.status(401).json({ error: e_7.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('updateExerciseHttp:', e_7);
                res.status(500).json({ error: e_7 instanceof Error ? e_7.message : 'Erro ao atualizar exercício' });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
exports.deleteExerciseHttp = (0, https_1.onRequest)(EXERCISE_HTTP_OPTS, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, id, pool, result, e_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    (0, cors_1.setCorsHeaders)(res);
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                (0, cors_1.setCorsHeaders)(res);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)))];
            case 2:
                auth = _a.sent();
                if (auth.role !== 'admin') {
                    res.status(403).json({ error: 'Apenas administradores podem excluir' });
                    return [2 /*return*/];
                }
                id = parseBody(req).id;
                if (!id) {
                    res.status(400).json({ error: 'ID do exercício é obrigatório' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query('UPDATE exercises SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id', [id])];
            case 3:
                result = _a.sent();
                if (result.rows.length === 0) {
                    res.status(404).json({ error: 'Exercício não encontrado' });
                    return [2 /*return*/];
                }
                res.json({ success: true });
                return [3 /*break*/, 5];
            case 4:
                e_8 = _a.sent();
                if (e_8 instanceof https_1.HttpsError && e_8.code === 'unauthenticated') {
                    res.status(401).json({ error: e_8.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('deleteExerciseHttp:', e_8);
                res.status(500).json({ error: e_8 instanceof Error ? e_8.message : 'Erro ao excluir exercício' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.mergeExercisesHttp = (0, https_1.onRequest)(EXERCISE_HTTP_OPTS, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, keepId, mergeIds, pool, _i, mergeIds_1, mid, e_9;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    (0, cors_1.setCorsHeaders)(res);
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                (0, cors_1.setCorsHeaders)(res);
                _b.label = 1;
            case 1:
                _b.trys.push([1, 8, , 9]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)))];
            case 2:
                auth = _b.sent();
                if (auth.role !== 'admin') {
                    res.status(403).json({ error: 'Apenas administradores podem unir' });
                    return [2 /*return*/];
                }
                _a = parseBody(req), keepId = _a.keepId, mergeIds = _a.mergeIds;
                if (!keepId || !(mergeIds === null || mergeIds === void 0 ? void 0 : mergeIds.length)) {
                    res.status(400).json({ error: 'keepId e mergeIds são obrigatórios' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                _i = 0, mergeIds_1 = mergeIds;
                _b.label = 3;
            case 3:
                if (!(_i < mergeIds_1.length)) return [3 /*break*/, 7];
                mid = mergeIds_1[_i];
                return [4 /*yield*/, pool.query('UPDATE prescribed_exercises SET exercise_id = $1 WHERE exercise_id = $2', [keepId, mid])];
            case 4:
                _b.sent();
                return [4 /*yield*/, pool.query('UPDATE exercises SET is_active = false WHERE id = $1', [mid])];
            case 5:
                _b.sent();
                _b.label = 6;
            case 6:
                _i++;
                return [3 /*break*/, 3];
            case 7:
                res.json({ success: true, deletedCount: mergeIds.length });
                return [3 /*break*/, 9];
            case 8:
                e_9 = _b.sent();
                if (e_9 instanceof https_1.HttpsError && e_9.code === 'unauthenticated') {
                    res.status(401).json({ error: e_9.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('mergeExercisesHttp:', e_9);
                res.status(500).json({ error: e_9 instanceof Error ? e_9.message : 'Erro ao unir exercícios' });
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
/**
 * Lista exercícios cadastrados
 */
var listExercisesHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, category, difficulty, search, _b, limit, _c, offset, pool, query, params, paramCount, result, categoriesResult, error_1, errorMessage;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                _d.sent();
                _a = request.data, category = _a.category, difficulty = _a.difficulty, search = _a.search, _b = _a.limit, limit = _b === void 0 ? 100 : _b, _c = _a.offset, offset = _c === void 0 ? 0 : _c;
                pool = (0, init_1.getPool)();
                _d.label = 2;
            case 2:
                _d.trys.push([2, 5, , 6]);
                query = "\n      SELECT\n        id, name, slug, category, description,\n        instructions, muscles, equipment, difficulty,\n        video_url, image_url, duration_minutes,\n        sets_recommended, reps_recommended, precautions,\n        benefits, tags\n      FROM exercises\n      WHERE is_active = true\n    ";
                params = [];
                paramCount = 0;
                if (category) {
                    paramCount++;
                    query += " AND category = $".concat(paramCount);
                    params.push(category);
                }
                if (difficulty) {
                    paramCount++;
                    query += " AND difficulty = $".concat(paramCount);
                    params.push(difficulty);
                }
                if (search) {
                    paramCount++;
                    query += " AND (name ILIKE $".concat(paramCount, " OR description ILIKE $").concat(paramCount, ")");
                    params.push("%".concat(search, "%"));
                }
                query += " ORDER BY name LIMIT $".concat(paramCount + 1, " OFFSET $").concat(paramCount + 2);
                params.push(limit, offset);
                return [4 /*yield*/, pool.query(query, params)];
            case 3:
                result = _d.sent();
                return [4 /*yield*/, pool.query("SELECT DISTINCT category FROM exercises WHERE is_active = true ORDER BY category")];
            case 4:
                categoriesResult = _d.sent();
                return [2 /*return*/, {
                        data: result.rows,
                        categories: categoriesResult.rows.map(function (r) { return r.category; }),
                    }];
            case 5:
                error_1 = _d.sent();
                logger_1.logger.error('Error in listExercises:', error_1);
                if (error_1 instanceof https_1.HttpsError)
                    throw error_1;
                errorMessage = error_1 instanceof Error ? error_1.message : 'Erro ao listar exercícios';
                throw new https_1.HttpsError('internal', errorMessage);
            case 6: return [2 /*return*/];
        }
    });
}); };
exports.listExercisesHandler = listExercisesHandler;
exports.listExercises = (0, https_1.onCall)(exports.listExercisesHandler);
/**
 * Busca um exercício por ID
 */
var getExerciseHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var exerciseId, pool, result, error_2, errorMessage;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                _a.sent();
                exerciseId = request.data.exerciseId;
                if (!exerciseId) {
                    throw new https_1.HttpsError('invalid-argument', 'exerciseId é obrigatório');
                }
                pool = (0, init_1.getPool)();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                return [4 /*yield*/, pool.query("SELECT * FROM exercises WHERE id = $1 AND is_active = true", [exerciseId])];
            case 3:
                result = _a.sent();
                if (result.rows.length === 0) {
                    throw new https_1.HttpsError('not-found', 'Exercício não encontrado');
                }
                return [2 /*return*/, { data: result.rows[0] }];
            case 4:
                error_2 = _a.sent();
                logger_1.logger.error('Error in getExercise:', error_2);
                if (error_2 instanceof https_1.HttpsError)
                    throw error_2;
                errorMessage = error_2 instanceof Error ? error_2.message : 'Erro ao buscar exercício';
                throw new https_1.HttpsError('internal', errorMessage);
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.getExerciseHandler = getExerciseHandler;
exports.getExercise = (0, https_1.onCall)(exports.getExerciseHandler);
/**
 * Registra a realização de um exercício
 */
var logExerciseHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, prescriptionId, exerciseId, sets, reps, load, effort, notes, pool, result, error_3, errorMessage;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _b.sent();
                _a = request.data, prescriptionId = _a.prescriptionId, exerciseId = _a.exerciseId, sets = _a.sets, reps = _a.reps, load = _a.load, effort = _a.effort, notes = _a.notes;
                if (!exerciseId || !sets || !reps) {
                    throw new https_1.HttpsError('invalid-argument', 'exercício, séries e repetições são obrigatórios');
                }
                pool = (0, init_1.getPool)();
                _b.label = 2;
            case 2:
                _b.trys.push([2, 4, , 5]);
                return [4 /*yield*/, pool.query("INSERT INTO exercise_logs (\n        organization_id, user_id, prescription_id, exercise_id,\n        sets, reps, load, effort_level, notes\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)\n      RETURNING *", [auth.organizationId, auth.userId, prescriptionId || null, exerciseId, sets, reps, load || null, effort || null, notes || ''])];
            case 3:
                result = _b.sent();
                return [2 /*return*/, { data: result.rows[0] }];
            case 4:
                error_3 = _b.sent();
                logger_1.logger.error('Error in logExercise:', error_3);
                if (error_3 instanceof https_1.HttpsError)
                    throw error_3;
                errorMessage = error_3 instanceof Error ? error_3.message : 'Erro ao registrar exercício';
                throw new https_1.HttpsError('internal', errorMessage);
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.logExerciseHandler = logExerciseHandler;
/**
 * Busca exercícios similares
 */
var searchSimilarExercisesHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, exerciseId, searchQuery, _b, limit, pool, result, baseResult, baseExercise, error_4, errorMessage;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                _c.sent();
                _a = request.data, exerciseId = _a.exerciseId, searchQuery = _a.query, _b = _a.limit, limit = _b === void 0 ? 10 : _b;
                if (!exerciseId && !searchQuery) {
                    throw new https_1.HttpsError('invalid-argument', 'exerciseId ou query é obrigatório');
                }
                pool = (0, init_1.getPool)();
                _c.label = 2;
            case 2:
                _c.trys.push([2, 8, , 9]);
                result = void 0;
                if (!exerciseId) return [3 /*break*/, 5];
                return [4 /*yield*/, pool.query('SELECT category FROM exercises WHERE id = $1', [exerciseId])];
            case 3:
                baseResult = _c.sent();
                if (baseResult.rows.length === 0) {
                    throw new https_1.HttpsError('not-found', 'Exercício não encontrado');
                }
                baseExercise = baseResult.rows[0];
                return [4 /*yield*/, pool.query("SELECT * FROM exercises\n         WHERE is_active = true\n           AND id != $1\n           AND category = $2\n         ORDER BY name\n         LIMIT $3", [exerciseId, baseExercise.category, limit])];
            case 4:
                // Buscar exercícios similares da mesma categoria
                result = _c.sent();
                return [3 /*break*/, 7];
            case 5: return [4 /*yield*/, pool.query("SELECT * FROM exercises\n         WHERE is_active = true\n           AND (name ILIKE $1 OR description ILIKE $1 OR $1 = ANY(tags))\n         ORDER BY name\n         LIMIT $2", ["%".concat(searchQuery, "%"), limit])];
            case 6:
                // Busca textual
                result = _c.sent();
                _c.label = 7;
            case 7: return [2 /*return*/, { data: result.rows }];
            case 8:
                error_4 = _c.sent();
                logger_1.logger.error('Error in searchSimilarExercises:', error_4);
                if (error_4 instanceof https_1.HttpsError)
                    throw error_4;
                errorMessage = error_4 instanceof Error ? error_4.message : 'Erro ao buscar exercícios similares';
                throw new https_1.HttpsError('internal', errorMessage);
            case 9: return [2 /*return*/];
        }
    });
}); };
exports.searchSimilarExercisesHandler = searchSimilarExercisesHandler;
exports.searchSimilarExercises = (0, https_1.onCall)(exports.searchSimilarExercisesHandler);
/**
 * Lista categorias de exercícios
 */
var getExerciseCategoriesHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var pool, result, error_5, errorMessage;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                pool = (0, init_1.getPool)();
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, pool.query("SELECT DISTINCT category FROM exercises WHERE is_active = true ORDER BY category ASC")];
            case 2:
                result = _a.sent();
                return [2 /*return*/, {
                        data: result.rows.map(function (r) { return ({
                            id: r.category.toLowerCase().replace(/\s+/g, '-'),
                            name: r.category,
                        }); })
                    }];
            case 3:
                error_5 = _a.sent();
                logger_1.logger.error('Error in getExerciseCategories:', error_5);
                if (error_5 instanceof https_1.HttpsError)
                    throw error_5;
                errorMessage = error_5 instanceof Error ? error_5.message : 'Erro ao buscar categorias';
                throw new https_1.HttpsError('internal', errorMessage);
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getExerciseCategoriesHandler = getExerciseCategoriesHandler;
exports.getExerciseCategories = (0, https_1.onCall)(exports.getExerciseCategoriesHandler);
exports.logExercise = (0, https_1.onCall)(exports.logExerciseHandler);
/**
 * Lista exercícios prescritos para um paciente
 */
var getPrescribedExercisesHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, patientId, pool, patientCheck, result, data, error_6, errorMessage;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _a.sent();
                patientId = request.data.patientId;
                if (!patientId) {
                    throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
                }
                pool = (0, init_1.getPool)();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 5, , 6]);
                return [4 /*yield*/, pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId])];
            case 3:
                patientCheck = _a.sent();
                if (patientCheck.rows.length === 0) {
                    throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
                }
                return [4 /*yield*/, pool.query("SELECT\n        pe.id, pe.patient_id, pe.exercise_id, pe.sets, pe.reps,\n        pe.duration, pe.frequency, pe.is_active, pe.created_at,\n        e.id as exercise_data_id, e.name, e.category, e.difficulty,\n        e.video_url, e.image_url\n      FROM prescribed_exercises pe\n      JOIN exercises e ON pe.exercise_id = e.id\n      WHERE pe.patient_id = $1\n        AND pe.is_active = true", [patientId])];
            case 4:
                result = _a.sent();
                data = result.rows.map(function (row) { return ({
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
                        thumbnail_url: row.image_url,
                        image_url: row.image_url
                    }
                }); });
                return [2 /*return*/, { data: data }];
            case 5:
                error_6 = _a.sent();
                logger_1.logger.error('Error in getPrescribedExercises:', error_6);
                if (error_6 instanceof https_1.HttpsError)
                    throw error_6;
                errorMessage = error_6 instanceof Error ? error_6.message : 'Erro ao buscar prescrições';
                throw new https_1.HttpsError('internal', errorMessage);
            case 6: return [2 /*return*/];
        }
    });
}); };
exports.getPrescribedExercisesHandler = getPrescribedExercisesHandler;
exports.getPrescribedExercises = (0, https_1.onCall)(exports.getPrescribedExercisesHandler);
/**
 * Cria um novo exercício
 */
var createExerciseHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, exercise, imageUrl, pool, result, error_7, errorMessage;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _a.sent();
                if (auth.role !== 'admin' && auth.role !== 'fisioterapeuta') {
                    throw new https_1.HttpsError('permission-denied', 'Permissão insuficiente para criar exercícios');
                }
                exercise = request.data;
                imageUrl = exercise.image_url || exercise.thumbnail_url || null;
                pool = (0, init_1.getPool)();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                return [4 /*yield*/, pool.query("INSERT INTO exercises (\n        name, category, difficulty, description, instructions,\n        muscles, equipment, video_url, image_url,\n        duration_minutes, sets_recommended, reps_recommended,\n        precautions, benefits, tags, is_active\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true)\n      RETURNING *", [
                        exercise.name,
                        exercise.category,
                        exercise.difficulty || 'médio',
                        exercise.description || null,
                        exercise.instructions || null,
                        exercise.muscles || [],
                        exercise.equipment || [],
                        exercise.video_url || null,
                        imageUrl,
                        exercise.duration_minutes || 0,
                        exercise.sets_recommended || 3,
                        exercise.reps_recommended || 10,
                        exercise.precautions || null,
                        exercise.benefits || null,
                        exercise.tags || []
                    ])];
            case 3:
                result = _a.sent();
                return [2 /*return*/, { data: result.rows[0] }];
            case 4:
                error_7 = _a.sent();
                logger_1.logger.error('Error in createExercise:', error_7);
                if (error_7 instanceof https_1.HttpsError)
                    throw error_7;
                errorMessage = error_7 instanceof Error ? error_7.message : 'Erro ao criar exercício';
                throw new https_1.HttpsError('internal', errorMessage);
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.createExerciseHandler = createExerciseHandler;
exports.createExercise = (0, https_1.onCall)(exports.createExerciseHandler);
/**
 * Atualiza um exercício existente
 */
var updateExerciseHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, id, updates, pool, fields, result_2, setClause, values, result, error_8, errorMessage;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _b.sent();
                if (auth.role !== 'admin' && auth.role !== 'fisioterapeuta') {
                    throw new https_1.HttpsError('permission-denied', 'Permissão insuficiente para atualizar exercícios');
                }
                _a = request.data, id = _a.id, updates = __rest(_a, ["id"]);
                if (!id) {
                    throw new https_1.HttpsError('invalid-argument', 'ID do exercício é obrigatório');
                }
                pool = (0, init_1.getPool)();
                _b.label = 2;
            case 2:
                _b.trys.push([2, 6, , 7]);
                fields = Object.keys(updates).filter(function (k) { return k !== 'id'; });
                if (!(fields.length === 0)) return [3 /*break*/, 4];
                return [4 /*yield*/, pool.query('SELECT * FROM exercises WHERE id = $1', [id])];
            case 3:
                result_2 = _b.sent();
                return [2 /*return*/, { data: result_2.rows[0] }];
            case 4:
                setClause = fields.map(function (f, i) { return "".concat(f, " = $").concat(i + 2); }).join(', ');
                values = fields.map(function (f) { return updates[f]; });
                return [4 /*yield*/, pool.query("UPDATE exercises SET ".concat(setClause, ", updated_at = NOW() WHERE id = $1 RETURNING *"), __spreadArray([id], values, true))];
            case 5:
                result = _b.sent();
                if (result.rows.length === 0) {
                    throw new https_1.HttpsError('not-found', 'Exercício não encontrado');
                }
                return [2 /*return*/, { data: result.rows[0] }];
            case 6:
                error_8 = _b.sent();
                logger_1.logger.error('Error in updateExercise:', error_8);
                if (error_8 instanceof https_1.HttpsError)
                    throw error_8;
                errorMessage = error_8 instanceof Error ? error_8.message : 'Erro ao atualizar exercício';
                throw new https_1.HttpsError('internal', errorMessage);
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.updateExerciseHandler = updateExerciseHandler;
exports.updateExercise = (0, https_1.onCall)(exports.updateExerciseHandler);
/**
 * Exclui logicamente um exercício
 */
var deleteExerciseHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, id, pool, result, error_9, errorMessage;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _a.sent();
                if (auth.role !== 'admin') {
                    throw new https_1.HttpsError('permission-denied', 'Apenas administradores podem excluir exercícios');
                }
                id = request.data.id;
                if (!id) {
                    throw new https_1.HttpsError('invalid-argument', 'ID do exercício é obrigatório');
                }
                pool = (0, init_1.getPool)();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                return [4 /*yield*/, pool.query("UPDATE exercises SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id", [id])];
            case 3:
                result = _a.sent();
                if (result.rows.length === 0) {
                    throw new https_1.HttpsError('not-found', 'Exercício não encontrado');
                }
                return [2 /*return*/, { success: true }];
            case 4:
                error_9 = _a.sent();
                logger_1.logger.error('Error in deleteExercise:', error_9);
                if (error_9 instanceof https_1.HttpsError)
                    throw error_9;
                errorMessage = error_9 instanceof Error ? error_9.message : 'Erro ao excluir exercício';
                throw new https_1.HttpsError('internal', errorMessage);
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.deleteExerciseHandler = deleteExerciseHandler;
exports.deleteExercise = (0, https_1.onCall)(exports.deleteExerciseHandler);
/**
 * Une exercícios duplicados
 */
var mergeExercisesHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, keepId, mergeIds, pool, deleteResult, err_1, errorMessage;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _b.sent();
                if (auth.role !== 'admin') {
                    throw new https_1.HttpsError('permission-denied', 'Apenas administradores podem unir exercícios');
                }
                _a = request.data, keepId = _a.keepId, mergeIds = _a.mergeIds;
                if (!keepId || !Array.isArray(mergeIds) || mergeIds.length === 0) {
                    throw new https_1.HttpsError('invalid-argument', 'keepId e mergeIds (array) são obrigatórios');
                }
                pool = (0, init_1.getPool)();
                _b.label = 2;
            case 2:
                _b.trys.push([2, 8, , 10]);
                return [4 /*yield*/, pool.query('BEGIN')];
            case 3:
                _b.sent();
                // 1. Atualizar todas as prescrições que usam os IDs a serem removidos
                return [4 /*yield*/, pool.query("UPDATE prescribed_exercises SET exercise_id = $1 WHERE exercise_id = ANY($2)", [keepId, mergeIds])];
            case 4:
                // 1. Atualizar todas as prescrições que usam os IDs a serem removidos
                _b.sent();
                // 2. Atualizar todos os logs que usam os IDs a serem removidos
                return [4 /*yield*/, pool.query("UPDATE exercise_logs SET prescribed_exercise_id = (\n         SELECT id FROM prescribed_exercises WHERE exercise_id = $1 LIMIT 1\n       ) WHERE prescribed_exercise_id IN (\n         SELECT id FROM prescribed_exercises WHERE exercise_id = ANY($2)\n       )", [keepId, mergeIds])];
            case 5:
                // 2. Atualizar todos os logs que usam os IDs a serem removidos
                _b.sent();
                return [4 /*yield*/, pool.query("DELETE FROM exercises WHERE id = ANY($1) AND id != $2", [mergeIds, keepId])];
            case 6:
                deleteResult = _b.sent();
                return [4 /*yield*/, pool.query('COMMIT')];
            case 7:
                _b.sent();
                return [2 /*return*/, { success: true, deletedCount: deleteResult.rowCount || 0 }];
            case 8:
                err_1 = _b.sent();
                return [4 /*yield*/, pool.query('ROLLBACK')];
            case 9:
                _b.sent();
                logger_1.logger.error('Error in mergeExercises:', err_1);
                errorMessage = err_1 instanceof Error ? err_1.message : 'Erro ao unir exercícios';
                throw new https_1.HttpsError('internal', errorMessage);
            case 10: return [2 /*return*/];
        }
    });
}); };
exports.mergeExercisesHandler = mergeExercisesHandler;
exports.mergeExercises = (0, https_1.onCall)(exports.mergeExercisesHandler);
