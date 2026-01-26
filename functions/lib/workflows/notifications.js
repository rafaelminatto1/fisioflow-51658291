"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailWebhook = exports.processNotificationQueue = exports.sendNotificationBatch = exports.sendNotification = void 0;
const https_1 = require("firebase-functions/v2/https");
const pubsub_1 = require("firebase-functions/v2/pubsub");
const firebase_functions_1 = require("firebase-functions");
const init_1 = require("../init");
const firestore_1 = require("firebase-admin/firestore");
// ============================================================================
// COLLECTION REFERENCES
// ============================================================================
function getNotificationsCollection() {
    const db = (0, init_1.getAdminDb)();
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
exports.sendNotification = (0, https_1.onCall)({
    region: 'southamerica-east1',
}, async (request) => {
    const { data, auth } = request;
    // Auth check
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // Validate input
    const { userId, organizationId, type, notificationData } = data;
    if (!userId || !organizationId || !type || !notificationData) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required fields');
    }
    const validTypes = ['email', 'whatsapp', 'push'];
    if (!validTypes.includes(type)) {
        throw new https_1.HttpsError('invalid-argument', `Invalid notification type: ${type}`);
    }
    const db = (0, init_1.getAdminDb)();
    try {
        // Log notification attempt
        const notificationRef = getNotificationsCollection().doc();
        const notificationId = notificationRef.id;
        const notificationDoc = {
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
        const result = await sendNotificationByType(type, notificationData, db, userId);
        // Update notification status
        await notificationRef.update({
            status: result.sent ? 'sent' : 'failed',
            sent_at: firestore_1.FieldValue.serverTimestamp(),
            error_message: result.error || null,
        });
        firebase_functions_1.logger.info('[sendNotification] Notification processed', {
            notificationId,
            sent: result.sent,
            channel: result.channel,
        });
        return {
            success: result.sent,
            notificationId,
            result,
        };
    }
    catch (error) {
        firebase_functions_1.logger.error('[sendNotification] Error sending notification', {
            userId,
            type,
            error,
        });
        throw new https_1.HttpsError('internal', 'Failed to send notification');
    }
});
exports.sendNotificationBatch = (0, https_1.onCall)({
    region: 'southamerica-east1',
}, async (request) => {
    const { data, auth } = request;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { organizationId, notifications } = data;
    if (!Array.isArray(notifications) || notifications.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'No notifications provided');
    }
    if (notifications.length > 100) {
        throw new https_1.HttpsError('out-of-range', 'Maximum 100 notifications per batch');
    }
    const db = (0, init_1.getAdminDb)();
    const batch = db.batch();
    const notificationIds = [];
    // Create notification records in batch
    for (const notification of notifications) {
        const ref = getNotificationsCollection().doc();
        notificationIds.push(ref.id);
        const notificationDoc = {
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
    firebase_functions_1.logger.info('[sendNotificationBatch] Batch queued', {
        count: notifications.length,
        notificationIds,
    });
    return {
        success: true,
        queued: notifications.length,
        timestamp: new Date().toISOString(),
    };
});
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
async function sendNotificationByType(type, data, db, userId) {
    switch (type) {
        case 'email':
            // TODO: Integrate with SendGrid, Mailgun, or similar
            firebase_functions_1.logger.info('[Notification] Email queued', {
                to: data.to,
                subject: data.subject,
            });
            return { sent: true, channel: 'email' };
        case 'whatsapp':
            // TODO: Integrate with Twilio, Z-API, or similar
            firebase_functions_1.logger.info('[Notification] WhatsApp queued', {
                to: data.to,
            });
            return { sent: true, channel: 'whatsapp' };
        case 'push': {
            const messaging = (0, init_1.getAdminMessaging)();
            // Get user's push tokens
            const tokensSnapshot = await db
                .collection('user_tokens')
                .doc(userId)
                .collection('push')
                .where('active', '==', true)
                .get();
            if (tokensSnapshot.empty) {
                firebase_functions_1.logger.warn('[Notification] No push tokens found', { userId });
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
                data: Object.entries(data).reduce((acc, [k, v]) => ({
                    ...acc,
                    [k]: String(v),
                }), { type: 'PROMOTIONAL' }),
                tokens,
            };
            const response = await messaging.sendEachForMulticast(message);
            if (response.failureCount > 0) {
                firebase_functions_1.logger.warn('[Notification] Some push notifications failed', {
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
                            const invalidTokenDocs = tokensSnapshot.docs.filter((doc) => doc.data().token === invalidToken);
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
exports.processNotificationQueue = (0, pubsub_1.onMessagePublished)({
    topic: 'notification-queue',
    region: 'southamerica-east1',
}, async (event) => {
    const message = event.data.message.json;
    firebase_functions_1.logger.info('[processNotificationQueue] Processing notification', { message });
    // Process notification from queue
    // This would handle the actual sending to email/whatsapp providers
    return {
        success: true,
        processedAt: new Date().toISOString(),
    };
});
// ============================================================================
// HTTP FUNCTION: Webhook for Email Provider (e.g., SendGrid)
// ============================================================================
/**
 * Webhook for email delivery status updates
 * Integrates with SendGrid/Mailgun webhooks
 */
exports.emailWebhook = (0, https_1.onCall)({
    region: 'southamerica-east1',
}, async (request) => {
    const { data } = request;
    // Process webhook data from email provider
    // Update notification status in Firestore
    firebase_functions_1.logger.info('[emailWebhook] Received webhook', { data });
    return { success: true };
});
//# sourceMappingURL=notifications.js.map