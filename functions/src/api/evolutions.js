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
exports.deleteEvolutionHandler = exports.updateEvolutionHandler = exports.createEvolutionHandler = exports.getEvolutionHandler = exports.listEvolutionsHandler = exports.deleteEvolutionHttp = exports.updateEvolutionHttp = exports.createEvolutionHttp = exports.getEvolutionHttp = exports.listEvolutionsHttp = void 0;
var https_1 = require("firebase-functions/v2/https");
var init_1 = require("../init");
var cache_helpers_1 = require("../lib/cache-helpers");
var logger_1 = require("../lib/logger");
var cors_1 = require("../lib/cors");
var audit_1 = require("../lib/audit");
var auth_1 = require("../middleware/auth");
// Configuração inline para evitar conflito CORS
var EVOLUTION_HTTP_OPTS = {
    region: 'southamerica-east1',
    maxInstances: 1,
    invoker: 'public',
};
function verifyAuthHeader(req) {
    return __awaiter(this, void 0, void 0, function () {
        var authHeader, token, decodedToken, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    authHeader = req.headers.authorization || '';
                    if (!authHeader.startsWith('Bearer ')) {
                        throw new https_1.HttpsError('unauthenticated', 'No bearer token');
                    }
                    token = authHeader.split('Bearer ')[1];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, init_1.getAdminAuth)().verifyIdToken(token)];
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
// ============================================================================
// HTTP HANDLERS
// ============================================================================
/**
 * List evolutions for a patient
 */
exports.listEvolutionsHttp = (0, https_1.onRequest)(EVOLUTION_HTTP_OPTS, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, organizationId, patientId, pool, result, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                (0, cors_1.setCorsHeaders)(res, req);
                if (req.method === 'OPTIONS') {
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                return [4 /*yield*/, verifyAuthHeader(req)];
            case 2:
                uid = (_a.sent()).uid;
                return [4 /*yield*/, (0, cache_helpers_1.getOrganizationIdCached)(uid)];
            case 3:
                organizationId = _a.sent();
                patientId = req.body.patientId;
                if (!patientId) {
                    res.status(400).json({ error: 'patientId é obrigatório' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query('SELECT * FROM evolutions WHERE organization_id = $1 AND patient_id = $2 ORDER BY date DESC', [organizationId, patientId])];
            case 4:
                result = _a.sent();
                res.json({ data: result.rows });
                return [3 /*break*/, 6];
            case 5:
                error_2 = _a.sent();
                logger_1.logger.error('Error in listEvolutionsHttp:', error_2);
                res.status(error_2.code === 'unauthenticated' ? 401 : 500).json({ error: error_2.message || 'Internal Server Error' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
/**
 * Get a single evolution by ID
 */
exports.getEvolutionHttp = (0, https_1.onRequest)(EVOLUTION_HTTP_OPTS, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, organizationId, evolutionId, pool, result, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                (0, cors_1.setCorsHeaders)(res, req);
                if (req.method === 'OPTIONS') {
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                return [4 /*yield*/, verifyAuthHeader(req)];
            case 2:
                uid = (_a.sent()).uid;
                return [4 /*yield*/, (0, cache_helpers_1.getOrganizationIdCached)(uid)];
            case 3:
                organizationId = _a.sent();
                evolutionId = req.body.evolutionId;
                if (!evolutionId) {
                    res.status(400).json({ error: 'evolutionId é obrigatório' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query('SELECT * FROM evolutions WHERE organization_id = $1 AND id = $2', [organizationId, evolutionId])];
            case 4:
                result = _a.sent();
                if (result.rows.length === 0) {
                    res.status(404).json({ error: 'Evolução não encontrada' });
                    return [2 /*return*/];
                }
                res.json({ data: result.rows[0] });
                return [3 /*break*/, 6];
            case 5:
                error_3 = _a.sent();
                logger_1.logger.error('Error in getEvolutionHttp:', error_3);
                res.status(error_3.code === 'unauthenticated' ? 401 : 500).json({ error: error_3.message || 'Internal Server Error' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
/**
 * Create a new evolution
 */
exports.createEvolutionHttp = (0, https_1.onRequest)(EVOLUTION_HTTP_OPTS, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, organizationId, _a, patientId, appointmentId, date, subjective, objective, assessment, plan, pain_level, attachments, pool, result, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                (0, cors_1.setCorsHeaders)(res, req);
                if (req.method === 'OPTIONS') {
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 7, , 8]);
                return [4 /*yield*/, verifyAuthHeader(req)];
            case 2:
                uid = (_b.sent()).uid;
                return [4 /*yield*/, (0, cache_helpers_1.getOrganizationIdCached)(uid)];
            case 3:
                organizationId = _b.sent();
                _a = req.body, patientId = _a.patientId, appointmentId = _a.appointmentId, date = _a.date, subjective = _a.subjective, objective = _a.objective, assessment = _a.assessment, plan = _a.plan, pain_level = _a.pain_level, attachments = _a.attachments;
                if (!patientId || !date) {
                    res.status(400).json({ error: 'patientId e date são obrigatórios' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query("INSERT INTO evolutions (patient_id, therapist_id, organization_id, appointment_id, date, subjective, objective, assessment, plan, pain_level, attachments)\n       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)\n       RETURNING *", [patientId, uid, organizationId, appointmentId, date, subjective, objective, assessment, plan, pain_level, attachments ? JSON.stringify(attachments) : null])];
            case 4:
                result = _b.sent();
                if (!(result.rows.length > 0)) return [3 /*break*/, 6];
                return [4 /*yield*/, (0, audit_1.logAuditEvent)({
                        action: 'create',
                        resourceType: 'evolution',
                        resourceId: result.rows[0].id,
                        userId: uid,
                        organizationId: organizationId,
                        description: 'Evolução clínica criada',
                        sensitivity: 'phi'
                    })];
            case 5:
                _b.sent();
                _b.label = 6;
            case 6:
                res.status(201).json({ data: result.rows[0] });
                return [3 /*break*/, 8];
            case 7:
                error_4 = _b.sent();
                logger_1.logger.error('Error in createEvolutionHttp:', error_4);
                res.status(error_4.code === 'unauthenticated' ? 401 : 500).json({ error: error_4.message || 'Internal Server Error' });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
/**
 * Update an evolution
 */
exports.updateEvolutionHttp = (0, https_1.onRequest)(EVOLUTION_HTTP_OPTS, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, organizationId, _a, evolutionId, updates, allowedFields, setClauses, values, paramCount, _i, _b, key, value, pool, result, error_5;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                (0, cors_1.setCorsHeaders)(res, req);
                if (req.method === 'OPTIONS') {
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 5, , 6]);
                return [4 /*yield*/, verifyAuthHeader(req)];
            case 2:
                uid = (_c.sent()).uid;
                return [4 /*yield*/, (0, cache_helpers_1.getOrganizationIdCached)(uid)];
            case 3:
                organizationId = _c.sent();
                _a = req.body, evolutionId = _a.evolutionId, updates = __rest(_a, ["evolutionId"]);
                if (!evolutionId) {
                    res.status(400).json({ error: 'evolutionId é obrigatório' });
                    return [2 /*return*/];
                }
                allowedFields = ['date', 'subjective', 'objective', 'assessment', 'plan', 'pain_level', 'attachments'];
                setClauses = [];
                values = [];
                paramCount = 1;
                for (_i = 0, _b = Object.keys(updates); _i < _b.length; _i++) {
                    key = _b[_i];
                    if (allowedFields.includes(key)) {
                        setClauses.push("".concat(key, " = $").concat(paramCount));
                        value = key === 'attachments' ? JSON.stringify(updates[key]) : updates[key];
                        values.push(value);
                        paramCount++;
                    }
                }
                if (setClauses.length === 0) {
                    res.status(400).json({ error: 'Nenhum campo para atualizar' });
                    return [2 /*return*/];
                }
                setClauses.push("updated_at = NOW()");
                values.push(evolutionId, organizationId);
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query("UPDATE evolutions SET ".concat(setClauses.join(', '), " WHERE id = $").concat(paramCount, " AND organization_id = $").concat(paramCount + 1, " RETURNING *"), values)];
            case 4:
                result = _c.sent();
                if (result.rows.length === 0) {
                    res.status(404).json({ error: 'Evolução não encontrada para atualização' });
                    return [2 /*return*/];
                }
                res.json({ data: result.rows[0] });
                return [3 /*break*/, 6];
            case 5:
                error_5 = _c.sent();
                logger_1.logger.error('Error in updateEvolutionHttp:', error_5);
                res.status(error_5.code === 'unauthenticated' ? 401 : 500).json({ error: error_5.message || 'Internal Server Error' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
/**
 * Delete an evolution
 */
exports.deleteEvolutionHttp = (0, https_1.onRequest)(EVOLUTION_HTTP_OPTS, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, organizationId, evolutionId, pool, result, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                (0, cors_1.setCorsHeaders)(res, req);
                if (req.method === 'OPTIONS') {
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                return [4 /*yield*/, verifyAuthHeader(req)];
            case 2:
                uid = (_a.sent()).uid;
                return [4 /*yield*/, (0, cache_helpers_1.getOrganizationIdCached)(uid)];
            case 3:
                organizationId = _a.sent();
                evolutionId = req.body.evolutionId;
                if (!evolutionId) {
                    res.status(400).json({ error: 'evolutionId é obrigatório' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query('DELETE FROM evolutions WHERE id = $1 AND organization_id = $2', [evolutionId, organizationId])];
            case 4:
                result = _a.sent();
                if (result.rowCount === 0) {
                    res.status(404).json({ error: 'Evolução não encontrada para exclusão' });
                    return [2 /*return*/];
                }
                res.status(200).json({ success: true });
                return [3 /*break*/, 6];
            case 5:
                error_6 = _a.sent();
                logger_1.logger.error('Error in deleteEvolutionHttp:', error_6);
                res.status(error_6.code === 'unauthenticated' ? 401 : 500).json({ error: error_6.message || 'Internal Server Error' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// ============================================================================
// CALLABLE HANDLERS
// ============================================================================
var listEvolutionsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, patientId, pool, result;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, (0, auth_1.authorizeRequest)((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token)];
            case 1:
                auth = _b.sent();
                patientId = request.data.patientId;
                if (!patientId)
                    throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query('SELECT * FROM evolutions WHERE organization_id = $1 AND patient_id = $2 ORDER BY date DESC', [auth.organizationId, patientId])];
            case 2:
                result = _b.sent();
                return [2 /*return*/, { data: result.rows }];
        }
    });
}); };
exports.listEvolutionsHandler = listEvolutionsHandler;
var getEvolutionHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, evolutionId, pool, result;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, (0, auth_1.authorizeRequest)((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token)];
            case 1:
                auth = _b.sent();
                evolutionId = request.data.evolutionId;
                if (!evolutionId)
                    throw new https_1.HttpsError('invalid-argument', 'evolutionId é obrigatório');
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query('SELECT * FROM evolutions WHERE organization_id = $1 AND id = $2', [auth.organizationId, evolutionId])];
            case 2:
                result = _b.sent();
                if (result.rows.length === 0)
                    throw new https_1.HttpsError('not-found', 'Evolução não encontrada');
                return [2 /*return*/, { data: result.rows[0] }];
        }
    });
}); };
exports.getEvolutionHandler = getEvolutionHandler;
var createEvolutionHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, patientId, appointmentId, date, subjective, objective, assessment, plan, pain_level, attachments, pool, result;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, (0, auth_1.authorizeRequest)((_b = request.auth) === null || _b === void 0 ? void 0 : _b.token)];
            case 1:
                auth = _c.sent();
                _a = request.data, patientId = _a.patientId, appointmentId = _a.appointmentId, date = _a.date, subjective = _a.subjective, objective = _a.objective, assessment = _a.assessment, plan = _a.plan, pain_level = _a.pain_level, attachments = _a.attachments;
                if (!patientId || !date)
                    throw new https_1.HttpsError('invalid-argument', 'patientId e date são obrigatórios');
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query("INSERT INTO evolutions (patient_id, therapist_id, organization_id, appointment_id, date, subjective, objective, assessment, plan, pain_level, attachments)\n       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)\n       RETURNING *", [patientId, auth.userId, auth.organizationId, appointmentId, date, subjective, objective, assessment, plan, pain_level, attachments ? JSON.stringify(attachments) : null])];
            case 2:
                result = _c.sent();
                return [2 /*return*/, { data: result.rows[0] }];
        }
    });
}); };
exports.createEvolutionHandler = createEvolutionHandler;
var updateEvolutionHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, evolutionId, updates, allowedFields, setClauses, values, paramCount, _i, _b, key, pool, result;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0: return [4 /*yield*/, (0, auth_1.authorizeRequest)((_c = request.auth) === null || _c === void 0 ? void 0 : _c.token)];
            case 1:
                auth = _d.sent();
                _a = request.data, evolutionId = _a.evolutionId, updates = __rest(_a, ["evolutionId"]);
                if (!evolutionId)
                    throw new https_1.HttpsError('invalid-argument', 'evolutionId é obrigatório');
                allowedFields = ['date', 'subjective', 'objective', 'assessment', 'plan', 'pain_level', 'attachments'];
                setClauses = [];
                values = [];
                paramCount = 1;
                for (_i = 0, _b = Object.keys(updates); _i < _b.length; _i++) {
                    key = _b[_i];
                    if (allowedFields.includes(key)) {
                        setClauses.push("".concat(key, " = $").concat(paramCount));
                        values.push(key === 'attachments' ? JSON.stringify(updates[key]) : updates[key]);
                        paramCount++;
                    }
                }
                if (setClauses.length === 0)
                    throw new https_1.HttpsError('invalid-argument', 'Nenhum campo para atualizar');
                setClauses.push("updated_at = NOW()");
                values.push(evolutionId, auth.organizationId);
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query("UPDATE evolutions SET ".concat(setClauses.join(', '), " WHERE id = $").concat(paramCount, " AND organization_id = $").concat(paramCount + 1, " RETURNING *"), values)];
            case 2:
                result = _d.sent();
                if (result.rows.length === 0)
                    throw new https_1.HttpsError('not-found', 'Evolução não encontrada');
                return [2 /*return*/, { data: result.rows[0] }];
        }
    });
}); };
exports.updateEvolutionHandler = updateEvolutionHandler;
var deleteEvolutionHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, evolutionId, pool, result;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, (0, auth_1.authorizeRequest)((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token)];
            case 1:
                auth = _b.sent();
                evolutionId = request.data.evolutionId;
                if (!evolutionId)
                    throw new https_1.HttpsError('invalid-argument', 'evolutionId é obrigatório');
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query('DELETE FROM evolutions WHERE id = $1 AND organization_id = $2', [evolutionId, auth.organizationId])];
            case 2:
                result = _b.sent();
                if (result.rowCount === 0)
                    throw new https_1.HttpsError('not-found', 'Evolução não encontrada');
                return [2 /*return*/, { success: true }];
        }
    });
}); };
exports.deleteEvolutionHandler = deleteEvolutionHandler;
