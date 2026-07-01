import { Hono } from "hono";
import { createPool } from "../lib/db";
import { broadcastToOrg } from "../lib/realtime";
import type { Env } from "../types/env";
import { verifyMetaSignature } from "./whatsapp";
import { writeEvent } from "../lib/analytics";
import type { WhatsAppInboundMessage } from "../lib/whatsapp-queue";

type RawEventState =
  | "received"
  | "signature_failed"
  | "payload_invalid"
  | "org_unresolved"
  | "processed"
  | "processing_error";

/**
 * Texto a persistir p/ uma mensagem inbound do WhatsApp. Usa o corpo real quando
 * existe (texto ou legenda de mídia); senão devolve um rótulo PT-BR amigável para
 * os tipos sem texto (interactive/reaction/location/contacts/sticker/…). Evita
 * gravar placeholders crus e conversas com "[mensagem sem texto]".
 */
export function inboundMessageText(msg: any): string | undefined {
  if (msg?.text?.body) return msg.text.body;
  const isMedia = ["image", "audio", "video", "document", "sticker"].includes(msg?.type);
  const mediaNode = msg?.[msg?.type] as { caption?: string } | undefined;
  if (isMedia && mediaNode?.caption) return mediaNode.caption;
  switch (msg?.type) {
    case "interactive":
      return (
        msg.interactive?.button_reply?.title ??
        msg.interactive?.list_reply?.title ??
        "🔘 Resposta interativa"
      );
    case "button":
      return msg.button?.text ?? "🔘 Clicou em um botão";
    case "reaction":
      return msg.reaction?.emoji ? `${msg.reaction.emoji} (reação)` : "❤️ Reação";
    case "location":
      return "📍 Enviou uma localização";
    case "contacts":
      return "👤 Compartilhou um contato";
    case "sticker":
      return "🌟 Enviou uma figurinha";
    case "order":
      return "🛒 Enviou um pedido";
    case "unsupported":
      return "❔ Mensagem não suportada";
    default:
      return undefined;
  }
}

function extractProviderEventId(body: Record<string, unknown>): string | null {
  return (
    (body as any).entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id ??
    (body as any).entry?.[0]?.changes?.[0]?.value?.statuses?.[0]?.id ??
    null
  );
}

function buildRawEventKey(
  eventType: string,
  phoneNumberId: string | null,
  entryId: string,
  providerEventId: string | null,
) {
  return [eventType, phoneNumberId ?? "no-phone", entryId || "no-entry", providerEventId || "no-provider"]
    .join(":")
    .replace(/\s+/g, "_");
}

interface RawEventParams {
  organizationId: string | null;
  eventType: string;
  rawBody: string;
  phoneNumberId: string | null;
  providerEventId: string | null;
  signatureValid: boolean;
  processingState: RawEventState;
  failureReason: string | null;
  requestPath: string;
}


function safeWaitUntil(c: any, promise: Promise<unknown>): void {
  if (c?.executionCtx?.waitUntil) {
    c.executionCtx.waitUntil(promise);
  } else {
    promise.catch(() => {});
  }
}

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");

  const verifyToken = c.env.WHATSAPP_VERIFY_TOKEN ?? "fisioflow_webhook_token";

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge, { status: 200 });
  }
  return c.json({ error: "Token de verificacao invalido" }, 403);
});

