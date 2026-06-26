/**
 * WhatsApp Dead Letter Queue Handler
 * 
 * Processes messages that failed after all retries from the WhatsApp inbound queue.
 * Logs the failure and stores the message in the database for manual review.
 */
import type { Env } from "../types/env";
import type { WhatsAppInboundMessage } from "../lib/whatsapp-queue";
import { createPool } from "../lib/db";
import { logToAxiom } from "../lib/axiom";

export async function handleWhatsAppDLQ(
  batch: MessageBatch<WhatsAppInboundMessage>,
  env: Env,
  ctx: ExecutionContext,
): Promise<void> {
  for (const message of batch.messages) {
    const msg = message.body;
    
    console.error(`[WA DLQ] Message failed after all retries: ${msg.metaMessageId}`);

    // Log for investigation
    ctx.waitUntil(
      logToAxiom(env, ctx, {
        level: "error",
        message: "whatsapp_message_dlq",
        event: "whatsapp_dlq",
        messageId: msg.metaMessageId,
        from: msg.from,
        phoneNumberId: msg.phoneNumberId,
        error: "Message failed after max retries",
        rawPayload: JSON.stringify(msg.rawPayload).slice(0, 2000),
      })
    );

    // Save to database for manual review (don't lose the message)
    try {
      const pool = await createPool(env);
      await pool.query(
        `INSERT INTO wa_dlq_messages (message_id, from_phone, phone_number_id, payload, failed_at, retry_count)
         VALUES ($1, $2, $3, $4, now(), 5)
         ON CONFLICT (message_id) DO NOTHING`,
        [msg.metaMessageId, msg.from, msg.phoneNumberId, JSON.stringify(msg.rawPayload)]
      );
    } catch (e) {
      console.error("[WA DLQ] Failed to persist DLQ message:", e);
    }

    // ACK to prevent infinite retries
    message.ack();
  }
}
