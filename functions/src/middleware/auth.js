"use strict";
/**
 * Middleware de Autenticação para Cloud Functions
 * Gerencia tokens Firebase Auth e contexto de organização
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
exports.extractBearerToken = extractBearerToken;
exports.verifyToken = verifyToken;
exports.authorizeRequest = authorizeRequest;
exports.withAuth = withAuth;
exports.requireRole = requireRole;
exports.hasPermission = hasPermission;
exports.createAuthorizedClient = createAuthorizedClient;
var auth_1 = require("firebase-admin/auth");
var app_1 = require("firebase-admin/app");
var firestore_1 = require("firebase-admin/firestore");
var auth = function () { return (0, auth_1.getAuth)((0, app_1.getApp)()); };
var firestore = function () { return (0, firestore_1.getFirestore)((0, app_1.getApp)()); };
var https_1 = require("firebase-functions/v2/https");
// Re-exportar getPool do index
var init_1 = require("../init");
var logger_1 = require("../lib/logger");
var uuid_1 = require("../lib/uuid");
/**
 * Extrai e verifica o token Bearer do header Authorization
 *
 * @param authHeader - Header Authorization completo
 * @returns Token JWT puro
 * @throws HttpsError se o header for inválido
 */
function extractBearerToken(authHeader) {
    if (!authHeader) {
        throw new https_1.HttpsError('unauthenticated', 'Token de autenticação não fornecido');
    }
    var parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new https_1.HttpsError('unauthenticated', 'Formato de token inválido. Use: Bearer <token>');
    }
    return parts[1];
}
/**
 * Verifica o token Firebase Auth e retorna os dados decodificados
 *
 * @param token - Token JWT
 * @returns Token decodificado
 * @throws HttpsError se o token for inválido
 */
