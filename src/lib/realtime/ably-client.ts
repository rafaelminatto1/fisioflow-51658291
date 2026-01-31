/**
 * Ably Realtime Client (Frontend)
 * Cliente para conexão em tempo real com Ably
 */

import * as Ably from 'ably';
import { fisioLogger as logger } from '@/lib/errors/logger';

/**
 * Configuração do Ably
 */
const ABLY_API_KEY = import.meta.env.VITE_ABLY_API_KEY;

if (!ABLY_API_KEY) {
  logger.warn('VITE_ABLY_API_KEY não configurada. Realtime não funcionará.', undefined, 'ably-client');
}

/**
 * Tipo de mensagem de evento
 */
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * Mensagem de atualização em tempo real
 */
export interface RealtimeMessage<T = unknown> {
  event: RealtimeEventType;
  new: T | null;
  old: T | null;
}

/**
 * Mensagem de notificação
 */
export interface NotificationMessage {
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  data?: Record<string, unknown>;
}

/**
 * Dados de presença de usuário
 */
export interface PresenceData {
  userId: string;
  userName: string;
  userAvatar?: string;
  role: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: Date;
}

/**
 * Cliente Ably singleton
 */
let ablyClient: Ably.Realtime | null = null;
const connectionPromise: Promise<Ably.Realtime> | null = null;

/**
 * Obtém ou cria o cliente Ably Realtime
 */
export function getAblyClient(): Ably.Realtime {
  if (!ablyClient) {
    if (!ABLY_API_KEY) {
      throw new Error('ABLY_API_KEY não configurada');
    }

    ablyClient = new Ably.Realtime(ABLY_API_KEY, {
      // Usar clientId baseado no token (será configurado após auth)
      clientId: undefined,
      // Reconexão automática
      recover: function (ctx, cb) {
        // Callback de recuperação após desconexão
        cb(true);
      },
      // Echo messages (para testes)
      echoMessages: false,
      // Tempo limite de conexão
      disconnectedTimeout: 30000,
      // Tempo limite de suspensão
      suspendedTimeout: 60000,
    });

    // Logs de conexão (remover em produção)
    ablyClient.connection.on('connected', () => {
      logger.info('[Ably] Conectado', undefined, 'ably-client');
    });

    ablyClient.connection.on('disconnected', () => {
      logger.info('[Ably] Desconectado temporariamente', undefined, 'ably-client');
    });

    ablyClient.connection.on('suspended', () => {
      logger.warn('[Ably] Conexão suspensa', undefined, 'ably-client');
    });

    ablyClient.connection.on('failed', (err) => {
      logger.error('[Ably] Falha na conexão', err, 'ably-client');
    });
  }

  return ablyClient;
}

/**
 * Configura o clientId do Ably após autenticação
 */
export function setAblyClientId(userId: string): void {
  const client = getAblyClient();
  client.auth.clientId = userId;
}

/**
 * Canais Ably para FisioFlow
 */
export const ABLY_CHANNELS = {
  /** Atualizações de agendamentos */
  appointments: (orgId: string) => `appointments:${orgId}`,

  /** Atualizações de pacientes */
  patients: (orgId: string) => `patients:${orgId}`,

  /** Atualizações de paciente específico */
  patient: (patientId: string) => `patient:${patientId}`,

  /** Presença de usuários */
  presence: (orgId: string) => `presence:${orgId}`,

  /** Notificações do usuário */
  notifications: (userId: string) => `user:${userId}`,

  /** Estatísticas da organização */
  stats: (orgId: string) => `stats:${orgId}`,
};

/**
 * Gerenciador de inscrições Ably
 */
export class AblySubscriptionManager {
  private channels: Map<string, Ably.RealtimeChannel> = new Map();
  private unsubscribers: Map<string, () => void> = new Map();

  constructor(private client: Ably.Realtime) {}

  /**
   * Inscreve em atualizações de agendamentos
   */
  subscribeToAppointments(
    organizationId: string,
    callback: (message: RealtimeMessage) => void
  ): () => void {
    const channelName = ABLY_CHANNELS.appointments(organizationId);
    const channel = this.getOrCreateChannel(channelName);

    channel.subscribe('update', (message) => {
      callback(message.data as RealtimeMessage);
    });

    const unsubscribe = () => {
      channel.unsubscribe('update');
      this.channels.delete(channelName);
    };

    this.unsubscribers.set(`appointments:${organizationId}`, unsubscribe);
    return unsubscribe;
  }

