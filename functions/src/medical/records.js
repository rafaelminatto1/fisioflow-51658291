"use strict";
/**
 * Electronic Medical Record - SOAP Advanced
 *
 * Prontuário eletrônico completo com SOAP avançado,
 * anexos, assinatura digital e histórico de edições
 *
 * @module medical/records
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareEvolutions = exports.generateEvolutionReport = exports.getPatientEvolutionHistory = exports.addEvolutionAttachment = exports.updateEvolution = exports.createEvolution = void 0;
/**
 * Cloud Function: Criar evolução completa (SOAP avançado)
 */
var https_1 = require("firebase-functions/v2/https");
var firebase_admin_1 = require("firebase-admin");
var storage_1 = require("firebase-admin/storage");
var logger = require("firebase-functions/logger");
var uuid_1 = require("uuid");
exports.createEvolution = (0, https_1.onCall)({
    cors: true,
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, patientId, appointmentId, subjective, objective, assessment, plan, painLevel, measurements, attachments, therapistId, evolutionId, patientDoc, evolutionData, maskedPatientId;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                _a = request.data, patientId = _a.patientId, appointmentId = _a.appointmentId, subjective = _a.subjective, objective = _a.objective, assessment = _a.assessment, plan = _a.plan, painLevel = _a.painLevel, measurements = _a.measurements, attachments = _a.attachments;
                therapistId = request.auth.uid;
                evolutionId = (0, uuid_1.v4)();
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('patients')
                        .doc(patientId)
                        .get()];
            case 1:
                patientDoc = _b.sent();
                if (!patientDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
                }
                evolutionData = {
                    id: evolutionId,
                    patientId: patientId,
                    therapistId: therapistId,
                    appointmentId: appointmentId || null,
                    subjective: subjective || '',
                    objective: objective || '',
                    assessment: assessment || '',
                    plan: plan || '',
                    painLevel: painLevel || null,
                    measurements: measurements || {},
                    attachments: attachments || [],
                    createdAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                    version: 1,
                    previousVersions: [],
                };
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('evolutions')
                        .doc(evolutionId)
                        .set(evolutionData)];
            case 2:
                _b.sent();
                if (!appointmentId) return [3 /*break*/, 4];
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('sessions')
                        .where('appointmentId', '==', appointmentId)
                        .limit(1)
                        .get()
                        .then(function (snapshot) {
                        if (!snapshot.empty) {
                            return snapshot.docs[0].ref.update({
                                subjective: subjective,
                                objective: objective,
                                assessment: assessment,
                                plan: plan,
                                painLevel: painLevel,
                                evolutionId: evolutionId,
                                status: 'completed',
                            });
                        }
                    })];
            case 3:
                _b.sent();
                _b.label = 4;
            case 4: 
            // Log de auditoria
            return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                    .collection('audit_logs')
                    .add({
                    action: 'evolution_created',
                    userId: therapistId,
                    patientId: patientId,
                    evolutionId: evolutionId,
                    timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                })];
            case 5:
                // Log de auditoria
                _b.sent();
                maskedPatientId = patientId.substring(0, 8) + '...';
                logger.info("Evolution created: ".concat(evolutionId, " for patient: ").concat(maskedPatientId));
                return [2 /*return*/, {
                        success: true,
                        evolutionId: evolutionId,
                        data: evolutionData,
                    }];
        }
    });
}); });
/**
 * Cloud Function: Atualizar evolução (com versionamento)
 */