app.post("/", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-hub-signature-256");
  const appSecret = c.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    console.error("[WhatsApp Webhook] missing WHATSAPP_APP_SECRET");
    return c.json({ error: "App secret not configured" }, 500);
  }

  const valid = await verifyMetaSignature(appSecret, rawBody, signature);
  if (!valid) {
    const phoneNumberId = JSON.parse(rawBody || "{}").entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id ?? null;
    await writeWebhookAudit(c.env, {
      organizationId: null,
      eventType: "unknown",
      rawBody,
      phoneNumberId,
      providerEventId: null,
      signatureValid: false,
      processingState: "signature_failed",
      failureReason: "invalid_signature",
      requestPath: "/api/whatsapp/webhook",
    });
    return c.json({ error: "Assinatura invalida" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    await writeWebhookAudit(c.env, {
      organizationId: null,
      eventType: "unknown",
      rawBody,
      phoneNumberId: null,
      providerEventId: null,
      signatureValid: true,
      processingState: "payload_invalid",
      failureReason: "invalid_json",
      requestPath: "/api/whatsapp/webhook",
    });
    return c.json({ error: "Payload invalido" }, 400);
  }

  // Inbound messages go to the Cloudflare Queue for reliable processing.
  const { entriesToEnqueue, phoneNumberId } = await extractAndEnqueueMessages(body, c);

  // Status (sent/delivered/read/failed) and system events are NOT queued — they
  // must be reconciled inline, otherwise outbound messages stay "sent" forever
  // even when Meta fails delivery (e.g. 131047 outside the 24h window).
  safeWaitUntil(c, processWebhook(body, c.env, rawBody));

  return c.json({ status: "ok", enqueued: entriesToEnqueue.length, phoneNumberId });
});

/**
 * Extract messages from webhook payload and enqueue to Cloudflare Queue.
 * Returns the number of messages enqueued and the phone number ID.
 */
async function extractAndEnqueueMessages(
  body: Record<string, unknown>,
  c: any,
): Promise<{ entriesToEnqueue: WhatsAppInboundMessage[]; phoneNumberId: string | null }> {
  const entries = (body.entry as any[]) ?? [];
  const entriesToEnqueue: WhatsAppInboundMessage[] = [];
  let phoneNumberId: string | null = null;

  for (const entry of entries) {
    const changes = entry?.changes ?? [];
    for (const change of changes) {
      const value = change?.value;
      if (!value) continue;

      phoneNumberId = value.metadata?.phone_number_id ?? phoneNumberId;

      if (value.messages?.length) {
        for (const msg of value.messages) {
          // Mídia: o id e a legenda ficam em msg[type] (image/audio/video/document/sticker).
          const mediaNode = msg[msg.type as keyof typeof msg] as
            | { id?: string; caption?: string; mime_type?: string }
            | undefined;
          const isMedia = ["image", "audio", "video", "document", "sticker"].includes(msg.type);
          const text = inboundMessageText(msg);

          const message: WhatsAppInboundMessage = {
            type: "inbound_message",
            metaMessageId: msg.id,
            waId: value.contacts?.[0]?.wa_id ?? msg.from,
            from: msg.from,
            text,
            messageType: msg.type,
            mediaId: isMedia ? mediaNode?.id : undefined,
            mediaMimeType: isMedia ? mediaNode?.mime_type : undefined,
            rawPayload: body as Record<string, unknown>,
            organizationId: null, // Will be resolved by consumer
            phoneNumberId: phoneNumberId ?? "",
            timestamp: new Date().toISOString(),
          };
          entriesToEnqueue.push(message);
        }
      }
    }
  }

  if (entriesToEnqueue.length > 0) {
    // Enqueue messages to Cloudflare Queue for reliable processing
    const batch = entriesToEnqueue.map((msg) => ({ body: msg }));
    await c.env.WHATSAPP_QUEUE.sendBatch(batch);
    console.log(`[WhatsApp Webhook] Enqueued ${entriesToEnqueue.length} messages`);
  }

  return { entriesToEnqueue, phoneNumberId };
}

