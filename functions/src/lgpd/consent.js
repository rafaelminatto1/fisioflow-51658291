"use strict";
/**
 * LGPD Compliance - Consent Management
 *
 * Implementa gerenciamento de consentimento de dados conforme LGPD
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptAllTerms = exports.getUserConsents = exports.revokeConsent = exports.recordConsent = exports.ConsentType = void 0;
// Tipos de consentimento LGPD
var firebase_admin_1 = require("firebase-admin");
var https_1 = require("firebase-functions/v2/https");
var ConsentType;
(function (ConsentType) {
    ConsentType["PERSONAL_DATA"] = "personal_data";
    ConsentType["HEALTH_DATA"] = "health_data";
    ConsentType["CONTACT_DATA"] = "contact_data";
    ConsentType["FINANCIAL_DATA"] = "financial_data";
    ConsentType["BIOMETRIC_DATA"] = "biometric_data";
    ConsentType["MARKETING_COMMUNICATIONS"] = "marketing";
    ConsentType["ANALYTICS"] = "analytics";
})(ConsentType || (exports.ConsentType = ConsentType = {}));
/**
 * Cloud Function: Registrar consentimento do usuário
 */
exports.recordConsent = (0, https_1.onCall)({
    cors: true,
    memory: '256MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, _a, consentType, granted, purposes, policyDoc, policyVersion, consentRecord, preferencesRef;
    var _b;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                userId = request.auth.uid;
                _a = request.data, consentType = _a.consentType, granted = _a.granted, purposes = _a.purposes;
                // Validar tipo de consentimento
                if (!Object.values(ConsentType).includes(consentType)) {
                    throw new https_1.HttpsError('invalid-argument', 'Tipo de consentimento inválido');
                }
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('settings')
                        .doc('privacy_policy')
                        .get()];
            case 1:
                policyDoc = _d.sent();
                if (!policyDoc.exists) {
                    throw new https_1.HttpsError('failed-precondition', 'Política de privacidade não configurada');
                }
                policyVersion = ((_c = policyDoc.data()) === null || _c === void 0 ? void 0 : _c.version) || '1.0';
                consentRecord = {
                    userId: userId,
                    consentType: consentType,
                    granted: granted,
                    timestamp: firebase_admin_1.firestore.Timestamp.now(),
                    version: policyVersion,
                    purposes: purposes || [],
                };
                // Salvar registro de consentimento
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('user_consents')
                        .add(consentRecord)];
            case 2:
                // Salvar registro de consentimento
                _d.sent();
                preferencesRef = (0, firebase_admin_1.firestore)()
                    .collection('user_privacy_preferences')
                    .doc(userId);
                return [4 /*yield*/, preferencesRef.set({
                        consents: (_b = {},
                            _b[consentType] = consentRecord,
                            _b),
                        updatedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true })];
            case 3:
                _d.sent();
                // Log de auditoria
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('audit_logs')
                        .add({
                        action: 'consent_recorded',
                        userId: userId,
                        consentType: consentType,
                        granted: granted,
                        timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                        ipAddress: request.rawRequest.ip,
                        userAgent: request.rawRequest.headers['user-agent'],
                    })];
            case 4:
                // Log de auditoria
                _d.sent();
                return [2 /*return*/, { success: true, timestamp: consentRecord.timestamp }];
        }
    });
}); });
/**
 * Cloud Function: Revogar consentimento (direito ao arrependimento)
 */
exports.revokeConsent = (0, https_1.onCall)({
    cors: true,
    memory: '256MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, consentType, consentsQuery, doc;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                userId = request.auth.uid;
                consentType = request.data.consentType;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('user_consents')
                        .where('userId', '==', userId)
                        .where('consentType', '==', consentType)
                        .where('granted', '==', true)
                        .orderBy('timestamp', 'desc')
                        .limit(1)
                        .get()];
            case 1:
                consentsQuery = _a.sent();
                if (!!consentsQuery.empty) return [3 /*break*/, 3];
                doc = consentsQuery.docs[0];
                return [4 /*yield*/, doc.ref.update({
                        granted: false,
                        revokedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                    })];
            case 2:
                _a.sent();
                _a.label = 3;
            case 3: 
            // Log de auditoria
            return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                    .collection('audit_logs')
                    .add({
                    action: 'consent_revoked',
                    userId: userId,
                    consentType: consentType,
                    timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                })];
            case 4:
                // Log de auditoria
                _a.sent();
                return [2 /*return*/, { success: true }];
        }
    });
}); });
/**
 * Cloud Function: Obter todos os consentimentos do usuário
 */
exports.getUserConsents = (0, https_1.onCall)({
    cors: true,
    memory: '256MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, consentsSnapshot, consents;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                userId = request.auth.uid;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('user_consents')
                        .where('userId', '==', userId)
                        .orderBy('timestamp', 'desc')
                        .get()];
            case 1:
                consentsSnapshot = _a.sent();
                consents = consentsSnapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                return [2 /*return*/, { consents: consents }];
        }
    });
}); });
/**
 * Cloud Function: Aceitar todos os termos (onboarding)
 */
exports.acceptAllTerms = (0, https_1.onCall)({
    cors: true,
    memory: '256MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, timestamp, essentialConsents, batch, _i, essentialConsents_1, consentType, consentRef;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                userId = request.auth.uid;
                timestamp = firebase_admin_1.firestore.FieldValue.serverTimestamp();
                essentialConsents = [
                    ConsentType.PERSONAL_DATA,
                    ConsentType.CONTACT_DATA,
                ];
                batch = (0, firebase_admin_1.firestore)().batch();
                for (_i = 0, essentialConsents_1 = essentialConsents; _i < essentialConsents_1.length; _i++) {
                    consentType = essentialConsents_1[_i];
                    consentRef = (0, firebase_admin_1.firestore)()
                        .collection('user_consents')
                        .doc();
                    batch.set(consentRef, {
                        userId: userId,
                        consentType: consentType,
                        granted: true,
                        timestamp: timestamp,
                        version: '1.0',
                        purposes: ['gerenciamento_conta', 'prestacao_servicos'],
                    });
                }
                return [4 /*yield*/, batch.commit()];
            case 1:
                _a.sent();
                // Atualizar documento do usuário
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('users')
                        .doc(userId)
                        .update({
                        termsAcceptedAt: timestamp,
                        termsAcceptedVersion: '1.0',
                    })];
            case 2:
                // Atualizar documento do usuário
                _a.sent();
                return [2 /*return*/, { success: true }];
        }
    });
}); });
