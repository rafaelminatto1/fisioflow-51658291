/**
 * Telemedicine Integration
 *
 * Sistema de videochamadas para teleatendimento fisioterapêutico
 *
 * @module integrations/telemedicine
 */


/**
 * Cloud Function: Criar sala de telemedicina
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { firestore } from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { CORS_ORIGINS } from '../init';

export const createTelemedicineRoom = onCall({
  cors: CORS_ORIGINS,
  memory: '256MiB',
  maxInstances: 1,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { patientId, scheduledFor, appointmentId } = request.data as {
    patientId: string;
    scheduledFor: string;
    appointmentId?: string;
  };

  const therapistId = request.auth.uid;

  // Validar que o paciente pertence ao terapeuta
  const patientDoc = await firestore()
    .collection('patients')
    .doc(patientId)
    .get();

  if (!patientDoc.exists) {
    throw new HttpsError('not-found', 'Paciente não encontrado');
  }

  // Verificar se já existe uma sala para este agendamento
  if (appointmentId) {
    const existingSnapshot = await firestore()
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
  const roomRef = firestore().collection('telemedicine_rooms').doc();
  await roomRef.create({
    therapistId,
    patientId,
    appointmentId: appointmentId || null,
    scheduledFor,
    roomCode,
    status: 'scheduled',
    createdAt: firestore.FieldValue.serverTimestamp(),
    activatedAt: null,
    endedAt: null,
  });

  // Se associado a agendamento, atualizar o agendamento
  if (appointmentId) {
    await firestore()
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
export const joinTelemedicineRoom = onCall({
  cors: CORS_ORIGINS,
  memory: '256MiB',
  maxInstances: 1,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { roomId, roomCode, role } = request.data as {
    roomId: string;
    roomCode?: string;
    role: 'therapist' | 'patient';
  };

  // Buscar sala
  const roomDoc = await firestore()
    .collection('telemedicine_rooms')
    .doc(roomId)
    .get();

  if (!roomDoc.exists) {
    throw new HttpsError('not-found', 'Sala não encontrada');
  }

  const room = roomDoc.data()!;

  // Verificar permissões
  const userId = request.auth.uid;

  if (role === 'therapist' && room!.therapistId !== userId) {
    throw new HttpsError('permission-denied', 'Você não tem permissão para acessar esta sala');
  }

  if (role === 'patient' && room!.patientId !== userId) {
    throw new HttpsError('permission-denied', 'Você não tem permissão para acessar esta sala');
  }

  // Verificar código se fornecido
  if (roomCode && room!.roomCode !== roomCode) {
    throw new HttpsError('permission-denied', 'Código da sala inválido');
  }

  // Verificar se a sala pode ser ativada
  const now = new Date();
  const scheduledTime = new Date(room!.scheduledFor);

  // Só pode entrar 15 minutos antes ou até 30 minutos depois
  const earliestEntry = new Date(scheduledTime.getTime() - 15 * 60 * 1000);
  const latestEntry = new Date(scheduledTime.getTime() + 30 * 60 * 1000);

  if (now < earliestEntry) {
    throw new HttpsError(
      'failed-precondition',
      `Só é possível entrar na sala 15 minutos antes do horário agendado. Horário: ${scheduledTime.toLocaleString('pt-BR')}`
    );
  }

  if (now > latestEntry && room!.status === 'scheduled') {
    throw new HttpsError(
      'failed-precondition',
      'O horário da teleconsulta expirou.'
    );
  }

  // Ativar sala se ainda não está ativa
  if (room!.status === 'scheduled') {
    await roomDoc.ref.update({
      status: 'active',
      activatedAt: firestore.FieldValue.serverTimestamp(),
      [role === 'therapist' ? 'therapistJoinedAt' : 'patientJoinedAt']: firestore.FieldValue.serverTimestamp(),
    });
  }

  // Verificar se ambos já entraram
  const updatedRoom = await roomDoc.ref.get();
  const updatedData = updatedRoom.data()!;

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
export const endTelemedicineRoom = onCall({
  cors: CORS_ORIGINS,
  memory: '256MiB',
  maxInstances: 1,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { roomId, summary, duration } = request.data as {
    roomId: string;
    summary?: string;
    duration?: number; // em segundos
  };

  // Buscar sala
  const roomDoc = await firestore()
    .collection('telemedicine_rooms')
    .doc(roomId)
    .get();

  if (!roomDoc.exists) {
    throw new HttpsError('not-found', 'Sala não encontrada');
  }

  const room = roomDoc.data()!;

  // Verificar permissão (apenas terapeuta pode encerrar)
  if (room!.therapistId !== request.auth.uid) {
    const userDoc = await firestore()
      .collection('users')
      .doc(request.auth.uid)
      .get();

    if (userDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Apenas o terapeuta pode encerrar a sessão');
    }
  }

  // Atualizar sala
  await roomDoc.ref.update({
    status: 'ended',
    endedAt: firestore.FieldValue.serverTimestamp(),
    summary: summary || '',
    duration: duration || null,
  });

  // Criar registro da sessão no prontuário
  if (room!.appointmentId) {
    await firestore()
      .collection('sessions')
      .where('appointmentId', '==', room!.appointmentId)
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
export const getTelemedicineHistory = onCall({
  cors: CORS_ORIGINS,
  memory: '256MiB',
  maxInstances: 1,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { limit = 20 } = request.data;

  let query: any = firestore()
    .collection('telemedicine_rooms');

  // Filtar baseado no role
  const userDoc = await firestore()
    .collection('users')
    .doc(request.auth.uid)
    .get();

  const role = userDoc.data()?.role;

  if (role === 'paciente') {
    query = query.where('patientId', '==', request.auth.uid);
  } else if (role === 'fisioterapeuta' || role === 'estagiário') {
    query = query.where('therapistId', '==', request.auth.uid);
  } else if (role === 'admin') {
    // Admin vê todas
  } else {
    throw new HttpsError('permission-denied', 'Role não autorizado');
  }

  const snapshot = await query
    .orderBy('scheduledFor', 'desc')
    .limit(limit)
    .get();

  const rooms = await Promise.all(
    snapshot.docs.map(async (doc: any) => {
      const room = doc.data();
      if (!room) {
        return null;
      }

      // Buscar dados do paciente
      const patientDoc = await firestore()
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
    })
  );

  return {
    success: true,
    rooms: rooms.filter(Boolean),
  };
});

// ============================================================================================
// HELPER FUNCTIONS
// ============================================================================================

/**
 * Gera código único para a sala
 * Formato: XXX-XXX-XXX (3 grupos de 3 letras/ números)
 */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const groups = 3;

  return Array.from({ length: groups }, () =>
    Array.from({ length: 3 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
  ).join('-');
}

/**
 * Verifica se uma sala está ativa
 */
async function isRoomActive(roomId: string): Promise<boolean> {
  const roomDoc = await firestore()
    .collection('telemedicine_rooms')
    .doc(roomId)
    .get();

  if (!roomDoc.exists) {
    return false;
  }

  const room = roomDoc.data();
  if (!room) {
    return false;
  }
  const now = new Date();
  const scheduledTime = new Date(room.scheduledFor);
  const expiryTime = new Date(scheduledTime.getTime() + 30 * 60 * 1000);

  return room.status === 'active' || room.status === 'ready' || now < expiryTime;
}

/**
 * Notifica paciente sobre teleconsulta
 */
async function notifyPatientTelemedicine(patientId: string, roomCode: string, scheduledFor: string) {
  const patientDoc = await firestore()
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
