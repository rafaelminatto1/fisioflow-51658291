/**
 * Notification Workflows - Firebase Cloud Functions
 *
 * Substitui workflows do Inngest:
 * - sendNotificationWorkflow → Callable Function + Pub/Sub
 * - sendNotificationBatchWorkflow → Callable Function
 * - Integrado com Firebase Cloud Messaging para push
 *
 * @version 2.0.0 - Fixed Firestore API usage
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { logger } from 'firebase-functions';
import { getAdminDb, getAdminMessaging } from '../init';
import { FieldValue } from 'firebase-admin/firestore';

// Firebase Functions v2 CORS - explicitly list allowed origins
const CORS_ORIGINS = [
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  /moocafisio\.com\.br$/,
  /fisioflow\.web\.app$/,
];

// ============================================================================
// TYPES
// ============================================================================

interface SendNotificationData {
  userId: string;
  organizationId: string;
  type: 'email' | 'whatsapp' | 'push';
  data: {
    to: string;
    subject?: string;
    body: string;
    [key: string]: any;
  };
}

interface NotificationResult {
  sent: boolean;
  channel: string;
  error?: string;
}

interface NotificationDocument {
  user_id: string;
  organization_id: string;
  type: string;
  channel: string;
  status: 'pending' | 'sent' | 'failed';
  data: Record<string, any>;
  created_at: string;
  sent_at?: string;
  error_message?: string | null;
  retry_count?: number;
}

// ============================================================================
// COLLECTION REFERENCES
// ============================================================================

function getNotificationsCollection() {
  const db = getAdminDb();
  return db.collection('notifications');
}

// ============================================================================
// CALLABLE FUNCTION: Send Single Notification
// ============================================================================

/**
 * Send a single notification
 *
 * Usage:
 * ```ts
 * import { getFunctions, httpsCallable } from 'firebase/functions';
 *
 * const functions = getFunctions();
 * const sendNotification = httpsCallable(functions, 'sendNotification');
 *
 * const result = await sendNotification({
 *   userId: 'xxx',
 *   organizationId: 'yyy',
 *   type: 'email',
 *   data: { to: 'user@example.com', subject: 'Test', body: 'Hello' }
 * });
 * ```
 */
export const sendNotification = onCall(
  {
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
  },
  async (request): Promise<{ success: boolean; notificationId?: string; result?: NotificationResult }> => {
    const { data, auth } = request;

    // Auth check
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Validate input
    const { userId, organizationId, type, notificationData } = data as {
      userId: string;
      organizationId: string;
      type: string;
      notificationData: SendNotificationData['data'];
    };

    if (!userId || !organizationId || !type || !notificationData) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    const validTypes = ['email', 'whatsapp', 'push'];
    if (!validTypes.includes(type)) {
      throw new HttpsError('invalid-argument', `Invalid notification type: ${type}`);
    }

    const db = getAdminDb();

    try {
      // Log notification attempt
      const notificationRef = getNotificationsCollection().doc();
      const notificationId = notificationRef.id;

      const notificationDoc: NotificationDocument = {
        user_id: userId,
        organization_id: organizationId,
        type,
        channel: type,
        status: 'pending',
        data: notificationData,
        created_at: new Date().toISOString(),
        retry_count: 0,
      };

      await notificationRef.create(notificationDoc);

      // Send based on type
      const result: NotificationResult = await sendNotificationByType(
        type,
        notificationData,
        db,
        userId
      );

      // Update notification status
      await notificationRef.update({
        status: result.sent ? 'sent' : 'failed',
        sent_at: FieldValue.serverTimestamp(),
        error_message: result.error || null,
      });

      logger.info('[sendNotification] Notification processed', {
        notificationId,
        sent: result.sent,
        channel: result.channel,
      });

      return {
        success: result.sent,
        notificationId,
        result,
      };
    } catch (error) {
      logger.error('[sendNotification] Error sending notification', {
        userId,
        type,
        error,
      });
      throw new HttpsError('internal', 'Failed to send notification');
    }
  }
);

// ============================================================================
// CALLABLE FUNCTION: Schedule Appointment Notification
// ============================================================================

export const notifyAppointmentScheduled = onCall(
  {
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
  },
  async (request): Promise<{ success: boolean; notificationId?: string; result?: NotificationResult }> => {
    const { data, auth } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { appointmentId, patientId, date, time, patientName, organizationId } = data as {
      appointmentId: string;
      patientId: string;
      date: string;
      time: string;
      patientName?: string;
      organizationId?: string;
    };

    if (!appointmentId || !patientId || !date || !time) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    const db = getAdminDb();

    const notificationData: SendNotificationData['data'] = {
      to: patientId,
      subject: 'Lembrete de Consulta',
      body: `Olá ${patientName || 'paciente'}, você tem uma consulta agendada para ${new Date(date).toLocaleDateString('pt-BR')} às ${time}.`,
      appointmentId,
      action: 'appointment_reminder',
    };

    const notificationRef = getNotificationsCollection().doc();
    const notificationId = notificationRef.id;

    const notificationDoc: NotificationDocument = {
      user_id: patientId,
      organization_id: organizationId || 'system',
      type: 'push',
      channel: 'push',
      status: 'pending',
      data: notificationData,
      created_at: new Date().toISOString(),
      retry_count: 0,
    };

    await notificationRef.create(notificationDoc);

    const result = await sendNotificationByType('push', notificationData, db, patientId);

    await notificationRef.update({
      status: result.sent ? 'sent' : 'failed',
      sent_at: FieldValue.serverTimestamp(),
      error_message: result.error || null,
    });

    return {
      success: result.sent,
      notificationId,
      result,
    };
  }
);

