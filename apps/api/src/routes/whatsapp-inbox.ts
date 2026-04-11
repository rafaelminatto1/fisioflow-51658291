import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthUser } from "../lib/auth";
import { broadcastToOrg } from "../lib/realtime";
import { logToAxiom } from "../lib/axiom";
import {
	getInboxConversations,
	getConversationWithMessages,
	addMessage,
	findOrCreateConversation as findOrCreateConversationSvc,
	assignConversation as assignConversationSvc,
	transferConversation as transferConversationSvc,
	addInternalNote,
	updateConversationStatus,
	getConversationMetrics,
} from "../lib/whatsapp-conversations";
import {
	sendReplyButtons,
	sendListMessage,
	sendFlowMessage,
} from "../lib/whatsapp-interactive";
import {
	resolveOrCreateContact,
	linkContactToPatient,
} from "../lib/whatsapp-identity";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

function mapConversationRow(row: any) {
	return {
		id: row.id,
		contactId: row.contact_id,
		contactName:
			row.display_name || row.username || row.wa_id || "Desconhecido",
		contactPhone: row.wa_id || "",
		patientId: row.patient_id || undefined,
		patientName: undefined,
		status: row.status,
		assignedTo: row.assigned_to || undefined,
		assignedToName: row.assigned_to_name || undefined,
		team: row.team || undefined,
		lastMessage: row.last_message || undefined,
		lastMessageAt: row.last_message_at || undefined,
		lastMessageDirection: row.last_message_direction || undefined,
		unreadCount: row.unread_count || 0,
		tags: row.tags || [],
		priority: row.priority || undefined,
		slaDeadline: row.sla_deadline || undefined,
		slaBreached: row.sla_breached || false,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function mapMessageRow(row: any): any {
	return {
		id: row.id,
		conversationId: row.conversation_id,
		direction: row.direction === "internal" ? "outbound" : row.direction,
		type: row.message_type || "text",
		content:
			typeof row.content === "string"
				? (() => {
						try {
							return JSON.parse(row.content);
						} catch {
							return row.content;
						}
					})()
				: row.content,
		senderId: row.sender_id || undefined,
		senderName: row.sender_name || undefined,
		timestamp: row.created_at,
		status: row.status || undefined,
		interactiveData: row.interactive_data || undefined,
		templateName: row.template_name || undefined,
		templateParams: undefined,
	};
}

function mapContactRow(row: any) {
	return {
		id: row.contact_id || row.id || row.patient_id,
		displayName:
			row.display_name || row.patient_name || row.username || row.wa_id || "Desconhecido",
		phoneE164: row.wa_id || row.patient_phone || row.phone_e164 || "",
		username: row.username || undefined,
		patientId: row.patient_id || row.wc_patient_id || row.p_patient_id || undefined,
		patientName: row.patient_name || undefined,
		isPatientOnly: !row.contact_id && !!row.p_patient_id,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function maskPhone(phone?: string | null) {
	const digits = String(phone ?? "").replace(/\D/g, "");
	if (!digits) return undefined;
	return `${digits.slice(0, 4)}...${digits.slice(-4)}`;
}

function serializeError(error: unknown) {
	if (error instanceof Error) {
		return { name: error.name, message: error.message, stack: error.stack };
	}
	return { message: String(error) };
}

function getMetaError(metaData: any) {
	const metaError = metaData?.error;
	if (!metaError) return undefined;
	return {
		type: metaError.type,
		code: metaError.code,
		errorSubcode: metaError.error_subcode,
		message: metaError.message,
		traceId: metaError.fbtrace_id,
	};
}

function logWhatsAppInboxEvent(
	c: any,
	level: "info" | "warn" | "error",
	message: string,
	data: Record<string, unknown>,
) {
	const payload = {
		level,
		message,
		type: "whatsapp_inbox_send",
		...data,
	};

	if (level === "error") {
		console.error(`[WhatsApp Inbox] ${message}`, payload);
	} else if (level === "warn") {
		console.warn(`[WhatsApp Inbox] ${message}`, payload);
	} else {
		console.info(`[WhatsApp Inbox] ${message}`, payload);
	}

	logToAxiom(c.env, c.executionCtx, payload);
}

app.get("/conversations", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	const {
		status,
		assignedTo,
		priority,
		team,
		search,
		tagId,
		page = "1",
		limit = "50",
	} = c.req.query();

	const pageNum = Math.max(1, parseInt(page) || 1);
	const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
	const offset = (pageNum - 1) * limitNum;

	try {
		const conversations = await getInboxConversations(
			pool,
			user.organizationId,
			{
				status: status ?? undefined,
				assignedTo: assignedTo ?? undefined,
				priority: priority ?? undefined,
				team: team ?? undefined,
				search: search ?? undefined,
				tagId: tagId ?? undefined,
				limit: limitNum,
				offset,
			},
		);

		const totalResult = await pool.query(
			`SELECT COUNT(*)::int AS total FROM wa_conversations c
       LEFT JOIN whatsapp_contacts wc ON wc.id = c.contact_id
       WHERE c.organization_id = $1${status ? " AND c.status = $2" : ""}`,
			status ? [user.organizationId, status] : [user.organizationId],
		);
		const total = totalResult.rows[0]?.total ?? conversations.length;

		return c.json({
			data: conversations.map(mapConversationRow),
			pagination: {
				page: pageNum,
				limit: limitNum,
				total,
				totalPages: Math.ceil(total / limitNum),
			},
		});
	} catch (err) {
		console.error("[WhatsApp Inbox] GET /conversations error:", err);
		return c.json({ error: "Failed to fetch conversations" }, 500);
	}
});

app.post("/conversations", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	const body = (await c.req.json()) as { contactId?: string };

	if (!body.contactId) {
		return c.json({ error: "contactId is required" }, 400);
	}

	try {
		const contactResult = await pool.query(
			`SELECT id FROM whatsapp_contacts WHERE id = $1 AND organization_id = $2 LIMIT 1`,
			[body.contactId, user.organizationId],
		);

		if (contactResult.rows.length === 0) {
			return c.json({ error: "Contact not found" }, 404);
		}

		const conversation = await findOrCreateConversationSvc(
			pool,
			user.organizationId,
			body.contactId,
		);

		const conversationResult = await pool.query(
			`SELECT c.*, wc.wa_id, wc.display_name, wc.username, wc.bsuid, wc.patient_id
       FROM wa_conversations c
       LEFT JOIN whatsapp_contacts wc ON wc.id = c.contact_id
       WHERE c.id = $1 AND c.organization_id = $2
       LIMIT 1`,
			[conversation.id, user.organizationId],
		);

		if (conversationResult.rows.length === 0) {
			return c.json({ error: "Conversation not found" }, 404);
		}

		return c.json(mapConversationRow(conversationResult.rows[0]));
	} catch (err) {
		console.error("[WhatsApp Inbox] POST /conversations error:", err);
		return c.json({ error: "Failed to open conversation" }, 500);
	}
});

app.post("/conversations/bulk", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	const body = (await c.req.json()) as {
		ids: string[];
		action: "resolve" | "close" | "assign" | "tag" | "snooze";
		payload?: { assignedTo?: string; tagId?: string; until?: string };
	};

	if (!body.ids?.length || !body.action) {
		return c.json({ error: "ids and action are required" }, 400);
	}
	if (body.ids.length > 100) {
		return c.json({ error: "Maximum 100 conversations per bulk action" }, 400);
	}

	const placeholders = body.ids.map((_, i) => `$${i + 2}`).join(", ");

	try {
		if (body.action === "resolve") {
			await pool.query(
				`UPDATE wa_conversations SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
         WHERE id IN (${placeholders}) AND organization_id = $1`,
				[user.organizationId, ...body.ids],
			);
		} else if (body.action === "close") {
			await pool.query(
				`UPDATE wa_conversations SET status = 'closed', closed_at = NOW(), updated_at = NOW()
         WHERE id IN (${placeholders}) AND organization_id = $1`,
				[user.organizationId, ...body.ids],
			);
		} else if (body.action === "assign" && body.payload?.assignedTo) {
			await pool.query(
				`UPDATE wa_conversations SET assigned_to = $2, status = 'assigned', updated_at = NOW()
         WHERE id IN (${placeholders}) AND organization_id = $1`,
				[user.organizationId, body.payload.assignedTo, ...body.ids],
			);
		} else if (body.action === "tag" && body.payload?.tagId) {
			for (const id of body.ids) {
				await pool.query(
					`INSERT INTO wa_conversation_tags (conversation_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
					[id, body.payload.tagId],
				);
			}
		} else if (body.action === "snooze" && body.payload?.until) {
			await pool.query(
				`UPDATE wa_conversations SET snoozed_until = $2, status = 'pending', updated_at = NOW()
         WHERE id IN (${placeholders}) AND organization_id = $1`,
				[user.organizationId, body.payload.until, ...body.ids],
			);
		} else {
			return c.json({ error: "Invalid action or missing payload" }, 400);
		}

		return c.json({ data: { affected: body.ids.length, action: body.action } });
	} catch (err) {
		console.error("[WhatsApp Inbox] POST /conversations/bulk error:", err);
		return c.json({ error: "Bulk action failed" }, 500);
	}
});

app.get("/conversations/:id", requireAuth, async (c) => {
	const { id } = c.req.param();
	const { beforeId, limit = "50" } = c.req.query();
	const pool = await createPool(c.env);

	try {
		const result = await getConversationWithMessages(
			pool,
			id,
			Math.min(100, parseInt(limit) || 50),
			beforeId ?? undefined,
		);

		if (!result) {
			return c.json({ error: "Conversation not found" }, 404);
		}

		return c.json({
			conversation: mapConversationRow(result),
			messages: (result.messages || []).map(mapMessageRow),
		});
	} catch (err) {
		console.error("[WhatsApp Inbox] GET /conversations/:id error:", err);
		return c.json({ error: "Failed to fetch conversation" }, 500);
	}
});

app.post("/conversations/:id/messages", requireAuth, async (c) => {
	const requestId = crypto.randomUUID();
	const user = c.get("user");
	const { id } = c.req.param();
	const pool = await createPool(c.env);
	const body = (await c.req.json()) as {
		content: string;
		type?: string;
		messageType?: string;
		templateName?: string;
		templateLanguage?: string;
		interactiveType?: string;
		sentVia?: string;
		attachmentUrl?: string;
	};

	if (!body.content && !body.attachmentUrl) {
		logWhatsAppInboxEvent(c, "warn", "send validation failed", {
			requestId,
			conversationId: id,
			organizationId: user.organizationId,
			userId: user.uid,
			reason: "missing_content_or_attachment",
		});
		return c.json({ error: "content or attachmentUrl is required", requestId }, 400);
	}

	try {
		const convResult = await pool.query(
			`SELECT c.*, wc.wa_id, wc.bsuid
			 FROM wa_conversations c
			 LEFT JOIN whatsapp_contacts wc ON wc.id = c.contact_id
			 WHERE c.id = $1 AND c.organization_id = $2`,
			[id, user.organizationId],
		);
		if (convResult.rows.length === 0) {
			logWhatsAppInboxEvent(c, "warn", "conversation not found for send", {
				requestId,
				conversationId: id,
				organizationId: user.organizationId,
				userId: user.uid,
			});
			return c.json({ error: "Conversation not found", requestId }, 404);
		}

		const conv = convResult.rows[0];
		const to = conv.wa_id;
		const phoneId = c.env.WHATSAPP_PHONE_NUMBER_ID;
		const token = c.env.WHATSAPP_ACCESS_TOKEN;
		const messageType =
			body.messageType || body.type || (body.attachmentUrl ? "image" : "text");
		const logContext = {
			requestId,
			conversationId: id,
			organizationId: conv.organization_id,
			contactId: conv.contact_id,
			userId: user.uid,
			messageType,
			hasAttachment: Boolean(body.attachmentUrl),
			recipient: maskPhone(to),
			contentLength: body.content?.length ?? 0,
		};

		let metaMessageId: string | null = null;
		let metaStatusCode: number | undefined;
		let metaData: any;
		let sendError:
			| {
					kind: string;
					message: string;
					statusCode?: number;
					metaError?: ReturnType<typeof getMetaError>;
					cause?: ReturnType<typeof serializeError>;
				}
			| null = null;

		if (!to) {
			sendError = {
				kind: "missing_recipient",
				message: "Contato sem numero de WhatsApp cadastrado",
			};
		} else if (!phoneId || !token) {
			sendError = {
				kind: "missing_credentials",
				message: "Credenciais do WhatsApp Business nao configuradas",
			};
		} else {
			try {
				let metaPayload: Record<string, unknown>;

				if (messageType === "template" && body.templateName) {
					metaPayload = {
						messaging_product: "whatsapp",
						recipient_type: "individual",
						to: to.replace(/\D/g, ""),
						type: "template",
						template: {
							name: body.templateName,
							language: { code: body.templateLanguage ?? "pt_BR" },
							components: [
								{
									type: "body",
									parameters: [],
								},
							],
						},
					};
				} else if (body.attachmentUrl) {
					const mediaType = messageType === "image" ? "image" : "document";
					metaPayload = {
						messaging_product: "whatsapp",
						recipient_type: "individual",
						to: to.replace(/\D/g, ""),
						type: mediaType,
						[mediaType]: {
							link: body.attachmentUrl,
							caption: body.content || undefined,
						},
					};
				} else {
					metaPayload = {
						messaging_product: "whatsapp",
						recipient_type: "individual",
						to: to.replace(/\D/g, ""),
						type: "text",
						text: { body: body.content },
					};
				}

				console.info(`[WhatsApp] Sending message to ${to.replace(/\D/g, "")} via PhoneID ${phoneId}`);

				const metaRes = await fetch(
					`https://graph.facebook.com/v22.0/${phoneId}/messages`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify(metaPayload),
					},
				);
				metaStatusCode = metaRes.status;
				metaData = await metaRes.json().catch(() => ({}));
				metaMessageId = metaData?.messages?.[0]?.id ?? null;

				if (!metaRes.ok) {
					console.error("[WhatsApp] Meta API Error Details:", JSON.stringify(metaData, null, 2));
					sendError = {
						kind: "meta_api_error",
						message:
							metaData?.error?.message ??
							`Meta Graph API returned HTTP ${metaRes.status}`,
						statusCode: metaRes.status,
						metaError: getMetaError(metaData),
					};
				} else {
					console.info(`[WhatsApp] Message sent successfully. MetaID: ${metaMessageId}`);
				}
			} catch (error) {
				console.error("[WhatsApp] Runtime error during send:", error);
				sendError = {
					kind: "network_or_runtime_error",
					message: error instanceof Error ? error.message : "Erro desconhecido",
					cause: serializeError(error),
				};
			}
		}

		const sendStatus = sendError ? "failed" : "sent";
		const savedMsg = await addMessage(
			pool,
			id,
			conv.organization_id,
			conv.contact_id,
			"outbound",
			"agent",
			user.uid,
			messageType,
			body.content || "",
			metaMessageId ?? undefined,
			{
				templateName: body.templateName,
				mediaUrl: body.attachmentUrl,
				mediaType: body.attachmentUrl ? messageType : undefined,
				status: sendStatus,
				metadata: {
					requestId,
					sentVia: body.sentVia ?? "inbox",
					whatsappSend: {
						status: sendStatus,
						metaStatusCode,
						metaMessageId,
						error: sendError,
					},
				},
			},
		);
		savedMsg.status = sendStatus;

		await broadcastToOrg(c.env, conv.organization_id, {
			type: sendError ? "whatsapp_message_failed" : "whatsapp_message",
			conversationId: id,
			message: savedMsg,
			requestId,
		});

		if (sendError) {
			logWhatsAppInboxEvent(c, "error", "message send failed", {
				...logContext,
				messageId: savedMsg.id,
				metaMessageId,
				metaStatusCode,
				sendError,
			});

			return c.json(
				{
					...mapMessageRow(savedMsg),
					error: "Mensagem nao enviada pelo WhatsApp",
					details: sendError.message,
					requestId,
				},
				502,
			);
		}

		await pool.query(
			`UPDATE wa_conversations
			 SET status = CASE WHEN status IN ('open', 'assigned') THEN 'pending' ELSE status END,
			     last_message_at = now(),
			     last_message_out_at = now(),
			     updated_at = now()
			 WHERE id = $1 AND organization_id = $2`,
			[id, conv.organization_id],
		);

		logWhatsAppInboxEvent(c, "info", "message sent successfully", {
			...logContext,
			messageId: savedMsg.id,
			metaMessageId,
			metaStatusCode,
		});

		return c.json(mapMessageRow(savedMsg), 201);
	} catch (err) {
		console.error("[WhatsApp Inbox] Route Crash Error:", err);
		logWhatsAppInboxEvent(c, "error", "message send route crashed", {
			requestId,
			conversationId: id,
			organizationId: user.organizationId,
			userId: user.uid,
			error: serializeError(err),
		});
		return c.json({ 
			error: "Failed to send message", 
			message: err instanceof Error ? err.message : String(err),
			requestId 
		}, 500);
	}
});

