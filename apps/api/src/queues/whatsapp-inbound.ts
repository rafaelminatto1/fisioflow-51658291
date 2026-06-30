/**
 * WhatsApp Inbound Queue Consumer
 * 
 * Processes messages from the fisioflow-whatsapp-inbound Cloudflare Queue.
 * Provides reliable, retryable processing decoupled from the webhook handler.
 */
import type { Env } from "../types/env";
import type { WhatsAppInboundMessage } from "../lib/whatsapp-queue";
import { createPool } from "../lib/db";
import { resolveOrCreateContact, linkContactToPatient } from "../lib/whatsapp-identity";
import { findOrCreateConversation, addMessage } from "../lib/whatsapp-conversations";
import { broadcastToOrg } from "../lib/realtime";
import { writeEvent } from "../lib/analytics";
import { AIConciergeService } from "../services/ai-concierge";
import { WhatsAppService } from "../lib/whatsapp";
import { mirrorWhatsAppMedia } from "../lib/media-mirror";

/**
 * Resolve organization ID from phone number ID (WhatsApp) or Instagram account ID.
 */
async function resolveOrgId(pool: any, phoneNumberId: string): Promise<string | null> {
  if (!phoneNumberId) return null;
  try {
    // Try WhatsApp phone number ID first
    const waResult = await pool.query(
      `SELECT id FROM organizations WHERE (settings->>'whatsapp_phone_number_id')::text = $1 LIMIT 1`,
      [phoneNumberId],
    );
    if (waResult.rows[0]?.id) return waResult.rows[0].id;

    // Try Instagram business account ID
    const igResult = await pool.query(
      `SELECT id FROM organizations WHERE (settings->>'instagram_business_account_id')::text = $1 LIMIT 1`,
      [phoneNumberId],
    );
    return igResult.rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Main entry point for the Cloudflare Queue consumer.
 * Called by the runtime when messages arrive in the queue.
 */
export async function handleWhatsAppInboundQueue(
  batch: MessageBatch<WhatsAppInboundMessage>,
  env: Env,
): Promise<void> {
  const pool = await createPool(env);

  for (const message of batch.messages) {
    const msg = message.body;

    try {
      // 1. Idempotency check via D1
      if (env.DB) {
        const dup = await env.DB
          .prepare("SELECT 1 FROM wa_idempotency WHERE message_id = ? AND created_at > datetime('now', '-24 hours')")
          .bind(msg.metaMessageId)
          .first();
        if (dup) {
          console.log(`[WA Queue] Duplicate message ${msg.metaMessageId}, acking`);
          message.ack();
          continue;
        }
      }

      // 2. Resolve organization from phone number
      const orgId = await resolveOrgId(pool, msg.phoneNumberId);
      if (!orgId) {
        console.error(`[WA Queue] No org for phone ${msg.phoneNumberId}, retrying`);
        message.retry();
        continue;
      }

      // 3. Resolve or create contact
      const contact = await resolveOrCreateContact(
        pool,
        orgId,
        msg.waId,
        null,
        null,
        null,
        null,
        null,
      );
      if (!contact) {
        console.error(`[WA Queue] Failed to resolve contact ${msg.waId}, retrying`);
        message.retry();
        continue;
      }

      // 4. Link to patient if phone matches
      if (!contact.patient_id && msg.from) {
        try {
          const cleanedPhone = msg.from.replace(/\D/g, "");
          const patientResult = await pool.query(
            `SELECT id FROM patients WHERE organization_id = $1 AND REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), '-', '') LIKE '%' || $2 LIMIT 1`,
            [orgId, cleanedPhone.slice(-8)],
          );
          if (patientResult.rows.length > 0) {
            await linkContactToPatient(pool, contact.id, patientResult.rows[0].id);
          }
        } catch {
          // Non-critical, continue
        }
      }

      // 5. Find or create conversation
      const conversation = await findOrCreateConversation(pool, orgId, contact.id, "whatsapp");
      if (!conversation) {
        console.error(`[WA Queue] Failed to create conversation, retrying`);
        message.retry();
        continue;
      }

      // 6. Resolve + mirror inbound media to R2 (URLs da Meta expiram → 403).
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;
      if (msg.mediaId) {
        const mirrored = await mirrorWhatsAppMedia(env, msg.mediaId);
        if (mirrored) {
          mediaUrl = mirrored.url;
          mediaType = msg.messageType;
        }
      }

      // Conteúdo textual: legenda (se houver) ou rótulo amigável p/ mídia sem texto.
      const isMedia = Boolean(msg.mediaId);
      const content = msg.text
        ? msg.text
        : isMedia
          ? `[${msg.messageType}]`
          : JSON.stringify(msg.rawPayload);

      // 7. Save message (this also updates last_message_at on the conversation)
      const savedMsg = await addMessage(
        pool,
        conversation.id,
        orgId,
        contact.id,
        "inbound",
        "contact",
        contact.id,
        msg.messageType,
        content,
        msg.metaMessageId,
        mediaUrl ? { mediaUrl, mediaType } : undefined,
      );

      // 7. Mark as processed in D1 for idempotency
      if (env.DB) {
        await env.DB
          .prepare("INSERT OR REPLACE INTO wa_idempotency (message_id, created_at) VALUES (?, datetime('now'))")
          .bind(msg.metaMessageId)
          .run();
      }

      // 8. Broadcast to frontend via Durable Object
      await broadcastToOrg(env, orgId, {
        type: "whatsapp_new_message",
        conversationId: conversation.id,
        message: {
          id: savedMsg.id,
          content: msg.text || "",
          direction: "inbound",
          messageType: msg.messageType,
          createdAt: savedMsg.created_at,
        },
        contact: {
          id: contact.id,
          name: contact.display_name,
          phone: msg.from,
        },
      });

      // 9. Analytics event
      writeEvent(env, { orgId, event: "whatsapp_message_received" });

      // 10. Process AI Concierge — awaited so the outbound send is not killed
      // when the consumer returns (fire-and-forget after ack() is unreliable in
      // Workers). The customer just messaged us, so we are within the 24h window.
      await processConciergeAsync(
        env,
        pool,
        orgId,
        conversation.id,
        contact.id,
        msg.from || msg.waId,
        msg.text || "",
      );

      // 11. Acknowledge successful processing
      message.ack();
      console.log(`[WA Queue] Processed message ${msg.metaMessageId} for org ${orgId}`);
    } catch (error) {
      console.error(`[WA Queue] Error processing message ${msg.metaMessageId}:`, error);
      message.retry();
    }
  }
}

/**
 * Process AI Concierge response asynchronously.
 * This does not block the queue processing.
 */
async function processConciergeAsync(
  env: Env,
  pool: any,
  orgId: string,
  conversationId: string,
  contactId: string,
  recipient: string,
  text: string,
): Promise<void> {
  try {
    const concierge = await AIConciergeService.processMessage(
      env,
      orgId,
      text,
      [],
    );

    if (concierge.answerable && concierge.reply && concierge.reply.length >= 2) {
      // Actually deliver the reply to the customer via Meta. We are within the
      // 24h customer-service window (they just messaged), so free-form text is
      // allowed and will deliver.
      const whatsapp = new WhatsAppService(env);
      const sendResult = (await whatsapp.sendTextMessage(recipient, concierge.reply)) as {
        messages?: { id?: string }[];
        error?: unknown;
      };
      const metaMessageId = sendResult?.messages?.[0]?.id ?? null;
      const sendStatus = metaMessageId ? "sent" : "failed";

      // Persist the reply with its real delivery status (sent/failed).
      await addMessage(
        pool,
        conversationId,
        orgId,
        contactId,
        "outbound",
        "system",
        contactId,
        "text",
        concierge.reply,
        metaMessageId ?? `ai_${Date.now()}`,
        {
          status: sendStatus,
          metadata: {
            autoReply: true,
            whatsappSend: {
              status: sendStatus,
              metaMessageId,
              error: metaMessageId ? null : sendResult?.error ?? "send_failed",
            },
          },
        },
      );

      // Broadcast the reply
      await broadcastToOrg(env, orgId, {
        type: sendStatus === "failed" ? "whatsapp_message_failed" : "whatsapp_message",
        conversationId,
        message: {
          content: concierge.reply,
          direction: "outbound",
          messageType: "text",
          status: sendStatus,
        },
      });

      writeEvent(env, {
        orgId,
        event: sendStatus === "failed" ? "whatsapp_concierge_failed" : "whatsapp_concierge_replied",
      });
    }
  } catch (error) {
    console.error("[WA Queue] Concierge error:", error);
    // Non-critical - inbound message is already saved
  }
}
