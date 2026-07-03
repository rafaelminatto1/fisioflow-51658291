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
import {
  AIConciergeService,
  buildConciergeHistory,
  shouldSkipGreeting,
  stripGreetingIntro,
} from "../services/ai-concierge";
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

      // 9.1. Interceptar respostas de confirmação (Botão ou texto SIM)
      let skipConcierge = false;
      let apptConfirmed = false;
      let targetApptId: string | null = null;

      // Pegar o ID do botão interativo no payload bruto se existir
      const rawPayload = msg.rawPayload as any;
      const buttonId = rawPayload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.interactive?.button_reply?.id 
                    || rawPayload?.interactive?.button_reply?.id 
                    || rawPayload?.button_reply?.id;

      if (buttonId && typeof buttonId === "string") {
        if (buttonId.startsWith("confirm_appt_")) {
          targetApptId = buttonId.replace("confirm_appt_", "");
          apptConfirmed = true;
        } else if (buttonId.startsWith("reschedule_appt_")) {
          targetApptId = buttonId.replace("reschedule_appt_", "");
          // Paciente quer remarcar - enviamos um aviso amigável que a IA do Concierge está procurando slots
          const rescheduleAck = "Entendido, você quer remarcar sua consulta. Vou consultar nossa agenda de horários livres para sugerir opções para você...";
          const whatsapp = new WhatsAppService(env);
          await whatsapp.sendTextMessage(msg.from || msg.waId, rescheduleAck);
          
          await addMessage(
            pool,
            conversation.id,
            orgId,
            contact.id,
            "outbound",
            "system",
            contact.id,
            "text",
            rescheduleAck,
            `reschedule_ack_${Date.now()}`,
            { status: "sent", metadata: { autoReply: true } }
          );

          await broadcastToOrg(env, orgId, {
            type: "whatsapp_message",
            conversationId: conversation.id,
            message: {
              content: rescheduleAck,
              direction: "outbound",
              messageType: "text",
              status: "sent",
            },
          });
        }
      }

      // Fallback para texto simples (ex: responder "SIM" ou "confirmar")
      const lowerText = (msg.text || "").trim().toLowerCase();
      if (!apptConfirmed && contact.patient_id && ["sim", "confirmar", "confirmado", "quero", "vou"].includes(lowerText)) {
        // Buscar consulta futura nas próximas 48h para este paciente
        const apptResult = await pool.query(
          `SELECT id FROM appointments 
           WHERE patient_id = $1 
             AND date >= CURRENT_DATE - INTERVAL '1 day'
             AND status NOT IN ('cancelled', 'completed', 'realizado')
           ORDER BY date ASC, time ASC LIMIT 1`,
          [contact.patient_id],
        );
        if (apptResult.rows.length > 0) {
          targetApptId = apptResult.rows[0].id;
          apptConfirmed = true;
        }
      }

      if (apptConfirmed && targetApptId) {
        // Atualizar status do agendamento no banco
        await pool.query(
          `UPDATE appointments SET status = 'confirmed', updated_at = NOW() WHERE id = $1`,
          [targetApptId],
        );

        // Notificar o frontend da agenda
        await broadcastToOrg(env, orgId, {
          type: "appointment_confirmed",
          appointmentId: targetApptId,
        });

        // Enviar confirmação via WhatsApp
        const whatsapp = new WhatsAppService(env);
        const confirmMsg = "Obrigado! Sua consulta está confirmada com sucesso. Te esperamos na clínica! 🏥";
        await whatsapp.sendTextMessage(msg.from || msg.waId, confirmMsg);

        // Salvar mensagem automática de confirmação
        await addMessage(
          pool,
          conversation.id,
          orgId,
          contact.id,
          "outbound",
          "system",
          contact.id,
          "text",
          confirmMsg,
          `confirm_ack_${Date.now()}`,
          { status: "sent", metadata: { autoReply: true } }
        );

        // Broadcast de mensagem do sistema
        await broadcastToOrg(env, orgId, {
          type: "whatsapp_message",
          conversationId: conversation.id,
          message: {
            content: confirmMsg,
            direction: "outbound",
            messageType: "text",
            status: "sent",
          },
        });

        skipConcierge = true; // Pular concierge já que o agendamento foi confirmado automaticamente
      }

      if (!skipConcierge) {
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
      }

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
    // 1. Check if concierge is enabled for this organization
    const conciergeCfgRes = await pool.query(
      `SELECT settings->'crm_whatsapp'->'concierge' AS concierge
       FROM organizations WHERE id = $1 LIMIT 1`,
      [orgId],
    );
    const raw = conciergeCfgRes.rows[0]?.concierge;
    const cfg = typeof raw === "string" ? JSON.parse(raw) : raw;
    const conciergeEnabled = cfg?.enabled !== false;
    const autoReplyNewLeads = cfg?.autoReplyNewLeads !== false;

    if (!conciergeEnabled || !autoReplyNewLeads) {
      console.log(`[WA Queue] Concierge is disabled for org ${orgId}. Skipping auto-reply.`);
      return;
    }

    // 2. Check if a human agent has replied recently (within 15 minutes)
    const recentAgentReply = await pool.query(
      `SELECT id FROM wa_messages
       WHERE conversation_id = $1::uuid
         AND direction = 'outbound'
         AND sender_type = 'agent'
         AND created_at > NOW() - INTERVAL '15 minutes'
       LIMIT 1`,
      [conversationId],
    );

    if (recentAgentReply.rows.length > 0) {
      console.log(`[WA Queue] Human agent replied recently in conversation ${conversationId}. Concierge skipping.`);
      return;
    }

    // Carrega o histórico recente da conversa p/ dar contexto ao concierge e,
    // sobretudo, evitar repetir a apresentação a cada mensagem.
    let history: ReturnType<typeof buildConciergeHistory> = [];
    try {
      const histRes = await pool.query(
        `SELECT direction, content FROM wa_messages
          WHERE conversation_id = $1 AND message_type = 'text'
            AND direction IN ('inbound', 'outbound')
          ORDER BY created_at DESC LIMIT 10`,
        [conversationId],
      );
      history = buildConciergeHistory([...histRes.rows].reverse());
      // Remove a mensagem atual (já persistida) do fim — ela é passada à parte.
      const last = history[history.length - 1];
      if (last && last.role === "user" && last.content === text.trim()) history.pop();
    } catch (histErr) {
      console.warn("[WA Queue] Concierge history load failed:", histErr);
    }

    const concierge = await AIConciergeService.processMessage(env, orgId, text, history);

    // Não repete a apresentação se já saudamos nesta conversa: responde a
    // saudação de volta em versão curta, sem se reapresentar (nunca fica mudo).
    const reply = shouldSkipGreeting(concierge.reply, history)
      ? stripGreetingIntro(concierge.reply)
      : concierge.reply;

    if (concierge.answerable && reply && reply.length >= 2) {
      // Actually deliver the reply to the customer via Meta. We are within the
      // 24h customer-service window (they just messaged), so free-form text is
      // allowed and will deliver.
      const whatsapp = new WhatsAppService(env);
      const sendResult = (await whatsapp.sendTextMessage(recipient, reply)) as {
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
        reply,
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
          content: reply,
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