app.post("/conversations/:id/interactive", requireAuth, async (c) => {
	const user = c.get("user");
	const { id } = c.req.param();
	const pool = await createPool(c.env);
	const body = (await c.req.json()) as {
		type: "button" | "list" | "flow";
		bodyText: string;
		buttons?: Array<{ id: string; title: string }>;
		buttonText?: string;
		sections?: Array<{
			title: string;
			rows: Array<{ id: string; title: string; description?: string }>;
		}>;
		flowId?: string;
		flowCta?: string;
		flowToken?: string;
		flowAction?: string;
		flowActionPayload?: Record<string, unknown>;
		header?: string;
		footer?: string;
	};

	try {
		const convResult = await pool.query(
			`SELECT c.*, wc.wa_id, wc.bsuid FROM wa_conversations c LEFT JOIN whatsapp_contacts wc ON wc.id = c.contact_id WHERE c.id = $1`,
			[id],
		);
		if (convResult.rows.length === 0) {
			return c.json({ error: "Conversation not found" }, 404);
		}

		const conv = convResult.rows[0];
		const to = conv.wa_id;
		let metaResult: any;

		if (body.type === "button" && body.buttons) {
			metaResult = await sendReplyButtons(
				c.env,
				to,
				body.bodyText,
				body.buttons,
				{
					header: body.header,
					footer: body.footer,
					bsuid: conv.bsuid,
				},
			);
		} else if (body.type === "list" && body.sections) {
			metaResult = await sendListMessage(
				c.env,
				to,
				body.bodyText,
				body.buttonText ?? "Opcoes",
				body.sections,
				{
					header: body.header,
					footer: body.footer,
					bsuid: conv.bsuid,
				},
			);
		} else if (body.type === "flow" && body.flowId) {
			metaResult = await sendFlowMessage(
				c.env,
				to,
				body.flowId,
				body.flowCta ?? "Iniciar",
				body.bodyText,
				{
					flowToken: body.flowToken,
					flowAction: body.flowAction,
					flowActionPayload: body.flowActionPayload,
					header: body.header,
					footer: body.footer,
					bsuid: conv.bsuid,
				},
			);
		} else {
			return c.json(
				{ error: "Invalid interactive message type or missing parameters" },
				400,
			);
		}

		const metaMessageId = metaResult?.messages?.[0]?.id ?? null;

		const savedMsg = await addMessage(
			pool,
			id,
			conv.organization_id,
			conv.contact_id,
			"outbound",
			"agent",
			user.uid,
			"interactive",
			JSON.stringify({ type: body.type, bodyText: body.bodyText, metaResult }),
			metaMessageId ?? undefined,
		);

		await broadcastToOrg(c.env, conv.organization_id, {
			type: "whatsapp_message",
			conversationId: id,
			message: savedMsg,
		});

		return c.json(mapMessageRow(savedMsg), 201);
	} catch (err) {
		console.error(
			"[WhatsApp Inbox] POST /conversations/:id/interactive error:",
			err,
		);
		return c.json({ error: "Failed to send interactive message" }, 500);
	}
});

