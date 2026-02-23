"use strict";
/**
 * Patient Financial Records API - CRUD for patient session payments
 *
 * Provides endpoints for:
 * - Creating, reading, updating, deleting financial records
 * - Listing patient financial history
 * - Applying partnership discounts automatically
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
exports.markAsPaid = exports.deleteFinancialRecord = exports.updateFinancialRecord = exports.createFinancialRecord = exports.getPatientFinancialSummary = exports.listPatientFinancialRecords = exports.markAsPaidHandler = exports.deleteFinancialRecordHandler = exports.updateFinancialRecordHandler = exports.createFinancialRecordHandler = exports.getPatientFinancialSummaryHandler = exports.listPatientFinancialRecordsHandler = exports.listAllFinancialRecordsHttp = exports.markAsPaidHttp = exports.deleteFinancialRecordHttp = exports.updateFinancialRecordHttp = exports.createFinancialRecordHttp = exports.getPatientFinancialSummaryHttp = exports.listPatientFinancialRecordsHttp = void 0;
var init_1 = require("../init");
var https_1 = require("firebase-functions/v2/https");
var cors_1 = require("../lib/cors");
var auth_1 = require("../middleware/auth");
var logger_1 = require("../lib/logger");
// import { DATABASE_FUNCTION, withCors } from '../lib/function-config'; // Not used after CORS fix
function parseBody(req) {
    return typeof req.body === 'string' ? (function () { try {
        return JSON.parse(req.body || '{}');
    }
    catch (_a) {
        return {};
    } })() : (req.body || {});
}
function getAuthHeader(req) {
    var _a, _b;
    var h = ((_a = req.headers) === null || _a === void 0 ? void 0 : _a.authorization) || ((_b = req.headers) === null || _b === void 0 ? void 0 : _b.Authorization);
    return Array.isArray(h) ? h[0] : h;
}
var httpOpts = {
    region: 'southamerica-east1',
    maxInstances: 1,
    invoker: 'public',
};
function handleError(origin, e, res) {
    logger_1.logger.error("".concat(origin, ":"), e);
    var message = e instanceof Error ? e.message : 'Erro desconhecido';
    if (res) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            return res.status(401).json({ error: e.message });
        }
        return res.status(500).json({ error: message });
    }
    if (e instanceof https_1.HttpsError)
        throw e;
    throw new https_1.HttpsError('internal', message);
}
// Helper to calculate final value with discount
function calculateFinalValue(sessionValue, discountType, discountValue) {
    if (discountType === 'percentage') {
        return sessionValue - (sessionValue * (discountValue / 100));
    }
    else if (discountType === 'fixed') {
        return Math.max(0, sessionValue - discountValue);
    }
    return sessionValue;
}
// ============================================================================
// Business Logic
// ============================================================================
function listPatientFinancialRecordsLogic(auth, data) {
    return __awaiter(this, void 0, void 0, function () {
        var patientId, _a, limit, _b, offset, status, patientCheck, query, params, result, records;
        var _this = this;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    patientId = data.patientId, _a = data.limit, limit = _a === void 0 ? 100 : _a, _b = data.offset, offset = _b === void 0 ? 0 : _b, status = data.status;
                    if (!patientId) {
                        throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
                    }
                    return [4 /*yield*/, (0, init_1.getPool)().query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId])];
                case 1:
                    patientCheck = _c.sent();
                    if (patientCheck.rows.length === 0) {
                        throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
                    }
                    query = 'SELECT * FROM patient_financial_records WHERE patient_id = $1 AND organization_id = $2';
                    params = [patientId, auth.organizationId];
                    if (status) {
                        query += ' AND payment_status = $3';
                        params.push(status);
                    }
                    query += ' ORDER BY session_date DESC, created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
                    params.push(limit, offset);
                    return [4 /*yield*/, (0, init_1.getPool)().query(query, params)];
                case 2:
                    result = _c.sent();
                    return [4 /*yield*/, Promise.all(result.rows.map(function (record) { return __awaiter(_this, void 0, void 0, function () {
                            var partnership;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (!record.partnership_id) return [3 /*break*/, 2];
                                        return [4 /*yield*/, (0, init_1.getPool)().query('SELECT name, discount_type, discount_value FROM partnerships WHERE id = $1', [record.partnership_id])];
                                    case 1:
                                        partnership = _a.sent();
                                        return [2 /*return*/, __assign(__assign({}, record), { partnership: partnership.rows[0] || null })];
                                    case 2: return [2 /*return*/, __assign(__assign({}, record), { partnership: null })];
                                }
                            });
                        }); }))];
                case 3:
                    records = _c.sent();
                    return [2 /*return*/, { data: records }];
            }
        });
    });
}
function listAllFinancialRecordsLogic(auth, data) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, limit, _b, offset, startDate, endDate, query, params, paramCount, result;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = data.limit, limit = _a === void 0 ? 100 : _a, _b = data.offset, offset = _b === void 0 ? 0 : _b, startDate = data.startDate, endDate = data.endDate;
                    query = "\n      SELECT pfr.*, p.name as patient_name\n      FROM patient_financial_records pfr\n      JOIN patients p ON pfr.patient_id = p.id\n      WHERE pfr.organization_id = $1\n    ";
                    params = [auth.organizationId];
                    paramCount = 1;
                    if (startDate) {
                        query += " AND pfr.session_date >= $".concat(++paramCount);
                        params.push(startDate);
                    }
                    if (endDate) {
                        query += " AND pfr.session_date <= $".concat(++paramCount);
                        params.push(endDate);
                    }
                    query += " ORDER BY pfr.session_date DESC, pfr.created_at DESC LIMIT $".concat(++paramCount, " OFFSET $").concat(++paramCount);
                    params.push(limit, offset);
                    return [4 /*yield*/, (0, init_1.getPool)().query(query, params)];
                case 1:
                    result = _c.sent();
                    return [2 /*return*/, { data: result.rows }];
            }
        });
    });
}
function getPatientFinancialSummaryLogic(auth, data) {
    return __awaiter(this, void 0, void 0, function () {
        var patientId, patientCheck, result, summary;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    patientId = data.patientId;
                    if (!patientId) {
                        throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
                    }
                    return [4 /*yield*/, (0, init_1.getPool)().query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId])];
                case 1:
                    patientCheck = _a.sent();
                    if (patientCheck.rows.length === 0) {
                        throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
                    }
                    return [4 /*yield*/, (0, init_1.getPool)().query("SELECT\n            COUNT(*) as total_sessions,\n            COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_sessions,\n            COUNT(*) FILTER (WHERE payment_status = 'pending') as pending_sessions,\n            COALESCE(SUM(final_value), 0) as total_value,\n            COALESCE(SUM(paid_amount), 0) as total_paid,\n            COALESCE(SUM(final_value) FILTER (WHERE payment_status = 'pending'), 0) as total_pending,\n            COALESCE(AVG(final_value), 0) as average_session_value\n        FROM patient_financial_records\n        WHERE patient_id = $1 AND organization_id = $2", [patientId, auth.organizationId])];
                case 2:
                    result = _a.sent();
                    summary = result.rows[0];
                    return [2 /*return*/, {
                            data: {
                                total_sessions: parseInt(summary.total_sessions),
                                paid_sessions: parseInt(summary.paid_sessions),
                                pending_sessions: parseInt(summary.pending_sessions),
                                total_value: parseFloat(summary.total_value),
                                total_paid: parseFloat(summary.total_paid),
                                total_pending: parseFloat(summary.total_pending),
                                average_session_value: parseFloat(summary.average_session_value)
                            }
                        }];
            }
        });
    });
}
function createFinancialRecordLogic(auth, data) {
    return __awaiter(this, void 0, void 0, function () {
        var patient_id, appointment_id, session_date, session_value, payment_method, _a, payment_status, _b, paid_amount, paid_date, notes, _c, is_barter, barter_notes, patient, patientData, discount_value, discount_type, partnership_id, final_value, result;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    patient_id = data.patient_id, appointment_id = data.appointment_id, session_date = data.session_date, session_value = data.session_value, payment_method = data.payment_method, _a = data.payment_status, payment_status = _a === void 0 ? 'pending' : _a, _b = data.paid_amount, paid_amount = _b === void 0 ? 0 : _b, paid_date = data.paid_date, notes = data.notes, _c = data.is_barter, is_barter = _c === void 0 ? false : _c, barter_notes = data.barter_notes;
                    if (!patient_id) {
                        throw new https_1.HttpsError('invalid-argument', 'patient_id é obrigatório');
                    }
                    if (!session_date) {
                        throw new https_1.HttpsError('invalid-argument', 'session_date é obrigatório');
                    }
                    if (session_value === undefined || session_value === null) {
                        throw new https_1.HttpsError('invalid-argument', 'session_value é obrigatório');
                    }
                    return [4 /*yield*/, (0, init_1.getPool)().query("SELECT p.id, p.partnership_id, p.name,\n            part.id as partnership_id, part.discount_type, part.discount_value, part.allows_barter\n        FROM patients p\n        LEFT JOIN partnerships part ON p.partnership_id = part.id AND part.is_active = true\n        WHERE p.id = $1 AND p.organization_id = $2", [patient_id, auth.organizationId])];
                case 1:
                    patient = _d.sent();
                    if (patient.rows.length === 0) {
                        throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
                    }
                    patientData = patient.rows[0];
                    discount_value = 0;
                    discount_type = null;
                    partnership_id = patientData.partnership_id;
                    // Apply partnership discount if applicable
                    if (patientData.partnership_id && !is_barter) {
                        discount_type = 'partnership';
                        if (patientData.discount_type === 'percentage') {
                            discount_value = session_value * (patientData.discount_value / 100);
                        }
                        else {
                            discount_value = patientData.discount_value;
                        }
                    }
                    final_value = calculateFinalValue(session_value, discount_type || 'none', discount_value);
                    return [4 /*yield*/, (0, init_1.getPool)().query("INSERT INTO patient_financial_records (\n            organization_id, patient_id, appointment_id, session_date, session_value,\n            discount_value, discount_type, partnership_id, final_value, payment_method,\n            payment_status, paid_amount, paid_date, notes, is_barter, barter_notes, created_by\n        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)\n        RETURNING *", [
                            auth.organizationId,
                            patient_id,
                            appointment_id || null,
                            session_date,
                            session_value,
                            discount_value,
                            discount_type,
                            partnership_id || null,
                            final_value,
                            payment_method || null,
                            payment_status,
                            paid_amount || 0,
                            paid_date || null,
                            notes || null,
                            is_barter,
                            barter_notes || null,
                            auth.userId
                        ])];
                case 2:
                    result = _d.sent();
                    return [2 /*return*/, { data: result.rows[0] }];
            }
        });
    });
}
function updateFinancialRecordLogic(auth, data) {
    return __awaiter(this, void 0, void 0, function () {
        var recordId, updates, pool, existing, allowedFields, setClauses, values, paramCount, _i, allowedFields_1, field, query, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    recordId = data.recordId, updates = __rest(data, ["recordId"]);
                    if (!recordId) {
                        throw new https_1.HttpsError('invalid-argument', 'recordId é obrigatório');
                    }
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query('SELECT * FROM patient_financial_records WHERE id = $1 AND organization_id = $2', [recordId, auth.organizationId])];
                case 1:
                    existing = _a.sent();
                    if (existing.rows.length === 0) {
                        throw new https_1.HttpsError('not-found', 'Registro financeiro não encontrado');
                    }
                    allowedFields = [
                        'session_date', 'session_value', 'payment_method', 'payment_status',
                        'paid_amount', 'paid_date', 'notes', 'is_barter', 'barter_notes'
                    ];
                    setClauses = [];
                    values = [];
                    paramCount = 0;
                    for (_i = 0, allowedFields_1 = allowedFields; _i < allowedFields_1.length; _i++) {
                        field = allowedFields_1[_i];
                        if (field in updates) {
                            paramCount++;
                            setClauses.push("".concat(field, " = $").concat(paramCount + 1));
                            values.push(updates[field]);
                        }
                    }
                    if (setClauses.length === 0) {
                        throw new https_1.HttpsError('invalid-argument', 'Nenhum campo para atualizar');
                    }
                    values.push(recordId, auth.organizationId);
                    query = "\n        UPDATE patient_financial_records\n        SET ".concat(setClauses.join(', '), ", updated_at = NOW()\n        WHERE id = $").concat(paramCount + 2, " AND organization_id = $").concat(paramCount + 3, "\n        RETURNING *\n    ");
                    return [4 /*yield*/, pool.query(query, values)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, { data: result.rows[0] }];
            }
        });
    });
}
function deleteFinancialRecordLogic(auth, data) {
    return __awaiter(this, void 0, void 0, function () {
        var recordId, pool, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    recordId = data.recordId;
                    if (!recordId) {
                        throw new https_1.HttpsError('invalid-argument', 'recordId é obrigatório');
                    }
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query('SELECT id FROM patient_financial_records WHERE id = $1 AND organization_id = $2', [recordId, auth.organizationId])];
                case 1:
                    existing = _a.sent();
                    if (existing.rows.length === 0) {
                        throw new https_1.HttpsError('not-found', 'Registro financeiro não encontrado');
                    }
                    return [4 /*yield*/, pool.query('DELETE FROM patient_financial_records WHERE id = $1', [recordId])];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { success: true }];
            }
        });
    });
}
function markAsPaidLogic(auth, data) {
    return __awaiter(this, void 0, void 0, function () {
        var recordId, payment_method, paid_date, pool, existing, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    recordId = data.recordId, payment_method = data.payment_method, paid_date = data.paid_date;
                    if (!recordId) {
                        throw new https_1.HttpsError('invalid-argument', 'recordId é obrigatório');
                    }
                    if (!payment_method) {
                        throw new https_1.HttpsError('invalid-argument', 'payment_method é obrigatório');
                    }
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query('SELECT * FROM patient_financial_records WHERE id = $1 AND organization_id = $2', [recordId, auth.organizationId])];
                case 1:
                    existing = _a.sent();
                    if (existing.rows.length === 0) {
                        throw new https_1.HttpsError('not-found', 'Registro financeiro não encontrado');
                    }
                    return [4 /*yield*/, pool.query("UPDATE patient_financial_records\n        SET payment_status = 'paid',\n            paid_amount = final_value,\n            payment_method = $1,\n            paid_date = COALESCE($2, CURRENT_DATE),\n            updated_at = NOW()\n        WHERE id = $3 AND organization_id = $4\n        RETURNING *", [payment_method, paid_date || null, recordId, auth.organizationId])];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, { data: result.rows[0] }];
            }
        });
    });
}
// ============================================================================
// HTTP Endpoints
// ============================================================================
exports.listPatientFinancialRecordsHttp = (0, https_1.onRequest)(httpOpts, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, result, e_1;
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
                return [4 /*yield*/, listPatientFinancialRecordsLogic(auth, parseBody(req))];
            case 3:
                result = _a.sent();
                res.json(result);
                return [3 /*break*/, 5];
            case 4:
                e_1 = _a.sent();
                handleError('listPatientFinancialRecordsHttp', e_1, res);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.getPatientFinancialSummaryHttp = (0, https_1.onRequest)(httpOpts, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, result, e_2;
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
                return [4 /*yield*/, getPatientFinancialSummaryLogic(auth, parseBody(req))];
            case 3:
                result = _a.sent();
                res.json(result);
                return [3 /*break*/, 5];
            case 4:
                e_2 = _a.sent();
                handleError('getPatientFinancialSummaryHttp', e_2, res);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.createFinancialRecordHttp = (0, https_1.onRequest)(httpOpts, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, result, e_3;
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
                return [4 /*yield*/, createFinancialRecordLogic(auth, parseBody(req))];
            case 3:
                result = _a.sent();
                res.status(201).json(result);
                return [3 /*break*/, 5];
            case 4:
                e_3 = _a.sent();
                handleError('createFinancialRecordHttp', e_3, res);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.updateFinancialRecordHttp = (0, https_1.onRequest)(httpOpts, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, result, e_4;
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
                return [4 /*yield*/, updateFinancialRecordLogic(auth, parseBody(req))];
            case 3:
                result = _a.sent();
                res.json(result);
                return [3 /*break*/, 5];
            case 4:
                e_4 = _a.sent();
                handleError('updateFinancialRecordHttp', e_4, res);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.deleteFinancialRecordHttp = (0, https_1.onRequest)(httpOpts, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, result, e_5;
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
                return [4 /*yield*/, deleteFinancialRecordLogic(auth, parseBody(req))];
            case 3:
                result = _a.sent();
                res.json(result);
                return [3 /*break*/, 5];
            case 4:
                e_5 = _a.sent();
                handleError('deleteFinancialRecordHttp', e_5, res);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.markAsPaidHttp = (0, https_1.onRequest)(httpOpts, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, result, e_6;
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
                return [4 /*yield*/, markAsPaidLogic(auth, parseBody(req))];
            case 3:
                result = _a.sent();
                res.json(result);
                return [3 /*break*/, 5];
            case 4:
                e_6 = _a.sent();
                handleError('markAsPaidHttp', e_6, res);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.listAllFinancialRecordsHttp = (0, https_1.onRequest)(httpOpts, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, result, e_7;
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
                return [4 /*yield*/, listAllFinancialRecordsLogic(auth, parseBody(req))];
            case 3:
                result = _a.sent();
                res.json(result);
                return [3 /*break*/, 5];
            case 4:
                e_7 = _a.sent();
                handleError('listAllFinancialRecordsHttp', e_7, res);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// ============================================================================
// Callable Functions
// ============================================================================
var listPatientFinancialRecordsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, e_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth || !request.auth.token)
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 2:
                auth = _a.sent();
                return [4 /*yield*/, listPatientFinancialRecordsLogic(auth, request.data)];
            case 3: return [2 /*return*/, _a.sent()];
            case 4:
                e_8 = _a.sent();
                return [2 /*return*/, handleError('listPatientFinancialRecordsHandler', e_8)];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.listPatientFinancialRecordsHandler = listPatientFinancialRecordsHandler;
var getPatientFinancialSummaryHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, e_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth || !request.auth.token)
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 2:
                auth = _a.sent();
                return [4 /*yield*/, getPatientFinancialSummaryLogic(auth, request.data)];
            case 3: return [2 /*return*/, _a.sent()];
            case 4:
                e_9 = _a.sent();
                return [2 /*return*/, handleError('getPatientFinancialSummaryHandler', e_9)];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.getPatientFinancialSummaryHandler = getPatientFinancialSummaryHandler;
var createFinancialRecordHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, e_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth || !request.auth.token)
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 2:
                auth = _a.sent();
                return [4 /*yield*/, createFinancialRecordLogic(auth, request.data)];
            case 3: return [2 /*return*/, _a.sent()];
            case 4:
                e_10 = _a.sent();
                return [2 /*return*/, handleError('createFinancialRecordHandler', e_10)];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.createFinancialRecordHandler = createFinancialRecordHandler;
var updateFinancialRecordHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, e_11;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth || !request.auth.token)
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 2:
                auth = _a.sent();
                return [4 /*yield*/, updateFinancialRecordLogic(auth, request.data)];
            case 3: return [2 /*return*/, _a.sent()];
            case 4:
                e_11 = _a.sent();
                return [2 /*return*/, handleError('updateFinancialRecordHandler', e_11)];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.updateFinancialRecordHandler = updateFinancialRecordHandler;
var deleteFinancialRecordHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, e_12;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth || !request.auth.token)
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 2:
                auth = _a.sent();
                return [4 /*yield*/, deleteFinancialRecordLogic(auth, request.data)];
            case 3: return [2 /*return*/, _a.sent()];
            case 4:
                e_12 = _a.sent();
                return [2 /*return*/, handleError('deleteFinancialRecordHandler', e_12)];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.deleteFinancialRecordHandler = deleteFinancialRecordHandler;
var markAsPaidHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, e_13;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth || !request.auth.token)
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 2:
                auth = _a.sent();
                return [4 /*yield*/, markAsPaidLogic(auth, request.data)];
            case 3: return [2 /*return*/, _a.sent()];
            case 4:
                e_13 = _a.sent();
                return [2 /*return*/, handleError('markAsPaidHandler', e_13)];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.markAsPaidHandler = markAsPaidHandler;
exports.listPatientFinancialRecords = (0, https_1.onCall)(httpOpts, exports.listPatientFinancialRecordsHandler);
exports.getPatientFinancialSummary = (0, https_1.onCall)(httpOpts, exports.getPatientFinancialSummaryHandler);
exports.createFinancialRecord = (0, https_1.onCall)(httpOpts, exports.createFinancialRecordHandler);
exports.updateFinancialRecord = (0, https_1.onCall)(httpOpts, exports.updateFinancialRecordHandler);
exports.deleteFinancialRecord = (0, https_1.onCall)(httpOpts, exports.deleteFinancialRecordHandler);
exports.markAsPaid = (0, https_1.onCall)(httpOpts, exports.markAsPaidHandler);
