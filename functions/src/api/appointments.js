"use strict";
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
exports.cancelAppointment = exports.cancelAppointmentHandler = exports.updateAppointment = exports.updateAppointmentHandler = exports.createAppointment = exports.createAppointmentHandler = exports.checkTimeConflictHandler = exports.getAppointment = exports.getAppointmentHandler = exports.listAppointments = exports.listAppointmentsHandler = exports.cancelAppointmentHttp = exports.updateAppointmentHttp = exports.createAppointmentHttp = exports.checkTimeConflictHttp = exports.getAppointmentHttp = exports.listAppointmentsHttp = void 0;
var https_1 = require("firebase-functions/v2/https");
var init_1 = require("../init");
var auth_1 = require("../middleware/auth");
var logger_1 = require("../lib/logger");
var rtdb_1 = require("../lib/rtdb");
var cache_helpers_1 = require("../lib/cache-helpers");
var notifications_1 = require("../workflows/notifications");
var error_handler_1 = require("../lib/error-handler");
var cors_1 = require("../lib/cors");
var uuid_1 = require("../lib/uuid");
// OTIMIZADO: Configurações com mais instâncias
var APPOINTMENT_HTTP_OPTS = {
    region: 'southamerica-east1',
    maxInstances: 2,
    invoker: 'public',
    cors: cors_1.CORS_ORIGINS,
};
// ============================================================================
// HTTP VERSION (for frontend fetch calls with CORS fix)
// ============================================================================ 
/**
 * Helper to verify Firebase ID token from Authorization header
 */
function verifyAuthHeader(req) {
    return __awaiter(this, void 0, void 0, function () {
        var authHeader, token, auth, decodedToken, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    authHeader = req.headers.authorization || req.headers.Authorization;
                    if (!authHeader || !authHeader.startsWith('Bearer ')) {
                        throw new https_1.HttpsError('unauthenticated', 'No authorization header');
                    }
                    token = authHeader.split('Bearer ')[1];
                    auth = (0, init_1.getAdminAuth)();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, auth.verifyIdToken(token)];
                case 2:
                    decodedToken = _a.sent();
                    return [2 /*return*/, { uid: decodedToken.uid }];
                case 3:
                    error_1 = _a.sent();
                    throw new https_1.HttpsError('unauthenticated', 'Invalid token');
                case 4: return [2 /*return*/];
            }
        });
    });
}
/** DB enum session_type é ('individual','dupla','grupo'). Frontend envia 'group' → normalizar para 'grupo'. */
function normalizeSessionType(value) {
    if (!value)
        return 'individual';
    if (value === 'group')
        return 'grupo';
    if (value === 'individual' || value === 'dupla' || value === 'grupo')
        return value;
    return 'individual';
}
function normalizeAppointmentStatus(value) {
    if (!value)
        return 'agendado';
    var v = value.toLowerCase();
    if (['agendado', 'confirmado', 'em_atendimento', 'concluido', 'cancelado', 'paciente_faltou'].includes(v))
        return v;
    if (v === 'avaliacao' || v === 'aguardando_confirmacao' || v === 'remarcado' || v === 'reagendado' || v === 'em_espera')
        return 'agendado';
    if (v === 'em_andamento' || v === 'atrasado')
        return 'em_atendimento';
    if (v === 'falta' || v === 'faltou')
        return 'paciente_faltou';
    if (v === 'atendido' || v === 'realizado')
        return 'concluido';
    return 'agendado';
}
/**
 * Helper to get organization ID from user ID
 * OTIMIZADO: Usa cache para evitar queries repetidas
 * ATENÇÃO: Sempre usar getOrganizationIdCached diretamente para máxima performance
 */
var getOrganizationId = cache_helpers_1.getOrganizationIdCached;
function normalizeDateOnly(value) {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }
    return String(value || '').slice(0, 10);
}
function normalizeTimeOnly(value) {
    return String(value || '').slice(0, 5);
}
var UUID_FILTER_BYPASS_VALUES = new Set(['', 'all', 'default', 'todos', 'none']);
function normalizeOptionalUuidFilter(value, fieldName) {
    if (value === undefined || value === null)
        return null;
    var raw = String(value).trim();
    if (UUID_FILTER_BYPASS_VALUES.has(raw.toLowerCase()))
        return null;
    if (!(0, uuid_1.isValidUuid)(raw)) {
        throw new https_1.HttpsError('invalid-argument', "".concat(fieldName, " inv\u00E1lido"));
    }
    return raw;
}
function requireUuidField(value, fieldName) {
    var raw = String(value || '').trim();
    if (!raw) {
        throw new https_1.HttpsError('invalid-argument', "".concat(fieldName, " \u00E9 obrigat\u00F3rio"));
    }
    if (!(0, uuid_1.isValidUuid)(raw)) {
        throw new https_1.HttpsError('invalid-argument', "".concat(fieldName, " inv\u00E1lido"));
    }
    return raw;
}
/**
 * HTTP version of listAppointments for CORS/compatibility
 * OTIMIZADO - Usa cache de organização
 */
exports.listAppointmentsHttp = (0, https_1.onRequest)(APPOINTMENT_HTTP_OPTS, (0, error_handler_1.withErrorHandling)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, organizationId, body, dateFrom, dateTo, therapistId, status, patientId, _a, limit, _b, offset, pool, normalizedPatientId, query, params, paramCount, result;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, verifyAuthHeader(req)];
            case 1:
                uid = (_c.sent()).uid;
                return [4 /*yield*/, (0, cache_helpers_1.getOrganizationIdCached)(uid)];
            case 2:
                organizationId = _c.sent();
                body = typeof req.body === 'string' ? (function () { try {
                    return JSON.parse(req.body || '{}');
                }
                catch (_a) {
                    return {};
                } })() : (req.body || {});
                dateFrom = body.dateFrom, dateTo = body.dateTo, therapistId = body.therapistId, status = body.status, patientId = body.patientId, _a = body.limit, limit = _a === void 0 ? 100 : _a, _b = body.offset, offset = _b === void 0 ? 0 : _b;
                pool = (0, init_1.getPool)();
                normalizedPatientId = normalizeOptionalUuidFilter(patientId, 'patientId');
                query = "SELECT a.*, p.name as patient_name, p.phone as patient_phone, prof.full_name as therapist_name\n                 FROM appointments a\n                 LEFT JOIN patients p ON a.patient_id = p.id\n                 LEFT JOIN profiles prof ON a.therapist_id = prof.user_id\n                 WHERE a.organization_id = $1";
                params = [organizationId];
                paramCount = 1;
                if (dateFrom) {
                    query += " AND a.date >= $".concat(++paramCount);
                    params.push(dateFrom);
                }
                if (dateTo) {
                    query += " AND a.date <= $".concat(++paramCount);
                    params.push(dateTo);
                }
                if (therapistId) {
                    query += " AND a.therapist_id = $".concat(++paramCount);
                    params.push(therapistId);
                }
                if (status) {
                    query += " AND a.status = $".concat(++paramCount);
                    params.push(status);
                }
                if (normalizedPatientId) {
                    query += " AND a.patient_id = $".concat(++paramCount);
                    params.push(normalizedPatientId);
                }
                query += " ORDER BY a.date, a.start_time LIMIT $".concat(++paramCount, " OFFSET $").concat(++paramCount);
                params.push(limit, offset);
                return [4 /*yield*/, pool.query(query, params)];
            case 3:
                result = _c.sent();
                // Disable cache for list to ensure immediate updates after creation
                res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.json({ data: result.rows });
                return [2 /*return*/];
        }
    });
}); }, 'listAppointmentsHttp'));
/**
 * HTTP version of getAppointment for CORS
 */