app.post("/conversations/:id/assign", requireAuth, async (c) => {
	const user = c.get("user");
	const { id } = c.req.param();
	const pool = await createPool(c.env);
	const body = (await c.req.json()) as {
		assignedTo: string;
		team?: string;
		reason?: string;
	};

	if (!body.assignedTo) {
		return c.json({ error: "assignedTo is required" }, 400);
	}

	try {
		const result = await assignConversationSvc(
			pool,
			id,
			body.assignedTo,
			user.uid,
			body.team ?? null,
			body.reason,
		);

		const convResult = await pool.query(
			`SELECT c.*, wc.wa_id, wc.display_name, wc.username, wc.bsuid, wc.patient_id FROM wa_conversations c LEFT JOIN whatsapp_contacts wc ON wc.id = c.contact_id WHERE c.id = $1`,
			[id],
		);

		if (convResult.rows.length > 0) {
			await broadcastToOrg(c.env, convResult.rows[0].organization_id, {
				type: "whatsapp_assignment",
				conversationId: id,
				assignedTo: body.assignedTo,
				assignedBy: user.uid,
			});
			return c.json(mapConversationRow(convResult.rows[0]));
		}

		return c.json({ data: result });
	} catch (err) {
		console.error(
			"[WhatsApp Inbox] POST /conversations/:id/assign error:",
			err,
		);
		return c.json({ error: "Failed to assign conversation" }, 500);
	}
});

