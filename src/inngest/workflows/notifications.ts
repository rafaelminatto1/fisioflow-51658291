/**
 * Notification Workflow - Migrated to Firebase
 *
 * Migration from Supabase to Firebase:
 * - createClient(supabase) → Firebase Admin SDK
 * - supabase.from('notification_history') → firestore.collection('notification_history')
 * - insert() → addDoc()
 * - update().where().eq() → updateDoc() with query
 *
 * @version 2.0.0 - Improved with centralized Admin SDK helper
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, NotificationSendPayload, NotificationBatchPayload, InngestStep } from '../../lib/inngest/types.js';
import { getAdminDb, getAdminMessaging } from '../../lib/firebase/admin.js';
import { logger } from '@/lib/errors/logger';

type NotificationResult = { sent: boolean; channel: string; error?: string };

/**
 * Send a single notification
 */
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
    const db = getAdminDb();

    // Log notification attempt
    const notificationId = await step.run('log-notification', async () => {
      const docRef = await db.collection('notification_history').add({
        user_id: userId,
        organization_id: organizationId,
        type,
        channel: type,
        status: 'pending',
        data,
        created_at: new Date().toISOString(),
      });

      return docRef.id;
    });

    // Send based on type
    const result = await step.run('send-notification', async (): Promise<NotificationResult> => {
      switch (type) {
        case 'email':
          // Trigger email workflow
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
          // Trigger WhatsApp workflow
          await inngest.send({
            name: Events.WHATSAPP_SEND,
            data: {
              to: data.to,
              message: data.body,
            },
          });
          return { sent: true, channel: 'whatsapp' };

        case 'push': {
          const messaging = getAdminMessaging();
          const tokensSnapshot = await db.collection('users').doc(userId).collection('push_tokens').get();

          if (tokensSnapshot.empty) {
            logger.info('[Notification] No push tokens found for user', { userId }, 'notifications-workflow');
            return { sent: false, channel: 'push', error: 'No tokens found' };
          }

          const tokens = tokensSnapshot.docs.map(doc => doc.data().token).filter(t => !!t);

          if (tokens.length === 0) {
            return { sent: false, channel: 'push', error: 'No valid tokens' };
          }

          // Send multicast message
          const message = {
            notification: {
              title: data.subject || 'FisioFlow',
              body: data.body,
            },
            data: {
              // Data must be string key/value pairs
              ...Object.entries(data).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {}),
              type: 'PROMOTIONAL', // Default or specific type
            },
            tokens: tokens,
          };

          const response = await messaging.sendEachForMulticast(message);

          if (response.failureCount > 0) {
            logger.warn('[Notification] Some push notifications failed', {
              success: response.successCount,
              failure: response.failureCount,
              errors: response.responses.filter(r => !r.success).map(r => r.error)
            }, 'notifications-workflow');

            // Optional: Clean up invalid tokens here if error is 'registration-token-not-registered'
          }

          return { sent: response.successCount > 0, channel: 'push', error: response.failureCount === tokens.length ? 'All failed' : undefined };
        }

        default:
          logger.warn('[Notification] Unknown notification type', { type }, 'notifications-workflow');
          return { sent: false, channel: type, error: 'Unknown type' };
      }
    });

    // Update notification status
    await step.run('update-status', async () => {
      await db.collection('notification_history').doc(notificationId).update({
        status: result.sent ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
        error_message: result.error || null,
      });

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

/**
 * Send notifications in batch
 */
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

    // Validate input
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return {
        success: false,
        error: 'No notifications provided',
        queued: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const results = await step.run('process-batch', async () => {
      // Send individual notification events
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
