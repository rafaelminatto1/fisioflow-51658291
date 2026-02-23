"use strict";
/**
 * API Functions: Patients
 * Cloud Functions para gestão de pacientes
 * OTIMIZADO - Cache de queries e configurações de performance
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.getPatientStats = exports.getPatientStatsHandler = exports.deletePatient = exports.deletePatientHandler = exports.updatePatient = exports.updatePatientHandler = exports.createPatient = exports.createPatientHandler = exports.getPatient = exports.getPatientHandler = exports.listPatients = exports.listPatientsHandler = exports.deletePatientHttp = exports.updatePatientHttp = exports.createPatientHttp = exports.getPatientStatsHttp = exports.getPatientHttp = exports.listPatientsHttp = void 0;
exports.verifyAuthHeader = verifyAuthHeader;
exports.getOrganizationId = getOrganizationId;
var https_1 = require("firebase-functions/v2/https");
var init_1 = require("../init");
var auth_1 = require("../middleware/auth");
var app_check_1 = require("../middleware/app-check");
var rate_limit_1 = require("../middleware/rate-limit");
var cors_1 = require("../lib/cors");
var error_handler_1 = require("../lib/error-handler");
var logger_1 = require("../lib/logger");
var audit_1 = require("../lib/audit");
var admin = require("firebase-admin");
var rag_index_maintenance_1 = require("../ai/rag/rag-index-maintenance");
var cache_helpers_1 = require("../lib/cache-helpers");
var rtdb_1 = require("../lib/rtdb");
// Configuração otimizada para funções de pacientes
var PATIENT_HTTP_OPTS = {
    region: 'southamerica-east1',
    maxInstances: 1,
    invoker: 'public',
    cors: cors_1.CORS_ORIGINS,
};
// ============================================================================
// HTTP VERSION (for frontend fetch calls with CORS fix)
// ============================================================================
var firebaseAuth = admin.auth();
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
                    logger_1.logger.warn('Failed to run incremental patient RAG reindex from patients API', {
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
function clearPatientRagIndexSafe(patientId, organizationId, reason) {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!patientId)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, rag_index_maintenance_1.clearPatientRagIndex)(patientId, organizationId)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    logger_1.logger.warn('Failed to clear patient RAG index from patients API', {
                        patientId: patientId,
                        organizationId: organizationId,
                        reason: reason,
                        error: error_2.message,
                    });
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Helper to verify Firebase ID token from Authorization header
 */
function verifyAuthHeader(req) {
    return __awaiter(this, void 0, void 0, function () {
        var authHeader, token, decodedToken, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    authHeader = req.headers.authorization || req.headers.Authorization;
                    if (!authHeader || !authHeader.startsWith('Bearer ')) {
                        throw new https_1.HttpsError('unauthenticated', 'No authorization header');
                    }
                    token = authHeader.split('Bearer ')[1];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, firebaseAuth.verifyIdToken(token)];
                case 2:
                    decodedToken = _a.sent();
                    return [2 /*return*/, { uid: decodedToken.uid }];
                case 3:
                    error_3 = _a.sent();
                    throw new https_1.HttpsError('unauthenticated', 'Invalid token');
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Helper to get organization ID from user ID
 * OTIMIZADO: Usa cache para reduzir queries repetidas
 */
function getOrganizationId(userId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, (0, cache_helpers_1.getOrganizationIdCached)(userId)];
        });
    });
}
/**
 * HTTP version of listPatients for CORS/compatibility
 * OTIMIZADO - Usa cache de organização e configurações de performance
 */
exports.listPatientsHttp = (0, https_1.onRequest)(PATIENT_HTTP_OPTS, (0, error_handler_1.withErrorHandling)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, organizationId, _a, status, search, _b, limit, _c, offset, pool, query, params, paramCount, result, countQuery, countParams, countParamCount, countResult, data, total, firestoreSnap;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, verifyAuthHeader(req)];
            case 1:
                uid = (_d.sent()).uid;
                return [4 /*yield*/, (0, cache_helpers_1.getOrganizationIdCached)(uid)];
            case 2:
                organizationId = _d.sent();
                _a = req.body || {}, status = _a.status, search = _a.search, _b = _a.limit, limit = _b === void 0 ? 50 : _b, _c = _a.offset, offset = _c === void 0 ? 0 : _c;
                pool = (0, init_1.getPool)();
                query = "\n        SELECT id, name, cpf, email, phone, birth_date, gender,\n          main_condition, status, progress, is_active,\n          created_at, updated_at\n        FROM patients\n        WHERE organization_id = $1 AND is_active = true\n      ";
                params = [organizationId];
                paramCount = 1;
                if (status) {
                    paramCount++;
                    query += " AND status = $".concat(paramCount);
                    params.push(status);
                }
                if (search) {
                    paramCount++;
                    query += " AND (name ILIKE $".concat(paramCount, " OR cpf ILIKE $").concat(paramCount, " OR email ILIKE $").concat(paramCount, ")");
                    params.push("%".concat(search, "%"));
                }
                query += " ORDER BY name ASC LIMIT $".concat(paramCount + 1, " OFFSET $").concat(paramCount + 2);
                params.push(limit, offset);
                return [4 /*yield*/, pool.query(query, params)];
            case 3:
                result = _d.sent();
                countQuery = "\n        SELECT COUNT(*) as total\n        FROM patients\n        WHERE organization_id = $1 AND is_active = true\n      ";
                countParams = [organizationId];
                countParamCount = 1;
                if (status) {
                    countParamCount++;
                    countQuery += " AND status = $".concat(countParamCount);
                    countParams.push(status);
                }
                if (search) {
                    countParamCount++;
                    countQuery += " AND (name ILIKE $".concat(countParamCount, " OR cpf ILIKE $").concat(countParamCount, " OR email ILIKE $").concat(countParamCount, ")");
                    countParams.push("%".concat(search, "%"));
                }
                return [4 /*yield*/, pool.query(countQuery, countParams)];
            case 4:
                countResult = _d.sent();
                data = result.rows;
                total = parseInt(countResult.rows[0].total, 10);
                if (!(data.length === 0)) return [3 /*break*/, 6];
                logger_1.logger.info('[listPatientsHttp] No patients in PostgreSQL, checking Firestore...');
                return [4 /*yield*/, admin.firestore().collection('patients')
                        .where('organizationId', '==', organizationId)
                        .where('isActive', '==', true)
                        .limit(limit)
                        .get()];
            case 5:
                firestoreSnap = _d.sent();
                if (!firestoreSnap.empty) {
                    data = firestoreSnap.docs.map(function (doc) {
                        var p = doc.data();
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
                        };
                    });
                    total = firestoreSnap.size;
                    logger_1.logger.info('[listPatientsHttp] Loaded ' + total + ' patients from Firestore fallback');
                }
                _d.label = 6;
            case 6:
                res.json({
                    data: data,
                    total: total,
                    page: Math.floor(offset / limit) + 1,
                    perPage: limit,
                });
                return [2 /*return*/];
        }
    });
}); }, 'listPatientsHttp'));
/**
 * HTTP version of getPatient for CORS/compatibility
 */