function verifyToken(token) {
    return __awaiter(this, void 0, void 0, function () {
        var decoded, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, auth().verifyIdToken(token, true)];
                case 1:
                    decoded = _a.sent();
                    return [2 /*return*/, {
                            uid: decoded.uid,
                            email: decoded.email || '',
                            email_verified: decoded.email_verified || false,
                        }];
                case 2:
                    error_1 = _a.sent();
                    if (error_1.code === 'auth/id-token-expired') {
                        throw new https_1.HttpsError('unauthenticated', 'Token expirado');
                    }
                    if (error_1.code === 'auth/id-token-revoked') {
                        throw new https_1.HttpsError('unauthenticated', 'Token revogado');
                    }
                    throw new https_1.HttpsError('unauthenticated', 'Token inválido: ' + error_1.message);
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Busca os dados do profile no banco de dados
 * Tenta PostgreSQL primeiro, depois Firestore como fallback
 *
 * @param userId - UID do Firebase Auth
 * @returns Dados do profile
 * @throws HttpsError se o profile não for encontrado
 */
function getProfile(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result, profile, organizationId, error_2, profileDoc, data, organizationId, firestoreError_1, organizationId, orgSlug, orgError_1, uniqueSlug, newProfile, error_3;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, pool.query("SELECT id, user_id, organization_id, role, full_name, email, is_active\n       FROM profiles\n       WHERE user_id = $1", [userId])];
                case 2:
                    result = _c.sent();
                    if (result.rows.length > 0) {
                        profile = result.rows[0];
                        organizationId = (0, uuid_1.toValidUuid)(profile.organization_id);
                        if (organizationId) {
                            profile.organization_id = organizationId;
                            return [2 /*return*/, profile];
                        }
                        logger_1.logger.warn('[Auth Middleware] Invalid organization_id in PostgreSQL profile', {
                            userId: userId,
                            organizationId: profile.organization_id,
                        });
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _c.sent();
                    logger_1.logger.info('[Auth Middleware] PostgreSQL query failed, trying Firestore:', error_2);
                    return [3 /*break*/, 4];
                case 4:
                    _c.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, firestore().collection('profiles').doc(userId).get()];
                case 5:
                    profileDoc = _c.sent();
                    if (profileDoc.exists) {
                        data = profileDoc.data();
                        if (data) {
                            organizationId = ((0, uuid_1.toValidUuid)(data.organizationId)
                                || (0, uuid_1.toValidUuid)((_a = data.organization_ids) === null || _a === void 0 ? void 0 : _a[0])
                                || (0, uuid_1.toValidUuid)((_b = data.organizationIds) === null || _b === void 0 ? void 0 : _b[0])
                                || (0, uuid_1.toValidUuid)(data.activeOrganizationId)
                                || (0, uuid_1.toValidUuid)(data.organization_id));
                            if (!organizationId) {
                                throw new https_1.HttpsError('failed-precondition', 'Perfil sem organizationId válido');
                            }
                            return [2 /*return*/, {
                                    id: userId,
                                    user_id: userId,
                                    organization_id: organizationId,
                                    role: data.role || 'user',
                                    full_name: data.displayName || data.name || data.full_name || '',
                                    email: data.email || '',
                                    is_active: data.isActive !== false,
                                }];
                        }
                    }
                    return [3 /*break*/, 7];
                case 6:
                    firestoreError_1 = _c.sent();
                    if (firestoreError_1 instanceof https_1.HttpsError) {
                        throw firestoreError_1;
                    }
                    logger_1.logger.info('[Auth Middleware] Firestore query failed:', firestoreError_1);
                    return [3 /*break*/, 7];
                case 7:
                    _c.trys.push([7, 15, , 16]);
                    logger_1.logger.info("[Auth Middleware] No profile found for user: ".concat(userId, ", creating default organization and profile"));
                    organizationId = '00000000-0000-0000-0000-000000000000';
                    orgSlug = "clinica-".concat(userId.substring(0, 8).toLowerCase());
                    _c.label = 8;
                case 8:
                    _c.trys.push([8, 10, , 13]);
                    return [4 /*yield*/, pool.query("INSERT INTO organizations (id, name, slug, active, email)\n           VALUES ($1, 'Cl\u00EDnica Principal', $2, true, $3)\n           ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug", [organizationId, orgSlug, 'admin@fisioflow.com.br'])];
                case 9:
                    _c.sent();
                    logger_1.logger.info("[Auth Middleware] Created/updated organization: ".concat(organizationId));
                    return [3 /*break*/, 13];
                case 10:
                    orgError_1 = _c.sent();
                    if (!(orgError_1.code === '23505')) return [3 /*break*/, 12];
                    uniqueSlug = "".concat(orgSlug, "-").concat(Date.now().toString(36));
                    return [4 /*yield*/, pool.query("UPDATE organizations SET slug = $1 WHERE id = $2", [uniqueSlug, organizationId])];
                case 11:
                    _c.sent();
                    _c.label = 12;
                case 12: return [3 /*break*/, 13];
                case 13: return [4 /*yield*/, pool.query("INSERT INTO profiles (user_id, organization_id, role, full_name, email, is_active)\n         VALUES ($1, $2, $3, $4, $5, $6)\n         RETURNING id, user_id, organization_id, role, full_name, email, is_active", [userId, organizationId, 'admin', 'Usuário Principal', 'admin@fisioflow.com.br', true])];
                case 14:
                    newProfile = _c.sent();
                    logger_1.logger.info("[Auth Middleware] Created default profile: ".concat(newProfile.rows[0].id));
                    return [2 /*return*/, newProfile.rows[0]];
                case 15:
                    error_3 = _c.sent();
                    if (error_3 instanceof Error) {
                        if (error_3.message.includes('connect') || error_3.message.includes('ECONNREFUSED') || error_3.message.includes('ETIMEDOUT')) {
                            logger_1.logger.error('[Auth Middleware] Database connection error:', error_3.message);
                            throw new https_1.HttpsError('internal', 'Erro de conexão com o banco de dados. Verifique se o PostgreSQL/Cloud SQL está configurado e acessível.');
                        }
                    }
                    throw error_3;
                case 16: return [2 /*return*/];
            }
        });
    });
}
/**
 * Configura o contexto RLS (Row Level Security) para a conexão atual
 *
 * @param pool - Pool de conexões PostgreSQL
 * @param organizationId - ID da organização do usuário
 */