exports.getAppointmentHttp = (0, https_1.onRequest)(APPOINTMENT_HTTP_OPTS, (0, error_handler_1.withErrorHandling)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, organizationId, body, appointmentId, pool, result, row;
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
                body = typeof req.body === 'string' ? (function () { try {
                    return JSON.parse(req.body || '{}');
                }
                catch (_a) {
                    return {};
                } })() : (req.body || {});
                appointmentId = requireUuidField(body.appointmentId, 'appointmentId');
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query("SELECT \n        a.*, \n        to_jsonb(p.*) as patient,\n        prof.full_name as therapist_name\n       FROM appointments a \n       LEFT JOIN patients p ON a.patient_id = p.id\n       LEFT JOIN profiles prof ON a.therapist_id = prof.user_id\n       WHERE a.id = $1 AND a.organization_id = $2", [appointmentId, organizationId])];
            case 3:
                result = _a.sent();
                if (result.rows.length === 0) {
                    res.status(404).json({ error: 'Agendamento não encontrado' });
                    return [2 /*return*/];
                }
                row = result.rows[0];
                res.json({ data: __assign(__assign({}, row), { patient: row.patient }) });
                return [2 /*return*/];
        }
    });
}); }, 'getAppointmentHttp'));
/**
 * HTTP version of checkTimeConflict for CORS
 */
exports.checkTimeConflictHttp = (0, https_1.onRequest)(APPOINTMENT_HTTP_OPTS, (0, error_handler_1.withErrorHandling)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, organizationId, body, therapistId, date, startTime, endTime, excludeAppointmentId, pool, hasConflict;
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
                body = typeof req.body === 'string' ? (function () { try {
                    return JSON.parse(req.body || '{}');
                }
                catch (_a) {
                    return {};
                } })() : (req.body || {});
                therapistId = body.therapistId, date = body.date, startTime = body.startTime, endTime = body.endTime, excludeAppointmentId = body.excludeAppointmentId;
                if (!therapistId || !date || !startTime || !endTime) {
                    res.status(400).json({ error: 'terapeuta, data, horário início e fim são obrigatórios' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, checkTimeConflictHelper(pool, { date: date, startTime: startTime, endTime: endTime, therapistId: therapistId, excludeAppointmentId: excludeAppointmentId, organizationId: organizationId })];
            case 3:
                hasConflict = _a.sent();
                res.json({ hasConflict: hasConflict, conflictingAppointments: [] });
                return [2 /*return*/];
        }
    });
}); }, 'checkTimeConflictHttp'));
/**
 * HTTP version of createAppointment for CORS/compatibility
 */
exports.createAppointmentHttp = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 10,
    cpu: 1,
    concurrency: 80,
    invoker: 'public'
}, (0, error_handler_1.withErrorHandling)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, _a, organizationId, body, pool, userId, data, requiredFields, _i, requiredFields_1, field, patientId, therapistIdRaw, therapistId, ignoreCapacity, conflictResult, _b, result, appointment;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, verifyAuthHeader(req)];
            case 1:
                uid = (_c.sent()).uid;
                return [4 /*yield*/, Promise.all([
                        getOrganizationId(uid),
                        Promise.resolve(typeof req.body === 'string' ? (function () { try {
                            return JSON.parse(req.body || '{}');
                        }
                        catch (_a) {
                            return {};
                        } })() : (req.body || {}))
                    ])];
            case 2:
                _a = _c.sent(), organizationId = _a[0], body = _a[1];
                pool = (0, init_1.getPool)();
                userId = uid;
                data = body;
                requiredFields = ['patientId', 'date', 'startTime', 'endTime'];
                for (_i = 0, requiredFields_1 = requiredFields; _i < requiredFields_1.length; _i++) {
                    field = requiredFields_1[_i];
                    if (!data[field]) {
                        if (field === 'type' && data.session_type)
                            continue;
                        res.status(400).json({ error: "Campo obrigat\u00F3rio faltando: ".concat(field) });
                        return [2 /*return*/];
                    }
                }
                patientId = requireUuidField(data.patientId, 'patientId');
                therapistIdRaw = (data.therapistId != null && data.therapistId !== '') ? String(data.therapistId).trim() : '';
                therapistId = therapistIdRaw || userId;
                ignoreCapacity = body.ignoreCapacity === true || body.ignore_capacity === true;
                if (!!ignoreCapacity) return [3 /*break*/, 4];
                return [4 /*yield*/, checkTimeConflictByCapacity(pool, {
                        date: data.date,
                        startTime: data.startTime,
                        endTime: data.endTime,
                        organizationId: organizationId
                    })];
            case 3:
                _b = _c.sent();
                return [3 /*break*/, 5];
            case 4:
                _b = { hasConflict: false, conflicts: [], total: 0, capacity: 4 };
                _c.label = 5;
            case 5:
                conflictResult = _b;
                if (conflictResult.hasConflict) {
                    res.status(409).json({
                        error: 'Conflito de horário detectado',
                        conflicts: conflictResult.conflicts,
                        total: conflictResult.total,
                        capacity: conflictResult.capacity
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, pool.query("INSERT INTO appointments (patient_id, therapist_id, date, start_time, end_time, session_type, notes, status, organization_id, created_by)\n       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *", [
                        patientId, therapistId, data.date, data.startTime, data.endTime,
                        normalizeSessionType(data.type || data.session_type),
                        data.notes || null, normalizeAppointmentStatus(data.status), organizationId, userId
                    ])];
            case 6:
                result = _c.sent();
                appointment = result.rows[0];
                // NON-BLOCKING BACKGROUND TASKS
                // We start these but don't 'await' them before responding to the user
                (function () { return __awaiter(void 0, void 0, void 0, function () {
                    var db, bgError_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 2, , 3]);
                                db = (0, init_1.getAdminDb)();
                                return [4 /*yield*/, Promise.all([
                                        // 1. Sync to Firestore
                                        db.collection('appointments').doc(appointment.id).set(__assign(__assign({}, appointment), { notification_origin: 'api_appointments_v2_optimized', created_at: new Date(), updated_at: new Date() })),
                                        // 2. Update RTDB
                                        rtdb_1.rtdb.refreshAppointments(organizationId),
                                        // 3. Dispatch Notification
                                        (0, notifications_1.dispatchAppointmentNotification)({
                                            kind: 'scheduled',
                                            organizationId: organizationId,
                                            patientId: String(appointment.patient_id),
                                            appointmentId: String(appointment.id),
                                            date: normalizeDateOnly(appointment.date),
                                            time: normalizeTimeOnly(appointment.start_time),
                                        })
                                    ])];
                            case 1:
                                _a.sent();
                                logger_1.logger.info("[createAppointmentHttp] Background tasks completed for ".concat(appointment.id));
                                return [3 /*break*/, 3];
                            case 2:
                                bgError_1 = _a.sent();
                                logger_1.logger.error("[createAppointmentHttp] Background tasks failed for ".concat(appointment.id, ":"), bgError_1);
                                return [3 /*break*/, 3];
                            case 3: return [2 /*return*/];
                        }
                    });
                }); })();
                // Optional: Add to event loop to ensure completion in some environments
                // In Gen 2, if the function returns, CPU might be throttled, but concurrency helps.
                res.status(201).json({ data: appointment });
                return [2 /*return*/];
        }
    });
}); }, 'createAppointmentHttp'));
/**
 * HTTP version of updateAppointment for CORS
 */