exports.getPatientHttp = (0, https_1.onRequest)(PATIENT_HTTP_OPTS, (0, error_handler_1.withErrorHandling)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, organizationId, patientId, pool, result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, verifyAuthHeader(req)];
            case 1:
                uid = (_a.sent()).uid;
                return [4 /*yield*/, getOrganizationId(uid)];
            case 2:
                organizationId = _a.sent();
                patientId = (req.body || {}).patientId;
                if (!patientId) {
                    res.status(400).json({ error: 'patientId é obrigatório' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query("SELECT id, name, cpf, email, phone, birth_date, gender,\n        main_condition, status, progress, is_active,\n        created_at, updated_at\n      FROM patients\n      WHERE id = $1 AND organization_id = $2", [patientId, organizationId])];
            case 3:
                result = _a.sent();
                if (result.rows.length === 0) {
                    res.status(404).json({ error: 'Paciente não encontrado' });
                    return [2 /*return*/];
                }
                res.json({ data: result.rows[0] });
                return [2 /*return*/];
        }
    });
}); }, 'getPatientHttp'));
/**
 * HTTP version of getPatientStats for CORS/compatibility
 */
exports.getPatientStatsHttp = (0, https_1.onRequest)(PATIENT_HTTP_OPTS, (0, error_handler_1.withErrorHandling)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var emptyStats, uid, organizationId, orgError_1, uuidRegex, body, patientId, pool, patientCheck, dbError_1, row, statsResult, sqlError_1, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                emptyStats = function () { return ({
                    data: {
                        totalSessions: 0,
                        upcomingAppointments: 0,
                        lastVisit: undefined,
                    },
                }); };
                _a.label = 1;
            case 1:
                _a.trys.push([1, 15, , 16]);
                return [4 /*yield*/, verifyAuthHeader(req)];
            case 2:
                uid = (_a.sent()).uid;
                organizationId = void 0;
                _a.label = 3;
            case 3:
                _a.trys.push([3, 5, , 6]);
                return [4 /*yield*/, getOrganizationId(uid)];
            case 4:
                organizationId = _a.sent();
                return [3 /*break*/, 6];
            case 5:
                orgError_1 = _a.sent();
                logger_1.logger.warn('getPatientStatsHttp: getOrganizationId failed, returning empty stats', { uid: uid, error: orgError_1 });
                res.status(200).json(emptyStats());
                return [2 /*return*/];
            case 6:
                uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!organizationId || organizationId === 'default' || !uuidRegex.test(organizationId)) {
                    logger_1.logger.warn('getPatientStatsHttp: invalid organizationId, returning empty stats', { organizationId: organizationId });
                    res.status(200).json(emptyStats());
                    return [2 /*return*/];
                }
                body = typeof req.body === 'string' ? (function () { try {
                    return JSON.parse(req.body || '{}');
                }
                catch (_a) {
                    return {};
                } })() : (req.body || {});
                patientId = body.patientId;
                if (!patientId) {
                    res.status(400).json({ error: 'patientId é obrigatório' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                patientCheck = void 0;
                _a.label = 7;
            case 7:
                _a.trys.push([7, 9, , 10]);
                return [4 /*yield*/, pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, organizationId])];
            case 8:
                patientCheck = _a.sent();
                return [3 /*break*/, 10];
            case 9:
                dbError_1 = _a.sent();
                logger_1.logger.warn('getPatientStatsHttp: patient check failed, returning empty stats', { patientId: patientId, error: dbError_1 });
                res.status(200).json(emptyStats());
                return [2 /*return*/];
            case 10:
                if (patientCheck.rows.length === 0) {
                    res.status(404).json({ error: 'Paciente não encontrado' });
                    return [2 /*return*/];
                }
                row = null;
                _a.label = 11;
            case 11:
                _a.trys.push([11, 13, , 14]);
                return [4 /*yield*/, pool.query("SELECT\n            COUNT(*) FILTER (WHERE status = 'concluido') as completed,\n            COUNT(*) FILTER (WHERE date >= CURRENT_DATE) as upcoming,\n            MAX(date)::text FILTER (WHERE status = 'concluido') as last_visit\n          FROM appointments\n          WHERE patient_id = $1", [patientId])];
            case 12:
                statsResult = _a.sent();
                row = statsResult.rows[0] || null;
                return [3 /*break*/, 14];
            case 13:
                sqlError_1 = _a.sent();
                logger_1.logger.warn('getPatientStatsHttp: appointments query failed, returning empty stats', {
                    patientId: patientId,
                    error: sqlError_1,
                });
                return [3 /*break*/, 14];
            case 14:
                res.json({
                    data: {
                        totalSessions: parseInt((row === null || row === void 0 ? void 0 : row.completed) || '0', 10),
                        upcomingAppointments: parseInt((row === null || row === void 0 ? void 0 : row.upcoming) || '0', 10),
                        lastVisit: (row === null || row === void 0 ? void 0 : row.last_visit) || undefined,
                    },
                });
                return [3 /*break*/, 16];
            case 15:
                error_4 = _a.sent();
                if (error_4 instanceof https_1.HttpsError && error_4.code === 'unauthenticated') {
                    throw error_4; // Let wrapper handle it
                }
                logger_1.logger.error('Error in getPatientStatsHttp:', error_4);
                // Retorna stats vazios em vez de 500 para não quebrar o prefetch
                res.status(200).json(emptyStats());
                return [3 /*break*/, 16];
            case 16: return [2 /*return*/];
        }
    });
}); }, 'getPatientStatsHttp'));
/**
 * HTTP version of createPatient for CORS/compatibility
 */
