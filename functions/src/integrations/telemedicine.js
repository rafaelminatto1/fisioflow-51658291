"use strict";
/**
 * Telemedicine Integration
 *
 * Sistema de videochamadas para teleatendimento fisioterapêutico
 *
 * @module integrations/telemedicine
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
exports.getTelemedicineHistory = exports.endTelemedicineRoom = exports.joinTelemedicineRoom = exports.createTelemedicineRoom = void 0;
/**
 * Cloud Function: Criar sala de telemedicina
 */
var https_1 = require("firebase-functions/v2/https");
var firebase_admin_1 = require("firebase-admin");
var logger = require("firebase-functions/logger");
var cors_1 = require("../lib/cors");
exports.createTelemedicineRoom = (0, https_1.onCall)({
    cors: cors_1.CORS_ORIGINS,
    memory: '256MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, patientId, scheduledFor, appointmentId, therapistId, patientDoc, existingSnapshot, existing, scheduledTime, now, expiryTime, roomCode, roomRef;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                _a = request.data, patientId = _a.patientId, scheduledFor = _a.scheduledFor, appointmentId = _a.appointmentId;
                therapistId = request.auth.uid;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('patients')
                        .doc(patientId)
                        .get()];
            case 1:
                patientDoc = _b.sent();
                if (!patientDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
                }
                if (!appointmentId) return [3 /*break*/, 3];
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('telemedicine_rooms')
                        .where('appointmentId', '==', appointmentId)
                        .limit(1)
                        .get()];
            case 2:
                existingSnapshot = _b.sent();
                if (!existingSnapshot.empty) {
                    existing = existingSnapshot.docs[0].data();
                    scheduledTime = new Date(existing.scheduledFor);
                    now = new Date();
                    expiryTime = new Date(scheduledTime.getTime() + 30 * 60 * 1000);
                    if (now < expiryTime && existing.status === 'active') {
                        return [2 /*return*/, {
                                success: true,
                                roomId: existingSnapshot.docs[0].id,
                                roomCode: existing.roomCode,
                                existing: true,
                            }];
                    }
                }
                _b.label = 3;
            case 3:
                roomCode = generateRoomCode();
                roomRef = (0, firebase_admin_1.firestore)().collection('telemedicine_rooms').doc();
                return [4 /*yield*/, roomRef.create({
                        therapistId: therapistId,
                        patientId: patientId,
                        appointmentId: appointmentId || null,
                        scheduledFor: scheduledFor,
                        roomCode: roomCode,
                        status: 'scheduled',
                        createdAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                        activatedAt: null,
                        endedAt: null,
                    })];
            case 4:
                _b.sent();
                if (!appointmentId) return [3 /*break*/, 6];
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('appointments')
                        .doc(appointmentId)
                        .update({
                        telemedicineRoomId: roomRef.id,
                        isTelemedicine: true,
                    })];
            case 5:
                _b.sent();
                _b.label = 6;
            case 6:
                // Notificar paciente sobre a teleconsulta
                // await sendTelemedicineNotification(patientId, roomCode, scheduledFor);
                logger.info("Telemedicine room created: ".concat(roomRef.id, " for appointment: ").concat(appointmentId));
                return [2 /*return*/, {
                        success: true,
                        roomId: roomRef.id,
                        roomCode: roomCode,
                    }];
        }
    });
}); });
/**
 * Cloud Function: Entrar na sala de telemedicina
 */