exports.updateEvolution = (0, https_1.onCall)({
    cors: true,
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, evolutionId, subjective, objective, assessment, plan, painLevel, measurements, evolutionDoc, currentData, userDoc, previousVersion, updatedData;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                _a = request.data, evolutionId = _a.evolutionId, subjective = _a.subjective, objective = _a.objective, assessment = _a.assessment, plan = _a.plan, painLevel = _a.painLevel, measurements = _a.measurements;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('evolutions')
                        .doc(evolutionId)
                        .get()];
            case 1:
                evolutionDoc = _c.sent();
                if (!evolutionDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Evolução não encontrada');
                }
                currentData = evolutionDoc.data();
                if (!((currentData === null || currentData === void 0 ? void 0 : currentData.therapistId) !== request.auth.uid)) return [3 /*break*/, 3];
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('users')
                        .doc(request.auth.uid)
                        .get()];
            case 2:
                userDoc = _c.sent();
                if (((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
                    throw new https_1.HttpsError('permission-denied', 'Sem permissão para editar esta evolução');
                }
                _c.label = 3;
            case 3:
                previousVersion = {
                    version: currentData === null || currentData === void 0 ? void 0 : currentData.version,
                    data: {
                        subjective: currentData === null || currentData === void 0 ? void 0 : currentData.subjective,
                        objective: currentData === null || currentData === void 0 ? void 0 : currentData.objective,
                        assessment: currentData === null || currentData === void 0 ? void 0 : currentData.assessment,
                        plan: currentData === null || currentData === void 0 ? void 0 : currentData.plan,
                        painLevel: currentData === null || currentData === void 0 ? void 0 : currentData.painLevel,
                        measurements: currentData === null || currentData === void 0 ? void 0 : currentData.measurements,
                        updatedAt: currentData === null || currentData === void 0 ? void 0 : currentData.updatedAt,
                    },
                    updatedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                };
                updatedData = {
                    subjective: subjective !== null && subjective !== void 0 ? subjective : currentData === null || currentData === void 0 ? void 0 : currentData.subjective,
                    objective: objective !== null && objective !== void 0 ? objective : currentData === null || currentData === void 0 ? void 0 : currentData.objective,
                    assessment: assessment !== null && assessment !== void 0 ? assessment : currentData === null || currentData === void 0 ? void 0 : currentData.assessment,
                    plan: plan !== null && plan !== void 0 ? plan : currentData === null || currentData === void 0 ? void 0 : currentData.plan,
                    painLevel: painLevel !== null && painLevel !== void 0 ? painLevel : currentData === null || currentData === void 0 ? void 0 : currentData.painLevel,
                    measurements: measurements !== null && measurements !== void 0 ? measurements : currentData === null || currentData === void 0 ? void 0 : currentData.measurements,
                    version: ((currentData === null || currentData === void 0 ? void 0 : currentData.version) || 0) + 1,
                    updatedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                    previousVersions: __spreadArray(__spreadArray([], ((currentData === null || currentData === void 0 ? void 0 : currentData.previousVersions) || []), true), [previousVersion], false),
                };
                return [4 /*yield*/, evolutionDoc.ref.update(updatedData)];
            case 4:
                _c.sent();
                // Log de auditoria
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('audit_logs')
                        .add({
                        action: 'evolution_updated',
                        userId: request.auth.uid,
                        evolutionId: evolutionId,
                        version: updatedData.version,
                        timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                    })];
            case 5:
                // Log de auditoria
                _c.sent();
                return [2 /*return*/, {
                        success: true,
                        version: updatedData.version,
                    }];
        }
    });
}); });
/**
 * Cloud Function: Adicionar anexo à evolução
 */
exports.addEvolutionAttachment = (0, https_1.onCall)({
    cors: true,
    region: 'southamerica-east1',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, evolutionId, attachment, allowedTypes, evolutionDoc, newAttachment;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                _a = request.data, evolutionId = _a.evolutionId, attachment = _a.attachment;
                // Validar tamanho do anexo (max 10MB)
                if (attachment.size && attachment.size > 10 * 1024 * 1024) {
                    throw new https_1.HttpsError('invalid-argument', 'Anexo muito grande (máximo 10MB)');
                }
                allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'video/mp4'];
                if (!allowedTypes.includes(attachment.type)) {
                    throw new https_1.HttpsError('invalid-argument', 'Tipo de arquivo não permitido');
                }
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('evolutions')
                        .doc(evolutionId)
                        .get()];
            case 1:
                evolutionDoc = _b.sent();
                if (!evolutionDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Evolução não encontrada');
                }
                newAttachment = __assign(__assign({}, attachment), { id: (0, uuid_1.v4)(), uploadedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(), uploadedBy: request.auth.uid });
                return [4 /*yield*/, evolutionDoc.ref.update({
                        attachments: firebase_admin_1.firestore.FieldValue.arrayUnion(newAttachment),
                        updatedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                    })];
            case 2:
                _b.sent();
                logger.info("Attachment added to evolution: ".concat(evolutionId));
                return [2 /*return*/, { success: true, attachmentId: newAttachment.id }];
        }
    });
}); });
/**
 * Cloud Function: Obter histórico de evoluções do paciente
 */