exports.createPatientHttp = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
    invoker: 'public',
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, organizationId, body, data, pool, existing, birthDate, mainCondition, validStatuses, rawStatus, status_1, result, insertErr_1, errMsg, patient, db, fsError_1, err_1, error_5;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    (0, cors_1.setCorsHeaders)(res, req);
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    (0, cors_1.setCorsHeaders)(res, req);
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                (0, cors_1.setCorsHeaders)(res, req);
                _d.label = 1;
            case 1:
                _d.trys.push([1, 22, , 23]);
                return [4 /*yield*/, verifyAuthHeader(req)];
            case 2:
                uid = (_d.sent()).uid;
                return [4 /*yield*/, getOrganizationId(uid)];
            case 3:
                organizationId = _d.sent();
                body = typeof req.body === 'string' ? (function () { try {
                    return JSON.parse(req.body || '{}');
                }
                catch (_a) {
                    return {};
                } })() : (req.body || {});
                data = body;
                if (!data.name) {
                    (0, cors_1.setCorsHeaders)(res, req);
                    res.status(400).json({ error: 'name é obrigatório' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                if (!data.cpf) return [3 /*break*/, 5];
                return [4 /*yield*/, pool.query('SELECT id FROM patients WHERE cpf = $1 AND organization_id = $2', [data.cpf.replace(/\D/g, ''), organizationId])];
            case 4:
                existing = _d.sent();
                if (existing.rows.length > 0) {
                    (0, cors_1.setCorsHeaders)(res, req);
                    res.status(409).json({ error: 'Já existe um paciente com este CPF' });
                    return [2 /*return*/];
                }
                _d.label = 5;
            case 5: 
            // Garantir organização existe
            return [4 /*yield*/, pool.query("INSERT INTO organizations (id, name, email)\n         VALUES ($1, 'Cl\u00EDnica Principal', 'admin@fisioflow.com.br')\n         ON CONFLICT (id) DO NOTHING", [organizationId])];
            case 6:
                // Garantir organização existe
                _d.sent();
                birthDate = data.birth_date || '1900-01-01';
                mainCondition = data.main_condition || 'A definir';
                validStatuses = ['Inicial', 'Em_Tratamento', 'Recuperacao', 'Concluido'];
                rawStatus = data.status || 'Inicial';
                status_1 = validStatuses.includes(rawStatus) ? rawStatus : 'Inicial';
                result = void 0;
                _d.label = 7;
            case 7:
                _d.trys.push([7, 9, , 13]);
                return [4 /*yield*/, pool.query("INSERT INTO patients (\n            name, cpf, email, phone, birth_date, gender,\n            address, emergency_contact, medical_history,\n            main_condition, status, organization_id, incomplete_registration\n          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)\n          RETURNING *", [
                        data.name,
                        ((_a = data.cpf) === null || _a === void 0 ? void 0 : _a.replace(/\D/g, '')) || null,
                        data.email || null,
                        data.phone || null,
                        birthDate,
                        data.gender || null,
                        data.address ? JSON.stringify(data.address) : null,
                        data.emergency_contact ? JSON.stringify(data.emergency_contact) : null,
                        data.medical_history || null,
                        mainCondition,
                        status_1,
                        organizationId,
                        (_b = data.incomplete_registration) !== null && _b !== void 0 ? _b : false
                    ])];
            case 8:
                result = _d.sent();
                return [3 /*break*/, 13];
            case 9:
                insertErr_1 = _d.sent();
                errMsg = insertErr_1 instanceof Error ? insertErr_1.message : String(insertErr_1);
                if (!/incomplete_registration|column.*does not exist/i.test(errMsg)) return [3 /*break*/, 11];
                return [4 /*yield*/, pool.query("INSERT INTO patients (\n              name, cpf, email, phone, birth_date, gender,\n              address, emergency_contact, medical_history,\n              main_condition, status, organization_id\n            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)\n            RETURNING *", [
                        data.name,
                        ((_c = data.cpf) === null || _c === void 0 ? void 0 : _c.replace(/\D/g, '')) || null,
                        data.email || null,
                        data.phone || null,
                        birthDate,
                        data.gender || null,
                        data.address ? JSON.stringify(data.address) : null,
                        data.emergency_contact ? JSON.stringify(data.emergency_contact) : null,
                        data.medical_history || null,
                        mainCondition,
                        status_1,
                        organizationId
                    ])];
            case 10:
                result = _d.sent();
                return [3 /*break*/, 12];
            case 11: throw insertErr_1;
            case 12: return [3 /*break*/, 13];
            case 13:
                patient = result.rows[0];
                return [4 /*yield*/, triggerPatientRagReindexSafe(patient.id, organizationId, 'patient_created_http')];
            case 14:
                _d.sent();
                _d.label = 15;
            case 15:
                _d.trys.push([15, 17, , 18]);
                db = admin.firestore();
                return [4 /*yield*/, db.collection('patients').doc(patient.id).set(__assign(__assign({}, patient), { created_at: new Date(), updated_at: new Date() }))];
            case 16:
                _d.sent();
                logger_1.logger.info("[createPatientHttp] Patient ".concat(patient.id, " synced to Firestore"));
                return [3 /*break*/, 18];
            case 17:
                fsError_1 = _d.sent();
                logger_1.logger.error("[createPatientHttp] Failed to sync patient ".concat(patient.id, " to Firestore:"), fsError_1);
                return [3 /*break*/, 18];
            case 18:
                _d.trys.push([18, 20, , 21]);
                return [4 /*yield*/, rtdb_1.rtdb.refreshPatients(organizationId)];
            case 19:
                _d.sent();
                return [3 /*break*/, 21];
            case 20:
                err_1 = _d.sent();
                logger_1.logger.error('Erro ao publicar no RTDB:', err_1);
                return [3 /*break*/, 21];
            case 21:
                (0, cors_1.setCorsHeaders)(res, req);
                res.status(201).json({ data: patient });
                return [3 /*break*/, 23];
            case 22:
                error_5 = _d.sent();
                (0, cors_1.setCorsHeaders)(res, req);
                if (error_5 instanceof https_1.HttpsError && error_5.code === 'unauthenticated') {
                    res.status(401).json({ error: error_5.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('Error in createPatientHttp:', error_5);
                res.status(500).json({ error: error_5 instanceof Error ? error_5.message : 'Erro ao criar paciente' });
                return [3 /*break*/, 23];
            case 23: return [2 /*return*/];
        }
    });
}); });
/**
 * HTTP version of updatePatient for CORS/compatibility
 */
