import { Hono } from "hono";
import { createPool } from "../lib/db";
import { broadcastToOrg } from "../lib/realtime";
import { resolveOrCreateContact } from "../lib/whatsapp-identity";
import { findOrCreateConversation, addMessage } from "../lib/whatsapp-conversations";
import { verifyMetaSignature } from "./whatsapp";
import { writeEvent } from "../lib/analytics";
import type { Env } from "../types/env";

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

// Instagram API with Instagram Login usa graph.instagram.com.
const IG_GRAPH = "https://graph.instagram.com/v23.0";

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
  // Assinatura do IG usa o secret DO APP INSTAGRAM (≠ WhatsApp). Só valida se IG_APP_SECRET
  // estiver definido; caso contrário pula (não rejeita), pois o secret do WhatsApp não confere.
  const appSecret = c.env.IG_APP_SECRET;
  if (appSecret) {
    const valid = await verifyMetaSignature(appSecret, rawBody, signature);
    if (!valid) return c.json({ error: "Assinatura inválida" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return c.json({ error: "Payload inválido" }, 400);
  }

  if (body.object !== "instagram") return c.json({ status: "ignored" });

  c.executionCtx.waitUntil(processInstagram(body, c.env));
  return c.json({ status: "ok" });
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

      const events = (entry.messaging as any[]) ?? [];
      for (const ev of events) {
        const message = ev.message;
        if (!message || message.is_echo) continue; // ignora ecos (saídas)

        const senderId = String(ev.sender?.id ?? "");
        if (!senderId) continue;

        const text: string =
          message.text ??
          (Array.isArray(message.attachments) && message.attachments.length
            ? `[${message.attachments[0].type ?? "mídia"}]`
            : "");
        const messageType = message.text ? "text" : "attachment";

        const contact = await resolveOrCreateContact(
          pool,
          orgId,
          senderId, // IGSID como identificador do contato
          null,
          null,
          null,
          null,
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

/** Envia uma mensagem de texto via Instagram Direct (janela de 24h). */
export async function sendInstagramText(
  env: Env,
  _igAccountId: string,
  recipientIgsid: string,
  text: string,
): Promise<unknown> {
  const token = env.IG_ACCESS_TOKEN;
  if (!token) return { error: "IG_ACCESS_TOKEN ausente" };
  // Instagram API with Instagram Login: POST graph.instagram.com/{version}/me/messages
  const res = await fetch(`${IG_GRAPH}/me/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: recipientIgsid }, message: { text } }),
  });
  return res.json();
}

export { app as instagramWebhookRoutes };
