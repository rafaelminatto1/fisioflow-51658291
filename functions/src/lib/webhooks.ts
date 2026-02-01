/**
 * Webhook Management System
 * Manages external webhook subscriptions and deliveries
 */

import { getLogger } from './logger';
import { Firestore } from 'firebase-admin/firestore';
import * as crypto from 'crypto';

const logger = getLogger('webhooks');

/**
 * Webhook event types
 */
export enum WebhookEventType {
  // Patient events
  PATIENT_CREATED = 'patient.created',
  PATIENT_UPDATED = 'patient.updated',
  PATIENT_DELETED = 'patient.deleted',

  // Appointment events
  APPOINTMENT_CREATED = 'appointment.created',
  APPOINTMENT_UPDATED = 'appointment.updated',
  APPOINTMENT_CANCELLED = 'appointment.cancelled',
  APPOINTMENT_COMPLETED = 'appointment.completed',

  // Treatment events
  TREATMENT_STARTED = 'treatment.started',
  TREATMENT_COMPLETED = 'treatment.completed',
  SESSION_COMPLETED = 'session.completed',

  // Assessment events
  ASSESSMENT_CREATED = 'assessment.created',
  ASSESSMENT_COMPLETED = 'assessment.completed',

  // Payment events
  PAYMENT_RECEIVED = 'payment.received',
  PAYMENT_FAILED = 'payment.failed',

  // Exercise events
  EXERCISE_ASSIGNED = 'exercise.assigned',
  EXERCISE_COMPLETED = 'exercise.completed',
}

/**
 * Webhook subscription
 */
export interface WebhookSubscription {
  id: string;
  url: string;
  events: WebhookEventType[];
  secret?: string;
  organizationId: string;
  active: boolean;
  headers?: Record<string, string>;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
  lastSuccessAt?: Date;
  failureCount: number;
}

/**
 * Webhook event payload
 */
export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  data: any;
  timestamp: Date;
  organizationId: string;
  userId?: string;
}

/**
 * Webhook delivery result
 */
export interface WebhookDeliveryResult {
  subscriptionId: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  duration: number;
}

/**
 * Collection name for webhook subscriptions
 */
const WEBHOOKS_COLLECTION = 'webhook_subscriptions';
const WEBHOOK_DELIVERY_LOGS = 'webhook_delivery_logs';

/**
 * Generates a signature for webhook payload
 */
export function generateWebhookSignature(
  payload: string,
  secret: string
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
}

/**
 * Verifies webhook signature with proper validation
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Validate signature format
  if (!signature || typeof signature !== 'string') {
    logger.warn('Invalid signature type or empty signature');
    return false;
  }

  if (!signature.startsWith('sha256=')) {
    logger.warn('Invalid signature format (missing sha256= prefix)');
    return false;
  }

  const signatureWithoutPrefix = signature.substring(7); // Remove "sha256="

  if (signatureWithoutPrefix.length !== 64) {
    logger.warn('Invalid signature length (not 64 hex chars)');
    return false;
  }

  // Check for hex characters only
  if (!/^[0-9a-f]{64}$/i.test(signatureWithoutPrefix)) {
    logger.warn('Invalid signature (not hex)');
    return false;
  }

  const expectedSignature = generateWebhookSignature(payload, secret);

  // Use constant-time comparison with proper format
  try {
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const providedBuffer = Buffer.from(signatureWithoutPrefix, 'hex');

    // Ensure both buffers are the same length
    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (error) {
    logger.error('Signature verification error', { error });
    return false;
  }
}

/**
 * Subscribes to webhook events
 */
export async function subscribeToWebhook(
  db: Firestore,
  subscription: Omit<WebhookSubscription, 'id' | 'createdAt' | 'updatedAt' | 'failureCount'>
): Promise<string> {
  const subscriptionRef = db.collection(WEBHOOKS_COLLECTION).doc();
  const subscriptionId = subscriptionRef.id;

  // Generate secret if not provided
  const secret = subscription.secret || crypto.randomBytes(32).toString('hex');

  const now = new Date();
  const newSubscription: WebhookSubscription = {
    ...subscription,
    id: subscriptionId,
    secret,
    active: subscription.active !== false,
    createdAt: now,
    updatedAt: now,
    failureCount: 0,
  };

  await subscriptionRef.set(newSubscription);

  logger.info('Webhook subscription created', {
    subscriptionId,
    url: subscription.url,
    events: subscription.events,
  });

  return subscriptionId;
}