// ============================================================================
// CALLABLE FUNCTION: Reschedule Appointment Notification
// ============================================================================

export const notifyAppointmentReschedule = onCall(
  {
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
  },
  async (request): Promise<{ success: boolean; notificationId?: string; result?: NotificationResult }> => {
    const { data, auth } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { appointmentId, patientId, newDate, newTime, patientName, organizationId } = data as {
      appointmentId: string;
      patientId: string;
      newDate: string;
      newTime: string;
      patientName?: string;
      organizationId?: string;
    };

    if (!appointmentId || !patientId || !newDate || !newTime) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    const db = getAdminDb();

    const notificationData: SendNotificationData['data'] = {
      to: patientId,
      subject: 'Consulta Reagendada',
      body: `Olá ${patientName || 'paciente'}, sua consulta foi reagendada para ${new Date(newDate).toLocaleDateString('pt-BR')} às ${newTime}.`,
      appointmentId,
      action: 'appointment_reschedule',
    };

    const notificationRef = getNotificationsCollection().doc();
    const notificationId = notificationRef.id;

    const notificationDoc: NotificationDocument = {
      user_id: patientId,
      organization_id: organizationId || 'system',
      type: 'push',
      channel: 'push',
      status: 'pending',
      data: notificationData,
      created_at: new Date().toISOString(),
      retry_count: 0,
    };

    await notificationRef.create(notificationDoc);

    const result = await sendNotificationByType('push', notificationData, db, patientId);

    await notificationRef.update({
      status: result.sent ? 'sent' : 'failed',
      sent_at: FieldValue.serverTimestamp(),
      error_message: result.error || null,
    });

    return {
      success: result.sent,
      notificationId,
      result,
    };
  }
);

// ============================================================================
// CALLABLE FUNCTION: Cancel Appointment Notification
// ============================================================================

export const notifyAppointmentCancellation = onCall(
  {
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
  },
  async (request): Promise<{ success: boolean; notificationId?: string; result?: NotificationResult }> => {
    const { data, auth } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { appointmentId, patientId, date, time, patientName, organizationId } = data as {
      appointmentId: string;
      patientId: string;
      date: string;
      time: string;
      patientName?: string;
      organizationId?: string;
    };

    if (!appointmentId || !patientId || !date || !time) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    const db = getAdminDb();

    const notificationData: SendNotificationData['data'] = {
      to: patientId,
      subject: 'Consulta Cancelada',
      body: `Olá ${patientName || 'paciente'}, sua consulta de ${new Date(date).toLocaleDateString('pt-BR')} às ${time} foi cancelada.`,
      appointmentId,
      action: 'appointment_cancellation',
    };

    const notificationRef = getNotificationsCollection().doc();
    const notificationId = notificationRef.id;

    const notificationDoc: NotificationDocument = {
      user_id: patientId,
      organization_id: organizationId || 'system',
      type: 'push',
      channel: 'push',
      status: 'pending',
      data: notificationData,
      created_at: new Date().toISOString(),
      retry_count: 0,
    };

    await notificationRef.create(notificationDoc);

    const result = await sendNotificationByType('push', notificationData, db, patientId);

    await notificationRef.update({
      status: result.sent ? 'sent' : 'failed',
      sent_at: FieldValue.serverTimestamp(),
      error_message: result.error || null,
    });

    return {
      success: result.sent,
      notificationId,
      result,
    };
  }
);

// ============================================================================
// CALLABLE FUNCTION: Send Batch Notifications
// ============================================================================

interface SendBatchNotificationsData {
  organizationId: string;
  notifications: Array<{
    userId: string;
    type: 'email' | 'whatsapp' | 'push';
    data: SendNotificationData['data'];
  }>;
}