async function processWebhook(
  body: Record<string, unknown>,
  env: Env,
  rawBody: string,
): Promise<void> {
  try {
    const entries = (body.entry as any[]) ?? [];
    const pool = await createPool(env);

    for (const entry of entries) {
      const changes = entry?.changes ?? [];
      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        // Inbound messages are handled by the queue consumer; here we only
        // reconcile status/system events. Skip message-only changes to avoid
        // duplicate raw-event audit rows.
        if (!value.statuses?.length && !value.system) continue;

        const phoneNumberId = value.metadata?.phone_number_id ?? null;
        const eventType = value.statuses?.length ? "status" : value.system ? "system" : "unknown";
        const providerEventId = extractProviderEventId(body);

        const orgId = await resolveOrgId(pool, phoneNumberId ?? undefined);
        if (!orgId) {
          await storeRawEvent(pool, {
            organizationId: null,
            eventType,
            rawBody,
            phoneNumberId,
            providerEventId,
            signatureValid: true,
            processingState: "org_unresolved",
            failureReason: "phone_number_id_not_mapped",
            requestPath: "/api/whatsapp/webhook",
          });
          continue;
        }

        const rawEventId = await storeRawEvent(pool, {
          organizationId: orgId,
          eventType,
          rawBody,
          phoneNumberId,
          providerEventId,
          signatureValid: true,
          processingState: "received",
          failureReason: null,
          requestPath: "/api/whatsapp/webhook",
        });

        try {
          if (value.statuses?.length) {
            for (const status of value.statuses) {
              await handleStatus(pool, env, orgId, status);
            }
          }

          if (value.system) {
            await handleSystem(pool, orgId, value.system);
          }

          await updateRawEventState(pool, rawEventId, "processed", null);
        } catch (error) {
          await updateRawEventState(
            pool,
            rawEventId,
            "processing_error",
            error instanceof Error ? error.message : "unknown_processing_error",
          );
          throw error;
        }
      }
    }
  } catch (err) {
    console.error("[WhatsApp Webhook] processWebhook error:", err);
  }
}

async function resolveOrgId(pool: any, phoneNumberId: string | undefined): Promise<string | null> {
  if (!phoneNumberId) return null;
  try {
    const result = await pool.query(
      `SELECT id FROM organizations WHERE (settings->>'whatsapp_phone_number_id')::text = $1 LIMIT 1`,
      [phoneNumberId],
    );
    if (result.rows.length > 0) return result.rows[0].id;

    console.warn("[WhatsApp Webhook] Nenhuma org encontrada para phone_number_id:", phoneNumberId);
    return null;
  } catch (error) {
    console.error("[WhatsApp Webhook] resolveOrgId error:", error);
    return null;
  }
}

async function storeRawEvent(pool: any, params: RawEventParams): Promise<string> {
  const parsed = JSON.parse(params.rawBody || "{}");
  const entryId = parsed?.entry?.[0]?.id ?? "";
  const idempotencyKey = buildRawEventKey(
    params.eventType,
    params.phoneNumberId,
    entryId,
    params.providerEventId,
  );

  const result = await pool.query(
    `INSERT INTO wa_raw_events (
       organization_id, event_type, meta_message_id, phone_number_id, raw_payload,
       processed, processing_state, failure_reason, provider_event_id,
       signature_valid, request_path, idempotency_key, created_at
     ) VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, now())
     ON CONFLICT (idempotency_key)
     DO UPDATE SET raw_payload = EXCLUDED.raw_payload
     RETURNING id`,
    [
      params.organizationId,
      params.eventType,
      params.providerEventId,
      params.phoneNumberId,
      params.rawBody,
      params.processingState === "processed",
      params.processingState,
      params.failureReason,
      params.providerEventId,
      params.signatureValid,
      params.requestPath,
      idempotencyKey,
    ],
  );

  return result.rows[0].id;
}

async function writeWebhookAudit(env: Env, params: RawEventParams): Promise<void> {
  try {
    const pool = await createPool(env);
    await storeRawEvent(pool, params);
  } catch (err) {
    console.error("[WhatsApp Webhook] writeWebhookAudit error:", err);
  }
}

async function updateRawEventState(
  pool: any,
  rawEventId: string,
  state: RawEventState,
  failureReason: string | null,
): Promise<void> {
  await pool.query(
    `UPDATE wa_raw_events
     SET processing_state = $1, failure_reason = $2, processed = $3, processed_at = CASE WHEN $3 THEN now() ELSE processed_at END
     WHERE id = $4::uuid`,
    [state, failureReason, state === "processed", rawEventId],
  );
}

