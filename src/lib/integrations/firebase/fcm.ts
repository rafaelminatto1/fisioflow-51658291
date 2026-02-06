/**
 * Firebase Cloud Messaging (FCM) Service
 * Gerencia envio de notificações push para dispositivos móveis
 */

import admin from 'firebase-admin';
import { httpsCallable, HttpsError } from 'firebase-functions';
import { db } from '@/integrations/firebase/app';
import { UnknownError, getErrorMessage } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface DeviceToken {
  token: string;
  userId: string;
  tenantId?: string;
  deviceInfo?: {
    platform: 'ios' | 'android' | 'web';
    model?: string;
    osVersion?: string;
    appVersion?: string;
  };
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  sound?: string;
  badge?: number;
  channelId?: string;
}

export interface PushNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  invalidToken?: boolean;
}

export interface TopicSubscriptionResult {
  successCount: number;
  failureCount: number;
  errors: string[];
}

// ============================================================================
// Notification Templates
// ============================================================================

export const NotificationTemplates = {
  // Lembrete de sessão
  SESSION_REMINDER: (
    patientName: string,
    therapistName: string,
    dateTime: string
  ): PushNotification => ({
    title: '📅 Lembrete de Sessão',
    body: `Olá ${patientName}! Lembre-se da sua sessão com ${therapistName} às ${dateTime}`,
    data: { type: 'session_reminder' },
  }),

  // Confirmação de sessão
  SESSION_CONFIRMED: (
    therapistName: string,
    dateTime: string
  ): PushNotification => ({
    title: '✅ Sessão Confirmada',
    body: `Sua sessão com ${therapistName} está confirmada para ${dateTime}`,
    data: { type: 'session_confirmed' },
  }),

  // Cancelamento de sessão
  SESSION_CANCELLED: (
    therapistName: string,
    dateTime: string
  ): PushNotification => ({
    title: '❌ Sessão Cancelada',
    body: `Sua sessão com ${therapistName} em ${dateTime} foi cancelada`,
    data: { type: 'session_cancelled' },
  }),

  // Reagendamento de sessão
  SESSION_RESCHEDULED: (
    oldDateTime: string,
    newDateTime: string
  ): PushNotification => ({
    title: '🔄 Sessão Reagendada',
    body: `Sua sessão foi remarcada de ${oldDateTime} para ${newDateTime}`,
    data: { type: 'session_rescheduled' },
  }),

  // Documento pronto
  DOCUMENT_READY: (documentType: string, patientName: string): PushNotification => ({
    title: '📄 Documento Disponível',
    body: `Novo ${documentType} disponível para ${patientName}`,
    data: { type: 'document_ready' },
  }),

  // Pagamento confirmado
  PAYMENT_CONFIRMED: (amount: string, reference: string): PushNotification => ({
    title: '💰 Pagamento Confirmado',
    body: `Pagamento de ${amount} confirmado (Ref: ${reference})`,
    data: { type: 'payment_confirmed' },
  }),

  // Retorno lembrete
  RETURN_REMINDER: (daysSinceLastVisit: number, clinicPhone: string): PushNotification => ({
    title: '👋 Estamos com Saudades!',
    body: `Já faz ${daysSinceLastVisit} dias desde sua última visita. Que agendar uma sessão? ${clinicPhone}`,
    data: { type: 'return_reminder' },
  }),

  // Avaliação
  RATE_APPOINTMENT: (patientName: string, therapistName: string): PushNotification => ({
    title: '⭐ Como foi seu atendimento?',
    body: `Avalie sua sessão com ${therapistName} e nos ajude a melhorar!`,
    data: { type: 'rate_appointment', patientName, therapistName },
  }),

  // Promoção
  PROMOTION: (title: string, message: string): PushNotification => ({
    title: `🎁 ${title}`,
    body: message,
    data: { type: 'promotion' },
  }),

  // Mensagem do terapeuta
  THERAPIST_MESSAGE: (therapistName: string, preview: string): PushNotification => ({
    title: `💬 ${therapistName}`,
    body: preview,
    data: { type: 'therapist_message' },
  }),

  // Evolução do paciente
  PROGRESS_UPDATE: (patientName: string, summary: string): PushNotification => ({
    title: '📈 Evolução Registrada',
    body: `${patientName}: ${summary}`,
    data: { type: 'progress_update' },
  }),
};

// ============================================================================
// FCM Service Class
// ============================================================================

export class FCMService {
  private messaging: admin.messaging.Messaging;

  constructor() {
    // Firebase Admin já deve estar inicializado
    if (!admin.apps.length) {
      throw new Error('Firebase Admin não está inicializado');
    }
    this.messaging = admin.messaging();
  }