app.post("/conversations/:id/transfer", requireAuth, async (c) => {
	const user = c.get("user");
	const { id } = c.req.param();
	const pool = await createPool(c.env);
	const body = (await c.req.json()) as {
		newAssignee: string;
		team?: string;
		reason?: string;
	};

	if (!body.newAssignee) {
		return c.json({ error: "newAssignee is required" }, 400);
	}

	try {
		const result = await transferConversationSvc(
			pool,
			id,
			body.newAssignee,
			user.uid,
			body.team,
			body.reason,
		);

		const convResult = await pool.query(
			`SELECT c.*, wc.wa_id, wc.display_name, wc.username, wc.bsuid, wc.patient_id FROM wa_conversations c LEFT JOIN whatsapp_contacts wc ON wc.id = c.contact_id WHERE c.id = $1`,
			[id],
		);

		if (convResult.rows.length > 0) {
			await broadcastToOrg(c.env, convResult.rows[0].organization_id, {
				type: "whatsapp_transfer",
				conversationId: id,
				newAssignee: body.newAssignee,
				transferredBy: user.uid,
			});
			return c.json(mapConversationRow(convResult.rows[0]));
		}

		return c.json({ data: result });
	} catch (err) {
		console.error(
			"[WhatsApp Inbox] POST /conversations/:id/transfer error:",
			err,
		);
		return c.json({ error: "Failed to transfer conversation" }, 500);
	}
});

