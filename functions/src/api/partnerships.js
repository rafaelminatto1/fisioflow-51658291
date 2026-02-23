"use strict";
/**
 * Partnerships API - CRUD operations for managing partnerships
 *
 * Provides endpoints for:
 * - Creating, reading, updating, deleting partnerships
 * - Listing partnerships with filters
 * - Applying partnership discounts to patients
 */
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
exports.deletePartnership = exports.updatePartnership = exports.createPartnership = exports.getPartnership = exports.listPartnerships = exports.deletePartnershipHandler = exports.updatePartnershipHandler = exports.createPartnershipHandler = exports.getPartnershipHandler = exports.listPartnershipsHandler = exports.deletePartnershipHttp = exports.updatePartnershipHttp = exports.createPartnershipHttp = exports.getPartnershipHttp = exports.listPartnershipsHttp = void 0;
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
// ============================================================================
// Business Logic
// ============================================================================
function listPartnershipsLogic(auth, data) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, activeOnly, _b, limit, _c, offset, query, params, result;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _a = data.activeOnly, activeOnly = _a === void 0 ? false : _a, _b = data.limit, limit = _b === void 0 ? 100 : _b, _c = data.offset, offset = _c === void 0 ? 0 : _c;
                    query = 'SELECT * FROM partnerships WHERE organization_id = $1';
                    params = [auth.organizationId];
                    if (activeOnly) {
                        query += ' AND is_active = true';
                    }
                    query += ' ORDER BY name ASC LIMIT $2 OFFSET $3';
                    params.push(limit, offset);
                    return [4 /*yield*/, (0, init_1.getPool)().query(query, params)];
                case 1:
                    result = _d.sent();
                    return [2 /*return*/, { data: result.rows }];
            }
        });
    });
}
function getPartnershipLogic(auth, data) {
    return __awaiter(this, void 0, void 0, function () {
        var partnershipId, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    partnershipId = data.partnershipId;
                    if (!partnershipId) {
                        throw new https_1.HttpsError('invalid-argument', 'partnershipId é obrigatório');
                    }
                    return [4 /*yield*/, (0, init_1.getPool)().query('SELECT * FROM partnerships WHERE id = $1 AND organization_id = $2', [partnershipId, auth.organizationId])];
                case 1:
                    result = _a.sent();
                    if (result.rows.length === 0) {
                        throw new https_1.HttpsError('not-found', 'Parceria não encontrada');
                    }
                    return [2 /*return*/, { data: result.rows[0] }];
            }
        });
    });
}
function createPartnershipLogic(auth, data) {
    return __awaiter(this, void 0, void 0, function () {
        var name, cnpj, contact_person, contact_phone, contact_email, address, _a, discount_type, _b, discount_value, _c, allows_barter, barter_description, barter_sessions_limit, notes, result;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    name = data.name, cnpj = data.cnpj, contact_person = data.contact_person, contact_phone = data.contact_phone, contact_email = data.contact_email, address = data.address, _a = data.discount_type, discount_type = _a === void 0 ? 'percentage' : _a, _b = data.discount_value, discount_value = _b === void 0 ? 0 : _b, _c = data.allows_barter, allows_barter = _c === void 0 ? false : _c, barter_description = data.barter_description, barter_sessions_limit = data.barter_sessions_limit, notes = data.notes;
                    if (!name || name.trim().length === 0) {
                        throw new https_1.HttpsError('invalid-argument', 'Nome da parceria é obrigatório');
                    }
                    if (!['percentage', 'fixed'].includes(discount_type)) {
                        throw new https_1.HttpsError('invalid-argument', 'Tipo de desconto inválido');
                    }
                    if (discount_value < 0) {
                        throw new https_1.HttpsError('invalid-argument', 'Valor do desconto não pode ser negativo');
                    }
                    if (discount_type === 'percentage' && discount_value > 100) {
                        throw new https_1.HttpsError('invalid-argument', 'Desconto percentual não pode exceder 100%');
                    }
                    return [4 /*yield*/, (0, init_1.getPool)().query("INSERT INTO partnerships (\n            organization_id, name, cnpj, contact_person, contact_phone, contact_email,\n            address, discount_type, discount_value, allows_barter, barter_description,\n            barter_sessions_limit, notes, is_active\n        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)\n        RETURNING *", [
                            auth.organizationId,
                            name.trim(),
                            cnpj || null,
                            contact_person || null,
                            contact_phone || null,
                            contact_email || null,
                            address || null,
                            discount_type,
                            discount_value,
                            allows_barter,
                            barter_description || null,
                            barter_sessions_limit || null,
                            notes || null
                        ])];
                case 1:
                    result = _d.sent();
                    return [2 /*return*/, { data: result.rows[0] }];
            }
        });
    });
}
function updatePartnershipLogic(auth, data) {
    return __awaiter(this, void 0, void 0, function () {
        var partnershipId, updates, pool, existing, allowedFields, setClauses, values, paramCount, _i, allowedFields_1, field, query, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    partnershipId = data.partnershipId, updates = __rest(data, ["partnershipId"]);
                    if (!partnershipId) {
                        throw new https_1.HttpsError('invalid-argument', 'partnershipId é obrigatório');
                    }
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query('SELECT id FROM partnerships WHERE id = $1 AND organization_id = $2', [partnershipId, auth.organizationId])];
                case 1:
                    existing = _a.sent();
                    if (existing.rows.length === 0) {
                        throw new https_1.HttpsError('not-found', 'Parceria não encontrada');
                    }
                    allowedFields = [
                        'name', 'cnpj', 'contact_person', 'contact_phone', 'contact_email',
                        'address', 'discount_type', 'discount_value', 'allows_barter',
                        'barter_description', 'barter_sessions_limit', 'notes', 'is_active'
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
                    values.push(partnershipId, auth.organizationId);
                    query = "\n        UPDATE partnerships\n        SET ".concat(setClauses.join(', '), ", updated_at = NOW()\n        WHERE id = $").concat(paramCount + 2, " AND organization_id = $").concat(paramCount + 3, "\n        RETURNING *\n    ");
                    return [4 /*yield*/, pool.query(query, values)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, { data: result.rows[0] }];
            }
        });
    });
}
function deletePartnershipLogic(auth, data) {
    return __awaiter(this, void 0, void 0, function () {
        var partnershipId, pool, existing, inUse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    partnershipId = data.partnershipId;
                    if (!partnershipId) {
                        throw new https_1.HttpsError('invalid-argument', 'partnershipId é obrigatório');
                    }
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query('SELECT id FROM partnerships WHERE id = $1 AND organization_id = $2', [partnershipId, auth.organizationId])];
                case 1:
                    existing = _a.sent();
                    if (existing.rows.length === 0) {
                        throw new https_1.HttpsError('not-found', 'Parceria não encontrada');
                    }
                    return [4 /*yield*/, pool.query('SELECT COUNT(*) as count FROM patients WHERE partnership_id = $1', [partnershipId])];
                case 2:
                    inUse = _a.sent();
                    if (parseInt(inUse.rows[0].count) > 0) {
                        throw new https_1.HttpsError('failed-precondition', 'Não é possível excluir uma parceria que está vinculada a pacientes. Desative-a em vez disso.');
                    }
                    return [4 /*yield*/, pool.query('DELETE FROM partnerships WHERE id = $1', [partnershipId])];
                case 3:
                    _a.sent();
                    return [2 /*return*/, { success: true }];
            }
        });
    });
}
// ============================================================================
// HTTP Endpoints
// ============================================================================
exports.listPartnershipsHttp = (0, https_1.onRequest)(httpOpts, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
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
                return [4 /*yield*/, listPartnershipsLogic(auth, parseBody(req))];
            case 3:
                result = _a.sent();
                res.json(result);
                return [3 /*break*/, 5];
            case 4:
                e_1 = _a.sent();
                handleError('listPartnershipsHttp', e_1, res);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.getPartnershipHttp = (0, https_1.onRequest)(httpOpts, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
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
                return [4 /*yield*/, getPartnershipLogic(auth, parseBody(req))];
            case 3:
                result = _a.sent();
                res.json(result);
                return [3 /*break*/, 5];
            case 4:
                e_2 = _a.sent();
                handleError('getPartnershipHttp', e_2, res);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.createPartnershipHttp = (0, https_1.onRequest)(httpOpts, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
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
                return [4 /*yield*/, createPartnershipLogic(auth, parseBody(req))];
            case 3:
                result = _a.sent();
                res.status(201).json(result);
                return [3 /*break*/, 5];
            case 4:
                e_3 = _a.sent();
                handleError('createPartnershipHttp', e_3, res);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.updatePartnershipHttp = (0, https_1.onRequest)(httpOpts, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
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
                return [4 /*yield*/, updatePartnershipLogic(auth, parseBody(req))];
            case 3:
                result = _a.sent();
                res.json(result);
                return [3 /*break*/, 5];
            case 4:
                e_4 = _a.sent();
                handleError('updatePartnershipHttp', e_4, res);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.deletePartnershipHttp = (0, https_1.onRequest)(httpOpts, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
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
                return [4 /*yield*/, deletePartnershipLogic(auth, parseBody(req))];
            case 3:
                result = _a.sent();
                res.json(result);
                return [3 /*break*/, 5];
            case 4:
                e_5 = _a.sent();
                handleError('deletePartnershipHttp', e_5, res);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// ============================================================================
// Callable Functions
// ============================================================================
var listPartnershipsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, e_6;
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
                return [4 /*yield*/, listPartnershipsLogic(auth, request.data)];
            case 3: return [2 /*return*/, _a.sent()];
            case 4:
                e_6 = _a.sent();
                return [2 /*return*/, handleError('listPartnershipsHandler', e_6)];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.listPartnershipsHandler = listPartnershipsHandler;
var getPartnershipHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, e_7;
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
                return [4 /*yield*/, getPartnershipLogic(auth, request.data)];
            case 3: return [2 /*return*/, _a.sent()];
            case 4:
                e_7 = _a.sent();
                return [2 /*return*/, handleError('getPartnershipHandler', e_7)];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.getPartnershipHandler = getPartnershipHandler;
var createPartnershipHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
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
                return [4 /*yield*/, createPartnershipLogic(auth, request.data)];
            case 3: return [2 /*return*/, _a.sent()];
            case 4:
                e_8 = _a.sent();
                return [2 /*return*/, handleError('createPartnershipHandler', e_8)];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.createPartnershipHandler = createPartnershipHandler;
var updatePartnershipHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
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
                return [4 /*yield*/, updatePartnershipLogic(auth, request.data)];
            case 3: return [2 /*return*/, _a.sent()];
            case 4:
                e_9 = _a.sent();
                return [2 /*return*/, handleError('updatePartnershipHandler', e_9)];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.updatePartnershipHandler = updatePartnershipHandler;
var deletePartnershipHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
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
                return [4 /*yield*/, deletePartnershipLogic(auth, request.data)];
            case 3: return [2 /*return*/, _a.sent()];
            case 4:
                e_10 = _a.sent();
                return [2 /*return*/, handleError('deletePartnershipHandler', e_10)];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.deletePartnershipHandler = deletePartnershipHandler;
exports.listPartnerships = (0, https_1.onCall)(httpOpts, exports.listPartnershipsHandler);
exports.getPartnership = (0, https_1.onCall)(httpOpts, exports.getPartnershipHandler);
exports.createPartnership = (0, https_1.onCall)(httpOpts, exports.createPartnershipHandler);
exports.updatePartnership = (0, https_1.onCall)(httpOpts, exports.updatePartnershipHandler);
exports.deletePartnership = (0, https_1.onCall)(httpOpts, exports.deletePartnershipHandler);
