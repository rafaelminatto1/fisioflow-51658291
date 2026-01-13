/**
 * Notification Workflow
 *
 * Generic notification workflow that can send emails, WhatsApp messages, or push notifications
 * Supports batch sending and individual retry
 */

import { inngest, retryConfig } from '@/lib/inngest/client';
import { Events, NotificationSendPayload, NotificationBatchPayload } from '@/lib/inngest/types';
import { createClient } from '@supabase/supabase-js';

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
  async ({ event, step }: { event: { data: NotificationSendPayload }; step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> } }) => {
    const { userId, organizationId, type, data } = event.data;

    // Log notification attempt
    await step.run('log-notification', async () => {
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await supabase.from('notification_history').insert({
        user_id: userId,
        organization_id: organizationId,
        type,
        channel: type,
        status: 'pending',
        data,
        created_at: new Date().toISOString(),
      });

      return { logged: true };
    });

    // Send based on type
    const result = await step.run('send-notification', async () => {
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

        case 'push':
          // TODO: Implement push notifications
          console.log('Push notification not yet implemented');
          return { sent: false, channel: 'push', error: 'Not implemented' };

        default:
          return { sent: false, channel: type, error: 'Unknown type' };
      }
    });

    // Update notification status
    await step.run('update-status', async () => {
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await supabase
        .from('notification_history')
        .update({
          status: result.sent ? 'sent' : 'failed',
          sent_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      return { updated: true };
    });

    return {
      success: result.sent,
      timestamp: new Date().toISOString(),
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
  async ({ event, step }: { event: { data: NotificationBatchPayload }; step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> } }) => {
    const { organizationId, notifications } = event.data;

    const results = await step.run('process-batch', async () => {
      // Send individual notification events
      const events = notifications.map((notification) => ({
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
