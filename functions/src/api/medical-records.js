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
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePainRecord = exports.savePainRecordHandler = exports.getPainRecords = exports.getPainRecordsHandler = exports.updateTreatmentSession = exports.updateTreatmentSessionHandler = exports.createTreatmentSession = exports.createTreatmentSessionHandler = exports.listTreatmentSessions = exports.listTreatmentSessionsHandler = exports.updateMedicalRecord = exports.updateMedicalRecordHandler = exports.createMedicalRecord = exports.createMedicalRecordHandler = exports.getPatientRecords = exports.getPatientRecordsHandler = exports.savePainRecordHttp = exports.getPainRecordsHttp = exports.createTreatmentSessionHttp = exports.listTreatmentSessionsHttp = exports.deleteMedicalRecordHttp = exports.updateMedicalRecordHttp = exports.createMedicalRecordHttp = exports.getPatientRecordsHttp = void 0;
var https_1 = require("firebase-functions/v2/https");
var init_1 = require("../init");
var auth_1 = require("../middleware/auth");
var logger_1 = require("../lib/logger");
var cors_1 = require("../lib/cors");
var rag_index_maintenance_1 = require("../ai/rag/rag-index-maintenance");
var rtdb_1 = require("../lib/rtdb");
// Standard HTTP options for API functions
var httpOpts = {
    region: 'southamerica-east1',
    maxInstances: 1,
    invoker: 'public',
};
function parseBody(req) { return typeof req.body === 'string' ? (function () { try {
    return JSON.parse(req.body || '{}');
}
catch (_a) {
    return {};
} })() : (req.body || {}); }
function getAuthHeader(req) { var _a, _b; var h = ((_a = req.headers) === null || _a === void 0 ? void 0 : _a.authorization) || ((_b = req.headers) === null || _b === void 0 ? void 0 : _b.Authorization); return Array.isArray(h) ? h[0] : h; }
function triggerPatientRagReindexSafe(patientId, organizationId, reason) {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!patientId)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, rag_index_maintenance_1.triggerPatientRagReindex)({
                            patientId: patientId,
                            organizationId: organizationId,
                            reason: reason,
                        })];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    logger_1.logger.warn('Failed to run incremental patient RAG reindex', {
                        patientId: patientId,
                        organizationId: organizationId,
                        reason: reason,
                        error: error_1.message,
                    });
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.getPatientRecordsHttp = (0, https_1.onRequest)(httpOpts, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, patientId, type, _b, limit, pool, patientQuery, query, params, result, e_1;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    (0, cors_1.setCorsHeaders)(res);
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    (0, cors_1.setCorsHeaders)(res);
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                (0, cors_1.setCorsHeaders)(res);
                _c.label = 1;
            case 1:
                _c.trys.push([1, 5, , 6]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)))];
            case 2:
                auth = _c.sent();
                _a = parseBody(req), patientId = _a.patientId, type = _a.type, _b = _a.limit, limit = _b === void 0 ? 50 : _b;
                if (!patientId) {
                    res.status(400).json({ error: 'patientId é obrigatório' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId])];
            case 3:
                patientQuery = _c.sent();
                if (patientQuery.rows.length === 0) {
                    res.status(404).json({ error: 'Paciente não encontrado' });
                    return [2 /*return*/];
                }
                query = "SELECT mr.*, p.full_name as created_by_name FROM medical_records mr LEFT JOIN profiles p ON mr.created_by = p.user_id WHERE mr.patient_id = $1 AND mr.organization_id = $2";
                params = [patientId, auth.organizationId];
                if (type) {
                    query += " AND mr.type = $3";
                    params.push(type);
                }
                query += " ORDER BY mr.record_date DESC, mr.created_at DESC LIMIT $".concat(params.length + 1);
                params.push(limit);
                return [4 /*yield*/, pool.query(query, params)];
            case 4:
                result = _c.sent();
                res.json({ data: result.rows });
                return [3 /*break*/, 6];
            case 5:
                e_1 = _c.sent();
                (0, cors_1.setCorsHeaders)(res);
                if (e_1 instanceof https_1.HttpsError && e_1.code === 'unauthenticated') {
                    res.status(401).json({ error: e_1.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('getPatientRecordsHttp:', e_1);
                res.status(500).json({ error: e_1 instanceof Error ? e_1.message : 'Erro' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
exports.createMedicalRecordHttp = (0, https_1.onRequest)(httpOpts, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, patientId, type, title, content, recordDate, pool, patientCheck, result, er_1, e_2;
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
                _b.trys.push([1, 10, , 11]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)))];
            case 2:
                auth = _b.sent();
                _a = parseBody(req), patientId = _a.patientId, type = _a.type, title = _a.title, content = _a.content, recordDate = _a.recordDate;
                if (!patientId || !type || !title) {
                    res.status(400).json({ error: 'patientId, type e title são obrigatórios' });
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
                return [4 /*yield*/, pool.query("INSERT INTO medical_records (patient_id, created_by, organization_id, type, title, content, record_date) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *", [patientId, auth.userId, auth.organizationId, type, title, content || '', recordDate || new Date().toISOString().split('T')[0]])];
            case 4:
                result = _b.sent();
                return [4 /*yield*/, triggerPatientRagReindexSafe(patientId, auth.organizationId, 'medical_record_created_http')];
            case 5:
                _b.sent();
                _b.label = 6;
            case 6:
                _b.trys.push([6, 8, , 9]);
                return [4 /*yield*/, rtdb_1.rtdb.refreshPatients(auth.organizationId)];
            case 7:
                _b.sent();
                return [3 /*break*/, 9];
            case 8:
                er_1 = _b.sent();
                logger_1.logger.error('Erro RTDB:', er_1);
                return [3 /*break*/, 9];
            case 9:
                res.status(201).json({ data: result.rows[0] });
                return [3 /*break*/, 11];
            case 10:
                e_2 = _b.sent();
                (0, cors_1.setCorsHeaders)(res);
                if (e_2 instanceof https_1.HttpsError && e_2.code === 'unauthenticated') {
                    res.status(401).json({ error: e_2.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('createMedicalRecordHttp:', e_2);
                res.status(500).json({ error: e_2 instanceof Error ? e_2.message : 'Erro' });
                return [3 /*break*/, 11];
            case 11: return [2 /*return*/];
        }
    });
}); });
exports.updateMedicalRecordHttp = (0, https_1.onRequest)(httpOpts, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, recordId, updates, pool, existing, setClauses, values, pc, _i, _b, f, result, e_3;
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
                _c.trys.push([1, 6, , 7]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)))];
            case 2:
                auth = _c.sent();
                _a = parseBody(req), recordId = _a.recordId, updates = __rest(_a, ["recordId"]);
                if (!recordId) {
                    res.status(400).json({ error: 'recordId é obrigatório' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query('SELECT id, patient_id FROM medical_records WHERE id = $1 AND organization_id = $2', [recordId, auth.organizationId])];
            case 3:
                existing = _c.sent();
                if (existing.rows.length === 0) {
                    res.status(404).json({ error: 'Prontuário não encontrado' });
                    return [2 /*return*/];
                }
                setClauses = [];
                values = [];
                pc = 0;
                for (_i = 0, _b = ['title', 'content']; _i < _b.length; _i++) {
                    f = _b[_i];
                    if (f in updates) {
                        pc++;
                        setClauses.push("".concat(f, " = $").concat(pc));
                        values.push(updates[f]);
                    }
                }
                if (setClauses.length === 0) {
                    res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
                    return [2 /*return*/];
                }
                pc++;
                setClauses.push("updated_at = $".concat(pc));
                values.push(new Date());
                values.push(recordId, auth.organizationId);
                return [4 /*yield*/, pool.query("UPDATE medical_records SET ".concat(setClauses.join(', '), " WHERE id = $").concat(pc + 1, " AND organization_id = $").concat(pc + 2, " RETURNING *"), values)];
            case 4:
                result = _c.sent();
                return [4 /*yield*/, triggerPatientRagReindexSafe(existing.rows[0].patient_id, auth.organizationId, 'medical_record_updated_http')];
            case 5:
                _c.sent();
                res.json({ data: result.rows[0] });
                return [3 /*break*/, 7];
            case 6:
                e_3 = _c.sent();
                (0, cors_1.setCorsHeaders)(res);
                if (e_3 instanceof https_1.HttpsError && e_3.code === 'unauthenticated') {
                    res.status(401).json({ error: e_3.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('updateMedicalRecordHttp:', e_3);
                res.status(500).json({ error: e_3 instanceof Error ? e_3.message : 'Erro' });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
exports.deleteMedicalRecordHttp = (0, https_1.onRequest)(httpOpts, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, recordId, result, e_4;
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
                recordId = parseBody(req).recordId;
                if (!recordId) {
                    res.status(400).json({ error: 'recordId é obrigatório' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, (0, init_1.getPool)().query('DELETE FROM medical_records WHERE id = $1 AND organization_id = $2 RETURNING id, patient_id', [recordId, auth.organizationId])];
            case 3:
                result = _a.sent();
                if (result.rows.length === 0) {
                    res.status(404).json({ error: 'Prontuário não encontrado' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, triggerPatientRagReindexSafe(result.rows[0].patient_id, auth.organizationId, 'medical_record_deleted_http')];
            case 4:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 6];
            case 5:
                e_4 = _a.sent();
                (0, cors_1.setCorsHeaders)(res);
                if (e_4 instanceof https_1.HttpsError && e_4.code === 'unauthenticated') {
                    res.status(401).json({ error: e_4.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('deleteMedicalRecordHttp:', e_4);
                res.status(500).json({ error: e_4 instanceof Error ? e_4.message : 'Erro' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
exports.listTreatmentSessionsHttp = (0, https_1.onRequest)(httpOpts, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, patientId, _b, limit, result, e_5;
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
                _c.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)))];
            case 2:
                auth = _c.sent();
                _a = parseBody(req), patientId = _a.patientId, _b = _a.limit, limit = _b === void 0 ? 20 : _b;
                if (!patientId) {
                    res.status(400).json({ error: 'patientId é obrigatório' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, (0, init_1.getPool)().query("SELECT ts.*, p.name as patient_name, prof.full_name as therapist_name, a.date as appointment_date FROM treatment_sessions ts LEFT JOIN patients p ON ts.patient_id=p.id LEFT JOIN profiles prof ON ts.therapist_id=prof.user_id LEFT JOIN appointments a ON ts.appointment_id=a.id WHERE ts.patient_id=$1 AND ts.organization_id=$2 ORDER BY ts.session_date DESC, ts.created_at DESC LIMIT $3", [patientId, auth.organizationId, limit])];
            case 3:
                result = _c.sent();
                res.json({ data: result.rows });
                return [3 /*break*/, 5];
            case 4:
                e_5 = _c.sent();
                (0, cors_1.setCorsHeaders)(res);
                if (e_5 instanceof https_1.HttpsError && e_5.code === 'unauthenticated') {
                    res.status(401).json({ error: e_5.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('listTreatmentSessionsHttp:', e_5);
                res.status(500).json({ error: e_5 instanceof Error ? e_5.message : 'Erro' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.createTreatmentSessionHttp = (0, https_1.onRequest)(httpOpts, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, patientId, appointmentId, painLevelBefore, painLevelAfter, observations, evolution, nextGoals, pool, appointmentDate, therapistId, apt, result, e_6;
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
                _b.trys.push([1, 7, , 8]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)))];
            case 2:
                auth = _b.sent();
                _a = parseBody(req), patientId = _a.patientId, appointmentId = _a.appointmentId, painLevelBefore = _a.painLevelBefore, painLevelAfter = _a.painLevelAfter, observations = _a.observations, evolution = _a.evolution, nextGoals = _a.nextGoals;
                if (!patientId) {
                    res.status(400).json({ error: 'patientId é obrigatório' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                appointmentDate = null;
                therapistId = auth.userId;
                if (!appointmentId) return [3 /*break*/, 4];
                return [4 /*yield*/, pool.query('SELECT date, therapist_id FROM appointments WHERE id = $1 AND organization_id = $2', [appointmentId, auth.organizationId])];
            case 3:
                apt = _b.sent();
                if (apt.rows.length > 0) {
                    appointmentDate = apt.rows[0].date;
                    therapistId = apt.rows[0].therapist_id;
                }
                _b.label = 4;
            case 4: return [4 /*yield*/, pool.query("INSERT INTO treatment_sessions (patient_id, therapist_id, appointment_id, organization_id, pain_level_before, pain_level_after, observations, evolution, next_session_goals, session_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *", [patientId, therapistId, appointmentId || null, auth.organizationId, painLevelBefore || null, painLevelAfter || null, observations || null, evolution || null, nextGoals || null, appointmentDate || new Date().toISOString().split('T')[0]])];
            case 5:
                result = _b.sent();
                return [4 /*yield*/, triggerPatientRagReindexSafe(patientId, auth.organizationId, 'treatment_session_created_http')];
            case 6:
                _b.sent();
                res.status(201).json({ data: result.rows[0] });
                return [3 /*break*/, 8];
            case 7:
                e_6 = _b.sent();
                (0, cors_1.setCorsHeaders)(res);
                if (e_6 instanceof https_1.HttpsError && e_6.code === 'unauthenticated') {
                    res.status(401).json({ error: e_6.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('createTreatmentSessionHttp:', e_6);
                res.status(500).json({ error: e_6 instanceof Error ? e_6.message : 'Erro' });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
exports.getPainRecordsHttp = (0, https_1.onRequest)(httpOpts, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, patientId, pool, patientCheck, result, e_7;
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
                return [4 /*yield*/, pool.query('SELECT * FROM patient_pain_records WHERE patient_id = $1 AND organization_id = $2 ORDER BY record_date DESC', [patientId, auth.organizationId])];
            case 4:
                result = _a.sent();
                res.json({ data: result.rows });
                return [3 /*break*/, 6];
            case 5:
                e_7 = _a.sent();
                (0, cors_1.setCorsHeaders)(res);
                if (e_7 instanceof https_1.HttpsError && e_7.code === 'unauthenticated') {
                    res.status(401).json({ error: e_7.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('getPainRecordsHttp:', e_7);
                res.status(500).json({ error: e_7 instanceof Error ? e_7.message : 'Erro' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
exports.savePainRecordHttp = (0, https_1.onRequest)(httpOpts, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, patientId, painLevel, recordDate, notes, pool, patientCheck, result, e_8;
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
                _a = parseBody(req), patientId = _a.patientId, painLevel = _a.painLevel, recordDate = _a.recordDate, notes = _a.notes;
                if (!patientId || painLevel === undefined) {
                    res.status(400).json({ error: 'patientId e painLevel são obrigatórios' });
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
                return [4 /*yield*/, pool.query('INSERT INTO patient_pain_records (patient_id, organization_id, pain_level, record_date, notes, recorded_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [patientId, auth.organizationId, painLevel, recordDate || new Date().toISOString().split('T')[0], notes || null, auth.userId])];
            case 4:
                result = _b.sent();
                return [4 /*yield*/, triggerPatientRagReindexSafe(patientId, auth.organizationId, 'pain_record_created_http')];
            case 5:
                _b.sent();
                res.status(201).json({ data: result.rows[0] });
                return [3 /*break*/, 7];
            case 6:
                e_8 = _b.sent();
                (0, cors_1.setCorsHeaders)(res);
                if (e_8 instanceof https_1.HttpsError && e_8.code === 'unauthenticated') {
                    res.status(401).json({ error: e_8.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('savePainRecordHttp:', e_8);
                res.status(500).json({ error: e_8 instanceof Error ? e_8.message : 'Erro' });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
/**
 * Busca prontuários de um paciente
 */
var getPatientRecordsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, patientId, type, _b, limit, pool, patientQuery, query, params, result, error_2, errorMessage;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _c.sent();
                _a = request.data, patientId = _a.patientId, type = _a.type, _b = _a.limit, limit = _b === void 0 ? 50 : _b;
                if (!patientId) {
                    throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
                }
                pool = (0, init_1.getPool)();
                _c.label = 2;
            case 2:
                _c.trys.push([2, 5, , 6]);
                return [4 /*yield*/, pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId])];
            case 3:
                patientQuery = _c.sent();
                if (patientQuery.rows.length === 0) {
                    throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
                }
                query = "\n      SELECT\n        mr.*,\n        p.full_name as created_by_name\n      FROM medical_records mr\n      LEFT JOIN profiles p ON mr.created_by = p.user_id\n      WHERE mr.patient_id = $1\n        AND mr.organization_id = $2\n    ";
                params = [patientId, auth.organizationId];
                if (type) {
                    query += " AND mr.type = $3";
                    params.push(type);
                }
                query += " ORDER BY mr.record_date DESC, mr.created_at DESC LIMIT $".concat(params.length + 1);
                params.push(limit);
                return [4 /*yield*/, pool.query(query, params)];
            case 4:
                result = _c.sent();
                return [2 /*return*/, { data: result.rows }];
            case 5:
                error_2 = _c.sent();
                logger_1.logger.error('Error in getPatientRecords:', error_2);
                if (error_2 instanceof https_1.HttpsError)
                    throw error_2;
                errorMessage = error_2 instanceof Error ? error_2.message : 'Erro ao buscar prontuários';
                throw new https_1.HttpsError('internal', errorMessage);
            case 6: return [2 /*return*/];
        }
    });
}); };
exports.getPatientRecordsHandler = getPatientRecordsHandler;
exports.getPatientRecords = (0, https_1.onCall)(exports.getPatientRecordsHandler);
/**
 * Cria um novo prontuário
 */
var createMedicalRecordHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, patientId, type, title, content, recordDate, pool, patientCheck, result, e_9, error_3, errorMessage;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _b.sent();
                _a = request.data, patientId = _a.patientId, type = _a.type, title = _a.title, content = _a.content, recordDate = _a.recordDate;
                if (!patientId || !type || !title) {
                    throw new https_1.HttpsError('invalid-argument', 'patientId, type e title são obrigatórios');
                }
                pool = (0, init_1.getPool)();
                _b.label = 2;
            case 2:
                _b.trys.push([2, 10, , 11]);
                return [4 /*yield*/, pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId])];
            case 3:
                patientCheck = _b.sent();
                if (patientCheck.rows.length === 0) {
                    throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
                }
                return [4 /*yield*/, pool.query("INSERT INTO medical_records (\n        patient_id, created_by, organization_id,\n        type, title, content, record_date\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7)\n      RETURNING *", [
                        patientId,
                        auth.userId,
                        auth.organizationId,
                        type,
                        title,
                        content || '',
                        recordDate || new Date().toISOString().split('T')[0],
                    ])];
            case 4:
                result = _b.sent();
                return [4 /*yield*/, triggerPatientRagReindexSafe(patientId, auth.organizationId, 'medical_record_created')];
            case 5:
                _b.sent();
                _b.label = 6;
            case 6:
                _b.trys.push([6, 8, , 9]);
                return [4 /*yield*/, rtdb_1.rtdb.refreshPatients(auth.organizationId)];
            case 7:
                _b.sent();
                return [3 /*break*/, 9];
            case 8:
                e_9 = _b.sent();
                logger_1.logger.error('Erro RTDB:', e_9);
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/, { data: result.rows[0] }];
            case 10:
                error_3 = _b.sent();
                logger_1.logger.error('Error in createMedicalRecord:', error_3);
                if (error_3 instanceof https_1.HttpsError)
                    throw error_3;
                errorMessage = error_3 instanceof Error ? error_3.message : 'Erro ao criar prontuário';
                throw new https_1.HttpsError('internal', errorMessage);
            case 11: return [2 /*return*/];
        }
    });
}); };
exports.createMedicalRecordHandler = createMedicalRecordHandler;
exports.createMedicalRecord = (0, https_1.onCall)(exports.createMedicalRecordHandler);
/**
 * Atualiza um prontuário
 */
var updateMedicalRecordHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, recordId, updates, pool, existing, setClauses, values, paramCount, allowedFields, _i, allowedFields_1, field, result, error_4, errorMessage;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _b.sent();
                _a = request.data, recordId = _a.recordId, updates = __rest(_a, ["recordId"]);
                if (!recordId) {
                    throw new https_1.HttpsError('invalid-argument', 'recordId é obrigatório');
                }
                pool = (0, init_1.getPool)();
                _b.label = 2;
            case 2:
                _b.trys.push([2, 6, , 7]);
                return [4 /*yield*/, pool.query('SELECT id, patient_id FROM medical_records WHERE id = $1 AND organization_id = $2', [recordId, auth.organizationId])];
            case 3:
                existing = _b.sent();
                if (existing.rows.length === 0) {
                    throw new https_1.HttpsError('not-found', 'Prontuário não encontrado');
                }
                setClauses = [];
                values = [];
                paramCount = 0;
                allowedFields = ['title', 'content'];
                for (_i = 0, allowedFields_1 = allowedFields; _i < allowedFields_1.length; _i++) {
                    field = allowedFields_1[_i];
                    if (field in updates) {
                        paramCount++;
                        setClauses.push("".concat(field, " = $").concat(paramCount));
                        values.push(updates[field]);
                    }
                }
                if (setClauses.length === 0) {
                    throw new https_1.HttpsError('invalid-argument', 'Nenhum campo válido para atualizar');
                }
                paramCount++;
                setClauses.push("updated_at = $".concat(paramCount));
                values.push(new Date());
                values.push(recordId, auth.organizationId);
                return [4 /*yield*/, pool.query("UPDATE medical_records\n       SET ".concat(setClauses.join(', '), "\n       WHERE id = $").concat(paramCount + 1, " AND organization_id = $").concat(paramCount + 2, "\n       RETURNING *"), values)];
            case 4:
                result = _b.sent();
                return [4 /*yield*/, triggerPatientRagReindexSafe(existing.rows[0].patient_id, auth.organizationId, 'medical_record_updated')];
            case 5:
                _b.sent();
                return [2 /*return*/, { data: result.rows[0] }];
            case 6:
                error_4 = _b.sent();
                logger_1.logger.error('Error in updateMedicalRecord:', error_4);
                if (error_4 instanceof https_1.HttpsError)
                    throw error_4;
                errorMessage = error_4 instanceof Error ? error_4.message : 'Erro ao atualizar prontuário';
                throw new https_1.HttpsError('internal', errorMessage);
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.updateMedicalRecordHandler = updateMedicalRecordHandler;
exports.updateMedicalRecord = (0, https_1.onCall)(exports.updateMedicalRecordHandler);
/**
 * Lista sessões de tratamento de um paciente
 */
var listTreatmentSessionsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, patientId, _b, limit, pool, result, error_5, errorMessage;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _c.sent();
                _a = request.data, patientId = _a.patientId, _b = _a.limit, limit = _b === void 0 ? 20 : _b;
                if (!patientId) {
                    throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
                }
                pool = (0, init_1.getPool)();
                _c.label = 2;
            case 2:
                _c.trys.push([2, 4, , 5]);
                return [4 /*yield*/, pool.query("SELECT\n        ts.*,\n        p.name as patient_name,\n        prof.full_name as therapist_name,\n        a.date as appointment_date\n      FROM treatment_sessions ts\n      LEFT JOIN patients p ON ts.patient_id = p.id\n      LEFT JOIN profiles prof ON ts.therapist_id = prof.user_id\n      LEFT JOIN appointments a ON ts.appointment_id = a.id\n      WHERE ts.patient_id = $1\n        AND ts.organization_id = $2\n      ORDER BY ts.session_date DESC, ts.created_at DESC\n      LIMIT $3", [patientId, auth.organizationId, limit])];
            case 3:
                result = _c.sent();
                return [2 /*return*/, { data: result.rows }];
            case 4:
                error_5 = _c.sent();
                logger_1.logger.error('Error in listTreatmentSessions:', error_5);
                if (error_5 instanceof https_1.HttpsError)
                    throw error_5;
                errorMessage = error_5 instanceof Error ? error_5.message : 'Erro ao listar sessões';
                throw new https_1.HttpsError('internal', errorMessage);
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.listTreatmentSessionsHandler = listTreatmentSessionsHandler;
exports.listTreatmentSessions = (0, https_1.onCall)(exports.listTreatmentSessionsHandler);
/**
 * Cria uma nova sessão de tratamento
 */
var createTreatmentSessionHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, patientId, appointmentId, painLevelBefore, painLevelAfter, observations, evolution, nextGoals, pool, appointmentDate, therapistId, apt, result, e_10, error_6, errorMessage;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _b.sent();
                _a = request.data, patientId = _a.patientId, appointmentId = _a.appointmentId, painLevelBefore = _a.painLevelBefore, painLevelAfter = _a.painLevelAfter, observations = _a.observations, evolution = _a.evolution, nextGoals = _a.nextGoals;
                if (!patientId) {
                    throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
                }
                pool = (0, init_1.getPool)();
                _b.label = 2;
            case 2:
                _b.trys.push([2, 11, , 12]);
                appointmentDate = null;
                therapistId = auth.userId;
                if (!appointmentId) return [3 /*break*/, 4];
                return [4 /*yield*/, pool.query('SELECT date, therapist_id FROM appointments WHERE id = $1 AND organization_id = $2', [appointmentId, auth.organizationId])];
            case 3:
                apt = _b.sent();
                if (apt.rows.length > 0) {
                    appointmentDate = apt.rows[0].date;
                    therapistId = apt.rows[0].therapist_id;
                }
                _b.label = 4;
            case 4: return [4 /*yield*/, pool.query("INSERT INTO treatment_sessions (\n        patient_id, therapist_id, appointment_id,\n        organization_id, pain_level_before, pain_level_after,\n        observations, evolution, next_session_goals,\n        session_date\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)\n      RETURNING *", [
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
                ])];
            case 5:
                result = _b.sent();
                return [4 /*yield*/, triggerPatientRagReindexSafe(patientId, auth.organizationId, 'treatment_session_created')];
            case 6:
                _b.sent();
                if (!(painLevelAfter !== undefined && painLevelBefore !== undefined)) return [3 /*break*/, 10];
                _b.label = 7;
            case 7:
                _b.trys.push([7, 9, , 10]);
                return [4 /*yield*/, pool.query("INSERT INTO patient_progress (\n            patient_id, assessment_date, pain_level,\n            organization_id, recorded_by\n          ) VALUES ($1, CURRENT_DATE, $2, $3, $4)", [
                        patientId,
                        painLevelAfter,
                        auth.organizationId,
                        auth.userId,
                    ])];
            case 8:
                _b.sent();
                return [3 /*break*/, 10];
            case 9:
                e_10 = _b.sent();
                logger_1.logger.error('Error recording patient progress:', e_10);
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/, { data: result.rows[0] }];
            case 11:
                error_6 = _b.sent();
                logger_1.logger.error('Error in createTreatmentSession:', error_6);
                if (error_6 instanceof https_1.HttpsError)
                    throw error_6;
                errorMessage = error_6 instanceof Error ? error_6.message : 'Erro ao criar sessão';
                throw new https_1.HttpsError('internal', errorMessage);
            case 12: return [2 /*return*/];
        }
    });
}); };
exports.createTreatmentSessionHandler = createTreatmentSessionHandler;
exports.createTreatmentSession = (0, https_1.onCall)(exports.createTreatmentSessionHandler);
/**
 * Atualiza uma sessão de tratamento
 */
var updateTreatmentSessionHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, sessionId, updates, pool, existing, setClauses, values, paramCount, allowedFields, fieldMap, _i, _b, key, dbField, result, error_7, errorMessage;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _c.sent();
                _a = request.data, sessionId = _a.sessionId, updates = __rest(_a, ["sessionId"]);
                if (!sessionId) {
                    throw new https_1.HttpsError('invalid-argument', 'sessionId é obrigatório');
                }
                pool = (0, init_1.getPool)();
                _c.label = 2;
            case 2:
                _c.trys.push([2, 6, , 7]);
                return [4 /*yield*/, pool.query('SELECT id, patient_id FROM treatment_sessions WHERE id = $1 AND organization_id = $2', [sessionId, auth.organizationId])];
            case 3:
                existing = _c.sent();
                if (existing.rows.length === 0) {
                    throw new https_1.HttpsError('not-found', 'Sessão não encontrada');
                }
                setClauses = [];
                values = [];
                paramCount = 0;
                allowedFields = ['pain_level_before', 'pain_level_after', 'observations', 'evolution', 'next_session_goals'];
                fieldMap = {
                    painLevelBefore: 'pain_level_before',
                    painLevelAfter: 'pain_level_after',
                    nextGoals: 'next_session_goals'
                };
                for (_i = 0, _b = Object.keys(updates); _i < _b.length; _i++) {
                    key = _b[_i];
                    dbField = fieldMap[key] || key;
                    if (allowedFields.includes(dbField)) {
                        paramCount++;
                        setClauses.push("".concat(dbField, " = $").concat(paramCount));
                        values.push(updates[key]);
                    }
                }
                if (setClauses.length === 0) {
                    throw new https_1.HttpsError('invalid-argument', 'Nenhum campo válido para atualizar');
                }
                paramCount++;
                setClauses.push("updated_at = $".concat(paramCount));
                values.push(new Date());
                values.push(sessionId, auth.organizationId);
                return [4 /*yield*/, pool.query("UPDATE treatment_sessions\n       SET ".concat(setClauses.join(', '), "\n       WHERE id = $").concat(paramCount + 1, " AND organization_id = $").concat(paramCount + 2, "\n       RETURNING *"), values)];
            case 4:
                result = _c.sent();
                return [4 /*yield*/, triggerPatientRagReindexSafe(existing.rows[0].patient_id, auth.organizationId, 'treatment_session_updated')];
            case 5:
                _c.sent();
                return [2 /*return*/, { data: result.rows[0] }];
            case 6:
                error_7 = _c.sent();
                logger_1.logger.error('Error in updateTreatmentSession:', error_7);
                if (error_7 instanceof https_1.HttpsError)
                    throw error_7;
                errorMessage = error_7 instanceof Error ? error_7.message : 'Erro ao atualizar sessão';
                throw new https_1.HttpsError('internal', errorMessage);
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.updateTreatmentSessionHandler = updateTreatmentSessionHandler;
exports.updateTreatmentSession = (0, https_1.onCall)(exports.updateTreatmentSessionHandler);
/**
 * Busca registros de dor de um paciente
 */
var getPainRecordsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var patientId, pool, result, error_8, errorMessage;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                _a.sent();
                patientId = request.data.patientId;
                if (!patientId) {
                    throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
                }
                pool = (0, init_1.getPool)();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                return [4 /*yield*/, pool.query("SELECT\n        id, patient_id, pain_level, pain_type,\n        body_part, notes, created_at, updated_at\n      FROM patient_pain_records\n      WHERE patient_id = $1\n      ORDER BY created_at DESC", [patientId])];
            case 3:
                result = _a.sent();
                return [2 /*return*/, { data: result.rows }];
            case 4:
                error_8 = _a.sent();
                logger_1.logger.error('Error in getPainRecords:', error_8);
                if (error_8 instanceof https_1.HttpsError)
                    throw error_8;
                errorMessage = error_8 instanceof Error ? error_8.message : 'Erro ao buscar registros de dor';
                throw new https_1.HttpsError('internal', errorMessage);
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.getPainRecordsHandler = getPainRecordsHandler;
exports.getPainRecords = (0, https_1.onCall)(exports.getPainRecordsHandler);
/**
 * Registra um novo evento de dor
 */
var savePainRecordHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, patientId, level, type, bodyPart, notes, pool, result, error_9, errorMessage;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _b.sent();
                _a = request.data, patientId = _a.patientId, level = _a.level, type = _a.type, bodyPart = _a.bodyPart, notes = _a.notes;
                if (!patientId || level === undefined || !type || !bodyPart) {
                    throw new https_1.HttpsError('invalid-argument', 'patientId, level, type e bodyPart são obrigatórios');
                }
                pool = (0, init_1.getPool)();
                _b.label = 2;
            case 2:
                _b.trys.push([2, 5, , 6]);
                return [4 /*yield*/, pool.query("INSERT INTO patient_pain_records (\n        patient_id, pain_level, pain_type,\n        body_part, notes, organization_id, created_by\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7)\n      RETURNING *", [
                        patientId,
                        level,
                        type,
                        bodyPart,
                        notes || null,
                        auth.organizationId,
                        auth.userId
                    ])];
            case 3:
                result = _b.sent();
                return [4 /*yield*/, triggerPatientRagReindexSafe(patientId, auth.organizationId, 'patient_pain_record_created')];
            case 4:
                _b.sent();
                return [2 /*return*/, { data: result.rows[0] }];
            case 5:
                error_9 = _b.sent();
                logger_1.logger.error('Error in savePainRecord:', error_9);
                if (error_9 instanceof https_1.HttpsError)
                    throw error_9;
                errorMessage = error_9 instanceof Error ? error_9.message : 'Erro ao salvar registro de dor';
                throw new https_1.HttpsError('internal', errorMessage);
            case 6: return [2 /*return*/];
        }
    });
}); };
exports.savePainRecordHandler = savePainRecordHandler;
exports.savePainRecord = (0, https_1.onCall)(exports.savePainRecordHandler);
