import { Hono } from "hono";
import { createPool } from "../lib/db";
import { broadcastToOrg } from "../lib/realtime";
import { resolveOrCreateContact, linkContactToPatient } from "../lib/whatsapp-identity";
import { findOrCreateConversation, addMessage } from "../lib/whatsapp-conversations";
import { isDuplicate, markProcessed } from "../lib/whatsapp-idempotency";
import type { Env } from "../types/env";
import { verifyMetaSignature } from "./whatsapp";
import { WhatsAppService } from "../lib/whatsapp";
import { writeEvent } from "../lib/analytics";
import { AIConciergeService } from "../services/ai-concierge";
import { needsHumanApproval } from "../lib/whatsappApproval";
import { notifyOrganization } from "../lib/push";
import type { WhatsAppInboundMessage } from "../lib/whatsapp-queue";

type RawEventState =
  | "received"
  | "signature_failed"
  | "payload_invalid"
  | "org_unresolved"
  | "processed"
  | "processing_error";

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
          const message: WhatsAppInboundMessage = {
            type: "inbound_message",
            metaMessageId: msg.id,
            waId: value.contacts?.[0]?.wa_id ?? msg.from,
            from: msg.from,
            text: msg.text?.body,
            messageType: msg.type,
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

async function handleMessage(
  pool: any,
  env: Env,
  orgId: string,
  msg: any,
  contacts: any[],
): Promise<void> {
  const metaMessageId = msg.id;
  if (!metaMessageId) return;

  if (env.DB) {
    const dup = await isDuplicate(env.DB, metaMessageId);
    if (dup) return;
  }

  try {
    const from: string = msg.from ?? "";
    const profile = contacts?.[0];
    const waId: string = profile?.wa_id ?? from;
    const username: string | null = profile?.profile?.username ?? null;
    const displayName: string | null = profile?.profile?.name ?? null;

    const bsuid: string | null =
      (msg.identity?.bsuid ?? msg.recipient_type === "individual")
        ? ((msg as any).biz_opaque_user_data ?? null)
        : null;
    const parentBsuid: string | null = msg.identity?.parent_bsuid ?? null;

    let messageType = "text";
    let content = "";
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;

    if (msg.type === "text" && msg.text?.body) {
      messageType = "text";
      content = msg.text.body;
    } else if (msg.type === "image") {
      messageType = "image";
      content = msg.image?.caption ?? "";
      mediaType = "image";
      mediaUrl = await resolveWhatsAppMediaUrl(env, msg.image?.id);
    } else if (msg.type === "audio") {
      messageType = "audio";
      content = msg.audio?.caption ?? "";
      mediaType = "audio";
    } else if (msg.type === "document") {
      messageType = "document";
      content = msg.document?.caption ?? "";
      mediaType = "document";
    } else if (msg.type === "video") {
      messageType = "video";
      content = msg.video?.caption ?? "";
      mediaType = "video";
    } else if (msg.type === "sticker") {
      messageType = "sticker";
      content = "";
    } else if (msg.type === "contacts") {
      messageType = "contacts";
      content = JSON.stringify(msg.contacts ?? []);
    } else if (msg.type === "location") {
      messageType = "location";
      content = JSON.stringify(msg.location ?? {});
    } else if (msg.type === "interactive") {
      messageType = "interactive";
      if (msg.interactive?.type === "button_reply") {
        content = JSON.stringify({
          type: "button_reply",
          id: msg.interactive.button_reply?.id,
          title: msg.interactive.button_reply?.title,
        });
      } else if (msg.interactive?.type === "list_reply") {
        content = JSON.stringify({
          type: "list_reply",
          id: msg.interactive.list_reply?.id,
          title: msg.interactive.list_reply?.title,
          description: msg.interactive.list_reply?.description,
        });
      } else {
        content = JSON.stringify(msg.interactive ?? {});
      }
    } else if (msg.type) {
      messageType = msg.type;
      content = msg[msg.type]?.body ?? JSON.stringify(msg[msg.type] ?? {});
    }

    if (!from) return;

    const contact = await resolveOrCreateContact(
      pool,
      orgId,
      waId,
      bsuid,
      parentBsuid,
      username,
      displayName,
    );
    if (!contact) return;

    if (!contact.patient_id) {
      try {
        const cleanedPhone = waId.replace(/\D/g, "");
        const patientResult = await pool.query(
          `SELECT id FROM patients WHERE organization_id = $1 AND REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), '-', '') LIKE '%' || $2 LIMIT 1`,
          [orgId, cleanedPhone.slice(-8)],
        );
        if (patientResult.rows.length > 0) {
          await linkContactToPatient(pool, contact.id, patientResult.rows[0].id);
        }
      } catch {}
    }

    const conversation = await findOrCreateConversation(pool, orgId, contact.id);
    if (!conversation) return;

    // Captura de origem de anúncio Click-to-WhatsApp (CTWA) — preenche origem/campanha no CRM.
    if (msg.referral && typeof msg.referral === "object") {
      try {
        const ref = msg.referral as Record<string, any>;
        const srcUrl: string = ref.source_url ?? "";
        const source = /instagram/i.test(srcUrl)
          ? "Instagram Ads"
          : /facebook|fb\.com/i.test(srcUrl)
            ? "Facebook Ads"
            : "Anúncio (CTWA)";
        const campaign = ref.headline || ref.body || ref.source_id || null;
        await pool.query(
          `UPDATE wa_conversations
           SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                 'source', $2::text,
                 'campaign', $3::text,
                 'ctwa', to_jsonb($4::json)
               )
           WHERE id = $1
             AND (metadata->>'source') IS NULL`,
          [conversation.id, source, campaign, JSON.stringify(ref)],
        );
      } catch (e) {
        console.warn("[WhatsApp Webhook] CTWA referral capture failed:", e);
      }
    }

    const savedMsg = await addMessage(
      pool,
      conversation.id,
      orgId,
      contact.id,
      "inbound",
      "contact",
      contact.id,
      messageType,
      content,
      metaMessageId,
      {
        mediaUrl,
        mediaType,
        metadata:
          messageType !== "text"
            ? {
                sourceType: msg.type,
                mediaId:
                  msg.image?.id ??
                  msg.audio?.id ??
                  msg.document?.id ??
                  msg.video?.id ??
                  undefined,
              }
            : undefined,
      },
    );

    if (env.DB) {
      await markProcessed(env.DB, metaMessageId);
    }

    await broadcastToOrg(env, orgId, {
      type: "whatsapp_message",
      conversationId: conversation.id,
      message: savedMsg,
      contact: {
        id: contact.id,
        wa_id: contact.wa_id,
        display_name: contact.display_name,
        username: contact.username,
      },
    });

    writeEvent(env, {
      orgId,
      event: "whatsapp_received",
      route: `type:${messageType}`,
    });

    // Intent handlers — appointment actions come first; fallback to concierge/task creation.
    // IMPORTANTE: estes handlers fazem chamadas de IA/HTTP que levam segundos. Precisam ser
    // AGUARDADOS aqui — processWebhook roda dentro de c.executionCtx.waitUntil, então o await
    // mantém o Worker vivo até o envio concluir. Em fire-and-forget o Worker congela antes
    // da resposta automática sair (lead novo nunca recebia a saudação do Concierge).
    // Texto efetivo p/ intents: mensagens de texto OU o título do botão/lista clicado.
    // Isso faz os botões dos templates (Confirmar/Remarcar/Fiz hoje/Ver horários) funcionarem.
    let effectiveText = "";
    if (messageType === "text") {
      effectiveText = content;
    } else if (msg.type === "interactive" && msg.interactive?.type === "button_reply") {
      effectiveText = msg.interactive.button_reply?.title ?? "";
    } else if (msg.type === "interactive" && msg.interactive?.type === "list_reply") {
      effectiveText = msg.interactive.list_reply?.title ?? "";
    }

    if (effectiveText && effectiveText.length > 1 && contact?.id) {
      const contactCtx = {
        id: String(contact.id),
        display_name: (contact.display_name as string | null) ?? null,
        patient_id: (contact.patient_id as string | null) ?? null,
        wa_id: contact.wa_id as string,
      };

      try {
        // #5 — adesão ao HEP via botão ("Fiz hoje" / "Ainda vou fazer")
        const adherenceHandled = await maybeHandleExerciseAdherence(
          env,
          orgId,
          contactCtx,
          effectiveText,
        );
        if (!adherenceHandled) {
          if (contactCtx.patient_id) {
            // Known patient — handle appointment intents first, then task creation
            const handled = await maybeHandleAppointmentIntent(
              pool,
              env,
              orgId,
              contactCtx,
              effectiveText,
            );
            if (!handled) {
              await maybeCreateTaskFromIntent(pool, orgId, contactCtx, effectiveText);
            }
          } else {
            // Unknown contact — AI Concierge greeting for new potential patients
            await maybeSendConciergeGreeting(
              pool,
              env,
              orgId,
              contactCtx,
              conversation.id,
              effectiveText,
            );
          }
        }
      } catch (err) {
        console.error("[WhatsApp Webhook] intent/concierge handler error:", err);
      }
    }
  } catch (err) {
    console.error("[WhatsApp Webhook] handleMessage error:", err);
    if (env.DB) {
      await markProcessed(env.DB, metaMessageId);
    }
  }
}

async function resolveWhatsAppMediaUrl(env: Env, mediaId: string | undefined): Promise<string | undefined> {
  if (!mediaId || !env.WHATSAPP_ACCESS_TOKEN) return undefined;

  try {
    const response = await fetch(`https://graph.facebook.com/v25.0/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      },
    });
    if (!response.ok) return undefined;
    const payload = (await response.json()) as { url?: unknown };
    return typeof payload.url === "string" && payload.url.length ? payload.url : undefined;
  } catch (error) {
    console.warn("[WhatsApp Webhook] resolveWhatsAppMediaUrl failed:", error);
    return undefined;
  }
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

// Intent classification → auto-create task
const INTENT_PATTERNS: Array<{
  pattern: RegExp;
  titulo: (name: string) => string;
  prioridade: string;
}> = [
  {
    pattern: /\b(dor|doendo|dói|doer|ardendo|latejando)\b/i,
    titulo: (n) => `Relato de dor — ${n}`,
    prioridade: "ALTA",
  },
  {
    pattern: /\b(piore[iu]|piorou|pioran[do]+|pior[ao]u)\b/i,
    titulo: (n) => `Queda na evolução — ${n}`,
    prioridade: "ALTA",
  },
  {
    pattern: /\b(exercício|treino|protocolo|plano|exerc[ií]cio)\b/i,
    titulo: (n) => `Dúvida sobre exercício — ${n}`,
    prioridade: "MEDIA",
  },
  {
    pattern: /\b(consulta|agendar|agendamento|marcar|remarcar|reagendar)\b/i,
    titulo: (n) => `Solicitação de consulta — ${n}`,
    prioridade: "MEDIA",
  },
  {
    pattern: /\b(retorno|acompanhamento|follow[ -]?up)\b/i,
    titulo: (n) => `Solicitação de retorno — ${n}`,
    prioridade: "MEDIA",
  },
  {
    pattern: /\b(urgente|emergência|emergencia|socorro|preciso de ajuda)\b/i,
    titulo: (n) => `Mensagem urgente — ${n}`,
    prioridade: "URGENTE",
  },
];

const CONFIRM_PATTERN =
  /\b(confirm[aoeiu]?|sim,?\s*confirm|ok|t[aá]\s+(ok|bom)|certo|vou|estarei|estou\s+indo)\b/i;
const CANCEL_PATTERN =
  /\b(cancel[aoeiu]?r?|desmarcar|n[ãa]o\s+(vou|posso|consigo)|n[ãa]o\s+vai\s+dar|n[aã]o\s+poderei)\b/i;
const RESCHEDULE_PATTERN =
  /\b(reagend|remarc|mudar|trocar|outra\s+hora|outro\s+dia|adiar|antecipar)\b/i;

type WebhookContact = {
  id: string;
  display_name?: string | null;
  patient_id?: string | null;
  wa_id: string;
};

async function findNextAppointment(pool: any, orgId: string, patientId: string) {
  const res = await pool.query(
    `SELECT id, start_time, end_time, status, therapist_id
     FROM appointments
     WHERE organization_id = $1::uuid
       AND patient_id = $2::uuid
       AND start_time >= NOW()
       AND status NOT IN ('cancelled', 'completed', 'no_show')
     ORDER BY start_time ASC
     LIMIT 1`,
    [orgId, patientId],
  );
  return res.rows[0] ?? null;
}

async function maybeHandleAppointmentIntent(
  pool: any,
  env: Env,
  orgId: string,
  contact: WebhookContact,
  text: string,
): Promise<boolean> {
  if (!contact.patient_id) return false;

  const isConfirm = CONFIRM_PATTERN.test(text);
  const isCancel = CANCEL_PATTERN.test(text);
  const isReschedule = RESCHEDULE_PATTERN.test(text);

  // Reagendar pode aparecer junto com cancel — priorizar reschedule
  const intent = isReschedule ? "reschedule" : isCancel ? "cancel" : isConfirm ? "confirm" : null;
  if (!intent) return false;

  const appt = await findNextAppointment(pool, orgId, contact.patient_id);
  if (!appt) return false;

  const whatsapp = new WhatsAppService(env);
  const displayName = contact.display_name ?? "Paciente";
  const startLocal = new Date(appt.start_time).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (intent === "confirm") {
    await pool.query(
      `UPDATE appointments SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
       WHERE id = $1::uuid AND organization_id = $2::uuid`,
      [appt.id, orgId],
    );
    await whatsapp.sendTextMessage(
      contact.wa_id,
      `Agendamento confirmado, ${displayName}! Te esperamos em ${startLocal}. ✅`,
    );
    await broadcastToOrg(env, orgId, {
      type: "appointment_confirmed",
      appointmentId: appt.id,
      via: "whatsapp",
      patientId: contact.patient_id,
    });
    writeEvent(env, { orgId, event: "whatsapp_intent_confirm" });
    return true;
  }

  if (intent === "cancel") {
    await pool.query(
      `UPDATE appointments SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = $3, updated_at = NOW()
       WHERE id = $1::uuid AND organization_id = $2::uuid`,
      [appt.id, orgId, `WhatsApp: ${text.slice(0, 200)}`],
    );
    await whatsapp.sendTextMessage(
      contact.wa_id,
      `Cancelado, ${displayName}. Quando quiser remarcar é só responder nessa mesma conversa.`,
    );
    await pool.query(
      `INSERT INTO tarefas (organization_id, created_by, titulo, descricao, status, prioridade, tipo,
         order_index, tags, label_ids, checklists, attachments, task_references, dependencies,
         requires_acknowledgment, acknowledgments, linked_entity_type, linked_entity_id)
       VALUES ($1, 'whatsapp_bot', $2, $3, 'A_FAZER', 'ALTA', 'TAREFA',
         0, '{}', '{}', '[]', '[]', '[]', '[]', false, '[]',
         'appointment', $4)`,
      [
        orgId,
        `Cancelamento via WhatsApp — ${displayName}`,
        `Paciente cancelou o agendamento de ${startLocal}.\nMensagem: "${text.slice(0, 500)}"`,
        appt.id,
      ],
    );
    await broadcastToOrg(env, orgId, {
      type: "appointment_cancelled",
      appointmentId: appt.id,
      via: "whatsapp",
      patientId: contact.patient_id,
    });
    writeEvent(env, { orgId, event: "whatsapp_intent_cancel" });
    return true;
  }

  if (intent === "reschedule") {
    await whatsapp.sendTextMessage(
      contact.wa_id,
      `Entendi que você quer reagendar, ${displayName}. Nossa equipe vai retornar em breve com opções de horário.`,
    );
    await pool.query(
      `INSERT INTO tarefas (organization_id, created_by, titulo, descricao, status, prioridade, tipo,
         order_index, tags, label_ids, checklists, attachments, task_references, dependencies,
         requires_acknowledgment, acknowledgments, linked_entity_type, linked_entity_id)
       VALUES ($1, 'whatsapp_bot', $2, $3, 'A_FAZER', 'ALTA', 'TAREFA',
         0, '{}', '{}', '[]', '[]', '[]', '[]', false, '[]',
         'appointment', $4)`,
      [
        orgId,
        `Reagendamento solicitado via WhatsApp — ${displayName}`,
        `Paciente pediu para reagendar ${startLocal}.\nMensagem: "${text.slice(0, 500)}"`,
        appt.id,
      ],
    );
    await broadcastToOrg(env, orgId, {
      type: "appointment_reschedule_requested",
      appointmentId: appt.id,
      via: "whatsapp",
      patientId: contact.patient_id,
    });
    writeEvent(env, { orgId, event: "whatsapp_intent_reschedule" });
    return true;
  }

  return false;
}

// #5 — Adesão ao HEP via botão/texto ("Fiz hoje" / "Ainda vou fazer").
const HEP_DONE_PATTERN = /^(fiz hoje|j[áa] fiz|feito|fiz os exerc)/i;
const HEP_LATER_PATTERN = /^(ainda vou fazer|vou fazer mais tarde)/i;

async function maybeHandleExerciseAdherence(
  env: Env,
  orgId: string,
  contact: { display_name?: string | null; wa_id: string },
  text: string,
): Promise<boolean> {
  const done = HEP_DONE_PATTERN.test(text.trim());
  const later = HEP_LATER_PATTERN.test(text.trim());
  if (!done && !later) return false;

  const whatsapp = new WhatsAppService(env);
  const name = contact.display_name ? `, ${contact.display_name.split(" ")[0]}` : "";
  if (done) {
    await whatsapp
      .sendTextMessage(
        contact.wa_id,
        `Boa${name}! 💪 Excelente constância — manter os exercícios em dia acelera sua recuperação.`,
      )
      .catch(() => null);
    writeEvent(env, { orgId, event: "hep_adherence_confirmed" });
  } else {
    await whatsapp
      .sendTextMessage(
        contact.wa_id,
        `Combinado${name}! Te lembro mais tarde. Capricha nos exercícios 😉`,
      )
      .catch(() => null);
    writeEvent(env, { orgId, event: "hep_adherence_later" });
  }
  return true;
}

// Tracks which wa_ids already got the concierge greeting (in-memory, per worker instance)
const conciergeGreetedThisSession = new Set<string>();

// Lê a config do Concierge de organizations.settings.crm_whatsapp.concierge
async function loadConciergeConfig(
  pool: any,
  orgId: string,
): Promise<{ enabled: boolean; autoReplyNewLeads: boolean; approvalIntents: string[] }> {
  const defaults = { enabled: true, autoReplyNewLeads: true, approvalIntents: ["urgent"] };
  try {
    const res = await pool.query(
      `SELECT settings->'crm_whatsapp'->'concierge' AS concierge FROM organizations WHERE id = $1 LIMIT 1`,
      [orgId],
    );
    const raw = res.rows[0]?.concierge;
    const cfg = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!cfg || typeof cfg !== "object") return defaults;
    return {
      enabled: cfg.enabled !== false,
      autoReplyNewLeads: cfg.autoReplyNewLeads !== false,
      approvalIntents: Array.isArray(cfg.approvalIntents) ? cfg.approvalIntents : defaults.approvalIntents,
    };
  } catch {
    return defaults;
  }
}

const _CONCIERGE_SCHEDULE_PATTERN =
  /\b(agendar|agendamento|consulta|marcar|avalia[çc][ãa]o|sessão|sessao|horário|horario|atendimento)\b/i;
const _CONCIERGE_INFO_PATTERN =
  /\b(informação|informacao|info|dúvida|duvida|preço|preco|valor|plano|convenio|funciona)\b/i;
const _CONCIERGE_URGENT_PATTERN =
  /\b(urgente|emergência|emergencia|socorro|dor forte|muito dor|dor intensa)\b/i;

async function maybeSendConciergeGreeting(
  pool: any,
  env: Env,
  orgId: string,
  contact: WebhookContact,
  conversationId: string,
  text: string,
): Promise<void> {
  const waId = contact.wa_id;

  // Respeita a config do CRM·WhatsApp (pode desligar a resposta automática)
  const conciergeCfg = await loadConciergeConfig(pool, orgId);
  if (!conciergeCfg.enabled || !conciergeCfg.autoReplyNewLeads) return;

  // Only send greeting once per session per contact to avoid spam
  if (conciergeGreetedThisSession.has(waId)) return;

  // Check if we already greeted this contact in DB (last 24h)
  const recentGreeting = await pool.query(
    `SELECT id FROM wa_messages
     WHERE conversation_id = $1::uuid
       AND direction = 'outbound'
       AND created_at > NOW() - INTERVAL '24 hours'
     LIMIT 1`,
    [conversationId],
  );
  if (recentGreeting.rows.length > 0) return;

  conciergeGreetedThisSession.add(waId);

  // 1. Get recent history for context
  const historyRes = await pool.query(
    `SELECT role, content FROM wa_messages 
     WHERE conversation_id = $1::uuid 
     ORDER BY created_at DESC LIMIT 5`,
    [conversationId],
  );
  const history = historyRes.rows.reverse().map((r: any) => ({
    role: r.role === "inbound" ? "user" : "assistant",
    content: r.content,
  }));

  // 2. Process with AI Concierge (includes Wiki search)
  const concierge = await AIConciergeService.processMessage(env, orgId, text, history);

  const whatsapp = new WhatsAppService(env);

  // HITL: resposta sensível, intenção marcada como "exige aprovação" na config, OU
  // pergunta fora das informações oficiais (answerable=false) → fila de aprovação
  // humana em vez de envio direto. Nunca enviamos resposta inventada.
  if (
    !concierge.answerable ||
    !concierge.reply ||
    needsHumanApproval(concierge.intent, text) ||
    conciergeCfg.approvalIntents.includes(concierge.intent)
  ) {
    await pool.query(
      `INSERT INTO whatsapp_pending_replies
         (organization_id, wa_id, conversation_id, original_message, suggested_reply, intent)
       VALUES ($1, $2, $3::uuid, $4, $5, $6)`,
      [orgId, waId, conversationId, text.slice(0, 2000), concierge.reply, concierge.intent],
    );
    writeEvent(env, { orgId, event: "whatsapp_reply_pending_approval" });

    // Notify admin about the pending item (função utilitária — sem c.executionCtx)
    await notifyOrganization(env, pool, orgId, {
      title: "Aprovação pendente",
      body: "Uma resposta da assistente virtual requer aprovação manual.",
    }).catch((e) => console.error("[Notify] push error:", e));
  } else {
    await whatsapp.sendTextMessage(waId, concierge.reply);
  }

  // 3. Automated Task Creation based on Intent
  if (concierge.intent !== "other") {
    const priority = concierge.intent === "urgent" ? "URGENTE" : "ALTA";
    const titleMap = {
      scheduling: "Solicitação de Agendamento (IA)",
      information: "Dúvida sobre Tratamento (IA)",
      urgent: "🚨 URGÊNCIA CLÍNICA (IA)",
    };

    await pool.query(
      `INSERT INTO tarefas (organization_id, created_by, titulo, descricao, status, prioridade, tipo,
         order_index, tags, label_ids, checklists, attachments, task_references, dependencies,
         requires_acknowledgment, acknowledgments)
       VALUES ($1, 'ai_concierge', $2, $3, 'A_FAZER', $4, 'TAREFA',
         0, '{}', '{}', '[]', '[]', '[]', '[]', $5, '[]')`,
      [
        orgId,
        `${titleMap[concierge.intent as keyof typeof titleMap] || "Contato IA"} — ${waId}`,
        `IA detectou intenção de ${concierge.intent}.\n\nDados extraídos: ${JSON.stringify(concierge.patientData)}\n\nMensagem original: "${text.slice(0, 500)}"`,
        priority,
        concierge.intent === "urgent",
      ],
    );
  }

  writeEvent(env, { orgId, event: "whatsapp_concierge_ai_greeted" });
}

async function maybeCreateTaskFromIntent(
  pool: any,
  orgId: string,
  contact: { id: string; display_name?: string | null; patient_id?: string | null },
  text: string,
): Promise<void> {
  const matched = INTENT_PATTERNS.find(({ pattern }) => pattern.test(text));
  if (!matched) return;

  const name = contact.display_name ?? "Paciente";
  const titulo = matched.titulo(name);

  await pool.query(
    `INSERT INTO tarefas (organization_id, created_by, titulo, descricao, status, prioridade, tipo,
       order_index, tags, label_ids, checklists, attachments, task_references, dependencies,
       requires_acknowledgment, acknowledgments, linked_entity_type, linked_entity_id)
     VALUES ($1, 'whatsapp_bot', $2, $3, 'A_FAZER', $4, 'TAREFA',
       0, '{}', '{}', '[]', '[]', '[]', '[]', false, '[]',
       $5, $6)`,
    [
      orgId,
      titulo,
      `Gerado automaticamente a partir de mensagem WhatsApp:\n\n"${text.slice(0, 500)}"`,
      matched.prioridade,
      contact.patient_id ? "patient" : "whatsapp_contact",
      contact.patient_id ?? contact.id,
    ],
  );
}

export { app as whatsappWebhookRoutes };