exports.joinTelemedicineRoom = (0, https_1.onCall)({
    cors: cors_1.CORS_ORIGINS,
    memory: '256MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, roomId, roomCode, role, roomDoc, room, userId, now, scheduledTime, earliestEntry, latestEntry, updatedRoom, updatedData, bothJoined;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                _a = request.data, roomId = _a.roomId, roomCode = _a.roomCode, role = _a.role;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('telemedicine_rooms')
                        .doc(roomId)
                        .get()];
            case 1:
                roomDoc = _c.sent();
                if (!roomDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Sala não encontrada');
                }
                room = roomDoc.data();
                userId = request.auth.uid;
                if (role === 'therapist' && room.therapistId !== userId) {
                    throw new https_1.HttpsError('permission-denied', 'Você não tem permissão para acessar esta sala');
                }
                if (role === 'patient' && room.patientId !== userId) {
                    throw new https_1.HttpsError('permission-denied', 'Você não tem permissão para acessar esta sala');
                }
                // Verificar código se fornecido
                if (roomCode && room.roomCode !== roomCode) {
                    throw new https_1.HttpsError('permission-denied', 'Código da sala inválido');
                }
                now = new Date();
                scheduledTime = new Date(room.scheduledFor);
                earliestEntry = new Date(scheduledTime.getTime() - 15 * 60 * 1000);
                latestEntry = new Date(scheduledTime.getTime() + 30 * 60 * 1000);
                if (now < earliestEntry) {
                    throw new https_1.HttpsError('failed-precondition', "S\u00F3 \u00E9 poss\u00EDvel entrar na sala 15 minutos antes do hor\u00E1rio agendado. Hor\u00E1rio: ".concat(scheduledTime.toLocaleString('pt-BR')));
                }
                if (now > latestEntry && room.status === 'scheduled') {
                    throw new https_1.HttpsError('failed-precondition', 'O horário da teleconsulta expirou.');
                }
                if (!(room.status === 'scheduled')) return [3 /*break*/, 3];
                return [4 /*yield*/, roomDoc.ref.update((_b = {
                            status: 'active',
                            activatedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp()
                        },
                        _b[role === 'therapist' ? 'therapistJoinedAt' : 'patientJoinedAt'] = firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                        _b))];
            case 2:
                _c.sent();
                _c.label = 3;
            case 3: return [4 /*yield*/, roomDoc.ref.get()];
            case 4:
                updatedRoom = _c.sent();
                updatedData = updatedRoom.data();
                bothJoined = updatedData.therapistJoinedAt && updatedData.patientJoinedAt;
                if (!bothJoined) return [3 /*break*/, 6];
                return [4 /*yield*/, roomDoc.ref.update({
                        status: 'ready',
                    })];
            case 5:
                _c.sent();
                _c.label = 6;
            case 6:
                logger.info("User ".concat(userId, " joined telemedicine room: ").concat(roomId, " as ").concat(role));
                return [2 /*return*/, {
                        success: true,
                        roomStatus: updatedData.status,
                        bothJoined: bothJoined,
                    }];
        }
    });
}); });
/**
 * Cloud Function: Encerrar sala de telemedicina
 */
exports.endTelemedicineRoom = (0, https_1.onCall)({
    cors: cors_1.CORS_ORIGINS,
    memory: '256MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, roomId, summary, duration, roomDoc, room, userDoc;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                _a = request.data, roomId = _a.roomId, summary = _a.summary, duration = _a.duration;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('telemedicine_rooms')
                        .doc(roomId)
                        .get()];
            case 1:
                roomDoc = _c.sent();
                if (!roomDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Sala não encontrada');
                }
                room = roomDoc.data();
                if (!(room.therapistId !== request.auth.uid)) return [3 /*break*/, 3];
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('users')
                        .doc(request.auth.uid)
                        .get()];
            case 2:
                userDoc = _c.sent();
                if (((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
                    throw new https_1.HttpsError('permission-denied', 'Apenas o terapeuta pode encerrar a sessão');
                }
                _c.label = 3;
            case 3: 
            // Atualizar sala
            return [4 /*yield*/, roomDoc.ref.update({
                    status: 'ended',
                    endedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                    summary: summary || '',
                    duration: duration || null,
                })];
            case 4:
                // Atualizar sala
                _c.sent();
                if (!room.appointmentId) return [3 /*break*/, 6];
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('sessions')
                        .where('appointmentId', '==', room.appointmentId)
                        .limit(1)
                        .get()
                        .then(function (snapshot) {
                        if (!snapshot.empty) {
                            return snapshot.docs[0].ref.update({
                                subjective: summary || '',
                                sessionType: 'telemedicine',
                                duration: duration || null,
                                status: 'completed',
                            });
                        }
                    })];
            case 5:
                _c.sent();
                _c.label = 6;
            case 6:
                logger.info("Telemedicine room ended: ".concat(roomId));
                return [2 /*return*/, {
                        success: true,
                    }];
        }
    });
}); });
/**
 * Cloud Function: Obter histórico de teleconsultas
 */
