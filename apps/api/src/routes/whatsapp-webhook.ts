import { Hono } from "hono";
import { createPool } from "../lib/db";
import { broadcastToOrg } from "../lib/realtime";
import {
	resolveOrCreateContact,
	linkContactToPatient,
} from "../lib/whatsapp-identity";
import {
	findOrCreateConversation,
	addMessage,
} from "../lib/whatsapp-conversations";
import { isDuplicate, markProcessed } from "../lib/whatsapp-idempotency";
import type { Env } from "../types/env";
import { verifyMetaSignature } from "./whatsapp";
import { WhatsAppService } from "../lib/whatsapp";
import { writeEvent } from "../lib/analytics";

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
		return c.json({ error: "App secret not configured" }, 500);
	}

	const valid = await verifyMetaSignature(appSecret, rawBody, signature);
	if (!valid) {
		return c.json({ error: "Assinatura invalida" }, 401);
	}

	let body: Record<string, unknown>;
	try {
		body = JSON.parse(rawBody);
	} catch {
		return c.json({ error: "Payload invalido" }, 400);
	}

	c.executionCtx.waitUntil(processWebhook(body, c.env, rawBody));

	return c.json({ status: "ok" });
});

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

				const orgId = await resolveOrgId(pool, value.metadata?.phone_number_id);
				if (!orgId) continue;

				await storeRawEvent(pool, orgId, body, rawBody);

				if (value.messages?.length) {
					for (const msg of value.messages) {
						await handleMessage(pool, env, orgId, msg, value.contacts);
					}
				}

				if (value.statuses?.length) {
					for (const status of value.statuses) {
						await handleStatus(pool, env, orgId, status);
					}
				}

				if (value.system) {
					await handleSystem(pool, orgId, value.system);
				}
			}
		}
	} catch (err) {
		console.error("[WhatsApp Webhook] processWebhook error:", err);
	}
}

async function resolveOrgId(
	pool: any,
	phoneNumberId: string | undefined,
): Promise<string | null> {
	if (!phoneNumberId) return null;
	try {
		const result = await pool.query(
			`SELECT id FROM organizations WHERE (settings->>'whatsapp_phone_number_id')::text = $1 LIMIT 1`,
			[phoneNumberId],
		);
		if (result.rows.length > 0) return result.rows[0].id;

		const fallback = await pool.query(
			`SELECT id, settings FROM organizations WHERE settings ? 'whatsapp_config' LIMIT 1`,
		);
		if (fallback.rows.length > 0) return fallback.rows[0].id;

		return null;
	} catch {
		return null;
	}
}

async function storeRawEvent(
	pool: any,
	orgId: string,
	body: Record<string, unknown>,
	rawBody: string,
): Promise<void> {
	try {
		// id é o business account id e será sempre o mesmo, então não use apenas ele.
		const entryId = (body as any).entry?.[0]?.id ?? '';
		const wamid = (body as any).entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id 
		           ?? (body as any).entry?.[0]?.changes?.[0]?.value?.statuses?.[0]?.id
		           ?? `ts_${Date.now()}`;
		const idempotencyKey = `evt_${entryId}_${wamid}_${crypto.randomUUID().substring(0, 8)}`;

		await pool.query(
			`INSERT INTO wa_raw_events (organization_id, raw_payload, idempotency_key, created_at)
       VALUES ($1::uuid, $2, $3, now())
       ON CONFLICT (idempotency_key) DO NOTHING`,
			[orgId, rawBody, idempotencyKey],
		);
	} catch (err) {
		console.error("[WhatsApp Webhook] storeRawEvent error:", err);
	}
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

		if (msg.type === "text" && msg.text?.body) {
			messageType = "text";
			content = msg.text.body;
		} else if (msg.type === "image") {
			messageType = "image";
			content = msg.image?.caption ?? "";
		} else if (msg.type === "audio") {
			messageType = "audio";
			content = msg.audio?.caption ?? "";
		} else if (msg.type === "document") {
			messageType = "document";
			content = msg.document?.caption ?? "";
		} else if (msg.type === "video") {
			messageType = "video";
			content = msg.video?.caption ?? "";
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
					await linkContactToPatient(
						pool,
						contact.id,
						patientResult.rows[0].id,
					);
				}
			} catch {}
		}

		const conversation = await findOrCreateConversation(
			pool,
			orgId,
			contact.id,
		);
		if (!conversation) return;

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
			event: 'whatsapp_received',
			route: `type:${messageType}`,
		});

		// Intent handlers — appointment actions come first; fallback to task creation
		if (messageType === 'text' && content.length > 2 && contact?.id) {
			const contactCtx = {
				id: String(contact.id),
				display_name: contact.display_name as string | null ?? null,
				patient_id: contact.patient_id as string | null ?? null,
				wa_id: contact.wa_id as string,
			};
			maybeHandleAppointmentIntent(pool, env, orgId, contactCtx, content)
				.then((handled) => {
					if (!handled) {
						return maybeCreateTaskFromIntent(pool, orgId, contactCtx, content);
					}
				})
				.catch(() => null);
		}
	} catch (err) {
		console.error("[WhatsApp Webhook] handleMessage error:", err);
		if (env.DB) {
			await markProcessed(env.DB, metaMessageId);
		}
	}
}

