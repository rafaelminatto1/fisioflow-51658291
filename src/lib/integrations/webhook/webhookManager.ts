/**
 * Webhook Manager - Sistema genérico de webhooks
 * Gerencia webhooks de entrada com verificação de assinatura
 */



// ============================================================================
// Webhook Signature Verification
// ============================================================================

/**
 * Gera assinatura HMAC para webhook
 */

import { createHmac, timingSafeEqual } from 'crypto';

export function generateWebhookSignature(
  payload: string,
  secret: string,
  algorithm: 'sha256' | 'sha512' = 'sha256'
): string {
  return createHmac(algorithm, secret)
    .update(payload, 'utf8')
    .digest('hex');
}

/**
 * Verifica assinatura do webhook
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: 'sha256' | 'sha512' = 'sha256'
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret, algorithm);

  // Timing-safe comparison para prevenir timing attacks
  return timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expectedSignature, 'utf8')
  );
}

/**
 * Extrai assinatura do header
 * Suporta formatos: "sha256=...", "sha256 ...", ou apenas o hash
 */
export function parseWebhookSignature(
  headerValue: string,
  algorithm: 'sha256' | 'sha512' = 'sha256'
): string | null {
  if (!headerValue) return null;

  const normalized = headerValue.trim().toLowerCase();

  // Formato "algorithm=hash"
  if (normalized.includes('=')) {
    const parts = normalized.split('=');
    if (parts[0] === algorithm && parts[1]) {
      return parts[1];
    }
  }

  // Formato "algorithm hash"
  if (normalized.startsWith(algorithm + ' ')) {
    return normalized.slice(algorithm.length + 1);
  }

  // Apenas o hash
  return normalized;
}

// ============================================================================
// Webhook Event Handler
// ============================================================================

export interface WebhookContext {
  organizationId: string;
  integrationId: string;
  webhookSecret: string;
  eventId: string;
}

export type WebhookHandler = (
  payload: unknown,
  context: WebhookContext
) => Promise<void | WebhookResponse>;

export interface WebhookResponse {
  status: number;
  body?: unknown;
}

/**
 * Processa webhook genérico
 */
export async function handleWebhook(
  payload: string | Buffer,
  signature: string | null,
  headers: Record<string, string>,
  handler: WebhookHandler,
  context: WebhookContext
): Promise<{ status: number; body: unknown }> {
  // Verificar assinatura
  if (context.webhookSecret) {
    if (!signature) {
      return {
        status: 401,
        body: { error: 'Missing signature' },
      };
    }

    const signatureHash = parseWebhookSignature(signature);

    if (!signatureHash || !verifyWebhookSignature(payload.toString(), signatureHash, context.webhookSecret)) {
      return {
        status: 401,
        body: { error: 'Invalid signature' },
      };
    }
  }

  // Parse payload
  let parsedPayload: unknown;
  try {
    parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString());
  } catch {
    return {
      status: 400,
      body: { error: 'Invalid JSON' },
    };
  }

  // Executar handler
  try {
    const response = await handler(parsedPayload, context);
    return {
      status: response?.status || 200,
      body: response?.body || { received: true },
    };
  } catch (error) {
    console.error('Webhook handler error:', error);
    return {
      status: 500,
      body: { error: 'Internal server error' },
    };
  }
}

// ============================================================================
// Retry Queue
// ============================================================================

export interface WebhookRetryConfig {
  maxAttempts: number;
  backoffMs: number;
  maxBackoffMs: number;
  exponentialBackoff: boolean;
}

const DEFAULT_RETRY_CONFIG: WebhookRetryConfig = {
  maxAttempts: 3,
  backoffMs: 1000,
  maxBackoffMs: 60000,
  exponentialBackoff: true,
};

/**
 * Envia webhook com retry
 */
export async function sendWebhookWithRetry(
  url: string,
  payload: unknown,
  signature: string,
  config: Partial<WebhookRetryConfig> = {}
): Promise<boolean> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

  let attempt = 0;
  let backoff = retryConfig.backoffMs;

  while (attempt < retryConfig.maxAttempts) {
    attempt++;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return true;
      }

      // Não fazer retry para erros de cliente (4xx)
      if (response.status >= 400 && response.status < 500) {
        return false;
      }
    } catch (_error) {
      // Erro de rede - tentar novamente
    }

    // Aguardar antes do próximo retry
    if (attempt < retryConfig.maxAttempts) {
      await sleep(backoff);

      if (retryConfig.exponentialBackoff) {
        backoff = Math.min(backoff * 2, retryConfig.maxBackoffMs);
      }
    }
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Webhook Logging
// ============================================================================

export interface WebhookLog {
  id: string;
  organization_id: string;
  integration_id: string;
  event_type: string;
  url: string;
  status: 'pending' | 'delivered' | 'failed';
  status_code?: number;
  attempt: number;
  max_attempts: number;
  next_retry_at?: Date;
  error?: string;
  created_at: Date;
  delivered_at?: Date;
}