async function handleStatus(pool: any, env: Env, orgId: string, statusObj: any): Promise<void> {
  const metaMessageId = statusObj.id;
  if (!metaMessageId) return;

  try {
    const newStatus = statusObj.status;
    const statusMap: Record<string, string> = {
      sent: "sent",
      delivered: "delivered",
      read: "read",
      failed: "failed",
    };
    const mapped = statusMap[newStatus] ?? newStatus;

    if (newStatus === "failed") {
      console.error(
        `[WhatsApp Webhook] Message ${metaMessageId} failed. Errors:`,
        JSON.stringify(statusObj.errors, null, 2),
      );
    }

    await pool.query(`UPDATE wa_messages SET status = $1 WHERE meta_message_id = $2`, [
      mapped,
      metaMessageId,
    ]);

    // Espelha o status nos envios de campanha (rastreio de entrega/leitura).
    if (mapped === "delivered" || mapped === "read" || mapped === "failed") {
      const campanhaStatus =
        mapped === "delivered" ? "entregue" : mapped === "read" ? "lido" : "falha";
      await pool.query(
        `UPDATE crm_campanha_envios
            SET status = $1,
                delivered_at = CASE WHEN $1 IN ('entregue', 'lido') AND delivered_at IS NULL
                                    THEN now() ELSE delivered_at END,
                read_at = CASE WHEN $1 = 'lido' THEN now() ELSE read_at END
          WHERE meta_message_id = $2`,
        [campanhaStatus, metaMessageId],
      );
    }

    writeEvent(env, {
      orgId,
      event: `whatsapp_${mapped}`,
    });

    const recipientId = statusObj.recipient_id;
    const recipientUserId = statusObj.recipient_user_id;
    const parentRecipientUserId = statusObj.parent_recipient_user_id;

    if (recipientUserId) {
      try {
        const contactResult = await pool.query(
          `SELECT id, bsuid, parent_bsuid FROM whatsapp_contacts WHERE organization_id = $1::uuid AND wa_id = $2 LIMIT 1`,
          [orgId, recipientId],
        );
        if (contactResult.rows.length > 0) {
          const contact = contactResult.rows[0];
          const updates: string[] = [];
          const params: any[] = [];
          let idx = 1;

          if (recipientUserId && contact.bsuid !== recipientUserId) {
            updates.push(`bsuid = $${idx++}`);
            params.push(recipientUserId);
          }
          if (parentRecipientUserId && contact.parent_bsuid !== parentRecipientUserId) {
            updates.push(`parent_bsuid = $${idx++}`);
            params.push(parentRecipientUserId);
          }

          if (updates.length > 0) {
            updates.push(`updated_at = now()`);
            params.push(contact.id);
            await pool.query(
              `UPDATE whatsapp_contacts SET ${updates.join(", ")} WHERE id = $${idx}`,
              params,
            );
          }
        }
      } catch {}
    }

    await broadcastToOrg(env, orgId, {
      type: "whatsapp_status",
      metaMessageId,
      status: mapped,
      timestamp: statusObj.timestamp,
    });
  } catch (err) {
    console.error("[WhatsApp Webhook] handleStatus error:", err);
  }
}

async function handleSystem(pool: any, orgId: string, system: any): Promise<void> {
  try {
    const waId = system.wa_id ?? system.customer;
    if (!waId) return;

    const contactResult = await pool.query(
      `SELECT id FROM whatsapp_contacts WHERE organization_id = $1::uuid AND wa_id = $2 LIMIT 1`,
      [orgId, waId],
    );

    if (contactResult.rows.length > 0) {
      await pool.query(
        `INSERT INTO identity_history (contact_id, org_id, changes) VALUES ($1, $2, $3)`,
        [contactResult.rows[0].id, orgId, JSON.stringify({ system: system })],
      );
    }
  } catch (err) {
    console.error("[WhatsApp Webhook] handleSystem error:", err);
  }
}


export { app as whatsappWebhookRoutes };
