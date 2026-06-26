import { Hono } from "hono";
import { createPool } from "../lib/db";
import { broadcastToOrg } from "../lib/realtime";
import { resolveOrCreateContact } from "../lib/whatsapp-identity";
import { findOrCreateConversation, addMessage } from "../lib/whatsapp-conversations";
import { fetchInstagramProfile, formatInstagramDisplayName, IG_GRAPH } from "../lib/instagram-profile";
import { verifyMetaSignature } from "./whatsapp";
import { writeEvent } from "../lib/analytics";
import type { Env } from "../types/env";
import type { WhatsAppInboundMessage } from "../lib/whatsapp-queue";

/**
 * Webhook do Instagram Direct (Instagram Messaging API com Instagram Login).
 * Mesmo Meta App do WhatsApp; assina o objeto `instagram`, campo `messages`.
 *
 * Pré-requisitos (config, não código):
 *  - Conta IG Business vinculada a uma Página do Facebook.
 *  - Produto Instagram adicionado ao Meta App + App Review de `instagram_business_manage_messages`.
 *  - Secrets: IG_ACCESS_TOKEN, IG_VERIFY_TOKEN (App Secret reutiliza WHATSAPP_APP_SECRET).
 *  - organizations.settings->>'instagram_business_account_id' = IG_ID da clínica.
 */
const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => {
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");
  const verifyToken = c.env.IG_VERIFY_TOKEN ?? c.env.WHATSAPP_VERIFY_TOKEN ?? "fisioflow_ig_token";
  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge, { status: 200 });
  }
  return c.json({ error: "Token de verificação inválido" }, 403);
});

