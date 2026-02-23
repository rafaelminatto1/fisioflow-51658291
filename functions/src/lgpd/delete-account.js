"use strict";
/**
 * LGPD Compliance - Data Deletion (Direito ao Esquecimento)
 *
 * Implementa deleção de dados do usuário conforme LGPD Art. 16, II
 *
 * IMPORTANTE: A deleção deve ser feita de forma segura e permanente,
 * mantendo apenas registros mínimos obrigatórios por lei (fiscais, médicos).
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
exports.executeAccountDeletion = exports.cancelDeletionRequest = exports.requestAccountDeletion = void 0;
/**
 * Níveis de retenção de dados conforme LGPD e leis brasileiras
 */
var firebase_admin_1 = require("firebase-admin");
var storage_1 = require("firebase-admin/storage");
var https_1 = require("firebase-functions/v2/https");
var logger = require("firebase-functions/logger");
var RetentionPolicy;
(function (RetentionPolicy) {
    RetentionPolicy["IMMEDIATE"] = "immediate";
    RetentionPolicy["DAYS_30"] = "30_days";
    RetentionPolicy["MONTHS_6"] = "6_months";
    RetentionPolicy["YEAR_1"] = "1_year";
    RetentionPolicy["YEARS_5"] = "5_years";
    RetentionPolicy["MEDICAL_INDEFINITE"] = "medical";
})(RetentionPolicy || (RetentionPolicy = {}));
/**
 * Mapeamento de coleções para política de retenção
 */
var COLLECTION_RETENTION_POLICY = {
    // Dados pessoais - deletar imediatamente após período de graça
    'users': RetentionPolicy.IMMEDIATE,
    'user_privacy_preferences': RetentionPolicy.IMMEDIATE,
    'user_consents': RetentionPolicy.IMMEDIATE,
    // Dados de contato - deletar imediatamente
    'contacts': RetentionPolicy.IMMEDIATE,
    // Agendamentos - 6 meses para contingência
    'appointments': RetentionPolicy.MONTHS_6,
    // Dados financeiros - 5 anos (obrigação fiscal)
    'payments': RetentionPolicy.YEARS_5,
    'vouchers': RetentionPolicy.YEARS_5,
    'invoices': RetentionPolicy.YEARS_5,
    // Prontuário médico - INDEFINIDO (obrigação legal Código de Ética Médica)
    'patients': RetentionPolicy.MEDICAL_INDEFINITE,
    'evolutions': RetentionPolicy.MEDICAL_INDEFINITE,
    'evaluations': RetentionPolicy.MEDICAL_INDEFINITE,
    'medical_records': RetentionPolicy.MEDICAL_INDEFINITE,
    // Planos de exercício - anonimizar após 1 ano
    'exercise_plans': RetentionPolicy.YEAR_1,
    // Notificações - deletar imediatamente
    'notifications': RetentionPolicy.IMMEDIATE,
    // Logs de auditoria - 6 meses
    'audit_logs': RetentionPolicy.MONTHS_6,
    // Uploads de arquivos - 30 dias
    'uploads': RetentionPolicy.DAYS_30,
};
/**
 * Cloud Function: Solicitar deleção de conta (direito ao esquecimento)
 *
 * LGPD Art. 16, II - "a eliminação de dados pessoais tratados com o
 * consentimento do titular"
 *
 * Processo:
 * 1. Marcar conta para deleção
 * 2. Aguardar período de graça de 30 dias (direito de arrependimento)
 * 3. Anonimizar/deletar dados conforme políticas de retenção
 * 4. Manter apenas dados legalmente obrigatórios
 */
exports.requestAccountDeletion = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
    cors: true,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, existingRequest, doc, data, scheduledDate_1, daysRemaining, scheduledDate;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                userId = request.auth.uid;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('deletion_requests')
                        .where('userId', '==', userId)
                        .where('status', '==', 'pending')
                        .get()];
            case 1:
                existingRequest = _a.sent();
                if (!existingRequest.empty) {
                    doc = existingRequest.docs[0];
                    data = doc.data();
                    scheduledDate_1 = new Date(data.scheduledDate);
                    daysRemaining = Math.ceil((scheduledDate_1.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return [2 /*return*/, {
                            success: true,
                            status: 'already_scheduled',
                            scheduledDate: data.scheduledDate,
                            daysRemaining: daysRemaining,
                            message: "Dele\u00E7\u00E3o j\u00E1 agendada para ".concat(scheduledDate_1.toLocaleDateString('pt-BR')),
                        }];
                }
                scheduledDate = new Date();
                scheduledDate.setDate(scheduledDate.getDate() + 30);
                // Criar solicitação de deleção
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('deletion_requests')
                        .add({
                        userId: userId,
                        status: 'pending',
                        requestedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                        scheduledDate: scheduledDate,
                        ipAddress: request.rawRequest.ip,
                        userAgent: request.rawRequest.headers['user-agent'],
                    })];
            case 2:
                // Criar solicitação de deleção
                _a.sent();
                // Log de auditoria
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('audit_logs')
                        .add({
                        action: 'account_deletion_requested',
                        userId: userId,
                        scheduledDate: scheduledDate,
                        timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                    })];
            case 3:
                // Log de auditoria
                _a.sent();
                logger.info("Solicita\u00E7\u00E3o de dele\u00E7\u00E3o de conta: ".concat(userId, ", agendada para ").concat(scheduledDate));
                // Enviar email de confirmação (implementar)
                // await sendDeletionConfirmationEmail(userId, scheduledDate);
                return [2 /*return*/, {
                        success: true,
                        status: 'scheduled',
                        scheduledDate: scheduledDate.toISOString(),
                        daysRemaining: 30,
                        message: "Sua conta ser\u00E1 deletada em ".concat(scheduledDate.toLocaleDateString('pt-BR'), ". Voc\u00EA pode cancelar a qualquer momento."),
                    }];
        }
    });
}); });
/**
 * Cloud Function: Cancelar solicitação de deleção
 */