exports.updateAppointmentHttp = (0, https_1.onRequest)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var handler;
    return __generator(this, function (_a) {
        handler = (0, error_handler_1.withErrorHandling)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
            var uid, organizationId, pool, body, updates, appointmentId, current, currentAppt, newDate, newStartTime, newEndTime, parseToMin, minToStr, duration, runConflictCheck, ignoreCapacity, conflictResult, allowedFields, fieldMap, setClauses, values, seenFields, paramCount, _i, _a, key, dbField, raw, result, updatedAppt, db, safeDoc, fsError_1, err_1, previousStatus, nextStatus, statusChangedToCancelled, dateChanged, startTimeChanged, notifyError_1;
            var _b, _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        // Only accept POST requests
                        if (req.method !== 'POST') {
                            res.status(405).json({ error: 'Method not allowed' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, verifyAuthHeader(req)];
                    case 1:
                        uid = (_j.sent()).uid;
                        return [4 /*yield*/, getOrganizationId(uid)];
                    case 2:
                        organizationId = _j.sent();
                        pool = (0, init_1.getPool)();
                        body = typeof req.body === 'string' ? (function () { try {
                            return JSON.parse(req.body || '{}');
                        }
                        catch (_a) {
                            return {};
                        } })() : (req.body || {});
                        updates = __rest(body, []);
                        appointmentId = requireUuidField(body.appointmentId, 'appointmentId');
                        return [4 /*yield*/, pool.query('SELECT * FROM appointments WHERE id = $1 AND organization_id = $2', [appointmentId, organizationId])];
                    case 3:
                        current = _j.sent();
                        if (current.rows.length === 0) {
                            res.status(404).json({ error: 'Agendamento não encontrado' });
                            return [2 /*return*/];
                        }
                        currentAppt = current.rows[0];
                        newDate = (_c = (_b = updates.date) !== null && _b !== void 0 ? _b : updates.appointment_date) !== null && _c !== void 0 ? _c : currentAppt.date;
                        newStartTime = (_f = (_e = (_d = updates.startTime) !== null && _d !== void 0 ? _d : updates.start_time) !== null && _e !== void 0 ? _e : updates.appointment_time) !== null && _f !== void 0 ? _f : currentAppt.start_time;
                        newEndTime = (_h = (_g = updates.endTime) !== null && _g !== void 0 ? _g : updates.end_time) !== null && _h !== void 0 ? _h : currentAppt.end_time;
                        // Se o horário de início mudou mas o de fim não foi enviado explicitamente,
                        // ajustamos o fim para manter a duração original. Isso evita violação de valid_end_time.
                        if ((updates.startTime || updates.start_time || updates.appointment_time) && !updates.endTime && !updates.end_time) {
                            parseToMin = function (t) {
                                if (!t)
                                    return 0;
                                var _a = t.split(':').map(Number), h = _a[0], m = _a[1];
                                return h * 60 + (m || 0);
                            };
                            minToStr = function (m) {
                                var hh = Math.floor(m / 60).toString().padStart(2, '0');
                                var mm = (m % 60).toString().padStart(2, '0');
                                return "".concat(hh, ":").concat(mm);
                            };
                            duration = parseToMin(String(currentAppt.end_time)) - parseToMin(String(currentAppt.start_time));
                            if (duration > 0) {
                                newEndTime = minToStr(parseToMin(newStartTime) + duration);
                                updates.end_time = newEndTime;
                            }
                        }
                        runConflictCheck = (updates.date || updates.appointment_date || updates.startTime || updates.start_time || updates.appointment_time || updates.endTime || updates.end_time) || (updates.therapistId && updates.therapistId !== currentAppt.therapist_id);
                        ignoreCapacity = body.ignoreCapacity === true || body.ignore_capacity === true;
                        if (!(runConflictCheck && !ignoreCapacity)) return [3 /*break*/, 5];
                        return [4 /*yield*/, checkTimeConflictByCapacity(pool, {
                                date: newDate,
                                startTime: newStartTime,
                                endTime: newEndTime,
                                excludeAppointmentId: appointmentId,
                                organizationId: organizationId
                            })];
                    case 4:
                        conflictResult = _j.sent();
                        if (conflictResult.hasConflict) {
                            res.status(409).json({
                                error: 'Conflito de horário detectado',
                                conflicts: conflictResult.conflicts,
                                total: conflictResult.total,
                                capacity: conflictResult.capacity
                            });
                            return [2 /*return*/];
                        }
                        _j.label = 5;
                    case 5:
                        allowedFields = ['date', 'start_time', 'end_time', 'therapist_id', 'status', 'type', 'session_type', 'notes'];
                        fieldMap = { startTime: 'start_time', endTime: 'end_time', therapistId: 'therapist_id', type: 'session_type', appointment_date: 'date', appointment_time: 'start_time' };
                        setClauses = [];
                        values = [];
                        seenFields = new Set();
                        paramCount = 0;
                        for (_i = 0, _a = Object.keys(updates); _i < _a.length; _i++) {
                            key = _a[_i];
                            dbField = fieldMap[key] || key;
                            if (allowedFields.includes(dbField) && !seenFields.has(dbField)) {
                                seenFields.add(dbField);
                                paramCount++;
                                setClauses.push("".concat(dbField, " = $").concat(paramCount));
                                raw = updates[key];
                                values.push((dbField === 'session_type' && typeof raw === 'string') ? normalizeSessionType(raw) :
                                    (dbField === 'status' && typeof raw === 'string') ? normalizeAppointmentStatus(raw) :
                                        raw);
                            }
                        }
                        if (setClauses.length === 0) {
                            res.status(400).json({ error: 'Nenhum campo para atualizar' });
                            return [2 /*return*/];
                        }
                        paramCount++;
                        setClauses.push("updated_at = $".concat(paramCount));
                        values.push(new Date());
                        values.push(appointmentId, organizationId);
                        return [4 /*yield*/, pool.query("UPDATE appointments SET ".concat(setClauses.join(', '), " WHERE id = $").concat(paramCount + 1, " AND organization_id = $").concat(paramCount + 2, " RETURNING *"), values)];
                    case 6:
                        result = _j.sent();
                        updatedAppt = result.rows[0];
                        if (!updatedAppt) {
                            logger_1.logger.error("[updateAppointmentHttp] UPDATE did not return row for appointmentId=".concat(appointmentId));
                            res.status(500).json({ error: 'Atualização não retornou o agendamento. Tente novamente.' });
                            return [2 /*return*/];
                        }
                        _j.label = 7;
                    case 7:
                        _j.trys.push([7, 9, , 10]);
                        db = (0, init_1.getAdminDb)();
                        safeDoc = __assign(__assign({}, updatedAppt), { updated_at: new Date() });
                        return [4 /*yield*/, db.collection('appointments').doc(appointmentId).set(safeDoc, { merge: true })];
                    case 8:
                        _j.sent();
                        logger_1.logger.info("[updateAppointmentHttp] Appointment ".concat(appointmentId, " synced to Firestore"));
                        return [3 /*break*/, 10];
                    case 9:
                        fsError_1 = _j.sent();
                        logger_1.logger.error("[updateAppointmentHttp] Failed to sync appointment ".concat(appointmentId, " to Firestore:"), fsError_1);
                        return [3 /*break*/, 10];
                    case 10:
                        _j.trys.push([10, 12, , 13]);
                        return [4 /*yield*/, rtdb_1.rtdb.refreshAppointments(organizationId)];
                    case 11:
                        _j.sent();
                        return [3 /*break*/, 13];
                    case 12:
                        err_1 = _j.sent();
                        logger_1.logger.error('Erro Realtime RTDB:', err_1);
                        return [3 /*break*/, 13];
                    case 13:
                        previousStatus = normalizeAppointmentStatus(String(currentAppt.status || 'agendado'));
                        nextStatus = normalizeAppointmentStatus(String(updatedAppt.status || currentAppt.status || 'agendado'));
                        statusChangedToCancelled = previousStatus !== 'cancelado' && nextStatus === 'cancelado';
                        dateChanged = normalizeDateOnly(updatedAppt.date) !== normalizeDateOnly(currentAppt.date);
                        startTimeChanged = normalizeTimeOnly(updatedAppt.start_time) !== normalizeTimeOnly(currentAppt.start_time);
                        _j.label = 14;
                    case 14:
                        _j.trys.push([14, 19, , 20]);
                        if (!statusChangedToCancelled) return [3 /*break*/, 16];
                        return [4 /*yield*/, (0, notifications_1.dispatchAppointmentNotification)({
                                kind: 'cancelled',
                                organizationId: organizationId,
                                patientId: String(updatedAppt.patient_id || currentAppt.patient_id),
                                appointmentId: String(updatedAppt.id || appointmentId),
                                date: normalizeDateOnly(updatedAppt.date || currentAppt.date),
                                time: normalizeTimeOnly(updatedAppt.start_time || currentAppt.start_time),
                            })];
                    case 15:
                        _j.sent();
                        return [3 /*break*/, 18];
                    case 16:
                        if (!(dateChanged || startTimeChanged)) return [3 /*break*/, 18];
                        return [4 /*yield*/, (0, notifications_1.dispatchAppointmentNotification)({
                                kind: 'rescheduled',
                                organizationId: organizationId,
                                patientId: String(updatedAppt.patient_id || currentAppt.patient_id),
                                appointmentId: String(updatedAppt.id || appointmentId),
                                date: normalizeDateOnly(updatedAppt.date || currentAppt.date),
                                time: normalizeTimeOnly(updatedAppt.start_time || currentAppt.start_time),
                            })];
                    case 17:
                        _j.sent();
                        _j.label = 18;
                    case 18: return [3 /*break*/, 20];
                    case 19:
                        notifyError_1 = _j.sent();
                        logger_1.logger.error('[updateAppointmentHttp] Notification dispatch failed (non-blocking):', notifyError_1);
                        return [3 /*break*/, 20];
                    case 20:
                        res.json({ data: updatedAppt });
                        return [2 /*return*/];
                }
            });
        }); }, 'updateAppointmentHttp');
        return [2 /*return*/, handler(req, res)];
    });
}); });
/**
 * HTTP version of cancelAppointment for CORS
 */
