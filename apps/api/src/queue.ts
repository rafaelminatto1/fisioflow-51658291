import type { Env } from './types/env';
import { createPool } from './lib/db';
import { writeEvent } from './lib/analytics';

export type WhatsAppQueuePayload = {
  to: string;
  templateName: string;
  languageCode: string;
  bodyParameters: Array<{ type: 'text'; text: string }>;
  organizationId: string;
  patientId: string;
  messageText: string;
  appointmentId: string;
};

export type QueueTask =
  | { type: 'SEND_WHATSAPP'; payload: WhatsAppQueuePayload }
  | { type: 'PROCESS_BACKUP'; payload: Record<string, unknown> }
  | { type: 'CLEANUP_LOGS'; payload: Record<string, unknown> };

/**
 * Handler para o Cloudflare Queues.
 * Processa tarefas em segundo plano: WhatsApp, backup, limpeza.
 * Retries automáticos pela política da fila (max_retries = 3).
 */
export async function handleQueue(batch: MessageBatch<QueueTask>, env: Env): Promise<void> {
  for (const message of batch.messages) {
    const task = message.body;
    console.log(`[Queue] Processing task type: ${task.type}`);

    try {
      switch (task.type) {
        case 'SEND_WHATSAPP':
          await processWhatsAppMessage(task.payload, env);
          break;
        case 'PROCESS_BACKUP':
        case 'CLEANUP_LOGS':
          console.log(`[Queue] Task ${task.type} acknowledged (no-op placeholder)`);
          break;
        default:
          console.warn(`[Queue] Unknown task type`);
      }

      message.ack();
    } catch (error) {
      console.error(`[Queue] Error processing task ${task.type}:`, error);
      message.retry();
    }
  }
}

async function processWhatsAppMessage(payload: WhatsAppQueuePayload, env: Env): Promise<void> {
  if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
    console.warn('[Queue/WhatsApp] Missing credentials, skipping.');
    return;
  }

  const metaRes = await fetch(
    `https://graph.facebook.com/v19.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: payload.to.replace(/\D/g, ''),
        type: 'template',
        template: {
          name: payload.templateName,
          language: { code: payload.languageCode },
          components: [
            {
              type: 'body',
              parameters: payload.bodyParameters,
            },
          ],
        },
      }),
    },
  );

  if (!metaRes.ok) {
    const err = (await metaRes.json().catch(() => ({}))) as any;
    throw new Error(`WhatsApp API error ${metaRes.status}: ${err?.error?.message ?? 'unknown'}`);
  }

  const pool = createPool(env);
  await pool.query(
    `INSERT INTO whatsapp_messages (
      organization_id, patient_id, from_phone, to_phone, message, type, status, metadata, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
    [
      payload.organizationId,
      payload.patientId,
      'clinic',
      payload.to,
      payload.messageText,
      'template',
      'sent',
      JSON.stringify({
        appointment_id: payload.appointmentId,
        template_key: payload.templateName,
        auto: true,
        via_queue: true,
      }),
    ],
  );

  writeEvent(env, {
    event: 'whatsapp_sent',
    orgId: payload.organizationId,
    route: '/queue/whatsapp',
    method: 'QUEUE',
    status: 200,
  });

  console.log(`[Queue/WhatsApp] Sent to ${payload.to} (appointment ${payload.appointmentId})`);
}