app.post("/", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-hub-signature-256");
  const candidateSecrets = [c.env.IG_APP_SECRET, c.env.WHATSAPP_APP_SECRET].filter(
    (s): s is string => typeof s === "string" && s.length > 0,
  );
  if (candidateSecrets.length > 0) {
    let valid = false;
    for (const secret of candidateSecrets) {
      if (await verifyMetaSignature(secret, rawBody, signature)) {
        valid = true;
        break;
      }
    }
    if (!valid) return c.json({ error: "Assinatura inválida" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return c.json({ error: "Payload inválido" }, 400);
  }

  if (body.object !== "instagram") return c.json({ status: "ignored" });

  // Extract messages and enqueue to Cloudflare Queue
  const entriesToEnqueue: WhatsAppInboundMessage[] = [];
  const entries = (body.entry as any[]) ?? [];
  
  for (const entry of entries) {
    const changes = entry?.changes ?? [];
    for (const change of changes) {
      const value = change?.value;
      if (!value?.messages?.length) continue;
      
      for (const msg of value.messages) {
        const message: WhatsAppInboundMessage = {
          type: "inbound_message",
          metaMessageId: msg.id,
          waId: value.recipients?.[0]?.id ?? msg.from?.id ?? "",
          from: msg.from?.id ?? "",
          text: msg.text,
          messageType: "text",
          rawPayload: body as Record<string, unknown>,
          organizationId: null,
          phoneNumberId: entry.id ?? "",
          timestamp: new Date().toISOString(),
        };
        entriesToEnqueue.push(message);
      }
    }
  }

  if (entriesToEnqueue.length > 0) {
    const batch = entriesToEnqueue.map((msg) => ({ body: msg }));
    await c.env.WHATSAPP_QUEUE.sendBatch(batch);
    console.log(`[IG Webhook] Enqueued ${entriesToEnqueue.length} messages`);
  }

  return c.json({ status: "ok", enqueued: entriesToEnqueue.length });
});

async function resolveOrgIdByIg(pool: any, igAccountId: string): Promise<string | null> {
  try {
    const res = await pool.query(
      `SELECT id FROM organizations WHERE (settings->>'instagram_business_account_id')::text = $1 LIMIT 1`,
      [igAccountId],
    );
    return res.rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function processInstagram(body: Record<string, unknown>, env: Env): Promise<void> {
  try {
    const pool = await createPool(env);
    const entries = (body.entry as any[]) ?? [];

    for (const entry of entries) {
      const igAccountId = String(entry.id ?? "");
      const orgId = await resolveOrgIdByIg(pool, igAccountId);
      if (!orgId) {
        console.warn("[IG Webhook] Nenhuma org para instagram_business_account_id:", igAccountId);
        continue;
      }

      // Token da org (renovável em settings) para consultar o perfil do remetente.
      const tokRes = await pool.query(
        `SELECT settings->>'instagram_access_token' AS t FROM organizations WHERE id = $1`,
        [orgId],
      );
      const igToken: string | undefined = tokRes.rows[0]?.t || env.IG_ACCESS_TOKEN || undefined;
      const profileCache = new Map<
        string,
        { username: string | null; name: string | null; profilePic: string | null } | null
      >();

      const events = (entry.messaging as any[]) ?? [];
      for (const ev of events) {
        const message = ev.message;
        if (!message || message.is_echo) continue; // ignora ecos (saídas)

        const senderId = String(ev.sender?.id ?? "");
        if (!senderId) continue;

        // Texto da mensagem; menção em Stories ganha rótulo amigável.
        const att = Array.isArray(message.attachments) ? message.attachments[0] : null;
        const attType: string | undefined = att?.type;
        const mediaUrl: string | undefined =
          typeof att?.payload?.url === "string" && att.payload.url.length ? att.payload.url : undefined;
        let text: string;
        let messageType: string;
        if (typeof message.text === "string" && message.text.length) {
          text = message.text;
          messageType = "text";
        } else if (attType === "story_mention") {
          text = "📲 Mencionou a Activity Fisioterapia nos Stories do Instagram.";
          messageType = "story_mention";
        } else if (attType === "image") {
          text = "";
          messageType = "image";
        } else if (attType === "share" || attType === "ig_reel") {
          text = "📎 Compartilhou uma publicação do Instagram.";
          messageType = "attachment";
        } else if (attType) {
          text = `[${attType}]`;
          messageType = "attachment";
        } else {
          text = "";
          messageType = "attachment";
        }

        // Busca o perfil (@username + nome) do remetente — uma vez por IGSID.
        let prof = profileCache.get(senderId);
        if (prof === undefined) {
          prof = await fetchInstagramProfile(senderId, igToken);
          profileCache.set(senderId, prof);
        }
        const username = prof?.username ?? null;
        const avatarUrl = prof?.profilePic ?? null;
        const displayName = formatInstagramDisplayName({
          name: prof?.name ?? null,
          username,
        });

        const contact = await resolveOrCreateContact(
          pool,
          orgId,
          senderId, // IGSID como identificador do contato
          null,
          null,
          username,
          displayName,
          avatarUrl,
        );
        if (!contact) continue;

        const conversation = await findOrCreateConversation(pool, orgId, contact.id, "instagram");
        if (!conversation) continue;

        const savedMsg = await addMessage(
          pool,
          conversation.id,
          orgId,
          contact.id,
          "inbound",
          "contact",
          contact.id,
          messageType,
          text,
          message.mid,
          {
            mediaUrl,
            mediaType: messageType === "image" ? "image" : undefined,
            metadata: attType
              ? {
                  attachmentType: attType,
                  mediaUrl,
                }
              : undefined,
          },
        );

        await broadcastToOrg(env, orgId, {
          type: "instagram_message",
          conversationId: conversation.id,
          message: savedMsg,
          contact: { id: contact.id, igsid: senderId },
        });

        writeEvent(env, { orgId, event: "instagram_received", route: `type:${messageType}` });
      }
    }
  } catch (err) {
    console.error("[IG Webhook] processInstagram error:", err);
  }
}

export type InstagramSendApiError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  error_user_title?: string;
  error_user_msg?: string;
  fbtrace_id?: string;
};

export type InstagramSendResponse = {
  recipient_id?: string;
  message_id?: string;
  error?: InstagramSendApiError | string;
  status?: number;
};

export function getInstagramSendError(response: unknown): InstagramSendApiError | undefined {
  if (!response || typeof response !== "object") return undefined;
  const error = (response as { error?: unknown }).error;
  if (!error || typeof error !== "object") return undefined;
  return error as InstagramSendApiError;
}

export function isInstagramOutsideWindowError(error: unknown): boolean {
  const metaError =
    error && typeof error === "object" && !Array.isArray(error)
      ? (error as InstagramSendApiError)
      : undefined;
  const message = String(metaError?.message ?? error ?? "").toLowerCase();
  return (
    metaError?.error_subcode === 2534022 ||
    message.includes("outside the allowed window") ||
    message.includes("outside of allowed window") ||
    message.includes("outside the 24 hour") ||
    message.includes("outside the 24-hour")
  );
}

/** Envia uma mensagem de texto via Instagram Direct (janela de 24h). */
export async function sendInstagramText(
  env: Env,
  igAccountId: string,
  recipientIgsid: string,
  text: string,
  tokenOverride?: string,
  options?: { humanAgentTag?: boolean },
): Promise<InstagramSendResponse> {
  // Prefere o token renovável (settings) passado pelo chamador; senão o secret do env.
  const token = tokenOverride || env.IG_ACCESS_TOKEN;
  if (!token) return { error: "IG_ACCESS_TOKEN ausente", status: 500 };

  const payload: Record<string, unknown> = {
    recipient: { id: recipientIgsid },
    message: { text },
  };

  if (options?.humanAgentTag) {
    payload.messaging_type = "MESSAGE_TAG";
    payload.tag = "HUMAN_AGENT";
  }

  const res = await fetch(`${IG_GRAPH}/${igAccountId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({ error: res.statusText }))) as InstagramSendResponse;
  return { ...data, status: res.status };
}

export { app as instagramWebhookRoutes };