exports.getPatientEvolutionHistory = (0, https_1.onCall)({
    cors: true,
    region: 'southamerica-east1',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, patientId, _b, limit, userDoc, user, role, evolutionsSnapshot, evolutions, stats;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                _a = request.data, patientId = _a.patientId, _b = _a.limit, limit = _b === void 0 ? 50 : _b;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('users')
                        .doc(request.auth.uid)
                        .get()];
            case 1:
                userDoc = _c.sent();
                user = userDoc.data();
                role = user === null || user === void 0 ? void 0 : user.role;
                if (role === 'paciente' && (user === null || user === void 0 ? void 0 : user.patientId) !== patientId) {
                    throw new https_1.HttpsError('permission-denied', 'Sem permissão para ver este histórico');
                }
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('evolutions')
                        .where('patientId', '==', patientId)
                        .orderBy('createdAt', 'desc')
                        .limit(limit)
                        .get()];
            case 2:
                evolutionsSnapshot = _c.sent();
                evolutions = evolutionsSnapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                return [4 /*yield*/, calculateEvolutionStats(patientId)];
            case 3:
                stats = _c.sent();
                return [2 /*return*/, {
                        success: true,
                        evolutions: evolutions,
                        stats: stats,
                    }];
        }
    });
}); });
/**
 * Cloud Function: Gerar relatório de evolução em PDF
 */
exports.generateEvolutionReport = (0, https_1.onCall)({
    cors: true,
    region: 'southamerica-east1',
    memory: '1GiB',
    maxInstances: 1,
    timeoutSeconds: 300,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, patientId, startDate, endDate, patientDoc, patient, evolutionsSnapshot, evolutions, therapistIds, therapists, reportHtml, storage, fileName, file, url;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                _a = request.data, patientId = _a.patientId, startDate = _a.startDate, endDate = _a.endDate;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('patients')
                        .doc(patientId)
                        .get()];
            case 1:
                patientDoc = _b.sent();
                if (!patientDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
                }
                patient = patientDoc.data();
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('evolutions')
                        .where('patientId', '==', patientId)
                        .where('createdAt', '>=', new Date(startDate))
                        .where('createdAt', '<=', new Date(endDate))
                        .orderBy('createdAt', 'asc')
                        .get()];
            case 2:
                evolutionsSnapshot = _b.sent();
                evolutions = evolutionsSnapshot.docs.map(function (doc) { return doc.data(); });
                therapistIds = __spreadArray([], new Set(evolutions.map(function (e) { return e.therapistId; })), true);
                return [4 /*yield*/, Promise.all(therapistIds.map(function (id) { return __awaiter(void 0, void 0, void 0, function () {
                        var doc;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, (0, firebase_admin_1.firestore)().collection('users').doc(id).get()];
                                case 1:
                                    doc = _a.sent();
                                    return [2 /*return*/, __assign({ id: id }, doc.data())];
                            }
                        });
                    }); }))];
            case 3:
                therapists = _b.sent();
                reportHtml = generateEvolutionReportHtml({
                    patient: patient,
                    evolutions: evolutions,
                    therapists: therapists,
                    startDate: startDate,
                    endDate: endDate,
                });
                storage = (0, storage_1.getStorage)().bucket();
                fileName = "reports/evolution_".concat(patientId, "_").concat(Date.now(), ".pdf");
                file = storage.file(fileName);
                // Aqui você usaria uma biblioteca de PDF (ex: PDFKit, Puppeteer)
                // Por enquanto salvando como HTML
                return [4 /*yield*/, file.save(reportHtml, {
                        contentType: 'text/html',
                    })];
            case 4:
                // Aqui você usaria uma biblioteca de PDF (ex: PDFKit, Puppeteer)
                // Por enquanto salvando como HTML
                _b.sent();
                return [4 /*yield*/, file.getSignedUrl({
                        action: 'read',
                        expires: Date.now() + 24 * 60 * 60 * 1000, // 24 horas
                    })];
            case 5:
                url = (_b.sent())[0];
                // Log de auditoria
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('audit_logs')
                        .add({
                        action: 'evolution_report_generated',
                        userId: request.auth.uid,
                        patientId: patientId,
                        reportUrl: fileName,
                        timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                    })];
            case 6:
                // Log de auditoria
                _b.sent();
                return [2 /*return*/, {
                        success: true,
                        downloadUrl: url,
                        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    }];
        }
    });
}); });
/**
 * Cloud Function: Comparar evoluções (antes/depois)
 */