exports.updatePatientHttp = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
    invoker: 'public',
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, organizationId, body, patientId, rawUpdates, updates, dateFields, _i, dateFields_1, key, pool, existing, allowedFields, setClauses, values, paramCount, _a, allowedFields_1, field, raw, value, result, patient, db, fsError_2, err_2, error_6, message;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                (0, cors_1.setCorsHeaders)(res, req);
                if (req.method === 'OPTIONS') {
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                (0, cors_1.setCorsHeaders)(res, req);
                _c.label = 1;
            case 1:
                _c.trys.push([1, 14, , 15]);
                return [4 /*yield*/, verifyAuthHeader(req)];
            case 2:
                uid = (_c.sent()).uid;
                return [4 /*yield*/, getOrganizationId(uid)];
            case 3:
                organizationId = _c.sent();
                body = typeof req.body === 'string' ? (function () { try {
                    return JSON.parse(req.body || '{}');
                }
                catch (_a) {
                    return {};
                } })() : (req.body || {});
                patientId = body.patientId, rawUpdates = __rest(body, ["patientId"]);
                if (!patientId) {
                    res.status(400).json({ error: 'patientId é obrigatório' });
                    return [2 /*return*/];
                }
                updates = __assign({}, rawUpdates);
                if ('full_name' in updates && !('name' in updates)) {
                    updates.name = updates.full_name;
                }
                dateFields = ['birth_date', 'medical_return_date'];
                for (_i = 0, dateFields_1 = dateFields; _i < dateFields_1.length; _i++) {
                    key = dateFields_1[_i];
                    if (key in updates && (updates[key] === '' || updates[key] == null)) {
                        updates[key] = null;
                    }
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query('SELECT * FROM patients WHERE id = $1 AND organization_id = $2', [patientId, organizationId])];
            case 4:
                existing = _c.sent();
                if (existing.rows.length === 0) {
                    res.status(404).json({ error: 'Paciente não encontrado' });
                    return [2 /*return*/];
                }
                allowedFields = ['name', 'cpf', 'email', 'phone', 'birth_date', 'gender', 'medical_history', 'main_condition', 'status', 'progress', 'referring_doctor_name', 'referring_doctor_phone', 'medical_return_date', 'medical_report_done', 'medical_report_sent'];
                setClauses = [];
                values = [];
                paramCount = 0;
                for (_a = 0, allowedFields_1 = allowedFields; _a < allowedFields_1.length; _a++) {
                    field = allowedFields_1[_a];
                    if (field in updates) {
                        paramCount++;
                        setClauses.push("".concat(field, " = $").concat(paramCount));
                        raw = updates[field];
                        value = field === 'cpf' ? (((_b = raw === null || raw === void 0 ? void 0 : raw.replace) === null || _b === void 0 ? void 0 : _b.call(raw, /\D/g, '')) || null) : (field === 'birth_date' || field === 'medical_return_date' ? (raw === '' ? null : raw) : raw);
                        values.push(value);
                    }
                }
                if (setClauses.length === 0) {
                    res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
                    return [2 /*return*/];
                }
                paramCount++;
                setClauses.push("updated_at = $".concat(paramCount));
                values.push(new Date());
                values.push(patientId, organizationId);
                return [4 /*yield*/, pool.query("UPDATE patients SET ".concat(setClauses.join(', '), " WHERE id = $").concat(paramCount + 1, " AND organization_id = $").concat(paramCount + 2, " RETURNING *"), values)];
            case 5:
                result = _c.sent();
                patient = result.rows[0];
                return [4 /*yield*/, triggerPatientRagReindexSafe(patientId, organizationId, 'patient_updated_http')];
            case 6:
                _c.sent();
                _c.label = 7;
            case 7:
                _c.trys.push([7, 9, , 10]);
                db = admin.firestore();
                return [4 /*yield*/, db.collection('patients').doc(patientId).set(__assign(__assign({}, patient), { updated_at: new Date() }), { merge: true })];
            case 8:
                _c.sent();
                logger_1.logger.info("[updatePatientHttp] Patient ".concat(patientId, " synced to Firestore"));
                return [3 /*break*/, 10];
            case 9:
                fsError_2 = _c.sent();
                logger_1.logger.error("[updatePatientHttp] Failed to sync patient ".concat(patientId, " to Firestore:"), fsError_2);
                return [3 /*break*/, 10];
            case 10:
                _c.trys.push([10, 12, , 13]);
                return [4 /*yield*/, rtdb_1.rtdb.refreshPatients(organizationId)];
            case 11:
                _c.sent();
                return [3 /*break*/, 13];
            case 12:
                err_2 = _c.sent();
                logger_1.logger.error('Erro ao publicar no RTDB:', err_2);
                return [3 /*break*/, 13];
            case 13:
                res.json({ data: patient });
                return [3 /*break*/, 15];
            case 14:
                error_6 = _c.sent();
                if (error_6 instanceof https_1.HttpsError && error_6.code === 'unauthenticated') {
                    res.status(401).json({ error: error_6.message });
                    return [2 /*return*/];
                }
                message = error_6 instanceof Error ? error_6.message : String(error_6);
                logger_1.logger.error('Error in updatePatientHttp:', { error: error_6, message: message });
                res.status(500).json({ error: message || 'Erro ao atualizar paciente' });
                return [3 /*break*/, 15];
            case 15: return [2 /*return*/];
        }
    });
}); });
/**
 * HTTP version of deletePatient for CORS/compatibility
 */