exports.cancelAppointmentHttp = (0, https_1.onRequest)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var handler;
    return __generator(this, function (_a) {
        handler = (0, error_handler_1.withErrorHandling)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
            var uid, organizationId, body, reason, appointmentId, pool, current, db, fsError_2, err_2, notifyError_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Only accept POST requests
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
                        body = typeof req.body === 'string' ? (function () { try {
                            return JSON.parse(req.body || '{}');
                        }
                        catch (_a) {
                            return {};
                        } })() : (req.body || {});
                        reason = body.reason;
                        appointmentId = requireUuidField(body.appointmentId, 'appointmentId');
                        pool = (0, init_1.getPool)();
                        return [4 /*yield*/, pool.query('SELECT * FROM appointments WHERE id = $1 AND organization_id = $2', [appointmentId, organizationId])];
                    case 3:
                        current = _a.sent();
                        if (current.rows.length === 0) {
                            res.status(404).json({ error: 'Agendamento não encontrado' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, pool.query("UPDATE appointments SET status = 'cancelado', notes = notes || $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3", [reason ? "\n[Cancelamento: ".concat(reason, "]") : '', appointmentId, organizationId])];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        db = (0, init_1.getAdminDb)();
                        return [4 /*yield*/, db.collection('appointments').doc(appointmentId).update({
                                status: 'cancelado',
                                updated_at: new Date()
                            })];
                    case 6:
                        _a.sent();
                        logger_1.logger.info("[cancelAppointmentHttp] Appointment ".concat(appointmentId, " cancellation synced to Firestore"));
                        return [3 /*break*/, 8];
                    case 7:
                        fsError_2 = _a.sent();
                        logger_1.logger.error("[cancelAppointmentHttp] Failed to sync cancellation of ".concat(appointmentId, " to Firestore:"), fsError_2);
                        return [3 /*break*/, 8];
                    case 8:
                        _a.trys.push([8, 10, , 11]);
                        return [4 /*yield*/, rtdb_1.rtdb.refreshAppointments(organizationId)];
                    case 9:
                        _a.sent();
                        return [3 /*break*/, 11];
                    case 10:
                        err_2 = _a.sent();
                        logger_1.logger.error('Erro Realtime RTDB:', err_2);
                        return [3 /*break*/, 11];
                    case 11:
                        _a.trys.push([11, 13, , 14]);
                        return [4 /*yield*/, (0, notifications_1.dispatchAppointmentNotification)({
                                kind: 'cancelled',
                                organizationId: organizationId,
                                patientId: String(current.rows[0].patient_id),
                                appointmentId: String(appointmentId),
                                date: normalizeDateOnly(current.rows[0].date),
                                time: normalizeTimeOnly(current.rows[0].start_time),
                            })];
                    case 12:
                        _a.sent();
                        return [3 /*break*/, 14];
                    case 13:
                        notifyError_2 = _a.sent();
                        logger_1.logger.error('[cancelAppointmentHttp] Notification dispatch failed (non-blocking):', notifyError_2);
                        return [3 /*break*/, 14];
                    case 14:
                        res.json({ success: true });
                        return [2 /*return*/];
                }
            });
        }); }, 'cancelAppointmentHttp');
        return [2 /*return*/, handler(req, res)];
    });
}); });
/**
 * Lista agendamentos com filtros
 */
var listAppointmentsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, patientId, therapistId, startDate, endDate, _b, limit, _c, offset, pool, query, params, result, error_2, errorMessage;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _d.sent();
                _a = request.data, patientId = _a.patientId, therapistId = _a.therapistId, startDate = _a.startDate, endDate = _a.endDate, _b = _a.limit, limit = _b === void 0 ? 50 : _b, _c = _a.offset, offset = _c === void 0 ? 0 : _c;
                pool = (0, init_1.getPool)();
                _d.label = 2;
            case 2:
                _d.trys.push([2, 4, , 5]);
                query = "\n      SELECT a.*, p.name as patient_name, prof.full_name as therapist_name\n      FROM appointments a\n      LEFT JOIN patients p ON a.patient_id = p.id\n      LEFT JOIN profiles prof ON a.therapist_id = prof.user_id\n      WHERE a.organization_id = $1\n    ";
                params = [auth.organizationId];
                if (patientId) {
                    query += " AND a.patient_id = $".concat(params.length + 1);
                    params.push(patientId);
                }
                if (therapistId) {
                    query += " AND a.therapist_id = $".concat(params.length + 1);
                    params.push(therapistId);
                }
                if (startDate) {
                    query += " AND a.date >= $".concat(params.length + 1);
                    params.push(startDate);
                }
                if (endDate) {
                    query += " AND a.date <= $".concat(params.length + 1);
                    params.push(endDate);
                }
                query += " ORDER BY a.date DESC, a.start_time DESC LIMIT $".concat(params.length + 1, " OFFSET $").concat(params.length + 2);
                params.push(limit, offset);
                return [4 /*yield*/, pool.query(query, params)];
            case 3:
                result = _d.sent();
                return [2 /*return*/, { data: result.rows }];
            case 4:
                error_2 = _d.sent();
                logger_1.logger.error('Error in listAppointments:', error_2);
                if (error_2 instanceof https_1.HttpsError)
                    throw error_2;
                errorMessage = error_2 instanceof Error ? error_2.message : 'Erro ao listar agendamentos';
                throw new https_1.HttpsError('internal', errorMessage);
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.listAppointmentsHandler = listAppointmentsHandler;
exports.listAppointments = (0, https_1.onCall)(exports.listAppointmentsHandler);
/**
 * Busca um agendamento por ID
 */
var getAppointmentHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, id, pool, result, error_3, errorMessage;
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
                    throw new https_1.HttpsError('invalid-argument', 'id é obrigatório');
                }
                pool = (0, init_1.getPool)();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                return [4 /*yield*/, pool.query("SELECT a.*, p.name as patient_name, prof.full_name as therapist_name\n       FROM appointments a\n       LEFT JOIN patients p ON a.patient_id = p.id\n       LEFT JOIN profiles prof ON a.therapist_id = prof.user_id\n       WHERE a.id = $1 AND a.organization_id = $2", [id, auth.organizationId])];
            case 3:
                result = _a.sent();
                if (result.rows.length === 0) {
                    throw new https_1.HttpsError('not-found', 'Agendamento não encontrado');
                }
                return [2 /*return*/, { data: result.rows[0] }];
            case 4:
                error_3 = _a.sent();
                logger_1.logger.error('Error in getAppointment:', error_3);
                if (error_3 instanceof https_1.HttpsError)
                    throw error_3;
                errorMessage = error_3 instanceof Error ? error_3.message : 'Erro ao buscar agendamento';
                throw new https_1.HttpsError('internal', errorMessage);
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.getAppointmentHandler = getAppointmentHandler;
exports.getAppointment = (0, https_1.onCall)(exports.getAppointmentHandler);
var DEFAULT_SLOT_CAPACITY = 4;
/**
 * Obtém capacidade do slot (max_patients) a partir do Firestore schedule_capacity_config.
 * day_of_week: 0=domingo, 1=segunda, ..., 6=sábado.
 */
function getSlotCapacity(organizationId, dateStr, startTime) {
    return __awaiter(this, void 0, void 0, function () {
        var d, dayOfWeek, db, snap, _i, _a, doc, data, start, end, max, e_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    d = new Date(dateStr + 'T12:00:00');
                    dayOfWeek = d.getDay();
                    db = (0, init_1.getAdminDb)();
                    return [4 /*yield*/, db.collection('schedule_capacity_config')
                            .where('organization_id', '==', organizationId)
                            .where('day_of_week', '==', dayOfWeek)
                            .get()];
                case 1:
                    snap = _b.sent();
                    for (_i = 0, _a = snap.docs; _i < _a.length; _i++) {
                        doc = _a[_i];
                        data = doc.data();
                        start = data.start_time || '00:00';
                        end = data.end_time || '23:59';
                        if (start <= startTime && startTime < end) {
                            max = Number(data.max_patients);
                            return [2 /*return*/, Number.isFinite(max) && max >= 1 ? max : DEFAULT_SLOT_CAPACITY];
                        }
                    }
                    return [3 /*break*/, 3];
                case 2:
                    e_1 = _b.sent();
                    logger_1.logger.warn('[getSlotCapacity] Firestore read failed, using default', { organizationId: organizationId, dateStr: dateStr, startTime: startTime, error: e_1 });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/, DEFAULT_SLOT_CAPACITY];
            }
        });
    });
}
function checkTimeConflictByCapacity(pool, params) {
    return __awaiter(this, void 0, void 0, function () {
        var date, startTime, endTime, excludeAppointmentId, organizationId, capacity, query, sqlParams, result, conflicts, count;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    date = params.date, startTime = params.startTime, endTime = params.endTime, excludeAppointmentId = params.excludeAppointmentId, organizationId = params.organizationId;
                    return [4 /*yield*/, getSlotCapacity(organizationId, date, startTime)];
                case 1:
                    capacity = _a.sent();
                    query = "\n    SELECT a.id, a.patient_id, p.name AS patient_name, a.therapist_id, prof.full_name AS therapist_name, a.start_time, a.end_time, a.date\n    FROM appointments a\n    LEFT JOIN patients p ON a.patient_id = p.id\n    LEFT JOIN profiles prof ON a.therapist_id = prof.user_id\n    WHERE a.organization_id = $1\n      AND a.date = $2\n      AND a.status NOT IN ('cancelado', 'remarcado', 'paciente_faltou')\n      AND (\n        (a.start_time <= $3 AND a.end_time > $3) OR\n        (a.start_time < $4 AND a.end_time >= $4) OR\n        (a.start_time >= $3 AND a.end_time <= $4)\n      )\n  ";
                    sqlParams = [organizationId, date, startTime, endTime];
                    if (excludeAppointmentId) {
                        query += " AND a.id != $5";
                        sqlParams.push(excludeAppointmentId);
                    }
                    return [4 /*yield*/, pool.query(query, sqlParams)];
                case 2:
                    result = _a.sent();
                    conflicts = result.rows;
                    count = conflicts.length;
                    logger_1.logger.info('[checkTimeConflictByCapacity]', { organizationId: organizationId, date: date, startTime: startTime, capacity: capacity, count: count, hasConflict: count >= capacity });
                    return [2 /*return*/, {
                            hasConflict: count >= capacity,
                            total: count,
                            conflicts: conflicts,
                            capacity: capacity,
                        }];
            }
        });
    });
}
/**
 * Verifica conflito de horário (Internal helper) - legado: 1 agendamento por terapeuta por slot.
 */