exports.compareEvolutions = (0, https_1.onCall)({
    cors: true,
    region: 'southamerica-east1',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, evolutionId1, evolutionId2, _b, evolution1, evolution2, data1, data2, comparison, allKeys;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                _a = request.data, evolutionId1 = _a.evolutionId1, evolutionId2 = _a.evolutionId2;
                return [4 /*yield*/, Promise.all([
                        (0, firebase_admin_1.firestore)().collection('evolutions').doc(evolutionId1).get(),
                        (0, firebase_admin_1.firestore)().collection('evolutions').doc(evolutionId2).get(),
                    ])];
            case 1:
                _b = _c.sent(), evolution1 = _b[0], evolution2 = _b[1];
                if (!evolution1.exists || !evolution2.exists) {
                    throw new https_1.HttpsError('not-found', 'Evolução não encontrada');
                }
                data1 = evolution1.data();
                data2 = evolution2.data();
                comparison = {
                    painLevel: {
                        before: data1 === null || data1 === void 0 ? void 0 : data1.painLevel,
                        after: data2 === null || data2 === void 0 ? void 0 : data2.painLevel,
                        difference: ((data2 === null || data2 === void 0 ? void 0 : data2.painLevel) || 0) - ((data1 === null || data1 === void 0 ? void 0 : data1.painLevel) || 0),
                        improved: ((data2 === null || data2 === void 0 ? void 0 : data2.painLevel) || 0) < ((data1 === null || data1 === void 0 ? void 0 : data1.painLevel) || 0),
                    },
                    measurements: {},
                };
                allKeys = new Set(__spreadArray(__spreadArray([], Object.keys((data1 === null || data1 === void 0 ? void 0 : data1.measurements) || {}), true), Object.keys((data2 === null || data2 === void 0 ? void 0 : data2.measurements) || {}), true));
                allKeys.forEach(function (key) {
                    var _a, _b;
                    var before = ((_a = data1 === null || data1 === void 0 ? void 0 : data1.measurements) === null || _a === void 0 ? void 0 : _a[key]) || 0;
                    var after = ((_b = data2 === null || data2 === void 0 ? void 0 : data2.measurements) === null || _b === void 0 ? void 0 : _b[key]) || 0;
                    var difference = after - before;
                    comparison.measurements[key] = {
                        before: before,
                        after: after,
                        difference: difference,
                        improved: difference !== 0, // Contexto específico seria necessário
                    };
                });
                return [2 /*return*/, {
                        success: true,
                        comparison: comparison,
                        date1: data1 === null || data1 === void 0 ? void 0 : data1.createdAt,
                        date2: data2 === null || data2 === void 0 ? void 0 : data2.createdAt,
                    }];
        }
    });
}); });
// ============================================================================================
// HELPER FUNCTIONS
// ============================================================================================
/**
 * Calcula estatísticas de evolução do paciente
 */