exports.cancelDeletionRequest = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
    cors: true,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, deletionRequests, batch;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                userId = request.auth.uid;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('deletion_requests')
                        .where('userId', '==', userId)
                        .where('status', '==', 'pending')
                        .get()];
            case 1:
                deletionRequests = _a.sent();
                if (deletionRequests.empty) {
                    throw new https_1.HttpsError('not-found', 'Nenhuma solicitação de deleção encontrada');
                }
                batch = (0, firebase_admin_1.firestore)().batch();
                deletionRequests.docs.forEach(function (doc) {
                    batch.update(doc.ref, {
                        status: 'cancelled',
                        cancelledAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                    });
                });
                return [4 /*yield*/, batch.commit()];
            case 2:
                _a.sent();
                // Log de auditoria
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('audit_logs')
                        .add({
                        action: 'account_deletion_cancelled',
                        userId: userId,
                        timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                    })];
            case 3:
                // Log de auditoria
                _a.sent();
                return [2 /*return*/, { success: true }];
        }
    });
}); });
/**
 * Cloud Function: Executar deleção de conta (agendada/manual admin)
 *
 * Esta função é chamada automaticamente após o período de 30 dias
 * ou manualmente por um administrador
 */
exports.executeAccountDeletion = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '1GiB',
    maxInstances: 1,
    timeoutSeconds: 540,
    cors: true,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var userDoc, _a, userId, forceDelete, usersToDelete, pendingRequests, _i, usersToDelete_1, uid, error_1;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!request.auth) return [3 /*break*/, 2];
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('users')
                        .doc(request.auth.uid)
                        .get()];
            case 1:
                userDoc = _c.sent();
                if (!userDoc.exists || ((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
                    throw new https_1.HttpsError('permission-denied', 'Apenas administradores podem executar esta ação');
                }
                _c.label = 2;
            case 2:
                _a = request.data, userId = _a.userId, forceDelete = _a.forceDelete;
                if (!userId && !forceDelete) {
                    throw new https_1.HttpsError('invalid-argument', 'userId é obrigatório');
                }
                _c.label = 3;
            case 3:
                _c.trys.push([3, 11, , 12]);
                usersToDelete = [];
                if (!forceDelete) return [3 /*break*/, 5];
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('deletion_requests')
                        .where('status', '==', 'pending')
                        .where('scheduledDate', '<=', new Date().toISOString())
                        .get()];
            case 4:
                pendingRequests = _c.sent();
                usersToDelete = pendingRequests.docs.map(function (doc) { return doc.data().userId; });
                return [3 /*break*/, 6];
            case 5:
                usersToDelete = [userId];
                _c.label = 6;
            case 6:
                logger.info("Iniciando dele\u00E7\u00E3o de ".concat(usersToDelete.length, " contas"));
                _i = 0, usersToDelete_1 = usersToDelete;
                _c.label = 7;
            case 7:
                if (!(_i < usersToDelete_1.length)) return [3 /*break*/, 10];
                uid = usersToDelete_1[_i];
                return [4 /*yield*/, deleteUserData(uid)];
            case 8:
                _c.sent();
                _c.label = 9;
            case 9:
                _i++;
                return [3 /*break*/, 7];
            case 10: return [2 /*return*/, {
                    success: true,
                    deletedCount: usersToDelete.length,
                }];
            case 11:
                error_1 = _c.sent();
                logger.error('Erro ao executar deleção:', error_1);
                throw new https_1.HttpsError('internal', 'Erro ao executar deleção de conta');
            case 12: return [2 /*return*/];
        }
    });
}); });
/**
 * Função auxiliar: Deletar dados do usuário conforme políticas de retenção
 */