/**
 * Unsubscribes from webhook events
 */
export async function unsubscribeFromWebhook(
  db: Firestore,
  subscriptionId: string,
  organizationId: string
): Promise<boolean> {
  const subscriptionRef = db
    .collection(WEBHOOKS_COLLECTION)
    .where('id', '==', subscriptionId)
    .where('organizationId', '==', organizationId)
    .limit(1);

  const snapshot = await subscriptionRef.get();

  if (snapshot.empty) {
    return false;
  }

  await snapshot.docs[0].ref.delete();

  logger.info('Webhook subscription deleted', { subscriptionId });

  return true;
}

/**
 * Gets active webhook subscriptions for an event type
 */
export async function getActiveSubscriptions(
  db: Firestore,
  eventType: WebhookEventType,
  organizationId: string
): Promise<WebhookSubscription[]> {
  const snapshot = await db
    .collection(WEBHOOKS_COLLECTION)
    .where('organizationId', '==', organizationId)
    .where('active', '==', true)
    .where('events', 'array-contains', eventType)
    .get();

  return snapshot.docs.map((doc) => doc.data() as WebhookSubscription);
}

/**
 * Delivers webhook event to a single subscription
 */
export async function deliverWebhook(
  subscription: WebhookSubscription,
  event: WebhookEvent
): Promise<WebhookDeliveryResult> {
  const startTime = Date.now();

  try {
    const payload = JSON.stringify(event);
    const signature = generateWebhookSignature(payload, subscription.secret || '');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-FisioFlow-Signature': signature,
      'X-FisioFlow-Event': event.type,
      'X-FisioFlow-Delivery-Id': crypto.randomUUID(),
      'User-Agent': 'FisioFlow-Webhooks/1.0',
      ...subscription.headers,
    };

    const maxRetries = subscription.retryConfig?.maxRetries || 3;
    const retryDelay = subscription.retryConfig?.retryDelay || 1000;

    let lastError: Error | null = null;
    let statusCode = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(subscription.url, {
          method: 'POST',
          headers,
          body: payload,
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        statusCode = response.status;

        // Success if status is 2xx
        if (response.ok || statusCode === 202) {
          const duration = Date.now() - startTime;

          logger.info('Webhook delivered successfully', {
            subscriptionId: subscription.id,
            eventType: event.type,
            statusCode,
            duration,
          });

          return {
            subscriptionId: subscription.id,
            success: true,
            statusCode,
            duration,
          };
        }

        // Retry on server errors and rate limits
        if (attempt < maxRetries && (statusCode >= 500 || statusCode === 429)) {
          const delay = retryDelay * Math.pow(2, attempt);
          logger.warn('Webhook delivery failed, retrying', {
            subscriptionId: subscription.id,
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            statusCode,
            delay,
          });
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        lastError = new Error(`HTTP ${statusCode}: ${response.statusText}`);
        break;
      } catch (error) {
        lastError = error as Error;

        // Retry on network errors
        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt);
          logger.warn('Webhook delivery network error, retrying', {
            subscriptionId: subscription.id,
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            error: (error as Error).message,
            delay,
          });
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        break;
      }
    }

    const duration = Date.now() - startTime;

    logger.error('Webhook delivery failed after retries', {
      subscriptionId: subscription.id,
      eventType: event.type,
      error: lastError?.message,
      duration,
    });

    return {
      subscriptionId: subscription.id,
      success: false,
      statusCode,
      error: lastError?.message || 'Unknown error',
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = (error as Error).message;

    logger.error('Webhook delivery error', {
      subscriptionId: subscription.id,
      error: errorMessage,
      duration,
    });

    return {
      subscriptionId: subscription.id,
      success: false,
      error: errorMessage,
      duration,
    };
  }
}