app.post("/conversations/:id/notes", requireAuth, async (c) => {
	const user = c.get("user");
	const { id } = c.req.param();
	const pool = await createPool(c.env);
	const body = (await c.req.json()) as { content: string };

	if (!body.content) {
		return c.json({ error: "content is required" }, 400);
	}

	try {
		const result = await addInternalNote(
			pool,
			id,
			user.organizationId,
			user.uid,
			body.content,
		);

		await broadcastToOrg(c.env, user.organizationId, {
			type: "whatsapp_note",
			conversationId: id,
			note: result,
		});

		return c.json(mapMessageRow(result), 201);
	} catch (err) {
		console.error("[WhatsApp Inbox] POST /conversations/:id/notes error:", err);
		return c.json({ error: "Failed to add note" }, 500);
	}
});

app.put("/conversations/:id/status", requireAuth, async (c) => {
	const user = c.get("user");
	const { id } = c.req.param();
	const pool = await createPool(c.env);
	const body = (await c.req.json()) as { status: string };

	const validStatuses = ["open", "pending", "assigned", "resolved", "closed"];
	if (!body.status || !validStatuses.includes(body.status)) {
		return c.json(
			{ error: `status must be one of: ${validStatuses.join(", ")}` },
			400,
		);
	}

	try {
		const result = await updateConversationStatus(pool, id, body.status);

		if (!result) {
			return c.json({ error: "Conversation not found" }, 404);
		}

		await broadcastToOrg(c.env, user.organizationId, {
			type: "whatsapp_status_update",
			conversationId: id,
			status: body.status,
		});

		const convResult = await pool.query(
			`SELECT c.*, wc.wa_id, wc.display_name, wc.username, wc.bsuid, wc.patient_id FROM wa_conversations c LEFT JOIN whatsapp_contacts wc ON wc.id = c.contact_id WHERE c.id = $1`,
			[id],
		);
		if (convResult.rows.length > 0) {
			return c.json(mapConversationRow(convResult.rows[0]));
		}
		return c.json(mapConversationRow(result));
	} catch (err) {
		console.error("[WhatsApp Inbox] PUT /conversations/:id/status error:", err);
		return c.json({ error: "Failed to update status" }, 500);
	}
});

app.post("/contacts/resolve", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	const body = (await c.req.json()) as {
		phone?: string;
		displayName?: string;
		patientId?: string;
	};

	let phone = String(body.phone ?? "").replace(/\D/g, "");
	let displayName = body.displayName?.trim() || null;

	try {
		if (body.patientId) {
			const patientResult = await pool.query(
				`SELECT id, full_name, phone
         FROM patients
         WHERE id = $1 AND organization_id = $2
         LIMIT 1`,
				[body.patientId, user.organizationId],
			);

			if (patientResult.rows.length === 0) {
				return c.json({ error: "Patient not found" }, 404);
			}

			const patient = patientResult.rows[0];
			if (!displayName) displayName = patient.full_name || null;
			if (!phone && patient.phone) {
				phone = String(patient.phone).replace(/\D/g, "");
			}
		}

		if (phone.length < 10) {
			return c.json({ error: "A valid phone is required" }, 400);
		}

		const contact = await resolveOrCreateContact(
			pool,
			user.organizationId,
			phone,
			null,
			null,
			null,
			displayName,
		);

		const resolvedContact = body.patientId
			? ((await linkContactToPatient(pool, contact.id, body.patientId)) ?? contact)
			: contact;

		return c.json({ data: mapContactRow(resolvedContact) });
	} catch (err) {
		console.error("[WhatsApp Inbox] POST /contacts/resolve error:", err);
		return c.json({ error: "Failed to resolve contact" }, 500);
	}
});