function calculateEvolutionStats(patientId) {
    return __awaiter(this, void 0, void 0, function () {
        var evolutionsSnapshot, evolutions, painLevels, avgPain, initialPain, currentPain, painImprovement, totalSessions, measurementsProgress, first_1, last_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('evolutions')
                        .where('patientId', '==', patientId)
                        .orderBy('createdAt', 'desc')
                        .get()];
                case 1:
                    evolutionsSnapshot = _c.sent();
                    evolutions = evolutionsSnapshot.docs.map(function (doc) { return doc.data(); });
                    if (evolutions.length === 0) {
                        return [2 /*return*/, null];
                    }
                    painLevels = evolutions
                        .filter(function (e) { return e.painLevel !== null && e.painLevel !== undefined; })
                        .map(function (e) { return e.painLevel; });
                    avgPain = painLevels.length > 0
                        ? painLevels.reduce(function (a, b) { return a + b; }, 0) / painLevels.length
                        : null;
                    initialPain = painLevels[painLevels.length - 1];
                    currentPain = painLevels[0];
                    painImprovement = initialPain !== null && currentPain !== null
                        ? initialPain - currentPain
                        : null;
                    totalSessions = evolutions.length;
                    measurementsProgress = {};
                    if (evolutions.length >= 2) {
                        first_1 = evolutions[evolutions.length - 1];
                        last_1 = evolutions[0];
                        Object.keys(last_1.measurements || {}).forEach(function (key) {
                            var _a, _b;
                            var initial = ((_a = first_1.measurements) === null || _a === void 0 ? void 0 : _a[key]) || 0;
                            var current = ((_b = last_1.measurements) === null || _b === void 0 ? void 0 : _b[key]) || 0;
                            measurementsProgress[key] = {
                                initial: initial,
                                current: current,
                                progress: current - initial,
                            };
                        });
                    }
                    return [2 /*return*/, {
                            totalSessions: totalSessions,
                            avgPain: avgPain ? Math.round(avgPain * 10) / 10 : null,
                            initialPain: initialPain,
                            currentPain: currentPain,
                            painImprovement: painImprovement,
                            measurementsProgress: measurementsProgress,
                            firstEvolution: (_a = evolutions[evolutions.length - 1]) === null || _a === void 0 ? void 0 : _a.createdAt,
                            lastEvolution: (_b = evolutions[0]) === null || _b === void 0 ? void 0 : _b.createdAt,
                        }];
            }
        });
    });
}
/**
 * Gera HTML do relatório de evolução
 */
