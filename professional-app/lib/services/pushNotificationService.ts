/**
 * Push Notification Service - Envio Real via Expo Push API
 * 
 * Integra com Expo Push API para enviar notificações push reais
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { authApi } from '@/lib/auth-api';
import { config } from '@/lib/config';
import { fisioLogger } from '@/lib/errors/logger';

// ============================================
// TYPES
// ============================================

export interface PushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | 'default_critical' | null;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
  expiration?: number;
  badge?: number;
  channelId?: string;
}

export interface PushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: any;
}

export interface PushReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: any;
}

// ============================================
// PUSH NOTIFICATION SERVICE
// ============================================

class PushNotificationService {
  private static instance: PushNotificationService;
  private expoPushUrl = 'https://exp.host/--/api/v2/push/send';
  private expoReceiptUrl = 'https://exp.host/--/api/v2/push/getReceipts';

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Send push notification via Expo Push API
   */
  async sendPushNotification(message: PushMessage): Promise<PushTicket[]> {
    try {
      const messages = Array.isArray(message.to) ? message.to : [message.to];
      
      const pushMessages = messages.map(token => ({
        to: token,
        title: message.title,
        body: message.body,
        data: message.data || {},
        sound: message.sound || 'default',
        priority: message.priority || 'high',
        ttl: message.ttl || 3600,
        badge: message.badge,
        channelId: message.channelId || 'default',
      }));

      const response = await fetch(this.expoPushUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(pushMessages),
      });

      if (!response.ok) {
        throw new Error(`Expo Push API error: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      fisioLogger.error('Failed to send push notification', error, 'PushNotificationService');
      throw error;
    }
  }

  /**
   * Check receipt status of sent notifications
   */
  async checkReceipts(ticketIds: string[]): Promise<Record<string, PushReceipt>> {
    try {
      const response = await fetch(this.expoReceiptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ ids: ticketIds }),
      });

      if (!response.ok) {
        throw new Error(`Expo Receipt API error: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {};
    } catch (error) {
      fisioLogger.error('Failed to check receipts', error, 'PushNotificationService');
      throw error;
    }
  }

  /**
   * Send notification to specific user via API
   */
  async sendToUser(userId: string, notification: {
    title: string;
    body: string;
    data?: Record<string, any>;
    type?: string;
  }): Promise<void> {
    try {
      const token = await authApi.getToken();
      
      const response = await fetch(`${config.apiUrl}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          notification: {
            title: notification.title,
            body: notification.body,
            data: notification.data,
            type: notification.type || 'info',
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      fisioLogger.info('Notification sent to user', { userId, type: notification.type }, 'PushNotificationService');
    } catch (error) {
      fisioLogger.error('Failed to send notification to user', error, 'PushNotificationService');
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(userIds: string[], notification: {
    title: string;
    body: string;
    data?: Record<string, any>;
    type?: string;
  }): Promise<void> {
    try {
      const token = await authApi.getToken();
      
      const response = await fetch(`${config.apiUrl}/api/notifications/send-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userIds,
          notification: {
            title: notification.title,
            body: notification.body,
            data: notification.data,
            type: notification.type || 'info',
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      fisioLogger.info('Notification sent to users', { count: userIds.length, type: notification.type }, 'PushNotificationService');
    } catch (error) {
      fisioLogger.error('Failed to send notification to users', error, 'PushNotificationService');
      throw error;
    }
  }

  /**
   * Send appointment reminder
   */
  async sendAppointmentReminder(
    userId: string,
    appointment: {
      id: string;
      patientName: string;
      date: string;
      time: string;
    }
  ): Promise<void> {
    await this.sendToUser(userId, {
      title: '📅 Lembrete de Atendimento',
      body: `Sessão com ${appointment.patientName} às ${appointment.time}`,
      data: {
        type: 'appointment_reminder',
        appointmentId: appointment.id,
      },
      type: 'appointment',
    });
  }

  /**
   * Send new appointment notification
   */
  async sendNewAppointmentNotification(
    userId: string,
    appointment: {
      id: string;
      patientName: string;
      date: string;
      time: string;
    }
  ): Promise<void> {
    await this.sendToUser(userId, {
      title: '✨ Novo Agendamento',
      body: `${appointment.patientName} agendou para ${appointment.date} às ${appointment.time}`,
      data: {
        type: 'new_appointment',
        appointmentId: appointment.id,
      },
      type: 'appointment',
    });
  }

  /**
   * Send appointment cancelled notification
   */
  async sendAppointmentCancelledNotification(
    userId: string,
    appointment: {
      id: string;
      patientName: string;
      date: string;
      reason?: string;
    }
  ): Promise<void> {
    await this.sendToUser(userId, {
      title: '❌ Agendamento Cancelado',
      body: `${appointment.patientName} cancelou a sessão de ${appointment.date}${appointment.reason ? `: ${appointment.reason}` : ''}`,
      data: {
        type: 'appointment_cancelled',
        appointmentId: appointment.id,
      },
      type: 'appointment',
    });
  }

  /**
   * Send daily summary notification
   */
  async sendDailySummaryNotification(
    userId: string,
    summary: {
      totalAppointments: number;
      completedAppointments: number;
      newPatients: number;
    }
  ): Promise<void> {
    await this.sendToUser(userId, {
      title: '📊 Resumo do Dia',
      body: `${summary.completedAppointments}/${summary.totalAppointments} sessões realizadas, ${summary.newPatients} novos pacientes`,
      data: {
        type: 'daily_summary',
      },
      type: 'system',
    });
  }

  /**
   * Register device push token
   */
  async registerPushToken(token: string, deviceName?: string): Promise<void> {
    try {
      const authToken = await authApi.getToken();
      
      await fetch(`${config.apiUrl}/api/push-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          expo_push_token: token,
          device_name: deviceName || Platform.OS,
          device_type: Platform.OS,
        })
      });

      fisioLogger.info('Push token registered', { token: token.substring(0, 20) + '...' }, 'PushNotificationService');
    } catch (error) {
      fisioLogger.error('Failed to register push token', error, 'PushNotificationService');
    }
  }
}

export const pushNotificationService = PushNotificationService.getInstance();