export const sendNotificationBatch = onCall(
  {
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
  },
  async (request): Promise<{ success: boolean; queued: number; timestamp: string }> => {
    const { data, auth } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { organizationId, notifications } = data as SendBatchNotificationsData;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      throw new HttpsError('invalid-argument', 'No notifications provided');
    }

    if (notifications.length > 100) {
      throw new HttpsError('out-of-range', 'Maximum 100 notifications per batch');
    }

    const db = getAdminDb();
    const batch = db.batch();
    const notificationIds: string[] = [];

    // Create notification records in batch
    for (const notification of notifications) {
      const ref = getNotificationsCollection().doc();
      notificationIds.push(ref.id);

      const notificationDoc: NotificationDocument = {
        user_id: notification.userId,
        organization_id: organizationId,
        type: notification.type,
        channel: notification.type,
        status: 'pending',
        data: notification.data,
        created_at: new Date().toISOString(),
        retry_count: 0,
      };

      batch.create(ref, notificationDoc);
    }

    await batch.commit();

    // Queue for async processing via Pub/Sub
    // In production, you would publish to a Pub/Sub topic here
    // and have a separate function handle the actual sending

    logger.info('[sendNotificationBatch] Batch queued', {
      count: notifications.length,
      notificationIds,
    });

    return {
      success: true,
      queued: notifications.length,
      timestamp: new Date().toISOString(),
    };
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function sendNotificationByType(
  type: string,
  data: SendNotificationData['data'],
  db: ReturnType<typeof getAdminDb>,
  userId: string
): Promise<NotificationResult> {
  switch (type) {
    case 'email':
      // TODO: Integrate with SendGrid, Mailgun, or similar
      logger.info('[Notification] Email queued', {
        to: data.to,
        subject: data.subject,
      });
      return { sent: true, channel: 'email' };

    case 'whatsapp':
      // TODO: Integrate with Twilio, Z-API, or similar
      logger.info('[Notification] WhatsApp queued', {
        to: data.to,
      });
      return { sent: true, channel: 'whatsapp' };

    case 'push': {
      const messaging = getAdminMessaging();

      // Get user's push tokens
      const tokensSnapshot = await db
        .collection('user_tokens')
        .doc(userId)
        .collection('push')
        .where('active', '==', true)
        .get();

      if (tokensSnapshot.empty) {
        logger.warn('[Notification] No push tokens found', { userId });
        return { sent: false, channel: 'push', error: 'No tokens found' };
      }

      const tokens = tokensSnapshot.docs.map((doc) => doc.data().token).filter((t) => !!t);

      if (tokens.length === 0) {
        return { sent: false, channel: 'push', error: 'No valid tokens' };
      }

      const message = {
        notification: {
          title: data.subject || 'FisioFlow',
          body: data.body,
        },
        data: Object.entries(data).reduce(
          (acc: Record<string, string>, [k, v]) => ({
            ...acc,
            [k]: String(v),
          }),
          { type: 'PROMOTIONAL' }
        ),
        tokens,
      };

      const response = await messaging.sendEachForMulticast(message);

      if (response.failureCount > 0) {
        logger.warn('[Notification] Some push notifications failed', {
          success: response.successCount,
          failure: response.failureCount,
        });

        // Clean up invalid tokens
        const batch = db.batch();
        for (let i = 0; i < response.responses.length; i++) {
          if (!response.responses[i].success) {
            const error = response.responses[i].error;
            if (error?.code === 'messaging/registration-token-not-registered') {
              // Find and delete the invalid token
              const invalidToken = tokens[i];
              const invalidTokenDocs = tokensSnapshot.docs.filter(
                (doc) => doc.data().token === invalidToken
              );
              invalidTokenDocs.forEach((doc) => batch.delete(doc.ref));
            }
          }
        }
        if (response.failureCount > 0) {
          await batch.commit();
        }
      }

      return {
        sent: response.successCount > 0,
        channel: 'push',
        error: response.failureCount === tokens.length ? 'All failed' : undefined,
      };
    }

    default:
      return { sent: false, channel: type, error: 'Unknown type' };
  }
}

// ============================================================================
// PUBSUB FUNCTION: Process Notification Queue
// ============================================================================

/**
 * Process notification queue
 * Triggered by Pub/Sub for async processing
 *
 * To trigger this function:
 * ```bash
 * gcloud pubsub topics publish notification-queue --message='{...}'
 * ```
 */
export const processNotificationQueue = onMessagePublished(
  {
    topic: 'notification-queue',
    region: 'southamerica-east1',
  },
  async (event) => {
    const message = event.data.message.json;
    logger.info('[processNotificationQueue] Processing notification', { message });

    // Process notification from queue
    // This would handle the actual sending to email/whatsapp providers

    return {
      success: true,
      processedAt: new Date().toISOString(),
    };
  }
);

// ============================================================================
// HTTP FUNCTION: Webhook for Email Provider (e.g., SendGrid)
// ============================================================================

/**
 * Webhook for email delivery status updates
 * Integrates with SendGrid/Mailgun webhooks
 */
export const emailWebhook = onCall(
  {
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
  },
  async (request) => {
    const { data } = request;
    // Process webhook data from email provider
    // Update notification status in Firestore

    logger.info('[emailWebhook] Received webhook', { data });

    return { success: true };
  }
);