function setRLSContext(pool, organizationId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, pool.query("SELECT set_config('app.organization_id', $1, true)", [organizationId])];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, pool.query("SELECT set_config('app.user_id', $1, true)", [organizationId])];
                case 2:
                    _a.sent(); // Fallback
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Autoriza uma requisição e retorna o contexto de autenticação completo
 *
 * Esta função deve ser chamada no início de cada Cloud Function que precisa
 * de autorização. Ela:
 * 1. Verifica o token Firebase Auth
 * 2. Busca os dados do profile no banco
 * 3. Configura o contexto RLS para isolamento multi-tenant
 *
 * @param token - Token JWT do Firebase Auth
 * @returns Contexto de autenticação com dados do usuário
 * @throws HttpsError se a autorização falhar
 *
 * @example
 * ```typescript
 * export const myFunction = onCall(async (request) => {
 *   const auth = await authorizeRequest(request.auth.token);
 *   // Use auth.organizationId, auth.role, etc.
 * });
 * ```
 */
function authorizeRequest(tokenOrUid) {
    return __awaiter(this, void 0, void 0, function () {
        var uid, decoded, profile, pool;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(typeof tokenOrUid === 'string')) return [3 /*break*/, 2];
                    return [4 /*yield*/, verifyToken(tokenOrUid)];
                case 1:
                    decoded = _a.sent();
                    uid = decoded.uid;
                    return [3 /*break*/, 3];
                case 2:
                    // Já é um objeto decodificado ou { uid }
                    uid = tokenOrUid.uid;
                    _a.label = 3;
                case 3: return [4 /*yield*/, getProfile(uid)];
                case 4:
                    profile = _a.sent();
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, setRLSContext(pool, profile.organization_id)];
                case 5:
                    _a.sent();
                    // 4. Retornar contexto completo
                    return [2 /*return*/, {
                            userId: uid,
                            organizationId: profile.organization_id,
                            role: profile.role,
                            email: profile.email,
                            profileId: profile.id,
                        }];
            }
        });
    });
}
/**
 * Wrapper para criar callable functions com autorização automática
 *
 * @param handler - Função handler que recebe o AuthContext
 * @returns Cloud Function callable com autenticação
 *
 * @example
 * ```typescript
 * export const myFunction = withAuth(async (data, auth) => {
 *   // auth já contém userId, organizationId, role, etc.
 *   return { success: true };
 * });
 * ```
 */
function withAuth(handler) {
    var _this = this;
    return function (request) { return __awaiter(_this, void 0, void 0, function () {
        var auth;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, authorizeRequest(request.auth.token)];
                case 1:
                    auth = _a.sent();
                    return [2 /*return*/, handler(request.data, auth)];
            }
        });
    }); };
}
/**
 * Verifica se o usuário tem permissão baseada em papel
 *
 * @param auth - Contexto de autenticação
 * @param allowedRoles - Array de papéis permitidos
 * @throws HttpsError se o usuário não tiver permissão
 */
function requireRole(auth, allowedRoles) {
    if (!allowedRoles.includes(auth.role)) {
        throw new https_1.HttpsError('permission-denied', "Acesso negado. Requer um dos pap\u00E9is: ".concat(allowedRoles.join(', ')));
    }
}
/**
 * Verifica se o usuário é admin ou tem role específico
 * Admins têm acesso a tudo
 *
 * @param auth - Contexto de autenticação
 * @param role - Papel necessário (opcional, se omitido verifica se é admin)
 * @returns true se tem permissão
 */
function hasPermission(auth, role) {
    if (auth.role === 'admin')
        return true;
    if (!role)
        return false;
    return auth.role === role;
}
/**
 * Criar um cliente PostgreSQL com contexto RLS configurado
 *
 * Útil para queries que precisam ser executadas dentro de uma transação
 * ou com contexto específico
 *
 * @param auth - Contexto de autenticação
 * @returns Cliente PostgreSQL com RLS configurado
 */
function createAuthorizedClient(auth) {
    return __awaiter(this, void 0, void 0, function () {
        var pool;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, setRLSContext(pool, auth.organizationId)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, pool];
            }
        });
    });
}