function deleteUserData(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var storage, batch, deletedCollections, anonymizedCollections, retainedCollections, _i, _a, _b, collection, policy, snapshot, files, _c, files_1, file, error_2, deletionRequests, _d, _e, doc;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    logger.info("Processando dele\u00E7\u00E3o de dados para usu\u00E1rio: ".concat(userId));
                    storage = (0, storage_1.getStorage)().bucket();
                    batch = (0, firebase_admin_1.firestore)().batch();
                    deletedCollections = [];
                    anonymizedCollections = [];
                    retainedCollections = [];
                    _i = 0, _a = Object.entries(COLLECTION_RETENTION_POLICY);
                    _f.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    _b = _a[_i], collection = _b[0], policy = _b[1];
                    return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                            .collection(collection)
                            .where('userId', '==', userId)
                            .get()];
                case 2:
                    snapshot = _f.sent();
                    if (snapshot.empty)
                        return [3 /*break*/, 3];
                    switch (policy) {
                        case RetentionPolicy.IMMEDIATE:
                            // Deletar imediatamente
                            snapshot.docs.forEach(function (doc) { return batch.delete(doc.ref); });
                            deletedCollections.push(collection);
                            break;
                        case RetentionPolicy.DAYS_30:
                        case RetentionPolicy.MONTHS_6:
                        case RetentionPolicy.YEAR_1:
                            // Anonimizar dados (remover identificadores pessoais)
                            snapshot.docs.forEach(function (doc) {
                                batch.update(doc.ref, {
                                    userId: 'deleted_user_' + doc.id.substring(0, 8),
                                    email: null,
                                    displayName: null,
                                    phoneNumber: null,
                                    anonymizedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                                });
                            });
                            anonymizedCollections.push(collection);
                            break;
                        case RetentionPolicy.YEARS_5:
                            // Marcar para deleção futura, manter dados fiscais
                            snapshot.docs.forEach(function (doc) {
                                batch.update(doc.ref, {
                                    userId: 'deleted_user_' + doc.id.substring(0, 8),
                                    anonymizedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                                    markedForDeletion: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
                                });
                            });
                            anonymizedCollections.push(collection);
                            break;
                        case RetentionPolicy.MEDICAL_INDEFINITE:
                            // Prontuário médico: NÃO deletar (obrigação legal)
                            // Apenas marcar que o usuário foi deletado
                            snapshot.docs.forEach(function (doc) {
                                batch.update(doc.ref, {
                                    userDeleted: true,
                                    userDeletedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                                });
                            });
                            retainedCollections.push(collection);
                            break;
                    }
                    _f.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [4 /*yield*/, storage.getFiles({
                        prefix: "users/".concat(userId, "/"),
                    })];
                case 5:
                    files = (_f.sent())[0];
                    _c = 0, files_1 = files;
                    _f.label = 6;
                case 6:
                    if (!(_c < files_1.length)) return [3 /*break*/, 9];
                    file = files_1[_c];
                    return [4 /*yield*/, file.delete()];
                case 7:
                    _f.sent();
                    _f.label = 8;
                case 8:
                    _c++;
                    return [3 /*break*/, 6];
                case 9:
                    _f.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, (0, firebase_admin_1.auth)().deleteUser(userId)];
                case 10:
                    _f.sent();
                    return [3 /*break*/, 12];
                case 11:
                    error_2 = _f.sent();
                    if (error_2.code !== 'auth/user-not-found') {
                        logger.warn("Erro ao deletar usu\u00E1rio Auth: ".concat(error_2.message));
                    }
                    return [3 /*break*/, 12];
                case 12: 
                // 4. Executar batch
                return [4 /*yield*/, batch.commit()];
                case 13:
                    // 4. Executar batch
                    _f.sent();
                    return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                            .collection('deletion_requests')
                            .where('userId', '==', userId)
                            .where('status', '==', 'pending')
                            .get()];
                case 14:
                    deletionRequests = _f.sent();
                    _d = 0, _e = deletionRequests.docs;
                    _f.label = 15;
                case 15:
                    if (!(_d < _e.length)) return [3 /*break*/, 18];
                    doc = _e[_d];
                    return [4 /*yield*/, doc.ref.update({
                            status: 'completed',
                            completedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                        })];
                case 16:
                    _f.sent();
                    _f.label = 17;
                case 17:
                    _d++;
                    return [3 /*break*/, 15];
                case 18: 
                // 6. Log final
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('audit_logs')
                        .add({
                        action: 'account_deleted',
                        userId: userId,
                        deletedCollections: deletedCollections,
                        anonymizedCollections: anonymizedCollections,
                        retainedCollections: retainedCollections,
                        timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                    })];
                case 19:
                    // 6. Log final
                    _f.sent();
                    logger.info("Dele\u00E7\u00E3o completada para usu\u00E1rio: ".concat(userId), {
                        deletedCollections: deletedCollections,
                        anonymizedCollections: anonymizedCollections,
                        retainedCollections: retainedCollections,
                    });
                    return [2 /*return*/];
            }
        });
    });
}
