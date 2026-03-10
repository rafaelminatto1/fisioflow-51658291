/**
 * Notification Workflow - Migrated to Neon
 *
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, NotificationSendPayload, NotificationBatchPayload, InngestStep } from '../../lib/inngest/types.js';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { 
  logNotificationHistory, 
  updateNotificationStatus, 
  getUserPushTokens 
} from './_shared/neon-patients-appointments';

type NotificationResult = { sent: boolean; channel: string; error?: string };

export const sendNotificationWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-send-notification',
    name: 'Send Notification',
    retries: retryConfig.email.maxAttempts,
  },
  {
    event: Events.NOTIFICATION_SEND,
  },
  async ({ event, step }: { event: { data: NotificationSendPayload }; step: InngestStep }) => {
    const { userId, organizationId, type, data } = event.data;

    // Log notification attempt (Neon)
    const notificationId = await step.run('log-notification', async () => {
      return await logNotificationHistory({
        user_id: userId,
        organization_id: organizationId,
        type,
        channel: type,
        status: 'pending',
        payload: data,
      });
    });

    // Send based on type
    const result = await step.run('send-notification', async (): Promise<NotificationResult> => {
      switch (type) {
        case 'email':
          await inngest.send({
            name: Events.EMAIL_SEND,
            data: {
              to: data.to,
              subject: data.subject || 'Notification',
              html: data.body,
              text: data.body,
            },
          });
          return { sent: true, channel: 'email' };

        case 'whatsapp':
          await inngest.send({
            name: Events.WHATSAPP_SEND,
            data: {
              to: data.to,
              message: data.body,
            },
          });
          return { sent: true, channel: 'whatsapp' };

        case 'push': {
          // Push notifications now handled via external provider or Worker bridge
          const tokens = await getUserPushTokens(userId);

          if (tokens.length === 0) {
            logger.info('[Notification] No push tokens found for user', { userId }, 'notifications-workflow');
            return { sent: false, channel: 'push', error: 'No tokens found' };
          }

          // Trigger internal event for Push Provider (OneSignal/Firebase-bridge)
          await inngest.send({
            name: 'push/send.multicast',
            data: {
              tokens,
              title: data.subject || 'FisioFlow',
              body: data.body,
              metadata: data
            }
          });

          return { sent: true, channel: 'push' };
        }

        default:
          logger.warn('[Notification] Unknown notification type', { type }, 'notifications-workflow');
          return { sent: false, channel: type, error: 'Unknown type' };
      }
    });

    // Update notification status (Neon)
    await step.run('update-status', async () => {
      await updateNotificationStatus(notificationId, result.sent ? 'sent' : 'failed', result.error);
      return { updated: true };
    });

    return {
      success: result.sent,
      timestamp: new Date().toISOString(),
      notificationId,
      ...result,
    };
  }
);

export const sendNotificationBatchWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-send-notification-batch',
    name: 'Send Batch Notifications',
    retries: retryConfig.email.maxAttempts,
  },
  {
    event: Events.NOTIFICATION_SEND_BATCH,
  },
  async ({ event, step }: { event: { data: NotificationBatchPayload }; step: InngestStep }) => {
    const { organizationId, notifications } = event.data;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return {
        success: false,
        error: 'No notifications provided',
        queued: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const results = await step.run('process-batch', async () => {
      const events = notifications.map((notification: Omit<NotificationSendPayload, 'organizationId'>) => ({
        name: Events.NOTIFICATION_SEND,
        data: {
          ...notification,
          organizationId,
        },
      }));

      await inngest.send(events);

      return {
        queued: events.length,
      };
    });

    return {
      success: true,
      queued: results.queued,
      timestamp: new Date().toISOString(),
    };
  }
);