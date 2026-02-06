/**
 * Webhook Management Functions
 * Functions for managing webhook subscriptions and testing
 */

import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

import {
  subscribeToWebhook,
  unsubscribeFromWebhook,
  WebhookEventType,
  WebhookSubscription,
  createWebhookEvent,
} from '../lib/webhooks';

const db = admin.firestore();

export const subscribeWebhookHandler = async (request: any) => {
  const { data } = request;
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { url, events, secret, organizationId, headers, retryConfig } = data as {
    url: string;
    events: WebhookEventType[];
    secret?: string;
    organizationId: string;
    headers?: Record<string, string>;
    retryConfig?: { maxRetries: number; retryDelay: number };
  };

  // Validate input
  if (!url || !events || events.length === 0 || !organizationId) {
    throw new HttpsError(
      'invalid-argument',
      'URL, events array, and organizationId are required'
    );
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new HttpsError('invalid-argument', 'Invalid URL format');
  }

  // Validate events
  const validEvents = Object.values(WebhookEventType);
  for (const event of events) {
    if (!validEvents.includes(event)) {
      throw new HttpsError('invalid-argument', `Invalid event type: ${event}`);
    }
  }

  try {
    const subscriptionId = await subscribeToWebhook(db, {
      url,
      events,
      secret,
      organizationId,
      active: true,
      headers,
      retryConfig,
    });

    return { success: true, subscriptionId };
  } catch (error) {
    throw new HttpsError(
      'internal',
      `Failed to create subscription: ${(error as Error).message}`
    );
  }
};

export const subscribeWebhook = onCall(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
  },
  subscribeWebhookHandler
);

/**
 * Unsubscribe from webhook events
 * Deletes an existing webhook subscription
 */
export const unsubscribeWebhookHandler = async (request: any) => {
  const { data } = request;
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { subscriptionId, organizationId } = data as {
    subscriptionId: string;
    organizationId: string;
  };

  if (!subscriptionId || !organizationId) {
    throw new HttpsError(
      'invalid-argument',
      'subscriptionId and organizationId are required'
    );
  }

  try {
    const deleted = await unsubscribeFromWebhook(db, subscriptionId, organizationId);

    if (!deleted) {
      throw new HttpsError('not-found', 'Webhook subscription not found');
    }

    return { success: true };
  } catch (error) {
    if ((error as HttpsError).code === 'not-found') {
      throw error;
    }
    throw new HttpsError(
      'internal',
      `Failed to delete subscription: ${(error as Error).message}`
    );
  }
};

export const unsubscribeWebhook = onCall(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
  },
  unsubscribeWebhookHandler
);

/**
 * List webhook subscriptions
 * Returns all webhook subscriptions for an organization
 */
export const listWebhooksHandler = async (request: any) => {
  const { data } = request;
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { organizationId } = data as { organizationId: string };

  if (!organizationId) {
    throw new HttpsError('invalid-argument', 'organizationId is required');
  }

  try {
    const snapshot = await db
      .collection('webhook_subscriptions')
      .where('organizationId', '==', organizationId)
      .get();

    const subscriptions = snapshot.docs.map(doc => {
      const data = doc.data();
      // Don't expose the secret
      const { secret, ...safeData } = data;
      return {
        id: doc.id,
        ...safeData,
      };
    });

    return { subscriptions };
  } catch (error) {
    throw new HttpsError(
      'internal',
      `Failed to list subscriptions: ${(error as Error).message}`
    );
  }
};

export const listWebhooks = onCall(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
  },
  listWebhooksHandler
);

/**
 * Test webhook delivery
 * Sends a test event to a webhook subscription
 */
