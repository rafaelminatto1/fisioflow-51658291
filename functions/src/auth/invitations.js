"use strict";
/**
 * Cloud Functions: Convites de usuários
 * createUserInvitation, getInvitationByToken, consumeInvitation
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
exports.consumeInvitation = exports.consumeInvitationHandler = exports.getInvitationByToken = exports.getInvitationByTokenHandler = exports.createUserInvitation = exports.createUserInvitationHandler = void 0;
var https_1 = require("firebase-functions/v2/https");
var firebase_admin_1 = require("firebase-admin");
var logger = require("firebase-functions/logger");
var db = (0, firebase_admin_1.firestore)();
function generateToken() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
/**
 * Cria convite e retorna token e expires_at.
 * Frontend (InviteUserModal) chama como createUserInvitation.
 */
var createUserInvitationHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, _b, role, profileSnap, profile, organizationId, token, expiresAt, invitationData, docRef;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                _a = request.data, email = _a.email, _b = _a.role, role = _b === void 0 ? 'fisioterapeuta' : _b;
                if (!email || typeof email !== 'string') {
                    throw new https_1.HttpsError('invalid-argument', 'email é obrigatório');
                }
                return [4 /*yield*/, db.collection('profiles').doc(request.auth.uid).get()];
            case 1:
                profileSnap = _c.sent();
                profile = profileSnap.data();
                organizationId = (profile === null || profile === void 0 ? void 0 : profile.organization_id) || null;
                token = generateToken();
                expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7);
                invitationData = {
                    email: email.trim().toLowerCase(),
                    role: role || 'fisioterapeuta',
                    token: token,
                    invited_by: request.auth.uid,
                    organization_id: organizationId,
                    expires_at: expiresAt.toISOString(),
                    used_at: null,
                    created_at: new Date().toISOString(),
                };
                return [4 /*yield*/, db.collection('user_invitations').add(invitationData)];
            case 2:
                docRef = _c.sent();
                logger.info("Invitation created: ".concat(docRef.id, " for ").concat(invitationData.email));
                return [2 /*return*/, {
                        token: token,
                        expires_at: expiresAt.toISOString(),
                        id: docRef.id,
                    }];
        }
    });
}); };
exports.createUserInvitationHandler = createUserInvitationHandler;
exports.createUserInvitation = (0, https_1.onCall)({ cors: true, memory: '512MiB', maxInstances: 1 }, exports.createUserInvitationHandler);
/**
 * Retorna dados do convite por token (para pré-preencher email na página de Auth).
 * Não requer autenticação (usuário ainda não tem conta).
 */
var getInvitationByTokenHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var token, snap, doc, data, expiresAt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                token = request.data.token;
                if (!token) {
                    throw new https_1.HttpsError('invalid-argument', 'token é obrigatório');
                }
                return [4 /*yield*/, db
                        .collection('user_invitations')
                        .where('token', '==', token)
                        .limit(1)
                        .get()];
            case 1:
                snap = _a.sent();
                if (snap.empty) {
                    return [2 /*return*/, { valid: false, email: null, role: null, organization_id: null }];
                }
                doc = snap.docs[0];
                data = doc.data();
                if (data.used_at) {
                    return [2 /*return*/, { valid: false, email: null, role: null, organization_id: null }];
                }
                expiresAt = new Date(data.expires_at);
                if (expiresAt < new Date()) {
                    return [2 /*return*/, { valid: false, email: null, role: null, organization_id: null }];
                }
                return [2 /*return*/, {
                        valid: true,
                        email: data.email,
                        role: data.role || 'fisioterapeuta',
                        organization_id: data.organization_id || null,
                        invitation_id: doc.id,
                    }];
        }
    });
}); };
exports.getInvitationByTokenHandler = getInvitationByTokenHandler;
exports.getInvitationByToken = (0, https_1.onCall)({ cors: true, memory: '512MiB', maxInstances: 1 }, exports.getInvitationByTokenHandler);
/**
 * Marca convite como usado e atualiza o perfil do usuário com role e organization_id.
 * Chamado após signup/signin quando o usuário acessou via link de convite.
 */
var consumeInvitationHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var token, snap, docRef, data, expiresAt, profileRef, profileSnap, updates;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                token = request.data.token;
                if (!token) {
                    throw new https_1.HttpsError('invalid-argument', 'token é obrigatório');
                }
                return [4 /*yield*/, db
                        .collection('user_invitations')
                        .where('token', '==', token)
                        .limit(1)
                        .get()];
            case 1:
                snap = _a.sent();
                if (snap.empty) {
                    throw new https_1.HttpsError('not-found', 'Convite não encontrado');
                }
                docRef = snap.docs[0].ref;
                data = snap.docs[0].data();
                if (data.used_at) {
                    return [2 /*return*/, { success: true, message: 'Convite já utilizado' }];
                }
                expiresAt = new Date(data.expires_at);
                if (expiresAt < new Date()) {
                    throw new https_1.HttpsError('failed-precondition', 'Convite expirado');
                }
                return [4 /*yield*/, docRef.update({
                        used_at: new Date().toISOString(),
                        used_by: request.auth.uid,
                    })];
            case 2:
                _a.sent();
                profileRef = db.collection('profiles').doc(request.auth.uid);
                return [4 /*yield*/, profileRef.get()];
            case 3:
                profileSnap = _a.sent();
                if (!profileSnap.exists) return [3 /*break*/, 5];
                updates = {
                    role: data.role || 'fisioterapeuta',
                    updated_at: new Date().toISOString(),
                };
                if (data.organization_id) {
                    updates.organization_id = data.organization_id;
                }
                return [4 /*yield*/, profileRef.update(updates)];
            case 4:
                _a.sent();
                _a.label = 5;
            case 5:
                logger.info("Invitation consumed: ".concat(docRef.id, " by ").concat(request.auth.uid));
                return [2 /*return*/, { success: true }];
        }
    });
}); };
exports.consumeInvitationHandler = consumeInvitationHandler;
exports.consumeInvitation = (0, https_1.onCall)({ cors: true, memory: '512MiB', maxInstances: 1 }, exports.consumeInvitationHandler);