function checkTimeConflictHelper(pool, params) {
    return __awaiter(this, void 0, void 0, function () {
        var date, startTime, endTime, therapistId, excludeAppointmentId, organizationId, query, sqlParams, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    date = params.date, startTime = params.startTime, endTime = params.endTime, therapistId = params.therapistId, excludeAppointmentId = params.excludeAppointmentId, organizationId = params.organizationId;
                    query = "\n    SELECT appointments.id FROM appointments\n    WHERE appointments.organization_id = $1\n      AND appointments.therapist_id = $2\n      AND appointments.date = $3\n      AND appointments.status NOT IN ('cancelado', 'remarcado', 'paciente_faltou')\n      AND (\n        (appointments.start_time <= $4 AND appointments.end_time > $4) OR\n        (appointments.start_time < $5 AND appointments.end_time >= $5) OR\n        (appointments.start_time >= $4 AND appointments.end_time <= $5)\n      )\n  ";
                    sqlParams = [organizationId, therapistId, date, startTime, endTime];
                    if (excludeAppointmentId) {
                        query += " AND appointments.id != $6";
                        sqlParams.push(excludeAppointmentId);
                    }
                    return [4 /*yield*/, pool.query(query, sqlParams)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows.length > 0];
            }
        });
    });
}
/**
 * Verifica conflitos de horário
 */
var checkTimeConflictHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, date, startTime, duration, therapistId, appointmentId, pool, query, params, result, error_4, errorMessage;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _b.sent();
                _a = request.data, date = _a.date, startTime = _a.startTime, duration = _a.duration, therapistId = _a.therapistId, appointmentId = _a.appointmentId;
                if (!date || !startTime || !duration || !therapistId) {
                    throw new https_1.HttpsError('invalid-argument', 'date, startTime, duration e therapistId são obrigatórios');
                }
                pool = (0, init_1.getPool)();
                _b.label = 2;
            case 2:
                _b.trys.push([2, 4, , 5]);
                query = "\n      SELECT id \n      FROM appointments \n      WHERE organization_id = $1 \n        AND therapist_id = $2 \n        AND date = $3 \n        AND status != 'cancelado'\n        AND (\n          (start_time <= $4 AND (EXTRACT(EPOCH FROM start_time) + duration * 60) > EXTRACT(EPOCH FROM $4::time))\n          OR ($4 <= start_time AND (EXTRACT(EPOCH FROM $4::time) + $5 * 60) > EXTRACT(EPOCH FROM start_time))\n        )\n    ";
                params = [auth.organizationId, therapistId, date, startTime, duration];
                if (appointmentId) {
                    query += " AND id != $6";
                    params.push(appointmentId);
                }
                return [4 /*yield*/, pool.query(query, params)];
            case 3:
                result = _b.sent();
                return [2 /*return*/, { hasConflict: result.rows.length > 0, conflicts: result.rows }];
            case 4:
                error_4 = _b.sent();
                logger_1.logger.error('Error in checkTimeConflict:', error_4);
                if (error_4 instanceof https_1.HttpsError)
                    throw error_4;
                errorMessage = error_4 instanceof Error ? error_4.message : 'Erro ao verificar conflito';
                throw new https_1.HttpsError('internal', errorMessage);
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.checkTimeConflictHandler = checkTimeConflictHandler;
/**
 * Cria um novo agendamento
 */
/**
 * Cria um novo agendamento
 */
var createAppointmentHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, data, requiredFields, _i, requiredFields_2, field, therapistId, pool, ignoreCapacity, conflictResult, result, appointment, db, fsError_3, err_3, notifyError_3, error_5, errorMessage, errDetails;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _a.sent();
                data = request.data;
                requiredFields = ['patientId', 'date', 'startTime', 'endTime', 'type'];
                for (_i = 0, requiredFields_2 = requiredFields; _i < requiredFields_2.length; _i++) {
                    field = requiredFields_2[_i];
                    if (!data[field]) {
                        if (field === 'type' && data.session_type)
                            continue;
                        throw new https_1.HttpsError('invalid-argument', "Campo obrigat\u00F3rio faltando: ".concat(field));
                    }
                }
                therapistId = (data.therapistId && String(data.therapistId).trim()) ? String(data.therapistId).trim() : auth.userId;
                pool = (0, init_1.getPool)();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 16, , 17]);
                ignoreCapacity = request.data.ignoreCapacity === true;
                if (!!ignoreCapacity) return [3 /*break*/, 4];
                return [4 /*yield*/, checkTimeConflictByCapacity(pool, {
                        date: data.date,
                        startTime: data.startTime,
                        endTime: data.endTime,
                        organizationId: auth.organizationId,
                    })];
            case 3:
                conflictResult = _a.sent();
                if (conflictResult.hasConflict) {
                    throw new https_1.HttpsError('failed-precondition', 'Conflito de horário detectado', {
                        conflicts: conflictResult.conflicts,
                        total: conflictResult.total,
                        capacity: conflictResult.capacity
                    });
                }
                _a.label = 4;
            case 4: return [4 /*yield*/, pool.query("INSERT INTO appointments (\n        patient_id, therapist_id, date, start_time, end_time,\n        session_type, notes, status, organization_id, created_by\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)\n      RETURNING *", [
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
                ])];
            case 5:
                result = _a.sent();
                appointment = result.rows[0];
                _a.label = 6;
            case 6:
                _a.trys.push([6, 8, , 9]);
                db = (0, init_1.getAdminDb)();
                return [4 /*yield*/, db.collection('appointments').doc(appointment.id).set(__assign(__assign({}, appointment), { notification_origin: 'api_appointments_v2', created_at: new Date(), updated_at: new Date() }))];
            case 7:
                _a.sent();
                logger_1.logger.info("[createAppointment] Appointment ".concat(appointment.id, " synced to Firestore"));
                return [3 /*break*/, 9];
            case 8:
                fsError_3 = _a.sent();
                logger_1.logger.error("[createAppointment] Failed to sync appointment ".concat(appointment.id, " to Firestore:"), fsError_3);
                return [3 /*break*/, 9];
            case 9:
                _a.trys.push([9, 11, , 12]);
                return [4 /*yield*/, rtdb_1.rtdb.refreshAppointments(auth.organizationId)];
            case 10:
                _a.sent();
                return [3 /*break*/, 12];
            case 11:
                err_3 = _a.sent();
                logger_1.logger.error('Erro Realtime RTDB:', err_3);
                return [3 /*break*/, 12];
            case 12:
                _a.trys.push([12, 14, , 15]);
                return [4 /*yield*/, (0, notifications_1.dispatchAppointmentNotification)({
                        kind: 'scheduled',
                        organizationId: auth.organizationId,
                        patientId: String(appointment.patient_id),
                        appointmentId: String(appointment.id),
                        date: normalizeDateOnly(appointment.date),
                        time: normalizeTimeOnly(appointment.start_time),
                    })];
            case 13:
                _a.sent();
                return [3 /*break*/, 15];
            case 14:
                notifyError_3 = _a.sent();
                logger_1.logger.error('[createAppointment] Notification dispatch failed (non-blocking):', notifyError_3);
                return [3 /*break*/, 15];
            case 15: return [2 /*return*/, { data: appointment }];
            case 16:
                error_5 = _a.sent();
                logger_1.logger.error('Error in createAppointment:', error_5);
                if (error_5 instanceof https_1.HttpsError)
                    throw error_5;
                errorMessage = error_5 instanceof Error ? error_5.message : 'Erro ao criar agendamento';
                errDetails = error_5 instanceof Error ? error_5.stack : String(error_5);
                logger_1.logger.error('createAppointment internal error details', { errorMessage: errorMessage, errDetails: errDetails });
                throw new https_1.HttpsError('internal', errorMessage);
            case 17: return [2 /*return*/];
        }
    });
}); };
exports.createAppointmentHandler = createAppointmentHandler;
exports.createAppointment = (0, https_1.onCall)(exports.createAppointmentHandler);
/**
 * Atualiza um agendamento
 */
/**
 * Atualiza um agendamento
 */
var updateAppointmentHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, appointmentId, updates, pool, current, currentAppt, hasTimeChange, ignoreCapacity, conflictResult, setClauses, values, paramCount, allowedFields, fieldMap, _i, _b, key, dbField, raw, result, updatedAppt, db, fsError_4, err_4, previousStatus, nextStatus, statusChangedToCancelled, dateChanged, startTimeChanged, notifyError_4, error_6, errorMessage;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _c.sent();
                _a = request.data, appointmentId = _a.appointmentId, updates = __rest(_a, ["appointmentId"]);
                if (!appointmentId) {
                    throw new https_1.HttpsError('invalid-argument', 'appointmentId é obrigatório');
                }
                pool = (0, init_1.getPool)();
                _c.label = 2;
            case 2:
                _c.trys.push([2, 21, , 22]);
                return [4 /*yield*/, pool.query('SELECT * FROM appointments WHERE id = $1 AND organization_id = $2', [appointmentId, auth.organizationId])];
            case 3:
                current = _c.sent();
                if (current.rows.length === 0) {
                    throw new https_1.HttpsError('not-found', 'Agendamento não encontrado');
                }
                currentAppt = current.rows[0];
                hasTimeChange = updates.date || updates.startTime || updates.endTime || (updates.therapistId && updates.therapistId !== currentAppt.therapist_id);
                ignoreCapacity = request.data.ignoreCapacity === true;
                if (!(hasTimeChange && !ignoreCapacity)) return [3 /*break*/, 5];
                return [4 /*yield*/, checkTimeConflictByCapacity(pool, {
                        date: updates.date || currentAppt.date,
                        startTime: updates.startTime || currentAppt.start_time,
                        endTime: updates.endTime || currentAppt.end_time,
                        excludeAppointmentId: appointmentId,
                        organizationId: auth.organizationId,
                    })];
            case 4:
                conflictResult = _c.sent();
                if (conflictResult.hasConflict) {
                    throw new https_1.HttpsError('failed-precondition', 'Conflito de horário detectado', {
                        conflicts: conflictResult.conflicts,
                        total: conflictResult.total,
                        capacity: conflictResult.capacity
                    });
                }
                _c.label = 5;
            case 5:
                setClauses = [];
                values = [];
                paramCount = 0;
                allowedFields = ['date', 'start_time', 'end_time', 'therapist_id', 'status', 'type', 'notes'];
                fieldMap = {
                    startTime: 'start_time',
                    endTime: 'end_time',
                    therapistId: 'therapist_id',
                };
                for (_i = 0, _b = Object.keys(updates); _i < _b.length; _i++) {
                    key = _b[_i];
                    dbField = fieldMap[key] || key;
                    if (allowedFields.includes(dbField)) {
                        paramCount++;
                        setClauses.push("".concat(dbField, " = $").concat(paramCount));
                        raw = updates[key];
                        values.push(dbField === 'status' && typeof raw === 'string' ? normalizeAppointmentStatus(raw) : raw);
                    }
                }
                if (setClauses.length === 0) {
                    throw new https_1.HttpsError('invalid-argument', 'Nenhum campo para atualizar');
                }
                paramCount++;
                setClauses.push("updated_at = $".concat(paramCount));
                values.push(new Date());
                values.push(appointmentId, auth.organizationId);
                return [4 /*yield*/, pool.query("UPDATE appointments\n       SET ".concat(setClauses.join(', '), "\n       WHERE id = $").concat(paramCount + 1, " AND organization_id = $").concat(paramCount + 2, "\n       RETURNING *"), values)];
            case 6:
                result = _c.sent();
                updatedAppt = result.rows[0];
                _c.label = 7;
            case 7:
                _c.trys.push([7, 9, , 10]);
                db = (0, init_1.getAdminDb)();
                return [4 /*yield*/, db.collection('appointments').doc(appointmentId).set(__assign(__assign({}, updatedAppt), { updated_at: new Date() }), { merge: true })];
            case 8:
                _c.sent();
                logger_1.logger.info("[updateAppointment] Appointment ".concat(appointmentId, " synced to Firestore"));
                return [3 /*break*/, 10];
            case 9:
                fsError_4 = _c.sent();
                logger_1.logger.error("[updateAppointment] Failed to sync appointment ".concat(appointmentId, " to Firestore:"), fsError_4);
                return [3 /*break*/, 10];
            case 10:
                _c.trys.push([10, 12, , 13]);
                return [4 /*yield*/, rtdb_1.rtdb.refreshAppointments(auth.organizationId)];
            case 11:
                _c.sent();
                return [3 /*break*/, 13];
            case 12:
                err_4 = _c.sent();
                logger_1.logger.error('Erro Realtime RTDB:', err_4);
                return [3 /*break*/, 13];
            case 13:
                previousStatus = normalizeAppointmentStatus(String(currentAppt.status || 'agendado'));
                nextStatus = normalizeAppointmentStatus(String(updatedAppt.status || currentAppt.status || 'agendado'));
                statusChangedToCancelled = previousStatus !== 'cancelado' && nextStatus === 'cancelado';
                dateChanged = normalizeDateOnly(updatedAppt.date) !== normalizeDateOnly(currentAppt.date);
                startTimeChanged = normalizeTimeOnly(updatedAppt.start_time) !== normalizeTimeOnly(currentAppt.start_time);
                _c.label = 14;
            case 14:
                _c.trys.push([14, 19, , 20]);
                if (!statusChangedToCancelled) return [3 /*break*/, 16];
                return [4 /*yield*/, (0, notifications_1.dispatchAppointmentNotification)({
                        kind: 'cancelled',
                        organizationId: auth.organizationId,
                        patientId: String(updatedAppt.patient_id || currentAppt.patient_id),
                        appointmentId: String(updatedAppt.id || appointmentId),
                        date: normalizeDateOnly(updatedAppt.date || currentAppt.date),
                        time: normalizeTimeOnly(updatedAppt.start_time || currentAppt.start_time),
                    })];
            case 15:
                _c.sent();
                return [3 /*break*/, 18];
            case 16:
                if (!(dateChanged || startTimeChanged)) return [3 /*break*/, 18];
                return [4 /*yield*/, (0, notifications_1.dispatchAppointmentNotification)({
                        kind: 'rescheduled',
                        organizationId: auth.organizationId,
                        patientId: String(updatedAppt.patient_id || currentAppt.patient_id),
                        appointmentId: String(updatedAppt.id || appointmentId),
                        date: normalizeDateOnly(updatedAppt.date || currentAppt.date),
                        time: normalizeTimeOnly(updatedAppt.start_time || currentAppt.start_time),
                    })];
            case 17:
                _c.sent();
                _c.label = 18;
            case 18: return [3 /*break*/, 20];
            case 19:
                notifyError_4 = _c.sent();
                logger_1.logger.error('[updateAppointment] Notification dispatch failed (non-blocking):', notifyError_4);
                return [3 /*break*/, 20];
            case 20: return [2 /*return*/, { data: updatedAppt }];
            case 21:
                error_6 = _c.sent();
                logger_1.logger.error('Error in updateAppointment:', error_6);
                if (error_6 instanceof https_1.HttpsError)
                    throw error_6;
                errorMessage = error_6 instanceof Error ? error_6.message : 'Erro ao atualizar agendamento';
                throw new https_1.HttpsError('internal', errorMessage);
            case 22: return [2 /*return*/];
        }
    });
}); };
exports.updateAppointmentHandler = updateAppointmentHandler;
exports.updateAppointment = (0, https_1.onCall)(exports.updateAppointmentHandler);
/**
 * Cancela um agendamento
 */