exports.deletePatientHttp = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
    invoker: 'public',
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, organizationId, body, patientId, pool, result, db, fsError_3, err_3, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    (0, cors_1.setCorsHeaders)(res, req);
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                (0, cors_1.setCorsHeaders)(res, req);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 14, , 15]);
                return [4 /*yield*/, verifyAuthHeader(req)];
            case 2:
                uid = (_a.sent()).uid;
                return [4 /*yield*/, getOrganizationId(uid)];
            case 3:
                organizationId = _a.sent();
                body = typeof req.body === 'string' ? (function () { try {
                    return JSON.parse(req.body || '{}');
                }
                catch (_a) {
                    return {};
                } })() : (req.body || {});
                patientId = body.patientId;
                if (!patientId) {
                    res.status(400).json({ error: 'patientId é obrigatório' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query('UPDATE patients SET is_active = false, updated_at = NOW() WHERE id = $1 AND organization_id = $2 RETURNING *', [patientId, organizationId])];
            case 4:
                result = _a.sent();
                if (result.rows.length === 0) {
                    res.status(404).json({ error: 'Paciente não encontrado' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, clearPatientRagIndexSafe(patientId, organizationId, 'patient_soft_deleted_http')];
            case 5:
                _a.sent();
                _a.label = 6;
            case 6:
                _a.trys.push([6, 8, , 9]);
                db = admin.firestore();
                return [4 /*yield*/, db.collection('patients').doc(patientId).update({
                        is_active: false,
                        updated_at: new Date()
                    })];
            case 7:
                _a.sent();
                logger_1.logger.info("[deletePatientHttp] Patient ".concat(patientId, " soft-deleted in Firestore"));
                return [3 /*break*/, 9];
            case 8:
                fsError_3 = _a.sent();
                logger_1.logger.error("[deletePatientHttp] Failed to sync deletion of ".concat(patientId, " to Firestore:"), fsError_3);
                return [3 /*break*/, 9];
            case 9:
                _a.trys.push([9, 11, , 12]);
                return [4 /*yield*/, rtdb_1.rtdb.refreshPatients(organizationId)];
            case 10:
                _a.sent();
                return [3 /*break*/, 12];
            case 11:
                err_3 = _a.sent();
                logger_1.logger.error('Erro ao publicar no RTDB:', err_3);
                return [3 /*break*/, 12];
            case 12: 
            // Log Audit Event (Healthcare standard)
            return [4 /*yield*/, (0, audit_1.logAuditEvent)({
                    action: 'delete',
                    resourceType: 'patient',
                    resourceId: patientId,
                    userId: uid,
                    organizationId: organizationId,
                    description: 'Paciente excluído (soft-delete)',
                    sensitivity: 'high'
                })];
            case 13:
                // Log Audit Event (Healthcare standard)
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 15];
            case 14:
                error_7 = _a.sent();
                if (error_7 instanceof https_1.HttpsError && error_7.code === 'unauthenticated') {
                    res.status(401).json({ error: error_7.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('Error in deletePatientHttp:', error_7);
                res.status(500).json({ error: error_7 instanceof Error ? error_7.message : 'Erro ao excluir paciente' });
                return [3 /*break*/, 15];
            case 15: return [2 /*return*/];
        }
    });
}); });
// ============================================================================
// ORIGINAL CALLABLE VERSION
// ============================================================================
/**
 * Lista pacientes com filtros opcionais
 */
var listPatientsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, profileDoc, profile, error_8, _a, status, search, _b, limit, _c, offset, pool, query, params, paramCount, countQuery, countResult, totalCount, result, error_9, errorMessage;
    var _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
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
                return [4 /*yield*/, (0, rate_limit_1.enforceRateLimit)(request, rate_limit_1.RATE_LIMITS.callable)];
            case 1:
                // Verificar rate limit
                _e.sent();
                console.log('[listPatients] Rate limit check passed');
                _e.label = 2;
            case 2:
                _e.trys.push([2, 4, , 5]);
                return [4 /*yield*/, admin.firestore().collection('profiles').doc(request.auth.uid).get()];
            case 3:
                profileDoc = _e.sent();
                if (!profileDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Perfil não encontrado');
                }
                profile = profileDoc.data();
                organizationId = (profile === null || profile === void 0 ? void 0 : profile.organizationId) || (profile === null || profile === void 0 ? void 0 : profile.activeOrganizationId) || ((_d = profile === null || profile === void 0 ? void 0 : profile.organizationIds) === null || _d === void 0 ? void 0 : _d[0]);
                if (!organizationId) {
                    throw new https_1.HttpsError('not-found', 'Organization ID não encontrado no perfil');
                }
                return [3 /*break*/, 5];
            case 4:
                error_8 = _e.sent();
                logger_1.logger.error('[listPatients] Error getting organization:', error_8);
                throw new https_1.HttpsError('not-found', 'Perfil não encontrado');
            case 5:
                _a = request.data, status = _a.status, search = _a.search, _b = _a.limit, limit = _b === void 0 ? 50 : _b, _c = _a.offset, offset = _c === void 0 ? 0 : _c;
                pool = (0, init_1.getPool)();
                _e.label = 6;
            case 6:
                _e.trys.push([6, 9, , 10]);
                query = "\n      SELECT\n        id, name, cpf, email, phone, birth_date, gender,\n        main_condition, status, progress, is_active,\n        created_at, updated_at\n      FROM patients\n      WHERE organization_id = $1\n        AND is_active = true\n    ";
                params = [organizationId];
                paramCount = 1;
                if (status) {
                    paramCount++;
                    query += " AND status = $".concat(paramCount);
                    params.push(status);
                }
                if (search) {
                    paramCount++;
                    query += " AND (name ILIKE $".concat(paramCount, " OR email ILIKE $").concat(paramCount, " OR phone ILIKE $").concat(paramCount, " OR cpf ILIKE $").concat(paramCount, ")");
                    params.push("%".concat(search, "%"));
                }
                countQuery = "SELECT COUNT(*) FROM patients WHERE organization_id = $1 AND is_active = true";
                if (status)
                    countQuery += " AND status = '".concat(status, "'");
                if (search)
                    countQuery += " AND (name ILIKE '%".concat(search, "%' OR email ILIKE '%").concat(search, "%')");
                return [4 /*yield*/, pool.query(countQuery, [organizationId])];
            case 7:
                countResult = _e.sent();
                totalCount = parseInt(countResult.rows[0].count);
                query += " ORDER BY name ASC LIMIT $".concat(paramCount + 1, " OFFSET $").concat(paramCount + 2);
                params.push(limit, offset);
                console.log('[listPatients] Executing query:', query);
                return [4 /*yield*/, pool.query(query, params)];
            case 8:
                result = _e.sent();
                console.log('[listPatients] Query executed, rows returned:', result.rowCount);
                return [2 /*return*/, {
                        data: result.rows,
                        total: totalCount,
                        page: Math.floor(offset / limit) + 1,
                        perPage: limit
                    }];
            case 9:
                error_9 = _e.sent();
                logger_1.logger.error('[listPatients] Error:', error_9);
                if (error_9 instanceof https_1.HttpsError)
                    throw error_9;
                errorMessage = error_9 instanceof Error ? error_9.message : 'Erro ao listar pacientes';
                throw new https_1.HttpsError('internal', errorMessage);
            case 10: return [2 /*return*/];
        }
    });
}); };
exports.listPatientsHandler = listPatientsHandler;
exports.listPatients = (0, https_1.onCall)(exports.listPatientsHandler);
/**
 * Busca um paciente por ID
 */
var getPatientHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, id, pool, result, error_10, errorMessage;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _a.sent();
                id = request.data.id;
                if (!id) {
                    throw new https_1.HttpsError('invalid-argument', 'O ID do paciente é obrigatório.');
                }
                pool = (0, init_1.getPool)();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                return [4 /*yield*/, pool.query("SELECT * FROM patients WHERE id = $1 AND organization_id = $2 AND is_active = true", [id, auth.organizationId])];
            case 3:
                result = _a.sent();
                if (result.rows.length === 0) {
                    throw new https_1.HttpsError('not-found', 'Paciente não encontrado.');
                }
                return [2 /*return*/, { data: result.rows[0] }];
            case 4:
                error_10 = _a.sent();
                logger_1.logger.error('[getPatient] Error:', error_10);
                if (error_10 instanceof https_1.HttpsError)
                    throw error_10;
                errorMessage = error_10 instanceof Error ? error_10.message : 'Erro ao buscar paciente';
                throw new https_1.HttpsError('internal', errorMessage);
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.getPatientHandler = getPatientHandler;
exports.getPatient = (0, https_1.onCall)(exports.getPatientHandler);
/**
 * Cria um novo paciente
 */
/**
 * Cria um novo paciente
 */
var createPatientHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, data, earlyError_1, msg, pool, existing, orgInsertSql, birthDate, mainCondition, validStatuses, rawStatus, status_2, result, insertErr_2, errMsg, patient, db, fsError_4, err_4, error_11, errorMessage;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                logger_1.logger.debug('[createPatient] ===== START =====');
                if (!request.auth || !request.auth.token) {
                    logger_1.logger.error('[createPatient] Unauthenticated request');
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                logger_1.logger.debug('[createPatient] Auth token present, uid:', request.auth.uid);
                _d.label = 1;
            case 1:
                _d.trys.push([1, 4, , 5]);
                // Verificar App Check
                (0, app_check_1.verifyAppCheck)(request);
                logger_1.logger.debug('[createPatient] App Check verified');
                // Verificar rate limit
                return [4 /*yield*/, (0, rate_limit_1.enforceRateLimit)(request, rate_limit_1.RATE_LIMITS.callable)];
            case 2:
                // Verificar rate limit
                _d.sent();
                logger_1.logger.debug('[createPatient] Rate limit check passed');
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 3:
                auth = _d.sent();
                data = request.data;
                return [3 /*break*/, 5];
            case 4:
                earlyError_1 = _d.sent();
                msg = earlyError_1 instanceof Error ? earlyError_1.message : String(earlyError_1);
                logger_1.logger.error('[createPatient] Error before try block:', earlyError_1);
                if (earlyError_1 instanceof https_1.HttpsError)
                    throw earlyError_1;
                throw new https_1.HttpsError('invalid-argument', "[createPatient] ".concat(msg));
            case 5:
                // DEBUG: Log organization_id ao criar paciente
                logger_1.logger.debug('[createPatient] auth.organizationId:', auth.organizationId);
                logger_1.logger.debug('[createPatient] auth.userId:', auth.userId);
                logger_1.logger.debug('[createPatient] data:', JSON.stringify({ name: data.name, phone: data.phone }));
                // Validar campos obrigatórios
                if (!data.name) {
                    throw new https_1.HttpsError('invalid-argument', 'name é obrigatório');
                }
                pool = (0, init_1.getPool)();
                _d.label = 6;
            case 6:
                _d.trys.push([6, 26, , 27]);
                if (!data.cpf) return [3 /*break*/, 8];
                return [4 /*yield*/, pool.query('SELECT id FROM patients WHERE cpf = $1 AND organization_id = $2', [data.cpf.replace(/\D/g, ''), auth.organizationId])];
            case 7:
                existing = _d.sent();
                if (existing.rows.length > 0) {
                    throw new https_1.HttpsError('already-exists', 'Já existe um paciente com este CPF');
                }
                _d.label = 8;
            case 8:
                // [AUTO-FIX] Ensure organization exists to satisfy FK constraint
                logger_1.logger.debug('[createPatient] Target Org ID:', auth.organizationId);
                orgInsertSql = "INSERT INTO organizations (id, name, email)\n       VALUES ($1, 'Cl\u00EDnica Principal', 'admin@fisioflow.com.br')\n       ON CONFLICT (id) DO NOTHING";
                logger_1.logger.debug('[createPatient] Org Insert SQL:', orgInsertSql);
                return [4 /*yield*/, pool.query(orgInsertSql, [auth.organizationId])];
            case 9:
                _d.sent();
                birthDate = data.birth_date || '1900-01-01';
                mainCondition = data.main_condition || 'A definir';
                validStatuses = ['Inicial', 'Em_Tratamento', 'Recuperacao', 'Concluido'];
                rawStatus = data.status || 'Inicial';
                status_2 = validStatuses.includes(rawStatus) ? rawStatus : 'Inicial';
                result = void 0;
                _d.label = 10;
            case 10:
                _d.trys.push([10, 12, , 16]);
                return [4 /*yield*/, pool.query("INSERT INTO patients (\n          name, cpf, email, phone, birth_date, gender,\n          address, emergency_contact, medical_history,\n          main_condition, status, organization_id, incomplete_registration\n        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)\n        RETURNING *", [
                        data.name,
                        ((_a = data.cpf) === null || _a === void 0 ? void 0 : _a.replace(/\D/g, '')) || null,
                        data.email || null,
                        data.phone || null,
                        birthDate,
                        data.gender || null,
                        data.address ? JSON.stringify(data.address) : null,
                        data.emergency_contact ? JSON.stringify(data.emergency_contact) : null,
                        data.medical_history || null,
                        mainCondition,
                        status_2,
                        auth.organizationId,
                        (_b = data.incomplete_registration) !== null && _b !== void 0 ? _b : false
                    ])];
            case 11:
                result = _d.sent();
                return [3 /*break*/, 16];
            case 12:
                insertErr_2 = _d.sent();
                errMsg = insertErr_2 instanceof Error ? insertErr_2.message : String(insertErr_2);
                if (!/incomplete_registration|column.*does not exist/i.test(errMsg)) return [3 /*break*/, 14];
                return [4 /*yield*/, pool.query("INSERT INTO patients (\n            name, cpf, email, phone, birth_date, gender,\n            address, emergency_contact, medical_history,\n            main_condition, status, organization_id\n          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)\n          RETURNING *", [
                        data.name,
                        ((_c = data.cpf) === null || _c === void 0 ? void 0 : _c.replace(/\D/g, '')) || null,
                        data.email || null,
                        data.phone || null,
                        birthDate,
                        data.gender || null,
                        data.address ? JSON.stringify(data.address) : null,
                        data.emergency_contact ? JSON.stringify(data.emergency_contact) : null,
                        data.medical_history || null,
                        mainCondition,
                        status_2,
                        auth.organizationId
                    ])];
            case 13:
                result = _d.sent();
                return [3 /*break*/, 15];
            case 14: throw insertErr_2;
            case 15: return [3 /*break*/, 16];
            case 16:
                patient = result.rows[0];
                return [4 /*yield*/, triggerPatientRagReindexSafe(patient.id, auth.organizationId, 'patient_created')];
            case 17:
                _d.sent();
                _d.label = 18;
            case 18:
                _d.trys.push([18, 20, , 21]);
                db = admin.firestore();
                return [4 /*yield*/, db.collection('patients').doc(patient.id).set(__assign(__assign({}, patient), { created_at: new Date(), updated_at: new Date() }))];
            case 19:
                _d.sent();
                logger_1.logger.info("[createPatient] Patient ".concat(patient.id, " synced to Firestore"));
                return [3 /*break*/, 21];
            case 20:
                fsError_4 = _d.sent();
                logger_1.logger.error("[createPatient] Failed to sync patient ".concat(patient.id, " to Firestore:"), fsError_4);
                return [3 /*break*/, 21];
            case 21:
                logger_1.logger.debug('[createPatient] Patient created:', JSON.stringify({
                    id: patient.id,
                    name: patient.name,
                    organization_id: patient.organization_id,
                    is_active: patient.is_active
                }));
                _d.label = 22;
            case 22:
                _d.trys.push([22, 24, , 25]);
                return [4 /*yield*/, rtdb_1.rtdb.refreshPatients(auth.organizationId)];
            case 23:
                _d.sent();
                return [3 /*break*/, 25];
            case 24:
                err_4 = _d.sent();
                logger_1.logger.error('Erro ao publicar no RTDB:', err_4);
                return [3 /*break*/, 25];
            case 25: return [2 /*return*/, { data: patient }];
            case 26:
                error_11 = _d.sent();
                logger_1.logger.error('Error in createPatient:', error_11);
                if (error_11 instanceof https_1.HttpsError)
                    throw error_11;
                errorMessage = error_11 instanceof Error ? error_11.message : 'Erro interno ao criar paciente';
                throw new https_1.HttpsError('internal', errorMessage);
            case 27: return [2 /*return*/];
        }
    });
}); };
exports.createPatientHandler = createPatientHandler;
exports.createPatient = (0, https_1.onCall)(exports.createPatientHandler);
/**
 * Atualiza um paciente existente
 */
var updatePatientHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, id, updateData, pool, existing, setClauses, values, paramCount, allowedFields, _i, allowedFields_2, field, query, result, patient, db, fsError_5, err_5, error_12, errorMessage;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                // Verificar App Check
                (0, app_check_1.verifyAppCheck)(request);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _c.sent();
                _a = request.data, id = _a.id, updateData = __rest(_a, ["id"]);
                if (!id) {
                    throw new https_1.HttpsError('invalid-argument', 'O ID do paciente é obrigatório.');
                }
                pool = (0, init_1.getPool)();
                _c.label = 2;
            case 2:
                _c.trys.push([2, 13, , 14]);
                return [4 /*yield*/, pool.query('SELECT * FROM patients WHERE id = $1 AND organization_id = $2', [id, auth.organizationId])];
            case 3:
                existing = _c.sent();
                if (existing.rows.length === 0) {
                    throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
                }
                setClauses = [];
                values = [];
                paramCount = 0;
                allowedFields = [
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
                    'notes', // Added notes
                    'is_active', // Added is_active
                ];
                for (_i = 0, allowedFields_2 = allowedFields; _i < allowedFields_2.length; _i++) {
                    field = allowedFields_2[_i];
                    if (field in updateData) { // Changed from updates to updateData
                        paramCount++;
                        setClauses.push("".concat(field, " = $").concat(paramCount));
                        if (field === 'cpf') {
                            values.push(((_b = updateData[field]) === null || _b === void 0 ? void 0 : _b.replace(/\D/g, '')) || null);
                        }
                        else {
                            values.push(updateData[field]);
                        }
                    }
                }
                if (setClauses.length === 0) {
                    throw new https_1.HttpsError('invalid-argument', 'Nenhum campo válido para atualizar');
                }
                // Adicionar updated_at
                paramCount++;
                setClauses.push("updated_at = $".concat(paramCount));
                values.push(new Date());
                // Adicionar WHERE params
                values.push(id, auth.organizationId); // Changed from patientId to id
                query = "\n      UPDATE patients\n      SET ".concat(setClauses.join(', '), "\n      WHERE id = $").concat(paramCount + 1, " AND organization_id = $").concat(paramCount + 2, "\n      RETURNING *\n    ");
                return [4 /*yield*/, pool.query(query, values)];
            case 4:
                result = _c.sent();
                patient = result.rows[0];
                return [4 /*yield*/, triggerPatientRagReindexSafe(id, auth.organizationId, 'patient_updated')];
            case 5:
                _c.sent();
                _c.label = 6;
            case 6:
                _c.trys.push([6, 8, , 9]);
                db = admin.firestore();
                return [4 /*yield*/, db.collection('patients').doc(id).set(__assign(__assign({}, patient), { updated_at: new Date() }), { merge: true })];
            case 7:
                _c.sent();
                logger_1.logger.info("[updatePatient] Patient ".concat(id, " synced to Firestore")); // Changed from patientId to id
                return [3 /*break*/, 9];
            case 8:
                fsError_5 = _c.sent();
                logger_1.logger.error("[updatePatient] Failed to sync patient ".concat(id, " to Firestore:"), fsError_5); // Changed from patientId to id
                return [3 /*break*/, 9];
            case 9:
                _c.trys.push([9, 11, , 12]);
                return [4 /*yield*/, rtdb_1.rtdb.refreshPatients(auth.organizationId)];
            case 10:
                _c.sent();
                return [3 /*break*/, 12];
            case 11:
                err_5 = _c.sent();
                logger_1.logger.error('Erro ao publicar no RTDB:', err_5);
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/, { data: patient }];
            case 13:
                error_12 = _c.sent();
                logger_1.logger.error('Error in updatePatient:', error_12);
                if (error_12 instanceof https_1.HttpsError)
                    throw error_12;
                errorMessage = error_12 instanceof Error ? error_12.message : 'Erro interno ao atualizar paciente';
                throw new https_1.HttpsError('internal', errorMessage);
            case 14: return [2 /*return*/];
        }
    });
}); };
exports.updatePatientHandler = updatePatientHandler;
exports.updatePatient = (0, https_1.onCall)(exports.updatePatientHandler);
/**
 * Remove (soft delete) um paciente
 */