app.get("/contacts", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	const { search, page = "1", limit = "50" } = c.req.query();

	const pageNum = Math.max(1, parseInt(page) || 1);
	const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
	const offset = (pageNum - 1) * limitNum;

	try {
		let query = "";
		let params: any[] = [user.organizationId];

		if (search) {
			params.push(`%${search}%`);
			query = `
				SELECT 
					wc.id as contact_id,
					wc.display_name,
					wc.wa_id,
					wc.username,
					wc.patient_id as wc_patient_id,
					p.id as p_patient_id,
					p.full_name as patient_name,
					p.phone as patient_phone,
					COALESCE(wc.created_at, p.created_at) as created_at,
					COALESCE(wc.updated_at, p.updated_at) as updated_at
				FROM whatsapp_contacts wc
				FULL OUTER JOIN patients p ON p.id = wc.patient_id AND p.organization_id = wc.organization_id
				WHERE (wc.organization_id = $1 OR p.organization_id = $1)
				AND (
					wc.display_name ILIKE $2 OR 
					wc.wa_id ILIKE $2 OR 
					wc.username ILIKE $2 OR 
					p.full_name ILIKE $2 OR 
					p.phone ILIKE $2
				)
				ORDER BY COALESCE(wc.updated_at, p.updated_at) DESC NULLS LAST
				LIMIT $3 OFFSET $4
			`;
			params.push(limitNum, offset);
		} else {
			query = `
				SELECT 
					wc.id as contact_id,
					wc.display_name,
					wc.wa_id,
					wc.username,
					wc.patient_id as wc_patient_id,
					p.id as p_patient_id,
					p.full_name as patient_name,
					p.phone as patient_phone,
					COALESCE(wc.created_at, p.created_at) as created_at,
					COALESCE(wc.updated_at, p.updated_at) as updated_at
				FROM whatsapp_contacts wc
				FULL OUTER JOIN patients p ON p.id = wc.patient_id AND p.organization_id = wc.organization_id
				WHERE (wc.organization_id = $1 OR p.organization_id = $1)
				ORDER BY COALESCE(wc.updated_at, p.updated_at) DESC NULLS LAST
				LIMIT $2 OFFSET $3
			`;
			params.push(limitNum, offset);
		}

		const result = await pool.query(query, params);

		return c.json({
			data: result.rows.map(mapContactRow),
			pagination: { page: pageNum, limit: limitNum, offset },
		});
	} catch (err) {
		console.error("[WhatsApp Inbox] GET /contacts error:", err);
		return c.json({ error: "Failed to fetch contacts" }, 500);
	}
});

app.get("/contacts/:id", requireAuth, async (c) => {
	const user = c.get("user");
	const { id } = c.req.param();
	const pool = await createPool(c.env);

	try {
		const result = await pool.query(
			`SELECT * FROM whatsapp_contacts WHERE id = $1 AND organization_id = $2`,
			[id, user.organizationId],
		);

		if (result.rows.length === 0) {
			return c.json({ error: "Contact not found" }, 404);
		}

		return c.json({ data: mapContactRow(result.rows[0]) });
	} catch (err) {
		console.error("[WhatsApp Inbox] GET /contacts/:id error:", err);
		return c.json({ error: "Failed to fetch contact" }, 500);
	}
});

app.get("/metrics", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);

	try {
		const metrics = await getConversationMetrics(pool, user.organizationId);
		return c.json({ data: metrics });
	} catch (err) {
		console.error("[WhatsApp Inbox] GET /metrics error:", err);
		return c.json({ error: "Failed to fetch metrics" }, 500);
	}
});

app.get("/tags", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);

	try {
		const result = await pool.query(
			`SELECT * FROM wa_tags WHERE organization_id = $1 ORDER BY name`,
			[user.organizationId],
		);
		return c.json({ data: result.rows });
	} catch (err) {
		console.error("[WhatsApp Inbox] GET /tags error:", err);
		return c.json({ error: "Failed to fetch tags" }, 500);
	}
});

app.post("/tags", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	const body = (await c.req.json()) as { name: string; color?: string };

	if (!body.name) {
		return c.json({ error: "name is required" }, 400);
	}

	try {
		const result = await pool.query(
			`INSERT INTO wa_tags (organization_id, name, color) VALUES ($1, $2, $3) RETURNING *`,
			[user.organizationId, body.name, body.color ?? null],
		);
		return c.json({ data: result.rows[0] }, 201);
	} catch (err) {
		console.error("[WhatsApp Inbox] POST /tags error:", err);
		return c.json({ error: "Failed to create tag" }, 500);
	}
});