  // ========================================================================
  // Single Device Notifications
  // ========================================================================

  /**
   * Envia notificação para um dispositivo específico
   */
  async sendToDevice(
    token: string,
    notification: PushNotification
  ): Promise<PushNotificationResult> {
    const message: admin.messaging.Message = {
      token,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      data: notification.data,
      android: notification.channelId
        ? {
            notification: {
              channelId: notification.channelId,
              sound: notification.sound || 'default',
              notificationCount: notification.badge,
            },
          }
        : undefined,
      apns: notification.sound
        ? {
            payload: {
              aps: {
                sound: notification.sound || 'default',
                badge: notification.badge,
              },
            },
          }
        : undefined,
    };

    try {
      const messageId = await this.messaging.send(message);
      return {
        success: true,
        messageId,
      };
    } catch (error: UnknownError) {
      const errorMessage = getErrorMessage(error);

      // Verificar se token é inválido
      if (
        errorMessage.includes('registration-token-not-registered') ||
        errorMessage.includes('invalid-registration-token')
      ) {
        return {
          success: false,
          error: errorMessage,
          invalidToken: true,
        };
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Envia notificação para múltiplos dispositivos
   */
  async sendToMultipleDevices(
    tokens: string[],
    notification: PushNotification
  ): Promise<{
    successCount: number;
    failureCount: number;
    results: PushNotificationResult[];
    invalidTokens: string[];
  }> {
    if (tokens.length === 0) {
      return {
        successCount: 0,
        failureCount: 0,
        results: [],
        invalidTokens: [],
      };
    }

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      data: notification.data,
    };

    try {
      const response = await this.messaging.sendMulticast(message);
      const results: PushNotificationResult[] = [];
      const invalidTokens: string[] = [];

      response.responses.forEach((resp, index) => {
        if (resp.success) {
          results.push({
            success: true,
            messageId: resp.messageId,
          });
        } else {
          const error = resp.error;
          const errorMessage = error?.message || 'Erro desconhecido';

          results.push({
            success: false,
            error: errorMessage,
            invalidToken:
              errorMessage.includes('registration-token-not-registered') ||
              errorMessage.includes('invalid-registration-token'),
          });

          if (
            errorMessage.includes('registration-token-not-registered') ||
            errorMessage.includes('invalid-registration-token')
          ) {
            invalidTokens.push(tokens[index]);
          }
        }
      });

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        results,
        invalidTokens,
      };
    } catch (error: UnknownError) {
      console.error('Erro ao enviar multicast:', error);
      return {
        successCount: 0,
        failureCount: tokens.length,
        results: tokens.map(() => ({
          success: false,
          error: getErrorMessage(error) || 'Erro ao enviar notificações',
        })),
        invalidTokens: [],
      };
    }
  }

  // ========================================================================
  // Topic-based Notifications
  // ========================================================================

  /**
   * Envia notificação para um tópico
   */
  async sendToTopic(
    topic: string,
    notification: PushNotification
  ): Promise<PushNotificationResult> {
    const message: admin.messaging.Message = {
      topic,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      data: notification.data,
    };

    try {
      const messageId = await this.messaging.send(message);
      return {
        success: true,
        messageId,
      };
    } catch (error: UnknownError) {
      return {
        success: false,
        error: getErrorMessage(error) || 'Erro ao enviar para tópico',
      };
    }
  }

  /**
   * Inscreve tokens em um tópico
   */
  async subscribeToTopic(
    tokens: string[],
    topic: string
  ): Promise<TopicSubscriptionResult> {
    try {
      const response = await this.messaging.subscribeToTopic(tokens, topic);
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: [],
      };
    } catch (error: UnknownError) {
      return {
        successCount: 0,
        failureCount: tokens.length,
        errors: [getErrorMessage(error) || 'Erro ao inscrever ao tópico'],
      };
    }
  }

