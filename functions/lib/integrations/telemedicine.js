"use strict";
/**
 * Telemedicine Integration
 *
 * Sistema de videochamadas para teleatendimento fisioterapêutico
 *
 * @module integrations/telemedicine
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTelemedicineHistory = exports.endTelemedicineRoom = exports.joinTelemedicineRoom = exports.createTelemedicineRoom = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_admin_1 = require("firebase-admin");
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Cloud Function: Criar sala de telemedicina
 */
exports.createTelemedicineRoom = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const { patientId, scheduledFor, appointmentId } = request.data;
    const therapistId = request.auth.uid;
    // Validar que o paciente pertence ao terapeuta
    const patientDoc = await (0, firebase_admin_1.firestore)()
        .collection('patients')
        .doc(patientId)
        .get();
    if (!patientDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
    }
    // Verificar se já existe uma sala para este agendamento
    if (appointmentId) {
        const existingSnapshot = await (0, firebase_admin_1.firestore)()
            .collection('telemedicine_rooms')
            .where('appointmentId', '==', appointmentId)
            .limit(1)
            .get();
        if (!existingSnapshot.empty) {
            const existing = existingSnapshot.docs[0].data();
            // Verificar se a sala ainda é válida
            const scheduledTime = new Date(existing.scheduledFor);
            const now = new Date();
            // Sala é válida por 30 minutos após o horário agendado
            const expiryTime = new Date(scheduledTime.getTime() + 30 * 60 * 1000);
            if (now < expiryTime && existing.status === 'active') {
                return {
                    success: true,
                    roomId: existingSnapshot.docs[0].id,
                    roomCode: existing.roomCode,
                    existing: true,
                };
            }
        }
    }
    // Gerar código único para a sala
    const roomCode = generateRoomCode();
    // Criar sala
    const roomRef = (0, firebase_admin_1.firestore)().collection('telemedicine_rooms').doc();
    await roomRef.create({
        therapistId,
        patientId,
        appointmentId: appointmentId || null,
        scheduledFor,
        roomCode,
        status: 'scheduled',
        createdAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        activatedAt: null,
        endedAt: null,
    });
    // Se associado a agendamento, atualizar o agendamento
    if (appointmentId) {
        await (0, firebase_admin_1.firestore)()
            .collection('appointments')
            .doc(appointmentId)
            .update({
            telemedicineRoomId: roomRef.id,
            isTelemedicine: true,
        });
    }
    // Notificar paciente sobre a teleconsulta
    // await sendTelemedicineNotification(patientId, roomCode, scheduledFor);
    logger.info(`Telemedicine room created: ${roomRef.id} for appointment: ${appointmentId}`);
    return {
        success: true,
        roomId: roomRef.id,
        roomCode,
    };
});
/**
 * Cloud Function: Entrar na sala de telemedicina
 */
exports.joinTelemedicineRoom = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const { roomId, roomCode, role } = request.data;
    // Buscar sala
    const roomDoc = await (0, firebase_admin_1.firestore)()
        .collection('telemedicine_rooms')
        .doc(roomId)
        .get();
    if (!roomDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Sala não encontrada');
    }
    const room = roomDoc.data();
    // Verificar permissões
    const userId = request.auth.uid;
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
    // Verificar se a sala pode ser ativada
    const now = new Date();
    const scheduledTime = new Date(room.scheduledFor);
    // Só pode entrar 15 minutos antes ou até 30 minutos depois
    const earliestEntry = new Date(scheduledTime.getTime() - 15 * 60 * 1000);
    const latestEntry = new Date(scheduledTime.getTime() + 30 * 60 * 1000);
    if (now < earliestEntry) {
        throw new https_1.HttpsError('failed-precondition', `Só é possível entrar na sala 15 minutos antes do horário agendado. Horário: ${scheduledTime.toLocaleString('pt-BR')}`);
    }
    if (now > latestEntry && room.status === 'scheduled') {
        throw new https_1.HttpsError('failed-precondition', 'O horário da teleconsulta expirou.');
    }
    // Ativar sala se ainda não está ativa
    if (room.status === 'scheduled') {
        await roomDoc.ref.update({
            status: 'active',
            activatedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
            [role === 'therapist' ? 'therapistJoinedAt' : 'patientJoinedAt']: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        });
    }
    // Verificar se ambos já entraram
    const updatedRoom = await roomDoc.ref.get();
    const updatedData = updatedRoom.data();
    const bothJoined = updatedData.therapistJoinedAt && updatedData.patientJoinedAt;
    if (bothJoined) {
        await roomDoc.ref.update({
            status: 'ready',
        });
    }
    logger.info(`User ${userId} joined telemedicine room: ${roomId} as ${role}`);
    return {
        success: true,
        roomStatus: updatedData.status,
        bothJoined,
    };
});
/**
 * Cloud Function: Encerrar sala de telemedicina
 */