export const testWebhookHandler = async (request: any) => {
  const { data } = request;
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { subscriptionId, organizationId } = data as {
    subscriptionId: string;
    organizationId: string;
  };

  if (!subscriptionId || !organizationId) {
    throw new HttpsError(
      'invalid-argument',
      'subscriptionId and organizationId are required'
    );
  }

  try {
    // Get subscription
    const subscriptionDoc = await db
      .collection('webhook_subscriptions')
      .doc(subscriptionId)
      .get();

    if (!subscriptionDoc.exists) {
      throw new HttpsError('not-found', 'Webhook subscription not found');
    }

    const subscription = subscriptionDoc.data() as WebhookSubscription;

    // Create test event
    const testEvent = createWebhookEvent(
      'test.event' as WebhookEventType,
      {
        test: true,
        message: 'This is a test webhook event from FisioFlow',
        timestamp: new Date().toISOString(),
      },
      organizationId,
      userId
    );

    // Import deliverWebhook and send test
    const { deliverWebhook } = await import('../lib/webhooks');
    const result = await deliverWebhook(subscription, testEvent);

    return {
      success: result.success,
      statusCode: result.statusCode,
      error: result.error,
      duration: result.duration,
    };
  } catch (error) {
    if ((error as HttpsError).code === 'not-found') {
      throw error;
    }
    throw new HttpsError(
      'internal',
      `Failed to test webhook: ${(error as Error).message}`
    );
  }
};

export const testWebhook = onCall(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
    timeoutSeconds: 60,
  },
  testWebhookHandler
);

/**
 * Webhook event types list
 * Returns available event types for subscription
 */
export const getWebhookEventTypesHandler = async (req: any, res: any) => {
  // CORS handling
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const eventTypes = Object.values(WebhookEventType).map(type => ({
    type,
    category: type.split('.')[0],
    description: getEventTypeDescription(type),
  }));

  // Group by category
  const grouped = eventTypes.reduce((acc, eventType) => {
    if (!acc[eventType.category]) {
      acc[eventType.category] = [];
    }
    acc[eventType.category].push(eventType);
    return acc;
  }, {} as Record<string, typeof eventTypes>);

  res.json({
    eventTypes: grouped,
  });
};

export const getWebhookEventTypes = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
  },
  getWebhookEventTypesHandler
);

function getEventTypeDescription(type: WebhookEventType): string {
  const descriptions: Record<WebhookEventType, string> = {
    [WebhookEventType.PATIENT_CREATED]: 'Triggered when a new patient is registered',
    [WebhookEventType.PATIENT_UPDATED]: 'Triggered when patient information is updated',
    [WebhookEventType.PATIENT_DELETED]: 'Triggered when a patient is deleted',
    [WebhookEventType.APPOINTMENT_CREATED]: 'Triggered when an appointment is scheduled',
    [WebhookEventType.APPOINTMENT_UPDATED]: 'Triggered when an appointment is modified',
    [WebhookEventType.APPOINTMENT_CANCELLED]: 'Triggered when an appointment is cancelled',
    [WebhookEventType.APPOINTMENT_COMPLETED]: 'Triggered when an appointment is completed',
    [WebhookEventType.TREATMENT_STARTED]: 'Triggered when a treatment plan is started',
    [WebhookEventType.TREATMENT_COMPLETED]: 'Triggered when a treatment plan is completed',
    [WebhookEventType.SESSION_COMPLETED]: 'Triggered when a treatment session is completed',
    [WebhookEventType.ASSESSMENT_CREATED]: 'Triggered when an assessment is created',
    [WebhookEventType.ASSESSMENT_COMPLETED]: 'Triggered when an assessment is completed',
    [WebhookEventType.PAYMENT_RECEIVED]: 'Triggered when a payment is received',
    [WebhookEventType.PAYMENT_FAILED]: 'Triggered when a payment fails',
    [WebhookEventType.EXERCISE_ASSIGNED]: 'Triggered when exercises are assigned to a patient',
    [WebhookEventType.EXERCISE_COMPLETED]: 'Triggered when patient completes exercises',
  };

  return descriptions[type] || 'Event description not available';
}