app.post("/conversations/:id/tags", requireAuth, async (c) => {
	const user = c.get("user");
	const { id } = c.req.param();
	const pool = await createPool(c.env);
	const body = (await c.req.json()) as { tagIds: string[] };

	if (!body.tagIds || !Array.isArray(body.tagIds)) {
		return c.json({ error: "tagIds array is required" }, 400);
	}

	try {
		for (const tagId of body.tagIds) {
			await pool.query(
				`INSERT INTO wa_conversation_tags (conversation_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
				[id, tagId],
			);
		}
		return c.json({ data: { conversationId: id, tagIds: body.tagIds } });
	} catch (err) {
		console.error("[WhatsApp Inbox] POST /conversations/:id/tags error:", err);
		return c.json({ error: "Failed to add tags" }, 500);
	}
});

app.delete("/conversations/:id/tags/:tagId", requireAuth, async (c) => {
	const { id, tagId } = c.req.param();
	const pool = await createPool(c.env);

	try {
		await pool.query(
			`DELETE FROM wa_conversation_tags WHERE conversation_id = $1 AND tag_id = $2`,
			[id, tagId],
		);
		return c.json({ data: { removed: true } });
	} catch (err) {
		console.error(
			"[WhatsApp Inbox] DELETE /conversations/:id/tags/:tagId error:",
			err,
		);
		return c.json({ error: "Failed to remove tag" }, 500);
	}
});

app.get("/quick-replies", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	const { team } = c.req.query();

	try {
		const conditions = ["organization_id = $1"];
		const params: any[] = [user.organizationId];
		let idx = 2;

		if (team) {
			conditions.push(`team = $${idx++}`);
			params.push(team);
		}

		const result = await pool.query(
			`SELECT * FROM wa_quick_replies WHERE ${conditions.join(" AND ")} ORDER BY title`,
			params,
		);
		return c.json({ data: result.rows });
	} catch (err) {
		console.error("[WhatsApp Inbox] GET /quick-replies error:", err);
		return c.json({ error: "Failed to fetch quick replies" }, 500);
	}
});

app.post("/quick-replies", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	const body = (await c.req.json()) as {
		title: string;
		content: string;
		team?: string;
		category?: string;
		variables?: string[];
	};

	if (!body.title || !body.content) {
		return c.json({ error: "title and content are required" }, 400);
	}

	try {
		const result = await pool.query(
			`INSERT INTO wa_quick_replies (organization_id, title, content, team, category, variables, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
			[
				user.organizationId,
				body.title,
				body.content,
				body.team ?? null,
				body.category ?? null,
				body.variables ?? [],
				user.uid,
			],
		);
		return c.json({ data: result.rows[0] }, 201);
	} catch (err) {
		console.error("[WhatsApp Inbox] POST /quick-replies error:", err);
		return c.json({ error: "Failed to create quick reply" }, 500);
	}
});

app.get("/pending-confirmations", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	const { limit = "100" } = c.req.query();

	const today = new Date().toISOString().split("T")[0];

	try {
		const result = await pool.query(
			`SELECT a.id, a.patient_id, a.therapist_id, a.date, a.start_time, a.status,
              p.full_name, p.phone
       FROM appointments a
       LEFT JOIN patients p ON p.id = a.patient_id
       WHERE a.organization_id = $1
         AND a.date >= $2
         AND a.status IN ('scheduled', 'confirmed')
       ORDER BY a.date ASC, a.start_time ASC
       LIMIT $3`,
			[user.organizationId, today, Number(limit)],
		);

		const rows = result.rows.map((row) => ({
			appointment_id: row.id,
			appointment_date:
				row.date instanceof Date
					? row.date.toISOString().split("T")[0]
					: row.date?.length >= 10
						? row.date.slice(0, 10)
						: null,
			appointment_time: row.start_time,
			confirmation_status: "pending",
			patient: row.patient_id
				? {
						id: row.patient_id,
						name: row.full_name ?? null,
						phone: row.phone ?? null,
					}
				: null,
			therapist_id: row.therapist_id,
		}));

		return c.json({ data: rows });
	} catch (err) {
		console.error("[WhatsApp Inbox] GET /pending-confirmations error:", err);
		return c.json({ error: "Failed to fetch pending confirmations" }, 500);
	}
});

app.put("/conversations/:id/priority", requireAuth, async (c) => {
	const { id } = c.req.param();
	const pool = await createPool(c.env);
	const body = (await c.req.json()) as { priority: string };
	const valid = ["low", "medium", "high", "urgent"];
	if (!body.priority || !valid.includes(body.priority)) {
		return c.json({ error: `priority must be one of: ${valid.join(", ")}` }, 400);
	}
	try {
		const result = await pool.query(
			`UPDATE wa_conversations SET priority = $1, updated_at = NOW() WHERE id = $2 RETURNING id, priority`,
			[body.priority, id],
		);
		if (result.rows.length === 0) {
			return c.json({ error: "Conversation not found" }, 404);
		}
		return c.json({ data: result.rows[0] });
	} catch (err) {
		console.error("[WhatsApp Inbox] PUT /conversations/:id/priority error:", err);
		return c.json({ error: "Failed to update priority" }, 500);
	}
});

app.post("/broadcast", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	const body = (await c.req.json()) as {
		contactIds: string[];
		content: string;
		templateName?: string;
		templateLanguage?: string;
	};

	if (!body.contactIds?.length) {
		return c.json({ error: "contactIds array is required" }, 400);
	}
	if (!body.content && !body.templateName) {
		return c.json({ error: "content or templateName is required" }, 400);
	}
	if (body.contactIds.length > 200) {
		return c.json({ error: "Maximum 200 contacts per broadcast" }, 400);
	}

	const phoneId = c.env.WHATSAPP_PHONE_NUMBER_ID;
	const token = c.env.WHATSAPP_ACCESS_TOKEN;
	const results: Array<{ contactId: string; status: "sent" | "failed"; error?: string }> = [];

	for (const contactId of body.contactIds) {
		try {
			const contactResult = await pool.query(
				`SELECT id, wa_id, bsuid FROM whatsapp_contacts WHERE id = $1 AND organization_id = $2 LIMIT 1`,
				[contactId, user.organizationId],
			);

			if (contactResult.rows.length === 0) {
				results.push({ contactId, status: "failed", error: "Contact not found" });
				continue;
			}

			const contact = contactResult.rows[0];
			const to = contact.wa_id;

			if (!to) {
				results.push({ contactId, status: "failed", error: "No phone number" });
				continue;
			}

			const conversation = await findOrCreateConversationSvc(
				pool,
				user.organizationId,
				contactId,
			);

			let metaMessageId: string | null = null;
			let sendStatus: "sent" | "failed" = "failed";

			if (phoneId && token) {
				let metaPayload: Record<string, unknown>;
				const toClean = to.replace(/\D/g, "");

				if (body.templateName) {
					metaPayload = {
						messaging_product: "whatsapp",
						to: toClean,
						type: "template",
						template: {
							name: body.templateName,
							language: { code: body.templateLanguage ?? "pt_BR" },
						},
					};
				} else {
					metaPayload = {
						messaging_product: "whatsapp",
						to: toClean,
						type: "text",
						text: { body: body.content },
					};
				}

				if (contact.bsuid) (metaPayload as any).recipient = contact.bsuid;

				const metaRes = await fetch(
					`https://graph.facebook.com/v21.0/${phoneId}/messages`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify(metaPayload),
					},
				);

				const metaData = (await metaRes.json()) as any;
				metaMessageId = metaData.messages?.[0]?.id ?? null;
				sendStatus = metaRes.ok ? "sent" : "failed";
			} else {
				sendStatus = "sent";
			}

			await addMessage(
				pool,
				conversation.id,
				user.organizationId,
				contactId,
				"outbound",
				"agent",
				user.uid,
				body.templateName ? "template" : "text",
				body.content || `[Template: ${body.templateName}]`,
				metaMessageId ?? undefined,
				{ templateName: body.templateName },
			);

			results.push({ contactId, status: sendStatus });
		} catch (err) {
			console.error("[WhatsApp Inbox] Broadcast error for contact", contactId, err);
			results.push({ contactId, status: "failed", error: String(err) });
		}
	}

	const sent = results.filter((r) => r.status === "sent").length;
	const failed = results.filter((r) => r.status === "failed").length;

	return c.json({ data: { sent, failed, total: results.length, results } });
});

