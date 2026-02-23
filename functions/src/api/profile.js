"use strict";
/**
 * API Functions: Profile (HTTP with CORS fix)
 * Cloud Functions para gestão do perfil do usuário
 * Using onRequest to fix authentication and CORS issues
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.updateProfileHandler = exports.getProfile = exports.getProfileHandler = void 0;
var https_1 = require("firebase-functions/v2/https");
var admin = require("firebase-admin");
var init_1 = require("../init");
var logger_1 = require("../lib/logger");
var uuid_1 = require("../lib/uuid");
var error_handler_1 = require("../lib/error-handler");
var cors_1 = require("../lib/cors");
var auth = admin.auth();
/**
 * Helper to verify Firebase ID token from Authorization header
 */
function verifyAuth(req) {
    return __awaiter(this, void 0, void 0, function () {
        var authHeader, token, decodedToken, error_1;
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
                    return [4 /*yield*/, auth.verifyIdToken(token)];
                case 2:
                    decodedToken = _a.sent();
                    return [2 /*return*/, { uid: decodedToken.uid, token: decodedToken }];
                case 3:
                    error_1 = _a.sent();
                    throw new https_1.HttpsError('unauthenticated', 'Invalid token');
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Helper to get user profile from database
 * Tries PostgreSQL first, then Firestore as fallback
 */
function getUserProfile(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result, profile, organizationId, error_2, profileDoc, data, organizationId, error_3;
        var _a, _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    _g.trys.push([0, 2, , 3]);
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query("SELECT\n        id, user_id, organization_id, full_name, email,\n        phone, avatar_url, role, crefito, specialties,\n        bio, birth_date, is_active, last_login_at,\n        email_verified, preferences, created_at, updated_at\n      FROM profiles\n      WHERE user_id = $1", [userId])];
                case 1:
                    result = _g.sent();
                    if (result.rows.length > 0) {
                        profile = result.rows[0];
                        organizationId = (0, uuid_1.toValidUuid)(profile.organization_id);
                        if (organizationId) {
                            profile.organization_id = organizationId;
                            return [2 /*return*/, profile];
                        }
                        logger_1.logger.warn('Invalid organization_id in PostgreSQL profile, trying Firestore fallback', {
                            userId: userId,
                            organizationId: profile.organization_id,
                        });
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _g.sent();
                    logger_1.logger.info('PostgreSQL query failed in getUserProfile, trying Firestore:', error_2);
                    return [3 /*break*/, 3];
                case 3:
                    _g.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, admin.firestore().collection('profiles').doc(userId).get()];
                case 4:
                    profileDoc = _g.sent();
                    if (profileDoc.exists) {
                        data = profileDoc.data();
                        if (data) {
                            organizationId = ((0, uuid_1.toValidUuid)(data.organizationId)
                                || (0, uuid_1.toValidUuid)(data.activeOrganizationId)
                                || (0, uuid_1.toValidUuid)((_a = data.organizationIds) === null || _a === void 0 ? void 0 : _a[0])
                                || (0, uuid_1.toValidUuid)((_b = data.organization_id) === null || _b === void 0 ? void 0 : _b[0])
                                || (0, uuid_1.toValidUuid)(data.organization_id));
                            if (!organizationId) {
                                throw new https_1.HttpsError('failed-precondition', 'Perfil sem organizationId válido');
                            }
                            // Convert Firestore profile to Profile format
                            return [2 /*return*/, {
                                    id: userId,
                                    user_id: userId,
                                    organization_id: organizationId,
                                    full_name: data.displayName || data.name || '',
                                    email: data.email || '',
                                    phone: data.phone || data.phoneNumber || '',
                                    avatar_url: data.photoURL || data.avatarUrl || '',
                                    role: data.role || 'user',
                                    crefito: data.crefito || '',
                                    specialties: data.specialties || [],
                                    bio: data.bio || '',
                                    birth_date: data.birthDate || null,
                                    is_active: data.isActive !== false,
                                    last_login_at: data.lastLoginAt || null,
                                    email_verified: data.emailVerified || false,
                                    preferences: data.preferences || {},
                                    created_at: ((_d = (_c = data.createdAt) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)) || new Date(),
                                    updated_at: ((_f = (_e = data.updatedAt) === null || _e === void 0 ? void 0 : _e.toDate) === null || _f === void 0 ? void 0 : _f.call(_e)) || new Date(),
                                }];
                        }
                    }
                    return [3 /*break*/, 6];
                case 5:
                    error_3 = _g.sent();
                    if (error_3 instanceof https_1.HttpsError) {
                        throw error_3;
                    }
                    logger_1.logger.info('Firestore query failed in getUserProfile:', error_3);
                    return [3 /*break*/, 6];
                case 6: throw new https_1.HttpsError('not-found', 'Perfil não encontrado em PostgreSQL nem Firestore');
            }
        });
    });
}
/**
 * Handler para getProfile
 */
var getProfileHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, profile;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                uid = ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || ((_c = (_b = request.auth) === null || _b === void 0 ? void 0 : _b.token) === null || _c === void 0 ? void 0 : _c.uid);
                if (!uid) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, getUserProfile(uid)];
            case 1:
                profile = _d.sent();
                return [2 /*return*/, { data: profile }];
        }
    });
}); };
exports.getProfileHandler = getProfileHandler;
/**
 * POST /getProfile - Retorna o perfil do usuário autenticado
 */
exports.getProfile = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    maxInstances: 1,
    invoker: 'public',
    cors: cors_1.CORS_ORIGINS,
}, (0, error_handler_1.withErrorHandling)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, profile;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                // Only accept POST requests
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, verifyAuth(req)];
            case 1:
                uid = (_a.sent()).uid;
                return [4 /*yield*/, getUserProfile(uid)];
            case 2:
                profile = _a.sent();
                res.json({ data: profile });
                return [2 /*return*/];
        }
    });
}); }, 'getProfile'));
/**
 * Handler para updateProfile
 */
var updateProfileHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, updates, pool, allowedFields, setClauses, values, paramCount, _i, allowedFields_1, field, query, result;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                uid = ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || ((_c = (_b = request.auth) === null || _b === void 0 ? void 0 : _b.token) === null || _c === void 0 ? void 0 : _c.uid);
                if (!uid) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                updates = request.data;
                pool = (0, init_1.getPool)();
                allowedFields = [
                    'full_name', 'phone', 'avatar_url', 'crefito',
                    'specialties', 'bio', 'birth_date', 'preferences'
                ];
                setClauses = [];
                values = [];
                paramCount = 0;
                for (_i = 0, allowedFields_1 = allowedFields; _i < allowedFields_1.length; _i++) {
                    field = allowedFields_1[_i];
                    if (field in updates) {
                        paramCount++;
                        setClauses.push("".concat(field, " = $").concat(paramCount));
                        if (field === 'specialties' || field === 'preferences') {
                            values.push(JSON.stringify(updates[field]));
                        }
                        else {
                            values.push(updates[field]);
                        }
                    }
                }
                if (setClauses.length === 0) {
                    throw new https_1.HttpsError('invalid-argument', 'Nenhum campo válido para atualização');
                }
                // Adicionar updated_at
                paramCount++;
                setClauses.push("updated_at = $".concat(paramCount));
                values.push(new Date());
                // Adicionar WHERE
                paramCount++;
                values.push(uid);
                query = "\n    UPDATE profiles\n    SET ".concat(setClauses.join(', '), "\n    WHERE user_id = $").concat(paramCount, "\n    RETURNING *\n  ");
                return [4 /*yield*/, pool.query(query, values)];
            case 1:
                result = _d.sent();
                return [2 /*return*/, { data: result.rows[0] }];
        }
    });
}); };
exports.updateProfileHandler = updateProfileHandler;
/**
 * POST /updateProfile - Atualiza o perfil do usuário
 */
exports.updateProfile = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    maxInstances: 1,
    invoker: 'public',
    cors: cors_1.CORS_ORIGINS,
}, (0, error_handler_1.withErrorHandling)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, updates, pool, allowedFields, setClauses, values, paramCount, _i, allowedFields_2, field, query, result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                // Only accept POST requests
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, verifyAuth(req)];
            case 1:
                uid = (_a.sent()).uid;
                updates = req.body;
                pool = (0, init_1.getPool)();
                allowedFields = [
                    'full_name', 'phone', 'avatar_url', 'crefito',
                    'specialties', 'bio', 'birth_date', 'preferences'
                ];
                setClauses = [];
                values = [];
                paramCount = 0;
                for (_i = 0, allowedFields_2 = allowedFields; _i < allowedFields_2.length; _i++) {
                    field = allowedFields_2[_i];
                    if (field in updates) {
                        paramCount++;
                        setClauses.push("".concat(field, " = $").concat(paramCount));
                        if (field === 'specialties' || field === 'preferences') {
                            values.push(JSON.stringify(updates[field]));
                        }
                        else {
                            values.push(updates[field]);
                        }
                    }
                }
                if (setClauses.length === 0) {
                    res.status(400).json({ error: 'Nenhum campo válido para atualização' });
                    return [2 /*return*/];
                }
                // Adicionar updated_at
                paramCount++;
                setClauses.push("updated_at = $".concat(paramCount));
                values.push(new Date());
                // Adicionar WHERE
                paramCount++;
                values.push(uid);
                query = "\n      UPDATE profiles\n      SET ".concat(setClauses.join(', '), "\n      WHERE user_id = $").concat(paramCount, "\n      RETURNING *\n    ");
                return [4 /*yield*/, pool.query(query, values)];
            case 2:
                result = _a.sent();
                res.json({ data: result.rows[0] });
                return [2 /*return*/];
        }
    });
}); }, 'updateProfile'));
