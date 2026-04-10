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
		const idempotencyKey = (body as any).entry?.[0]?.id ?? `evt_${Date.now()}`;
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

		await pool.query(
			`UPDATE wa_messages SET status = $1 WHERE meta_message_id = $2`,
			[mapped, metaMessageId],
		);

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

export { app as whatsappWebhookRoutes };