/**
 * Salva log de tentativa de entrega
 */
export async function logWebhookDelivery(
  db: unknown, // Firestore instance
  log: Omit<WebhookLog, 'id' | 'created_at'>
): Promise<string> {
  const logRef = db.collection('webhook_logs').doc();
  const now = new Date();

  await logRef.set({
    ...log,
    id: logRef.id,
    created_at: now,
  });

  return logRef.id;
}

/**
 * Atualiza log de delivery
 */
export async function updateWebhookLog(
  db: unknown,
  logId: string,
  updates: Partial<WebhookLog>
): Promise<void> {
  await db.collection('webhook_logs').doc(logId).update(updates);
}

// ============================================================================
// Provider-Specific Handlers
// ============================================================================

/**
 * Handler para Stripe webhooks
 */
export async function handleStripeWebhook(
  payload: unknown,
  context: WebhookContext,
  handlers: {
    onCheckoutCompleted?: (session: unknown) => Promise<void>;
    onInvoicePaid?: (invoice: unknown) => Promise<void>;
    onSubscriptionCreated?: (subscription: unknown) => Promise<void>;
  }
): Promise<WebhookResponse> {
  const eventType = payload.type;

  switch (eventType) {
    case 'checkout.session.completed':
      await handlers.onCheckoutCompleted?.(payload.data.object);
      break;

    case 'invoice.paid':
      await handlers.onInvoicePaid?.(payload.data.object);
      break;

    case 'customer.subscription.created':
      await handlers.onSubscriptionCreated?.(payload.data.object);
      break;

    default:
      console.log(`Unhandled Stripe event: ${eventType}`);
  }

  return { status: 200, body: { received: true } };
}

/**
 * Handler para Google Calendar webhooks
 */
export async function handleGoogleCalendarWebhook(
  payload: unknown,
  context: WebhookContext,
  handlers: {
    onEventCreated?: (eventId: string, eventData: unknown) => Promise<void>;
    onEventUpdated?: (eventId: string, eventData: unknown) => Promise<void>;
    onEventDeleted?: (eventId: string) => Promise<void>;
  }
): Promise<WebhookResponse> {
  for (const item of payload.items || []) {
    switch (item.kind) {
      case 'calendar#event':
        if (item.status === 'cancelled') {
          await handlers.onEventDeleted?.(item.id);
        } else if (item.id.includes('_recurrence')) {
          await handlers.onEventUpdated?.(item.id, item);
        } else {
          await handlers.onEventCreated?.(item.id, item);
        }
        break;
    }
  }

  return { status: 200, body: { received: true } };
}

/**
 * Handler para Zoom webhooks
 */
export async function handleZoomWebhook(
  payload: unknown,
  context: WebhookContext,
  handlers: {
    onMeetingStarted?: (meetingId: string, data: unknown) => Promise<void>;
    onMeetingEnded?: (meetingId: string, data: unknown) => Promise<void>;
    onRecordingCompleted?: (meetingId: string, downloadUrl: string) => Promise<void>;
  }
): Promise<WebhookResponse> {
  const event = payload.event;
  const meetingId = payload.object?.id;

  switch (event) {
    case 'meeting.started':
      await handlers.onMeetingStarted?.(meetingId, payload);
      break;

    case 'meeting.ended':
      await handlers.onMeetingEnded?.(meetingId, payload);
      break;

    case 'recording.completed':
      await handlers.onRecordingCompleted?.(meetingId, payload.object?.download_url);
      break;

    default:
      console.log(`Unhandled Zoom event: ${event}`);
  }

  return { status: 200, body: { received: true } };
}

// ============================================================================
// Express Middleware (para uso em Cloud Functions)
// ============================================================================

/**
 * Cria middleware para processar webhooks
 */
export function createWebhookMiddleware(
  getSecret: (integrationId: string) => Promise<string | null>
) {
  return async (
    req: {
      body: unknown;
      headers: Record<string, string>;
      method: string;
    },
    res: {
      status: (code: number) => unknown;
      json: (data: unknown) => void;
    },
    next: () => void
  ) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const signature = req.headers['x-webhook-signature'] || req.headers['x-hub-signature'] || req.headers['x-zm-signature'];
    const integrationId = req.params.integrationId;

    if (!integrationId) {
      return res.status(400).json({ error: 'Missing integration ID' });
    }

    const secret = await getSecret(integrationId);

    if (!secret) {
      return res.status(401).json({ error: 'Integration not found' });
    }

    const payload = JSON.stringify(req.body);

    if (!verifyWebhookSignature(payload, signature || '', secret)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Adicionar contexto ao request
    (req as unknown).webhook = {
      verified: true,
      integrationId,
    };

    next();
  };
}
