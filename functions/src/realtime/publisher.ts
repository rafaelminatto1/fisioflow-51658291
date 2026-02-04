/**
 * Realtime Publisher: Ably
 * Publica eventos em tempo real usando Ably
 */

import * as Ably from 'ably';
import { logger } from '../lib/logger';

// Cliente Ably REST (para publicação do servidor)
let ablyRest: Ably.Rest | null = null;

function getAblyRest(): Ably.Rest {
  if (!ablyRest) {
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      throw new Error('ABLY_API_KEY não está configurada');
    }
    ablyRest = new Ably.Rest(apiKey);
  }
  return ablyRest;
}

/**
 * Mensagem de evento de agendamento
 */
export interface AppointmentMessage {
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
}

/**
 * Mensagem de evento de paciente
 */
export interface PatientMessage {
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
}

/**
 * Publica evento de agendamento no Ably
 *
 * @param organizationId - ID da organização
 * @param message - Mensagem do evento
 */
export async function publishAppointmentEvent(
  organizationId: string,
  message: AppointmentMessage
): Promise<void> {
  const ably = getAblyRest();
  const channel = ably.channels.get(`appointments:${organizationId}`);

  await channel.publish('update', message);
}

/**
 * Publica evento de paciente no Ably
 *
 * @param organizationId - ID da organização
 * @param message - Mensagem do evento
 */
export async function publishPatientEvent(
  organizationId: string,
  message: PatientMessage
): Promise<void> {
  const ably = getAblyRest();
  const channel = ably.channels.get(`patients:${organizationId}`);

  await channel.publish('update', message);
}

/**
 * Publica atualização de paciente específico
 *
 * @param patientId - ID do paciente
 * @param message - Mensagem do evento
 */
export async function publishPatientUpdate(
  patientId: string,
  message: Record<string, unknown>
): Promise<void> {
  const ably = getAblyRest();
  const channel = ably.channels.get(`patient:${patientId}`);

  await channel.publish('update', message);
}

/**
 * Publica notificação para usuário
 *
 * @param userId - ID do usuário Firebase
 * @param notification - Dados da notificação
 */
export async function publishNotification(
  userId: string,
  notification: {
    title: string;
    body: string;
    type?: string;
    link?: string;
    data?: Record<string, unknown>;
  }
): Promise<void> {
  const ably = getAblyRest();
  const channel = ably.channels.get(`user:${userId}`);

  await channel.publish('notification', notification);
}

/**
 * Publica atualização de presença
 *
 * @param organizationId - ID da organização
 * @param presence - Dados de presença
 */
export async function publishPresence(
  organizationId: string,
  presence: {
    userId: string;
    userName: string;
    status: 'online' | 'offline' | 'away';
  }
): Promise<void> {
  const ably = getAblyRest();
  const channel = ably.channels.get(`presence:${organizationId}`);

  await channel.publish('presence', presence);
}

import { onRequest } from 'firebase-functions/v2/https';

export const realtimePublishHandler = async (req: any, res: any) => {
  // Verificar autenticação (opcional - pode usar Firebase Auth)
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const { channel, event, data } = req.body || {};

    if (!channel || !event || data === undefined) {
      res.status(400).json({ error: 'channel, event e data são obrigatórios' });
      return;
    }

    const ably = getAblyRest();
    const ablyChannel = ably.channels.get(channel);

    await ablyChannel.publish(event, data);

    res.json({ success: true });
  } catch (error: unknown) {
    logger.error('Erro ao publicar no Ably:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
};

/**
 * HTTP endpoint para publicar mensagens (útil para testes e webhooks)
 */
export const realtimePublish = onRequest(realtimePublishHandler);

/**
 * Configuração de canais Ably para o FisioFlow
 */
export const ABLY_CHANNELS = {
  /** Atualizações de agendamentos da organização */
  appointments: (orgId: string) => `appointments:${orgId}`,

  /** Atualizações de pacientes da organização */
  patients: (orgId: string) => `patients:${orgId}`,

  /** Atualizações de um paciente específico */
  patient: (patientId: string) => `patient:${patientId}`,

  /** Presença de usuários da organização */
  presence: (orgId: string) => `presence:${orgId}`,

  /** Notificações de um usuário */
  user: (userId: string) => `user:${userId}`,

  /** Estatísticas da organização (atualizadas em tempo real) */
  stats: (orgId: string) => `stats:${orgId}`,

  /** Fila de espera da organização */
  waitingQueue: (orgId: string) => `waiting-queue:${orgId}`,
};

/**
 * Eventos publicados no Ably
 */
export const ABLY_EVENTS = {
  /** Atualização de registro (INSERT, UPDATE, DELETE) */
  update: 'update',

  /** Nova entrada */
  insert: 'insert',

  /** Remoção */
  delete: 'delete',

  /** Notificação */
  notification: 'notification',

  /** Atualização de presença */
  presence: 'presence',

  /** Status alterado */
  statusChanged: 'status-changed',

  /** Nova mensagem */
  newMessage: 'new-message',
};

/**
 * Inicializa o Ably Realtime para conexões bidirecionais
 * (usado no frontend, não no backend)
 */
export function createAblyRealtimeClient(apiKey: string) {
  return new Ably.Realtime(apiKey);
}

/**
 * Conecta aos canais relevantes para uma organização
 *
 * @param client - Cliente Ably Realtime
 * @param organizationId - ID da organização
 * @param callbacks - Callbacks para cada tipo de evento
 */
export function subscribeToOrganizationChannels(
  client: Ably.Realtime,
  organizationId: string,
  callbacks: {
    onAppointmentUpdate?: (message: AppointmentMessage) => void;
    onPatientUpdate?: (message: PatientMessage) => void;
    onNotification?: (notification: unknown) => void;
    onPresence?: (presence: unknown) => void;
  }
): () => void {
  const unsubscribers: (() => void)[] = [];

  // Agendamentos
  if (callbacks.onAppointmentUpdate) {
    const appointmentsChannel = client.channels.get(ABLY_CHANNELS.appointments(organizationId));
    appointmentsChannel.subscribe(ABLY_EVENTS.update, (message) => {
      callbacks.onAppointmentUpdate?.(message.data as AppointmentMessage);
    });
    unsubscribers.push(() => appointmentsChannel.unsubscribe());
  }

  // Pacientes
  if (callbacks.onPatientUpdate) {
    const patientsChannel = client.channels.get(ABLY_CHANNELS.patients(organizationId));
    patientsChannel.subscribe(ABLY_EVENTS.update, (message) => {
      callbacks.onPatientUpdate?.(message.data as PatientMessage);
    });
    unsubscribers.push(() => patientsChannel.unsubscribe());
  }

  // Notificações
  if (callbacks.onNotification) {
    const userChannel = client.channels.get(ABLY_CHANNELS.user(client.auth.clientId || ''));
    userChannel.subscribe(ABLY_EVENTS.notification, (message) => {
      callbacks.onNotification?.(message.data);
    });
    unsubscribers.push(() => userChannel.unsubscribe());
  }

  // Presença
  if (callbacks.onPresence) {
    const presenceChannel = client.channels.get(ABLY_CHANNELS.presence(organizationId));
    presenceChannel.subscribe(ABLY_EVENTS.presence, (message) => {
      callbacks.onPresence?.(message.data);
    });
    unsubscribers.push(() => presenceChannel.unsubscribe());
  }

  // Retorna função para limpar todas as inscrições
  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}