function generateEvolutionReportHtml(params) {
    var patient = params.patient, evolutions = params.evolutions, therapists = params.therapists, startDate = params.startDate, endDate = params.endDate;
    var therapistMap = new Map(therapists.map(function (t) { return [t.id, t.displayName || t.fullName]; }));
    return "\n<!DOCTYPE html>\n<html lang=\"pt-BR\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Relat\u00F3rio de Evolu\u00E7\u00E3o - ".concat((patient === null || patient === void 0 ? void 0 : patient.fullName) || (patient === null || patient === void 0 ? void 0 : patient.name), "</title>\n  <style>\n    body {\n      font-family: Arial, sans-serif;\n      line-height: 1.6;\n      color: #333;\n      max-width: 800px;\n      margin: 0 auto;\n      padding: 20px;\n    }\n    .header {\n      text-align: center;\n      margin-bottom: 30px;\n      border-bottom: 2px solid #10B981;\n      padding-bottom: 20px;\n    }\n    .header h1 {\n      color: #10B981;\n      margin: 0;\n    }\n    .patient-info {\n      background: #f3f4f6;\n      padding: 15px;\n      border-radius: 10px;\n      margin-bottom: 20px;\n    }\n    .evolution {\n      margin-bottom: 30px;\n      padding: 15px;\n      border: 1px solid #e5e7eb;\n      border-radius: 10px;\n    }\n    .evolution-header {\n      display: flex;\n      justify-content: space-between;\n      margin-bottom: 10px;\n      padding-bottom: 10px;\n      border-bottom: 1px solid #e5e7eb;\n    }\n    .soap-section {\n      margin-bottom: 10px;\n    }\n    .soap-section h4 {\n      color: #10B981;\n      margin: 5px 0;\n    }\n    .pain-indicator {\n      display: inline-block;\n      padding: 5px 15px;\n      border-radius: 20px;\n      font-weight: bold;\n    }\n    .pain-low { background: #d1fae5; color: #065f46; }\n    .pain-medium { background: #fef3c7; color: #92400e; }\n    .pain-high { background: #fee2e2; color: #991b1b; }\n    .footer {\n      text-align: center;\n      margin-top: 40px;\n      padding-top: 20px;\n      border-top: 1px solid #e5e7eb;\n      color: #6b7280;\n      font-size: 12px;\n    }\n  </style>\n</head>\n<body>\n  <div class=\"header\">\n    <h1>\uD83D\uDCCA Relat\u00F3rio de Evolu\u00E7\u00E3o</h1>\n    <p>FisioFlow - Fisioterapia Digital</p>\n  </div>\n\n  <div class=\"patient-info\">\n    <h3>Paciente: ").concat((patient === null || patient === void 0 ? void 0 : patient.fullName) || (patient === null || patient === void 0 ? void 0 : patient.name), "</h3>\n    <p><strong>Per\u00EDodo:</strong> ").concat(new Date(startDate).toLocaleDateString('pt-BR'), " a ").concat(new Date(endDate).toLocaleDateString('pt-BR'), "</p>\n    <p><strong>Total de Sess\u00F5es:</strong> ").concat(evolutions.length, "</p>\n  </div>\n\n  ").concat(evolutions.map(function (evo, index) {
        var _a, _b;
        return "\n    <div class=\"evolution\">\n      <div class=\"evolution-header\">\n        <strong>Sess\u00E3o #".concat(evolutions.length - index, "</strong>\n        <span>").concat(new Date((_b = (_a = evo.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)).toLocaleDateString('pt-BR'), "</span>\n      </div>\n\n      <p><strong>Fisioterapeuta:</strong> ").concat(therapistMap.get(evo.therapistId) || 'N/A', "</p>\n\n      ").concat(evo.painLevel !== null ? "\n        <p>\n          <strong>N\u00EDvel de Dor:</strong>\n          <span class=\"pain-indicator ".concat(evo.painLevel <= 3 ? 'pain-low' : evo.painLevel <= 6 ? 'pain-medium' : 'pain-high', "\">\n            ").concat(evo.painLevel, "/10\n          </span>\n        </p>\n      ") : '', "\n\n      ").concat(evo.subjective ? "\n        <div class=\"soap-section\">\n          <h4>\uD83D\uDC42 Subjetivo</h4>\n          <p>".concat(evo.subjective, "</p>\n        </div>\n      ") : '', "\n\n      ").concat(evo.objective ? "\n        <div class=\"soap-section\">\n          <h4>\uD83D\uDC41\uFE0F Objetivo</h4>\n          <p>".concat(evo.objective, "</p>\n        </div>\n      ") : '', "\n\n      ").concat(evo.assessment ? "\n        <div class=\"soap-section\">\n          <h4>\uD83D\uDCAD Avalia\u00E7\u00E3o</h4>\n          <p>".concat(evo.assessment, "</p>\n        </div>\n      ") : '', "\n\n      ").concat(evo.plan ? "\n        <div class=\"soap-section\">\n          <h4>\uD83D\uDCCB Plano</h4>\n          <p>".concat(evo.plan, "</p>\n        </div>\n      ") : '', "\n\n      ").concat(Object.keys(evo.measurements || {}).length > 0 ? "\n        <div class=\"soap-section\">\n          <h4>\uD83D\uDCCF Medi\u00E7\u00F5es</h4>\n          <ul>\n            ".concat(Object.entries(evo.measurements).map(function (_a) {
            var key = _a[0], value = _a[1];
            return "<li><strong>".concat(key, ":</strong> ").concat(value, "</li>");
        }).join(''), "\n          </ul>\n        </div>\n      ") : '', "\n    </div>\n  ");
    }).join(''), "\n\n  <div class=\"footer\">\n    <p>Relat\u00F3rio gerado em ").concat(new Date().toLocaleString('pt-BR'), "</p>\n    <p>FisioFlow \u00A9 ").concat(new Date().getFullYear(), " - Todos os direitos reservados</p>\n  </div>\n</body>\n</html>\n  ");
}
