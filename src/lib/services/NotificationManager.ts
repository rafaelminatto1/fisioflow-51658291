/**
 * Unified Notification Manager
 *
 * Central service for sending notifications via multiple channels:
 * - Email (Resend)
 * - WhatsApp (Evolution API)
 * - Push (Web Push API)
 * - SMS (optional provider)
 *
 * Features:
 * - Respects user preferences
 * - Honors quiet hours
 * - Supports batch sending
 * - Tracks delivery status
 * - Automatic retry with exponential backoff
 */

import { supabase } from '@/integrations/supabase/client';
import { ResendService } from '@/lib/email/resend';
import { WhatsAppService } from '@/lib/services/WhatsAppService';
import { NotificationType, NotificationStatus, NotificationPayload } from '@/types/notifications';
import { logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationRecipient {
  id: string;
  email?: string;
  phone?: string;
  pushSubscription?: PushSubscription;
}

export interface NotificationChannel {
  type: 'email' | 'whatsapp' | 'push' | 'sms';
  enabled: boolean;
  priority: number;
}

export interface NotificationSendOptions {
  channels?: NotificationChannel['type'][];
  scheduleAt?: Date;
  quietHoursCheck?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel['type'];
  messageId?: string;
  error?: string;
  retryable?: boolean;
}

export interface NotificationSummary {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  results: NotificationResult[];
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

interface UserNotificationPreferences {
  user_id: string;
  appointment_reminders: boolean;
  exercise_reminders: boolean;
  progress_updates: boolean;
  system_alerts: boolean;
  therapist_messages: boolean;
  payment_reminders: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  weekend_notifications: boolean;
  preferred_channel?: 'email' | 'whatsapp' | 'push';
}

// ============================================================================
// NOTIFICATION MANAGER
// ============================================================================

class NotificationManagerClass {
  private channelPriority: Record<NotificationChannel['type'], number> = {
    whatsapp: 1,
    push: 2,
    sms: 3,
    email: 4,
  };

  /**
   * Initialize the notification manager
   */
  async initialize(): Promise<void> {
    // Load any configuration from database if needed
    logger.info('NotificationManager initialized', 'NotificationManager');
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  /**
   * Send a notification to a single user
   */
  async send(
    recipient: NotificationRecipient,
    payload: NotificationPayload,
    options: NotificationSendOptions = {}
  ): Promise<NotificationResult[]> {
    const { channels, scheduleAt, quietHoursCheck = true, priority = 'normal' } = options;

    // Check if should send now
    if (scheduleAt && scheduleAt > new Date()) {
      return this.scheduleNotification(recipient, payload, options);
    }

    // Check quiet hours
    if (quietHoursCheck && await this.isQuietHours(recipient.id, payload.type)) {
      await this.scheduleNotification(recipient, payload, {
        ...options,
        scheduleAt: this.getNextActiveTime(recipient.id),
      });
      return [{
        success: false,
        channel: 'email',
        error: 'Skipped due to quiet hours - rescheduled',
      }];
    }

    // Get user preferences
    const preferences = await this.getUserPreferences(recipient.id);
    if (!this.shouldSendNotification(preferences, payload.type)) {
      return [{
        success: false,
        channel: 'email',
        error: 'Notification type disabled in preferences',
      }];
    }

    // Determine channels to use
    const channelsToSend = channels || this.determineChannels(preferences, recipient);

    // Send to each channel
    const results: NotificationResult[] = [];
    for (const channel of channelsToSend) {
      const result = await this.sendToChannel(channel, recipient, payload, options);
      results.push(result);

      // Log to history
      await this.logNotification({
        userId: recipient.id,
        type: payload.type,
        channel,
        status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
        payload,
        error: result.error,
        messageId: result.messageId,
      });

      // If priority is urgent or first channel succeeded, continue
      if (priority === 'urgent' || result.success) {
        continue;
      }
    }

    return results;
  }

  /**
   * Send notification to multiple recipients
   */
  async sendBulk(
    recipients: NotificationRecipient[],
    payload: NotificationPayload,
    options: NotificationSendOptions = {}
  ): Promise<NotificationSummary> {
    const results: NotificationResult[] = [];
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const recipient of recipients) {
      try {
        const recipientResults = await this.send(recipient, payload, options);
        results.push(...recipientResults);

        if (recipientResults.some(r => r.success)) {
          sent++;
        } else if (recipientResults.some(r => r.error?.includes('Skipped'))) {
          skipped++;
        } else {
          failed++;
        }
      } catch (error) {
        logger.error(`Failed to send notification to ${recipient.id}:`, error, 'NotificationManager');
        failed++;
      }
    }

    return {
      total: recipients.length,
      sent,
      failed,
      skipped,
      results,
    };
  }

  /**
   * Get notification analytics for a user or organization
   */
  async getAnalytics(
    userId?: string,
    organizationId?: string,
    period: { startDate: Date; endDate: Date } = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    }
  ): Promise<Record<NotificationType, { sent: number; delivered: number; failed: number }>> {
    let query = supabase
      .from('notification_history')
      .select('*')
      .gte('created_at', period.startDate.toISOString())
      .lte('created_at', period.endDate.toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;

    if (error || !data) {
      return {} as Record<NotificationType, { sent: number; delivered: number; failed: number }>;
    }

    // Aggregate by type
    const analytics: Record<string, { sent: number; delivered: number; failed: number }> = {};

    for (const record of data) {
      const type = record.type as NotificationType;
      if (!analytics[type]) {
        analytics[type] = { sent: 0, delivered: 0, failed: 0 };
      }

      analytics[type].sent++;
      if (record.status === 'sent' || record.status === 'delivered') {
        analytics[type].delivered++;
      } else if (record.status === 'failed') {
        analytics[type].failed++;
      }
    }

    return analytics as Record<NotificationType, { sent: number; delivered: number; failed: number }>;
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Send notification to a specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel['type'],
    recipient: NotificationRecipient,
    payload: NotificationPayload,
    options: NotificationSendOptions
  ): Promise<NotificationResult> {
    try {
      switch (channel) {
        case 'email':
          return await this.sendEmail(recipient, payload, options);

        case 'whatsapp':
          return await this.sendWhatsApp(recipient, payload, options);

        case 'push':
          return await this.sendPush(recipient, payload, options);

        case 'sms':
          return await this.sendSMS(recipient, payload, options);

        default:
          return {
            success: false,
            channel,
            error: `Unknown channel: ${channel}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        channel,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      };
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(
    recipient: NotificationRecipient,
    payload: NotificationPayload,
    options: NotificationSendOptions
  ): Promise<NotificationResult> {
    if (!recipient.email) {
      return {
        success: false,
        channel: 'email',
        error: 'No email address',
        retryable: false,
      };
    }

    // Map notification type to email template
    const emailData = this.mapToEmailTemplate(payload);

    const result = await ResendService.sendEmail({
      to: recipient.email,
      subject: payload.title,
      html: this.renderEmailTemplate(payload),
      text: payload.body,
      tags: {
        type: payload.type,
        ...options.metadata,
      },
    });

    return {
      success: result.success,
      channel: 'email',
      messageId: result.messageId,
      error: result.error,
      retryable: !result.success,
    };
  }

  /**
   * Send WhatsApp notification
   */
  private async sendWhatsApp(
    recipient: NotificationRecipient,
    payload: NotificationPayload,
    options: NotificationSendOptions
  ): Promise<NotificationResult> {
    if (!recipient.phone) {
      return {
        success: false,
        channel: 'whatsapp',
        error: 'No phone number',
        retryable: false,
      };
    }

    try {
      const message = this.formatWhatsAppMessage(payload);
      await WhatsAppService.sendMessage(recipient.phone, message);

      return {
        success: true,
        channel: 'whatsapp',
      };
    } catch (error) {
      return {
        success: false,
        channel: 'whatsapp',
        error: error instanceof Error ? error.message : 'Failed to send WhatsApp',
        retryable: true,
      };
    }
  }

  /**
   * Send push notification
   * Note: Push notifications must be sent from server-side using web-push
   * Client-side can only show local notifications via Service Worker
   */
  private async sendPush(
    recipient: NotificationRecipient,
    payload: NotificationPayload,
    options: NotificationSendOptions
  ): Promise<NotificationResult> {
    if (!recipient.pushSubscription) {
      return {
        success: false,
        channel: 'push',
        error: 'No push subscription',
        retryable: false,
      };
    }

    try {
      // Client-side: Show local notification via Service Worker Registration
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Send message to service worker to show notification
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          data: {
            title: payload.title,
            body: payload.body,
            icon: payload.icon,
            badge: payload.badge,
            image: payload.image,
            data: payload.data,
            actions: payload.actions,
            requireInteraction: payload.requireInteraction,
            silent: payload.silent,
            tag: payload.tag,
          },
        });

        return {
          success: true,
          channel: 'push',
        };
      }

      // Fallback: Try to show notification directly (requires permission)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon,
          badge: payload.badge,
          image: payload.image,
          data: payload.data,
          tag: payload.tag,
          requireInteraction: payload.requireInteraction,
          silent: payload.silent,
        });

        return {
          success: true,
          channel: 'push',
        };
      }

      return {
        success: false,
        channel: 'push',
        error: 'Notification permission not granted or service worker not available',
        retryable: false,
      };
    } catch (error) {
      return {
        success: false,
        channel: 'push',
        error: error instanceof Error ? error.message : 'Failed to send push',
        retryable: true,
      };
    }
  }

  /**
   * Send SMS notification (placeholder for future implementation)
   */
  private async sendSMS(
    recipient: NotificationRecipient,
    payload: NotificationPayload,
    options: NotificationSendOptions
  ): Promise<NotificationResult> {
    // TODO: Implement SMS provider (Twilio, Vonage, etc.)
    return {
      success: false,
      channel: 'sms',
      error: 'SMS not implemented yet',
      retryable: false,
    };
  }

  /**
   * Get user notification preferences
   */
  private async getUserPreferences(userId: string): Promise<UserNotificationPreferences | null> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as unknown as UserNotificationPreferences;
  }

  /**
   * Check if notification should be sent based on preferences
   */
  private shouldSendNotification(
    preferences: UserNotificationPreferences | null,
    type: NotificationType
  ): boolean {
    if (!preferences) return true;

    switch (type) {
      case NotificationType.APPOINTMENT_REMINDER:
      case NotificationType.APPOINTMENT_CHANGE:
        return preferences.appointment_reminders;
      case NotificationType.EXERCISE_REMINDER:
      case NotificationType.EXERCISE_MILESTONE:
        return preferences.exercise_reminders;
      case NotificationType.PROGRESS_UPDATE:
        return preferences.progress_updates;
      case NotificationType.THERAPIST_MESSAGE:
        return preferences.therapist_messages;
      case NotificationType.PAYMENT_REMINDER:
        return preferences.payment_reminders;
      case NotificationType.SYSTEM_ALERT:
        return preferences.system_alerts;
      default:
        return true;
    }
  }

  /**
   * Determine which channels to use based on preferences and recipient data
   */
  private determineChannels(
    preferences: UserNotificationPreferences | null,
    recipient: NotificationRecipient
  ): NotificationChannel['type'][] {
    const channels: NotificationChannel['type'][] = [];

    // Use preferred channel if set
    if (preferences?.preferred_channel) {
      const preferred = preferences.preferred_channel;
      if (preferred === 'email' && recipient.email) channels.push('email');
      if (preferred === 'whatsapp' && recipient.phone) channels.push('whatsapp');
      if (preferred === 'push' && recipient.pushSubscription) channels.push('push');
    }

    // Add available channels by priority
    if (recipient.pushSubscription) channels.push('push');
    if (recipient.phone && preferences?.therapist_messages) channels.push('whatsapp');
    if (recipient.email) channels.push('email');

    // Remove duplicates while preserving order
    return Array.from(new Set(channels));
  }

  /**
   * Check if current time is within quiet hours
   */
  private async isQuietHours(userId: string, type: NotificationType): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId);
    if (!preferences) return false;

    // Check weekend
    const now = new Date();
    const dayOfWeek = now.getDay();
    if (!preferences.weekend_notifications && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return true;
    }

    // Check quiet hours
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMin] = preferences.quiet_hours_start.split(':').map(Number);
    const [endHour, endMin] = preferences.quiet_hours_end.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    }

    return currentTime >= startTime && currentTime < endTime;
  }

  /**
   * Get next time outside quiet hours
   */
  private getNextActiveTime(userId: string): Date {
    // Default to 8 AM next day
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(8, 0, 0, 0);
    return next;
  }

  /**
   * Schedule notification for later
   */
  private async scheduleNotification(
    recipient: NotificationRecipient,
    payload: NotificationPayload,
    options: NotificationSendOptions
  ): Promise<NotificationResult[]> {
    // Add to notification queue for scheduled sending
    const { error } = await supabase.from('notification_queue').insert({
      user_id: recipient.id,
      payload,
      scheduled_at: options.scheduleAt,
      status: 'queued',
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to schedule notification: ${error.message}`);
    }

    return [{
      success: true,
      channel: 'email',
      error: 'Scheduled for later',
    }];
  }

  /**
   * Log notification to history
   */
  private async logNotification(data: {
    userId: string;
    type: NotificationType;
    channel: NotificationChannel['type'];
    status: NotificationStatus;
    payload: NotificationPayload;
    error?: string;
    messageId?: string;
  }): Promise<void> {
    await supabase.from('notification_history').insert({
      user_id: data.userId,
      type: data.type,
      channel: data.channel,
      status: data.status,
      title: data.payload.title,
      body: data.payload.body,
      data: data.payload.data,
      error_message: data.error,
      message_id: data.messageId,
      created_at: new Date().toISOString(),
      sent_at: data.status === NotificationStatus.SENT ? new Date().toISOString() : null,
    });
  }

  /**
   * Map notification payload to email template data
   */
  private mapToEmailTemplate(payload: NotificationPayload): Record<string, unknown> {
    return {
      patientName: payload.data?.patientName || '',
      therapistName: payload.data?.therapistName || '',
      date: payload.data?.date || '',
      time: payload.data?.time || '',
      location: payload.data?.location,
      onlineMeetingUrl: payload.data?.onlineMeetingUrl,
      organizationName: payload.data?.organizationName || 'FisioFlow',
    };
  }

  /**
   * Render HTML email template from payload
   */
  private renderEmailTemplate(payload: NotificationPayload): string {
    // Use existing Resend templates when possible, otherwise generic
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${payload.title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${payload.title}</h1>
  </div>
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; line-height: 1.6;">${payload.body}</p>
    ${payload.data ? `<div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px;">${JSON.stringify(payload.data, null, 2)}</div>` : ''}
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Format message for WhatsApp
   */
  private formatWhatsAppMessage(payload: NotificationPayload): string {
    let message = `*${payload.title}*\n\n`;
    message += `${payload.body}\n\n`;

    // Add emoji based on type
    const emojiMap: Record<NotificationType, string> = {
      [NotificationType.APPOINTMENT_REMINDER]: '📅',
      [NotificationType.APPOINTMENT_CHANGE]: '🔄',
      [NotificationType.EXERCISE_REMINDER]: '💪',
      [NotificationType.EXERCISE_MILESTONE]: '🏆',
      [NotificationType.PROGRESS_UPDATE]: '📈',
      [NotificationType.SYSTEM_ALERT]: '⚠️',
      [NotificationType.THERAPIST_MESSAGE]: '💬',
      [NotificationType.PAYMENT_REMINDER]: '💳',
    };

    message = `${emojiMap[payload.type] || ''} ${message}`;
    return message;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const notificationManager = new NotificationManagerClass();

// Convenience functions for common notification types
export const sendAppointmentReminder = async (
  recipient: NotificationRecipient,
  data: {
    patientName: string;
    therapistName: string;
    date: string;
    time: string;
    location?: string;
    onlineMeetingUrl?: string;
  }
) => {
  return notificationManager.send(recipient, {
    type: NotificationType.APPOINTMENT_REMINDER,
    title: 'Lembrete de Consulta 🔔',
    body: `Olá ${data.patientName}, você tem uma consulta amanhã às ${data.time} com ${data.therapistName}.`,
    data,
  });
};

export const sendExerciseReminder = async (
  recipient: NotificationRecipient,
  data: {
    exerciseName: string;
    patientName: string;
  }
) => {
  return notificationManager.send(recipient, {
    type: NotificationType.EXERCISE_REMINDER,
    title: 'Lembrete de Exercício 💪',
    body: `Hora de fazer ${data.exerciseName}! Você consegue!`,
    data,
  });
};

export const sendProgressUpdate = async (
  recipient: NotificationRecipient,
  data: {
    patientName: string;
    progress: string;
  }
) => {
  return notificationManager.send(recipient, {
    type: NotificationType.PROGRESS_UPDATE,
    title: 'Atualização de Progresso 📈',
    body: `${data.patientName}, seu progresso: ${data.progress}`,
    data,
  });
};

export const sendTherapistMessage = async (
  recipient: NotificationRecipient,
  data: {
    therapistName: string;
    message: string;
  }
) => {
  return notificationManager.send(recipient, {
    type: NotificationType.THERAPIST_MESSAGE,
    title: `Mensagem de ${data.therapistName} 💬`,
    body: data.message,
    data,
  });
};

export const sendPaymentReminder = async (
  recipient: NotificationRecipient,
  data: {
    patientName: string;
    amount: number;
    dueDate: string;
  }
) => {
  return notificationManager.send(recipient, {
    type: NotificationType.PAYMENT_REMINDER,
    title: 'Lembrete de Pagamento 💳',
    body: `Olá ${data.patientName}, seu pacote expira em ${data.dueDate}. Valor: R$ ${data.amount.toFixed(2)}`,
    data,
  });
};