async function handleStatus(
	pool: any,
	env: Env,
	orgId: string,
	statusObj: any,
): Promise<void> {
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
			console.error(`[WhatsApp Webhook] Message ${metaMessageId} failed. Errors:`, JSON.stringify(statusObj.errors, null, 2));
		}

		await pool.query(
			`UPDATE wa_messages SET status = $1 WHERE meta_message_id = $2`,
			[mapped, metaMessageId],
		);

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
					if (
						parentRecipientUserId &&
						contact.parent_bsuid !== parentRecipientUserId
					) {
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

async function handleSystem(
	pool: any,
	orgId: string,
	system: any,
): Promise<void> {
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
  { pattern: /\b(dor|doendo|dói|doer|ardendo|latejando)\b/i, titulo: (n) => `Relato de dor — ${n}`, prioridade: 'ALTA' },
  { pattern: /\b(piore[iu]|piorou|pioran[do]+|pior[ao]u)\b/i, titulo: (n) => `Queda na evolução — ${n}`, prioridade: 'ALTA' },
  { pattern: /\b(exercício|treino|protocolo|plano|exerc[ií]cio)\b/i, titulo: (n) => `Dúvida sobre exercício — ${n}`, prioridade: 'MEDIA' },
  { pattern: /\b(consulta|agendar|agendamento|marcar|remarcar|reagendar)\b/i, titulo: (n) => `Solicitação de consulta — ${n}`, prioridade: 'MEDIA' },
  { pattern: /\b(retorno|acompanhamento|follow[ -]?up)\b/i, titulo: (n) => `Solicitação de retorno — ${n}`, prioridade: 'MEDIA' },
  { pattern: /\b(urgente|emergência|emergencia|socorro|preciso de ajuda)\b/i, titulo: (n) => `Mensagem urgente — ${n}`, prioridade: 'URGENTE' },
];

const CONFIRM_PATTERN = /\b(confirm[aoeiu]?|sim,?\s*confirm|ok|t[aá]\s+(ok|bom)|certo|vou|estarei|estou\s+indo)\b/i;
const CANCEL_PATTERN = /\b(cancel[aoeiu]?r?|desmarcar|n[ãa]o\s+(vou|posso|consigo)|n[ãa]o\s+vai\s+dar|n[aã]o\s+poderei)\b/i;
const RESCHEDULE_PATTERN = /\b(reagend|remarc|mudar|trocar|outra\s+hora|outro\s+dia|adiar|antecipar)\b/i;

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
  const intent = isReschedule ? 'reschedule' : isCancel ? 'cancel' : isConfirm ? 'confirm' : null;
  if (!intent) return false;

  const appt = await findNextAppointment(pool, orgId, contact.patient_id);
  if (!appt) return false;

  const whatsapp = new WhatsAppService(env);
  const displayName = contact.display_name ?? 'Paciente';
  const startLocal = new Date(appt.start_time).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (intent === 'confirm') {
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
      type: 'appointment_confirmed',
      appointmentId: appt.id,
      via: 'whatsapp',
      patientId: contact.patient_id,
    });
    writeEvent(env, { orgId, event: 'whatsapp_intent_confirm' });
    return true;
  }

  if (intent === 'cancel') {
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
      type: 'appointment_cancelled',
      appointmentId: appt.id,
      via: 'whatsapp',
      patientId: contact.patient_id,
    });
    writeEvent(env, { orgId, event: 'whatsapp_intent_cancel' });
    return true;
  }

  if (intent === 'reschedule') {
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
      type: 'appointment_reschedule_requested',
      appointmentId: appt.id,
      via: 'whatsapp',
      patientId: contact.patient_id,
    });
    writeEvent(env, { orgId, event: 'whatsapp_intent_reschedule' });
    return true;
  }

  return false;
}

async function maybeCreateTaskFromIntent(
  pool: any,
  orgId: string,
  contact: { id: string; display_name?: string | null; patient_id?: string | null },
  text: string,
): Promise<void> {
  const matched = INTENT_PATTERNS.find(({ pattern }) => pattern.test(text));
  if (!matched) return;

  const name = contact.display_name ?? 'Paciente';
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
      contact.patient_id ? 'patient' : 'whatsapp_contact',
      contact.patient_id ?? contact.id,
    ],
  );
}

export { app as whatsappWebhookRoutes };