  /**
   * Remove inscrição de tokens de um tópico
   */
  async unsubscribeFromTopic(
    tokens: string[],
    topic: string
  ): Promise<TopicSubscriptionResult> {
    try {
      const response = await this.messaging.unsubscribeFromTopic(tokens, topic);
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: [],
      };
    } catch (error: UnknownError) {
      return {
        successCount: 0,
        failureCount: tokens.length,
        errors: [getErrorMessage(error) || 'Erro ao remover inscrição do tópico'],
      };
    }
  }

  // ========================================================================
  // Token Management
  // ========================================================================

  /**
   * Salva token de dispositivo no Firestore
   */
  async saveDeviceToken(tokenData: Omit<DeviceToken, 'createdAt' | 'updatedAt'>): Promise<void> {
    const { token, userId, tenantId, deviceInfo, active } = tokenData;

    // Verificar se token já existe
    const snapshot = await db
      .collection('fcm_tokens')
      .where('token', '==', token)
      .limit(1)
      .get();

    const now = new Date();

    if (snapshot.empty) {
      // Criar novo registro
      await db.collection('fcm_tokens').add({
        token,
        userId,
        tenantId,
        deviceInfo,
        active: active ?? true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    } else {
      // Atualizar registro existente
      const doc = snapshot.docs[0];
      await doc.ref.update({
        active: active ?? true,
        deviceInfo: deviceInfo || null,
        updatedAt: now.toISOString(),
      });
    }
  }

  /**
   * Remove token de dispositivo (desativa)
   */
  async removeDeviceToken(token: string): Promise<void> {
    const snapshot = await db
      .collection('fcm_tokens')
      .where('token', '==', token)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        active: false,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Busca tokens ativos de um usuário
   */
  async getUserTokens(userId: string): Promise<string[]> {
    const snapshot = await db
      .collection('fcm_tokens')
      .where('userId', '==', userId)
      .where('active', '==', true)
      .get();

    return snapshot.docs.map((doc) => doc.data().token);
  }

  /**
   * Busca tokens ativos de um tenant
   */
  async getTenantTokens(tenantId: string): Promise<string[]> {
    const snapshot = await db
      .collection('fcm_tokens')
      .where('tenantId', '==', tenantId)
      .where('active', '==', true)
      .get();

    return snapshot.docs.map((doc) => doc.data().token);
  }

  // ========================================================================
  // User Notifications
  // ========================================================================

  /**
   * Envia notificação para um usuário
   */
  async notifyUser(
    userId: string,
    notification: PushNotification
  ): Promise<PushNotificationResult[]> {
    const tokens = await this.getUserTokens(userId);

    if (tokens.length === 0) {
      return [
        {
          success: false,
          error: 'Usuário não possui tokens ativos',
        },
      ];
    }

    const result = await this.sendToMultipleDevices(tokens, notification);

    // Remover tokens inválidos
    if (result.invalidTokens.length > 0) {
      for (const token of result.invalidTokens) {
        await this.removeDeviceToken(token);
      }
    }

    return result.results;
  }

  /**
   * Envia notificação para múltiplos usuários
   */
  async notifyUsers(
    userIds: string[],
    notification: PushNotification
  ): Promise<PushNotificationResult[]> {
    const tokens: string[] = [];

    for (const userId of userIds) {
      const userTokens = await this.getUserTokens(userId);
      tokens.push(...userTokens);
    }

    if (tokens.length === 0) {
      return [
        {
          success: false,
          error: 'Nenhum token ativo encontrado',
        },
      ];
    }

    const result = await this.sendToMultipleDevices(tokens, notification);

    // Remover tokens inválidos
    if (result.invalidTokens.length > 0) {
      for (const token of result.invalidTokens) {
        await this.removeDeviceToken(token);
      }
    }

    return result.results;
  }

  // ========================================================================
  // Topic Helpers
  // ========================================================================

  /**
   * Inscreve usuário em tópicos baseados em tenant
   */
  async subscribeUserToTenantTopics(userId: string, tenantId: string): Promise<void> {
    const tokens = await this.getUserTokens(userId);

    if (tokens.length > 0) {
      // Inscrever em tópico geral do tenant
      await this.subscribeToTopic(tokens, `tenant_${tenantId}`);

      // Inscrever em tópico de notificações do tenant
      await this.subscribeToTopic(tokens, `tenant_${tenantId}_notifications`);
    }
  }

  /**
   * Notifica todos os usuários de um tenant
   */
  async notifyTenant(
    tenantId: string,
    notification: PushNotification
  ): Promise<PushNotificationResult> {
    return this.sendToTopic(`tenant_${tenantId}_notifications`, notification);
  }

  /**
   * Notifica todos os terapeutas
   */
  async notifyTherapists(notification: PushNotification): Promise<PushNotificationResult> {
    return this.sendToTopic('therapists', notification);
  }

  /**
   * Notifica todos os pacientes de um tenant
   */
  async notifyPatients(
    tenantId: string,
    notification: PushNotification
  ): Promise<PushNotificationResult> {
    return this.sendToTopic(`tenant_${tenantId}_patients`, notification);
  }
}

// ============================================================================
// Singleton
// ============================================================================

let fcmServiceInstance: FCMService | null = null;

export function getFCMService(): FCMService {
  if (!fcmServiceInstance) {
    fcmServiceInstance = new FCMService();
  }
  return fcmServiceInstance;
}

// ============================================================================
// Default export
// ============================================================================

export default FCMService;