/**
 * Cancela um agendamento
 */
var cancelAppointmentHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, appointmentId, reason, pool, current, db, fsError_5, err_5, notifyError_5, error_7, errorMessage;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _b.sent();
                _a = request.data, appointmentId = _a.appointmentId, reason = _a.reason;
                if (!appointmentId) {
                    throw new https_1.HttpsError('invalid-argument', 'appointmentId é obrigatório');
                }
                pool = (0, init_1.getPool)();
                _b.label = 2;
            case 2:
                _b.trys.push([2, 15, , 16]);
                return [4 /*yield*/, pool.query('SELECT * FROM appointments WHERE id = $1 AND organization_id = $2', [appointmentId, auth.organizationId])];
            case 3:
                current = _b.sent();
                if (current.rows.length === 0) {
                    throw new https_1.HttpsError('not-found', 'Agendamento não encontrado');
                }
                return [4 /*yield*/, pool.query("UPDATE appointments\n       SET status = 'cancelado', notes = notes || $1, updated_at = NOW()\n       WHERE id = $2 AND organization_id = $3\n       RETURNING *", [reason ? "\n[Cancelamento: ".concat(reason, "]") : '', appointmentId, auth.organizationId])];
            case 4:
                _b.sent();
                _b.label = 5;
            case 5:
                _b.trys.push([5, 7, , 8]);
                db = (0, init_1.getAdminDb)();
                return [4 /*yield*/, db.collection('appointments').doc(appointmentId).update({
                        status: 'cancelado',
                        updated_at: new Date()
                    })];
            case 6:
                _b.sent();
                logger_1.logger.info("[cancelAppointment] Appointment ".concat(appointmentId, " cancellation synced to Firestore"));
                return [3 /*break*/, 8];
            case 7:
                fsError_5 = _b.sent();
                logger_1.logger.error("[cancelAppointment] Failed to sync cancellation of ".concat(appointmentId, " to Firestore:"), fsError_5);
                return [3 /*break*/, 8];
            case 8:
                _b.trys.push([8, 10, , 11]);
                return [4 /*yield*/, rtdb_1.rtdb.refreshAppointments(auth.organizationId)];
            case 9:
                _b.sent();
                return [3 /*break*/, 11];
            case 10:
                err_5 = _b.sent();
                logger_1.logger.error('Erro Realtime RTDB:', err_5);
                return [3 /*break*/, 11];
            case 11:
                _b.trys.push([11, 13, , 14]);
                return [4 /*yield*/, (0, notifications_1.dispatchAppointmentNotification)({
                        kind: 'cancelled',
                        organizationId: auth.organizationId,
                        patientId: String(current.rows[0].patient_id),
                        appointmentId: String(appointmentId),
                        date: normalizeDateOnly(current.rows[0].date),
                        time: normalizeTimeOnly(current.rows[0].start_time),
                    })];
            case 12:
                _b.sent();
                return [3 /*break*/, 14];
            case 13:
                notifyError_5 = _b.sent();
                logger_1.logger.error('[cancelAppointment] Notification dispatch failed (non-blocking):', notifyError_5);
                return [3 /*break*/, 14];
            case 14: return [2 /*return*/, { success: true }];
            case 15:
                error_7 = _b.sent();
                logger_1.logger.error('Error in cancelAppointment:', error_7);
                if (error_7 instanceof https_1.HttpsError)
                    throw error_7;
                errorMessage = error_7 instanceof Error ? error_7.message : 'Erro ao cancelar agendamento';
                throw new https_1.HttpsError('internal', errorMessage);
            case 16: return [2 /*return*/];
        }
    });
}); };
exports.cancelAppointmentHandler = cancelAppointmentHandler;
exports.cancelAppointment = (0, https_1.onCall)(exports.cancelAppointmentHandler);