exports.getTelemedicineHistory = (0, https_1.onCall)({
    cors: cors_1.CORS_ORIGINS,
    memory: '256MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, limit, query, userDoc, role, snapshot, rooms;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                _a = request.data.limit, limit = _a === void 0 ? 20 : _a;
                query = (0, firebase_admin_1.firestore)()
                    .collection('telemedicine_rooms');
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('users')
                        .doc(request.auth.uid)
                        .get()];
            case 1:
                userDoc = _c.sent();
                role = (_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.role;
                if (role === 'paciente') {
                    query = query.where('patientId', '==', request.auth.uid);
                }
                else if (role === 'fisioterapeuta' || role === 'estagiário') {
                    query = query.where('therapistId', '==', request.auth.uid);
                }
                else if (role === 'admin') {
                    // Admin vê todas
                }
                else {
                    throw new https_1.HttpsError('permission-denied', 'Role não autorizado');
                }
                return [4 /*yield*/, query
                        .orderBy('scheduledFor', 'desc')
                        .limit(limit)
                        .get()];
            case 2:
                snapshot = _c.sent();
                return [4 /*yield*/, Promise.all(snapshot.docs.map(function (doc) { return __awaiter(void 0, void 0, void 0, function () {
                        var room, patientDoc, patient;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    room = doc.data();
                                    if (!room) {
                                        return [2 /*return*/, null];
                                    }
                                    return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                                            .collection('patients')
                                            .doc(room.patientId)
                                            .get()];
                                case 1:
                                    patientDoc = _a.sent();
                                    patient = patientDoc.exists ? patientDoc.data() : null;
                                    return [2 /*return*/, __assign(__assign({ id: doc.id }, room), { patientName: (patient === null || patient === void 0 ? void 0 : patient.fullName) || (patient === null || patient === void 0 ? void 0 : patient.name), patientEmail: patient === null || patient === void 0 ? void 0 : patient.email })];
                            }
                        });
                    }); }))];
            case 3:
                rooms = _c.sent();
                return [2 /*return*/, {
                        success: true,
                        rooms: rooms.filter(Boolean),
                    }];
        }
    });
}); });
// ============================================================================================
// HELPER FUNCTIONS
// ============================================================================================
/**
 * Gera código único para a sala
 * Formato: XXX-XXX-XXX (3 grupos de 3 letras/ números)
 */
function generateRoomCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var groups = 3;
    return Array.from({ length: groups }, function () {
        return Array.from({ length: 3 }, function () {
            return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
    }).join('-');
}
/**
 * Verifica se uma sala está ativa
 */
function isRoomActive(roomId) {
    return __awaiter(this, void 0, void 0, function () {
        var roomDoc, room, now, scheduledTime, expiryTime;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('telemedicine_rooms')
                        .doc(roomId)
                        .get()];
                case 1:
                    roomDoc = _a.sent();
                    if (!roomDoc.exists) {
                        return [2 /*return*/, false];
                    }
                    room = roomDoc.data();
                    if (!room) {
                        return [2 /*return*/, false];
                    }
                    now = new Date();
                    scheduledTime = new Date(room.scheduledFor);
                    expiryTime = new Date(scheduledTime.getTime() + 30 * 60 * 1000);
                    return [2 /*return*/, room.status === 'active' || room.status === 'ready' || now < expiryTime];
            }
        });
    });
}
/**
 * Notifica paciente sobre teleconsulta
 */
function notifyPatientTelemedicine(patientId, roomCode, scheduledFor) {
    return __awaiter(this, void 0, void 0, function () {
        var patientDoc, patient;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('patients')
                        .doc(patientId)
                        .get()];
                case 1:
                    patientDoc = _a.sent();
                    if (!patientDoc.exists) {
                        return [2 /*return*/];
                    }
                    patient = patientDoc.data();
                    // Enviar notificação push/email
                    // Implementação depende do sistema de notificações configurado
                    logger.info("Telemedicine notification sent to patient ".concat(patientId));
                    return [2 /*return*/];
            }
        });
    });
}
