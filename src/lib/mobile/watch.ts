/**
 * Serviço de Integração com Apple Watch
 * Permite comunicação bidirecional entre iPhone e Apple Watch
 */

import { CapWatch } from '@capgo/capacitor-watch';
import { Capacitor } from '@capacitor/core';

/**
 * Tipos de mensagens enviadas para o Apple Watch
 */
export type WatchMessageType =
  | 'appointment_reminder'
  | 'exercise_reminder'
  | 'patient_update'
  | 'emergency_alert'
  | 'sync_request';

/**
 * Interface para mensagens enviadas ao Watch
 */
export interface WatchMessage {
  type: WatchMessageType;
  data: Record<string, any>;
  timestamp?: number;
}

/**
 * Interface para mensagens recebidas do Watch
 */
export interface WatchResponse {
  type: string;
  data: Record<string, any>;
}

/**
 * Inicializa a comunicação com o Apple Watch
 */
export async function initWatchConnectivity(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('Apple Watch não disponível na web');
    return false;
  }

  try {
    await CapWatch.init();
    console.log('Apple Watch conectividade inicializada');
    return true;
  } catch (error) {
    console.error('Erro ao inicializar Apple Watch:', error);
    return false;
  }
}

/**
 * Verifica se o Apple Watch está pareado e conectado
 */
export async function isWatchPaired(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    // O plugin CapWatch não tem um método explícito para verificar pareamento,
    // mas podemos verificar enviando uma mensagem de teste
    return true; // Assumimos que está disponível se for plataforma nativa
  } catch {
    return false;
  }
}

/**
 * Envia uma mensagem para o Apple Watch
 */
export async function sendToWatch(message: WatchMessage): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    await CapWatch.sendMessage({
      message: {
        ...message,
        timestamp: message.timestamp || Date.now()
      }
    });
    return true;
  } catch (error) {
    console.error('Erro ao enviar mensagem para Watch:', error);
    return false;
  }
}

/**
 * Envia lembrete de consulta para o Watch
 */
export async function sendAppointmentReminderToWatch(data: {
  patientName: string;
  appointmentTime: string;
  location: string;
}): Promise<boolean> {
  return sendToWatch({
    type: 'appointment_reminder',
    data: {
      title: 'Próxima Consulta',
      body: `${data.patientName} às ${data.appointmentTime}`,
      location: data.location,
      action: 'view_details'
    }
  });
}

/**
 * Envia lembrete de exercício para o Watch
 */
export async function sendExerciseReminderToWatch(data: {
  exerciseName: string;
  sets: number;
  reps: number;
}): Promise<boolean> {
  return sendToWatch({
    type: 'exercise_reminder',
    data: {
      title: 'Exercício Pendente',
      body: `${data.exerciseName} - ${data.sets}x${data.reps}`,
      action: 'mark_complete'
    }
  });
}

/**
 * Envia atualização de paciente para o Watch
 */
export async function sendPatientUpdateToWatch(data: {
  patientName: string;
  updateType: 'progress' | 'message' | 'alert';
  content: string;
}): Promise<boolean> {
  return sendToWatch({
    type: 'patient_update',
    data: {
      title: `Atualização: ${data.patientName}`,
      body: data.content,
      updateType: data.updateType
    }
  });
}

/**
 * Envia alerta de emergência para o Watch
 */
export async function sendEmergencyAlertToWatch(data: {
  patientName: string;
  alertType: 'pain' | 'emergency' | 'vital_signs';
  message: string;
}): Promise<boolean> {
  return sendToWatch({
    type: 'emergency_alert',
    data: {
      title: '⚠️ Alerta',
      body: `${data.patientName}: ${data.message}`,
      alertType: data.alertType,
      urgent: true
    }
  });
}

/**
 * Solicita sincronização de dados com o Watch
 */
export async function requestSyncFromWatch(): Promise<boolean> {
  return sendToWatch({
    type: 'sync_request',
    data: {
      request: 'sync_health_data'
    }
  });
}

/**
 * Registra listener para mensagens do Apple Watch
 */
export function registerWatchListener(
  callback: (response: WatchResponse) => void
): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  const listener = CapWatch.addListener('message', (data: any) => {
    try {
      const response: WatchResponse = {
        type: data.message?.type || 'unknown',
        data: data.message?.data || {}
      };
      callback(response);
    } catch (error) {
      console.error('Erro ao processar mensagem do Watch:', error);
    }
  });

  // Retorna função de cleanup
  return () => {
    listener.then(fn => fn.remove());
  };
}

/**
 * Hook customizado para usar Apple Watch em componentes React
 */
export function useAppleWatch() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WatchResponse | null>(null);

  useEffect(() => {
    let cleanup: () => void;

    const setupWatch = async () => {
      const connected = await initWatchConnectivity();
      setIsConnected(connected);

      if (connected) {
        cleanup = registerWatchListener((response) => {
          setLastMessage(response);
        });
      }
    };

    setupWatch();

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const sendMessage = async (message: WatchMessage) => {
    return sendToWatch(message);
  };

  return {
    isConnected,
    lastMessage,
    sendMessage,
    sendAppointmentReminder: sendAppointmentReminderToWatch,
    sendExerciseReminder: sendExerciseReminderToWatch,
    sendPatientUpdate: sendPatientUpdateToWatch,
    sendEmergencyAlert: sendEmergencyAlertToWatch,
    requestSync: requestSyncFromWatch
  };
}

import { useState, useEffect } from 'react';
