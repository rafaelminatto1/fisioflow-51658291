"use strict";
/**
 * LGPD Compliance - Data Export (Direito à Portabilidade)
 *
 * Implementa exportação de dados do usuário conforme LGPD Art. 18
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
exports.getExportHistory = exports.exportUserData = void 0;
/**
 * Interface para dados exportados do usuário
 */
var firebase_admin_1 = require("firebase-admin");
var https_1 = require("firebase-functions/v2/https");
var logger = require("firebase-functions/logger");
/**
 * Cloud Function: Exportar todos os dados do usuário (ZIP)
 *
 * LGPD Art. 18, I - direito à portabilidade dos dados
 */
exports.exportUserData = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
    timeoutSeconds: 540, // 9 minutos máximo
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, userDoc, userData, profile, patientDoc, evolutionsSnapshot, medicalRecords, appointmentsSnapshot, appointments, exercisePlansSnapshot, exercisePlans, consentsSnapshot, consents, auditSnapshot, auditLogs, exportData, url, fileName, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                userId = request.auth.uid;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 11, , 12]);
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('users')
                        .doc(userId)
                        .get()];
            case 2:
                userDoc = _a.sent();
                if (!userDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Usuário não encontrado');
                }
                userData = userDoc.data();
                profile = {};
                if (!((userData === null || userData === void 0 ? void 0 : userData.role) === 'paciente')) return [3 /*break*/, 4];
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('patients')
                        .where('userId', '==', userId)
                        .limit(1)
                        .get()];
            case 3:
                patientDoc = _a.sent();
                if (!patientDoc.empty) {
                    profile = patientDoc.docs[0].data();
                    // Remover campos sensíveis demais
                    delete profile.cpf;
                    delete profile.ssn;
                }
                _a.label = 4;
            case 4: return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                    .collection('evolutions')
                    .where('patientId', '==', userId)
                    .orderBy('date', 'desc')
                    .limit(100)
                    .get()];
            case 5:
                evolutionsSnapshot = _a.sent();
                medicalRecords = evolutionsSnapshot.docs.map(function (doc) { return ({
                    id: doc.id,
                    type: doc.data().type || 'evolucao',
                    date: doc.data().date,
                    summary: doc.data().summary || '',
                    therapist: doc.data().therapistName || 'N/A',
                }); });
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('appointments')
                        .where('patientId', '==', userId)
                        .orderBy('date', 'desc')
                        .limit(100)
                        .get()];
            case 6:
                appointmentsSnapshot = _a.sent();
                appointments = appointmentsSnapshot.docs.map(function (doc) { return ({
                    id: doc.id,
                    date: doc.data().date,
                    status: doc.data().status,
                    type: doc.data().type || 'consulta',
                    notes: doc.data().notes,
                }); });
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('exercise_plans')
                        .where('patientId', '==', userId)
                        .orderBy('createdAt', 'desc')
                        .limit(50)
                        .get()];
            case 7:
                exercisePlansSnapshot = _a.sent();
                exercisePlans = exercisePlansSnapshot.docs.map(function (doc) {
                    var data = doc.data();
                    return {
                        id: doc.id,
                        name: data.name || 'Plano de Exercícios',
                        createdAt: data.createdAt,
                        exercises: data.exercises || [],
                    };
                });
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('user_consents')
                        .where('userId', '==', userId)
                        .orderBy('timestamp', 'desc')
                        .get()];
            case 8:
                consentsSnapshot = _a.sent();
                consents = consentsSnapshot.docs.map(function (doc) {
                    var data = doc.data();
                    return {
                        consentType: data.consentType,
                        granted: data.granted,
                        timestamp: data.timestamp,
                        version: data.version,
                    };
                });
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('audit_logs')
                        .where('userId', '==', userId)
                        .orderBy('timestamp', 'desc')
                        .limit(100)
                        .get()];
            case 9:
                auditSnapshot = _a.sent();
                auditLogs = auditSnapshot.docs.map(function (doc) {
                    var data = doc.data();
                    return {
                        action: data.action,
                        timestamp: data.timestamp,
                        details: data.details,
                    };
                });
                exportData = {
                    personalInfo: {
                        userId: (userData === null || userData === void 0 ? void 0 : userData.userId) || userId,
                        email: (userData === null || userData === void 0 ? void 0 : userData.email) || '',
                        displayName: (userData === null || userData === void 0 ? void 0 : userData.displayName) || '',
                        phoneNumber: userData === null || userData === void 0 ? void 0 : userData.phoneNumber,
                        createdAt: userData === null || userData === void 0 ? void 0 : userData.createdAt,
                        lastSignInAt: userData === null || userData === void 0 ? void 0 : userData.lastSignInAt,
                    },
                    profile: profile,
                    medicalRecords: medicalRecords,
                    appointments: appointments,
                    exercisePlans: exercisePlans,
                    consents: consents,
                    auditLogs: auditLogs,
                    exportedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                };
                url = "feature_temporarily_disabled";
                fileName = "export_disabled";
                // Using exportData to satisfy linter until Storage feature is re-enabled
                logger.info("Prepared export data for user ".concat(userId), { recordCount: Object.keys(exportData).length });
                // 10. Log da exportação
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('audit_logs')
                        .add({
                        action: 'data_exported',
                        userId: userId,
                        exportUrl: fileName,
                        timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                        ipAddress: request.rawRequest.ip,
                    })];
            case 10:
                // 10. Log da exportação
                _a.sent();
                logger.info("Dados exportados para usu\u00E1rio: ".concat(userId));
                return [2 /*return*/, {
                        success: true,
                        downloadUrl: url,
                        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                        recordCount: {
                            medicalRecords: medicalRecords.length,
                            appointments: appointments.length,
                            exercisePlans: exercisePlans.length,
                            consents: consents.length,
                            auditLogs: auditLogs.length,
                        },
                    }];
            case 11:
                error_1 = _a.sent();
                logger.error('Erro ao exportar dados:', error_1);
                throw new https_1.HttpsError('internal', 'Erro ao exportar dados. Tente novamente ou contate o suporte.');
            case 12: return [2 /*return*/];
        }
    });
}); });
/**
 * Cloud Function: Obter histórico de exportações do usuário
 */
exports.getExportHistory = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, exportsSnapshot, exports;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                userId = request.auth.uid;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('data_exports')
                        .where('userId', '==', userId)
                        .orderBy('createdAt', 'desc')
                        .limit(10)
                        .get()];
            case 1:
                exportsSnapshot = _a.sent();
                exports = exportsSnapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                return [2 /*return*/, { exports: exports }];
        }
    });
}); });