  /**
   * Inscreve em atualizações de pacientes
   */
  subscribeToPatients(
    organizationId: string,
    callback: (message: RealtimeMessage) => void
  ): () => void {
    const channelName = ABLY_CHANNELS.patients(organizationId);
    const channel = this.getOrCreateChannel(channelName);

    channel.subscribe('update', (message) => {
      callback(message.data as RealtimeMessage);
    });

    const unsubscribe = () => {
      channel.unsubscribe('update');
      this.channels.delete(channelName);
    };

    this.unsubscribers.set(`patients:${organizationId}`, unsubscribe);
    return unsubscribe;
  }

  /**
   * Inscreve em atualizações de um paciente específico
   */
  subscribeToPatient(
    patientId: string,
    callback: (message: RealtimeMessage) => void
  ): () => void {
    const channelName = ABLY_CHANNELS.patient(patientId);
    const channel = this.getOrCreateChannel(channelName);

    channel.subscribe('update', (message) => {
      callback(message.data as RealtimeMessage);
    });

    const unsubscribe = () => {
      channel.unsubscribe('update');
      this.channels.delete(channelName);
    };

    this.unsubscribers.set(`patient:${patientId}`, unsubscribe);
    return unsubscribe;
  }

  /**
   * Inscreve em notificações do usuário
   */
  subscribeToNotifications(
    userId: string,
    callback: (notification: NotificationMessage) => void
  ): () => void {
    const channelName = ABLY_CHANNELS.notifications(userId);
    const channel = this.getOrCreateChannel(channelName);

    channel.subscribe('notification', (message) => {
      callback(message.data as NotificationMessage);
    });

    const unsubscribe = () => {
      channel.unsubscribe('notification');
      this.channels.delete(channelName);
    };

    this.unsubscribers.set(`notifications:${userId}`, unsubscribe);
    return unsubscribe;
  }

  /**
   * Inscreve em presença de usuários da organização
   */
  subscribeToPresence(
    organizationId: string,
    callback: (presence: Map<string, PresenceData>) => void
  ): () => void {
    const channelName = ABLY_CHANNELS.presence(organizationId);
    const channel = this.getOrCreateChannel(channelName);

    const presenceMap = new Map<string, PresenceData>();

    // Quando um usuário entra
    channel.presence.subscribe('enter', (message) => {
      const data = message.data as PresenceData;
      presenceMap.set(message.clientId, data);
      callback(new Map(presenceMap));
    });

    // Quando um usuário atualiza presença
    channel.presence.subscribe('update', (message) => {
      const data = message.data as PresenceData;
      presenceMap.set(message.clientId, data);
      callback(new Map(presenceMap));
    });

    // Quando um usuário sai
    channel.presence.subscribe('leave', (message) => {
      presenceMap.delete(message.clientId);
      callback(new Map(presenceMap));
    });

    // Entrar no canal de presença
    channel.presence.enter();

    const unsubscribe = () => {
      channel.presence.leave();
      this.channels.delete(channelName);
    };

    this.unsubscribers.set(`presence:${organizationId}`, unsubscribe);
    return unsubscribe;
  }

  /**
   * Obtém ou cria um canal e armazena no cache
   */
  private getOrCreateChannel(name: string): Ably.RealtimeChannel {
    if (!this.channels.has(name)) {
      const channel = this.client.channels.get(name);
      this.channels.set(name, channel);
    }
    return this.channels.get(name)!;
  }

  /**
   * Remove todas as inscrições
   */
  unsubscribeAll(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers.clear();
    this.channels.forEach((channel) => {
      channel.unsubscribe();
    });
    this.channels.clear();
  }

  /**
   * Desconecta o cliente Ably
   */
  disconnect(): void {
    this.unsubscribeAll();
    this.client.close();
  }
}

/**
 * Hook React para usar o Ably
 */
export function useAbly(): {
  client: Ably.Realtime;
  manager: AblySubscriptionManager;
  isConnected: boolean;
} {
  const client = getAblyClient();
  const manager = new AblySubscriptionManager(client);

  return {
    client,
    manager,
    isConnected: client.connection.state === 'connected',
  };
}

/**
 * Exporta o cliente padrão
 */
export default getAblyClient;