exports.endTelemedicineRoom = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const { roomId, summary, duration } = request.data;
    // Buscar sala
    const roomDoc = await (0, firebase_admin_1.firestore)()
        .collection('telemedicine_rooms')
        .doc(roomId)
        .get();
    if (!roomDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Sala não encontrada');
    }
    const room = roomDoc.data();
    // Verificar permissão (apenas terapeuta pode encerrar)
    if (room.therapistId !== request.auth.uid) {
        const userDoc = await (0, firebase_admin_1.firestore)()
            .collection('users')
            .doc(request.auth.uid)
            .get();
        if (userDoc.data()?.role !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Apenas o terapeuta pode encerrar a sessão');
        }
    }
    // Atualizar sala
    await roomDoc.ref.update({
        status: 'ended',
        endedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        summary: summary || '',
        duration: duration || null,
    });
    // Criar registro da sessão no prontuário
    if (room.appointmentId) {
        await (0, firebase_admin_1.firestore)()
            .collection('sessions')
            .where('appointmentId', '==', room.appointmentId)
            .limit(1)
            .get()
            .then(snapshot => {
            if (!snapshot.empty) {
                return snapshot.docs[0].ref.update({
                    subjective: summary || '',
                    sessionType: 'telemedicine',
                    duration: duration || null,
                    status: 'completed',
                });
            }
        });
    }
    logger.info(`Telemedicine room ended: ${roomId}`);
    return {
        success: true,
    };
});
/**
 * Cloud Function: Obter histórico de teleconsultas
 */
exports.getTelemedicineHistory = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const { limit = 20 } = request.data;
    let query = (0, firebase_admin_1.firestore)()
        .collection('telemedicine_rooms');
    // Filtar baseado no role
    const userDoc = await (0, firebase_admin_1.firestore)()
        .collection('users')
        .doc(request.auth.uid)
        .get();
    const role = userDoc.data()?.role;
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
    const snapshot = await query
        .orderBy('scheduledFor', 'desc')
        .limit(limit)
        .get();
    const rooms = await Promise.all(snapshot.docs.map(async (doc) => {
        const room = doc.data();
        // Buscar dados do paciente
        const patientDoc = await (0, firebase_admin_1.firestore)()
            .collection('patients')
            .doc(room.patientId)
            .get();
        const patient = patientDoc.exists ? patientDoc.data() : null;
        return {
            id: doc.id,
            ...room,
            patientName: patient?.fullName || patient?.name,
            patientEmail: patient?.email,
        };
    }));
    return {
        success: true,
        rooms,
    };
});
// ============================================================================================
// HELPER FUNCTIONS
// ============================================================================================
/**
 * Gera código único para a sala
 * Formato: XXX-XXX-XXX (3 grupos de 3 letras/ números)
 */
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const groups = 3;
    return Array.from({ length: groups }, () => Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')).join('-');
}
/**
 * Verifica se uma sala está ativa
 */
async function isRoomActive(roomId) {
    const roomDoc = await (0, firebase_admin_1.firestore)()
        .collection('telemedicine_rooms')
        .doc(roomId)
        .get();
    if (!roomDoc.exists) {
        return false;
    }
    const room = roomDoc.data();
    const now = new Date();
    const scheduledTime = new Date(room.scheduledFor);
    const expiryTime = new Date(scheduledTime.getTime() + 30 * 60 * 1000);
    return room.status === 'active' || room.status === 'ready' || now < expiryTime;
}
/**
 * Notifica paciente sobre teleconsulta
 */
async function notifyPatientTelemedicine(patientId, roomCode, scheduledFor) {
    const patientDoc = await (0, firebase_admin_1.firestore)()
        .collection('patients')
        .doc(patientId)
        .get();
    if (!patientDoc.exists) {
        return;
    }
    const patient = patientDoc.data();
    // Enviar notificação push/email
    // Implementação depende do sistema de notificações configurado
    logger.info(`Telemedicine notification sent to patient ${patientId}`);
}
//# sourceMappingURL=telemedicine.js.map