/**
 * Triggers webhook event to all active subscriptions
 */
export async function triggerWebhookEvent(
  db: Firestore,
  event: WebhookEvent
): Promise<WebhookDeliveryResult[]> {
  const subscriptions = await getActiveSubscriptions(
    db,
    event.type,
    event.organizationId
  );

  if (subscriptions.length === 0) {
    logger.debug('No active webhook subscriptions for event', {
      eventType: event.type,
      organizationId: event.organizationId,
    });
    return [];
  }

  logger.info('Triggering webhook event', {
    eventType: event.type,
    organizationId: event.organizationId,
    subscriptionCount: subscriptions.length,
  });

  // Deliver to all subscriptions in parallel
  const results = await Promise.allSettled(
    subscriptions.map(subscription => deliverWebhook(subscription, event))
  );

  // Update subscription failure counts
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const deliveryResult = result.value;
      const subscriptionRef = db.collection(WEBHOOKS_COLLECTION).doc(deliveryResult.subscriptionId);

      if (deliveryResult.success) {
        await subscriptionRef.update({
          failureCount: 0,
          lastSuccessAt: new Date(),
          lastTriggeredAt: new Date(),
        });
      } else {
        await subscriptionRef.update({
          failureCount: admin.firestore.FieldValue.increment(1),
          lastTriggeredAt: new Date(),
        });
      }
    }
  }

  // Log delivery results
  const logEntry = {
    eventId: event.id,
    eventType: event.type,
    organizationId: event.organizationId,
    timestamp: new Date(),
    results: results.map(r =>
      r.status === 'fulfilled' ? r.value : { success: false, error: 'Promise rejected' }
    ),
  };

  await db.collection(WEBHOOK_DELIVERY_LOGS).add(logEntry);

  return results.map((r) =>
    r.status === 'fulfilled' ? r.value : { subscriptionId: 'unknown', success: false, error: 'Promise rejected', duration: 0 }
  ) as WebhookDeliveryResult[];
}

/**
 * Creates a webhook event object
 */
export function createWebhookEvent(
  type: WebhookEventType,
  data: any,
  organizationId: string,
  userId?: string
): WebhookEvent {
  return {
    id: crypto.randomUUID(),
    type,
    data,
    timestamp: new Date(),
    organizationId,
    userId,
  };
}

/**
 * Helper functions for common webhook triggers
 */
export const webhookHelpers = {
  patientCreated: (db: Firestore, patientData: any, organizationId: string, userId: string) => {
    const event = createWebhookEvent(
      WebhookEventType.PATIENT_CREATED,
      { patient: patientData },
      organizationId,
      userId
    );
    return triggerWebhookEvent(db, event);
  },

  appointmentCreated: (db: Firestore, appointmentData: any, organizationId: string, userId: string) => {
    const event = createWebhookEvent(
      WebhookEventType.APPOINTMENT_CREATED,
      { appointment: appointmentData },
      organizationId,
      userId
    );
    return triggerWebhookEvent(db, event);
  },

  appointmentCompleted: (db: Firestore, appointmentData: any, organizationId: string) => {
    const event = createWebhookEvent(
      WebhookEventType.APPOINTMENT_COMPLETED,
      { appointment: appointmentData },
      organizationId
    );
    return triggerWebhookEvent(db, event);
  },

  paymentReceived: (db: Firestore, paymentData: any, organizationId: string) => {
    const event = createWebhookEvent(
      WebhookEventType.PAYMENT_RECEIVED,
      { payment: paymentData },
      organizationId
    );
    return triggerWebhookEvent(db, event);
  },

  sessionCompleted: (db: Firestore, sessionData: any, organizationId: string, userId: string) => {
    const event = createWebhookEvent(
      WebhookEventType.SESSION_COMPLETED,
      { session: sessionData },
      organizationId,
      userId
    );
    return triggerWebhookEvent(db, event);
  },
};

import * as admin from 'firebase-admin';