/**
 * Remove (soft delete) um paciente
 */
var deletePatientHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, patientId, pool, result, db, fsError_6, err_6, error_13, errorMessage;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                // Verificar App Check
                (0, app_check_1.verifyAppCheck)(request);
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
                _a.trys.push([2, 12, , 13]);
                return [4 /*yield*/, pool.query("UPDATE patients\n       SET is_active = false, updated_at = NOW()\n       WHERE id = $1 AND organization_id = $2\n       RETURNING *", [patientId, auth.organizationId])];
            case 3:
                result = _a.sent();
                if (result.rows.length === 0) {
                    throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
                }
                return [4 /*yield*/, clearPatientRagIndexSafe(patientId, auth.organizationId, 'patient_soft_deleted')];
            case 4:
                _a.sent();
                _a.label = 5;
            case 5:
                _a.trys.push([5, 7, , 8]);
                db = admin.firestore();
                return [4 /*yield*/, db.collection('patients').doc(patientId).update({
                        is_active: false,
                        updated_at: new Date()
                    })];
            case 6:
                _a.sent();
                logger_1.logger.info("[deletePatient] Patient ".concat(patientId, " soft-deleted in Firestore"));
                return [3 /*break*/, 8];
            case 7:
                fsError_6 = _a.sent();
                logger_1.logger.error("[deletePatient] Failed to sync deletion of ".concat(patientId, " to Firestore:"), fsError_6);
                return [3 /*break*/, 8];
            case 8:
                _a.trys.push([8, 10, , 11]);
                return [4 /*yield*/, rtdb_1.rtdb.refreshPatients(auth.organizationId)];
            case 9:
                _a.sent();
                return [3 /*break*/, 11];
            case 10:
                err_6 = _a.sent();
                logger_1.logger.error('Erro ao publicar no RTDB:', err_6);
                return [3 /*break*/, 11];
            case 11: return [2 /*return*/, { success: true }];
            case 12:
                error_13 = _a.sent();
                logger_1.logger.error('Error in deletePatient:', error_13);
                if (error_13 instanceof https_1.HttpsError)
                    throw error_13;
                errorMessage = error_13 instanceof Error ? error_13.message : 'Erro interno ao excluir paciente';
                throw new https_1.HttpsError('internal', errorMessage);
            case 13: return [2 /*return*/];
        }
    });
}); };
exports.deletePatientHandler = deletePatientHandler;
exports.deletePatient = (0, https_1.onCall)(exports.deletePatientHandler);
/**
 * Busca estatísticas de um paciente
 */
/**
 * Busca estatísticas de um paciente
 */
var getPatientStatsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, id, pool, patient, _a, appointmentsResult, sessionsResult, plansResult, apptStats, error_14, errorMessage;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _b.sent();
                id = request.data.id;
                if (!id) {
                    throw new https_1.HttpsError('invalid-argument', 'id é obrigatório');
                }
                pool = (0, init_1.getPool)();
                _b.label = 2;
            case 2:
                _b.trys.push([2, 5, , 6]);
                return [4 /*yield*/, pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [id, auth.organizationId])];
            case 3:
                patient = _b.sent();
                if (patient.rows.length === 0) {
                    throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
                }
                return [4 /*yield*/, Promise.all([
                        pool.query("SELECT\n          COUNT(*) as total,\n          COUNT(*) FILTER (WHERE status = 'concluido') as completed,\n          COUNT(*) FILTER (WHERE status = 'agendado') as scheduled,\n          COUNT(*) FILTER (WHERE date >= CURRENT_DATE) as upcoming\n        FROM appointments\n        WHERE patient_id = $1", [id]),
                        pool.query("SELECT COUNT(*) as total_sessions\n        FROM treatment_sessions\n        WHERE patient_id = $1", [id]),
                        pool.query("SELECT COUNT(*) as active_plans\n        FROM exercise_plans\n        WHERE patient_id = $1 AND status = 'ativo'", [id]),
                    ])];
            case 4:
                _a = _b.sent(), appointmentsResult = _a[0], sessionsResult = _a[1], plansResult = _a[2];
                apptStats = appointmentsResult.rows[0];
                return [2 /*return*/, {
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
                    }];
            case 5:
                error_14 = _b.sent();
                logger_1.logger.error('Error in getPatientStats:', error_14);
                if (error_14 instanceof https_1.HttpsError)
                    throw error_14;
                errorMessage = error_14 instanceof Error ? error_14.message : 'Erro interno ao buscar estatísticas';
                throw new https_1.HttpsError('internal', errorMessage);
            case 6: return [2 /*return*/];
        }
    });
}); };
exports.getPatientStatsHandler = getPatientStatsHandler;
exports.getPatientStats = (0, https_1.onCall)(exports.getPatientStatsHandler);