app.post("/conversations/:id/snooze", requireAuth, async (c) => {
	const user = c.get("user");
	const { id } = c.req.param();
	const pool = await createPool(c.env);
	const body = (await c.req.json()) as { until: string };

	if (!body.until) {
		return c.json({ error: "until (ISO date) is required" }, 400);
	}

	try {
		const result = await pool.query(
			`UPDATE wa_conversations
       SET snoozed_until = $1, status = 'pending', updated_at = NOW()
       WHERE id = $2 AND organization_id = $3
       RETURNING id, snoozed_until, status`,
			[body.until, id, user.organizationId],
		);

		if (result.rows.length === 0) {
			return c.json({ error: "Conversation not found" }, 404);
		}

		return c.json({ data: result.rows[0] });
	} catch (err) {
		console.error("[WhatsApp Inbox] POST /conversations/:id/snooze error:", err);
		return c.json({ error: "Failed to snooze conversation" }, 500);
	}
});

app.get("/conversations/:id/activity", requireAuth, async (c) => {
	const { id } = c.req.param();
	const pool = await createPool(c.env);

	try {
		const [assignments, messages] = await Promise.all([
			pool.query(
				`SELECT
           a.id,
           a.created_at,
           'assignment' AS activity_type,
           a.assigned_to,
           a.assigned_by,
           a.team,
           a.reason,
           COALESCE(u_to.name, a.assigned_to) AS assigned_to_name,
           COALESCE(u_by.name, a.assigned_by) AS assigned_by_name
         FROM wa_assignments a
         LEFT JOIN users u_to ON u_to.id = a.assigned_to
         LEFT JOIN users u_by ON u_by.id = a.assigned_by
         WHERE a.conversation_id = $1
         ORDER BY a.created_at DESC
         LIMIT 50`,
				[id],
			),
			pool.query(
				`SELECT id, created_at, direction, message_type, sender_id, sender_name, status
         FROM wa_messages
         WHERE conversation_id = $1 AND (is_internal_note = true OR message_type = 'template')
         ORDER BY created_at DESC
         LIMIT 20`,
				[id],
			),
		]);

		const activities = [
			...assignments.rows.map((r) => ({
				id: r.id,
				type: "assignment",
				timestamp: r.created_at,
				description: `Atribuído para ${r.assigned_to_name || r.assigned_to}${r.reason ? ` — ${r.reason}` : ""}`,
				by: r.assigned_by_name || r.assigned_by,
			})),
			...messages.rows.map((r) => ({
				id: r.id,
				type: r.message_type === "template" ? "template_sent" : "internal_note",
				timestamp: r.created_at,
				description:
					r.message_type === "template"
						? "Template enviado"
						: "Nota interna adicionada",
				by: r.sender_name || r.sender_id,
			})),
		].sort(
			(a, b) =>
				new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
		);

		return c.json({ data: activities });
	} catch (err) {
		console.error(
			"[WhatsApp Inbox] GET /conversations/:id/activity error:",
			err,
		);
		return c.json({ error: "Failed to fetch activity log" }, 500);
	}
});

app.get("/agents/workload", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);

	try {
		const result = await pool.query(
			`SELECT
         om.user_id,
         COALESCE(u.name, om.user_id) AS agent_name,
         COUNT(CASE WHEN c.status IN ('open', 'assigned', 'pending') THEN 1 END)::int AS open_conversations,
         COUNT(CASE WHEN c.status = 'resolved' AND DATE(c.resolved_at) = CURRENT_DATE THEN 1 END)::int AS resolved_today
       FROM organization_members om
       LEFT JOIN users u ON u.id = om.user_id
       LEFT JOIN wa_conversations c ON c.assigned_to = om.user_id AND c.organization_id = $1
       WHERE om.organization_id = $1
       GROUP BY om.user_id, u.name
       ORDER BY open_conversations DESC`,
			[user.organizationId],
		);

		return c.json({
			data: result.rows.map((r) => ({
				agentId: r.user_id,
				agentName: r.agent_name,
				openConversations: r.open_conversations,
				resolvedToday: r.resolved_today,
			})),
		});
	} catch (err) {
		console.error("[WhatsApp Inbox] GET /agents/workload error:", err);
		return c.json({ error: "Failed to fetch workload" }, 500);
	}
});

export { app as whatsappInboxRoutes };
