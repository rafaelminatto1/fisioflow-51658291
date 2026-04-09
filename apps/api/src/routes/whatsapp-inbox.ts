import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthUser } from "../lib/auth";
import { broadcastToOrg } from "../lib/realtime";
import {
	getInboxConversations,
	getConversationWithMessages,
	addMessage,
	assignConversation,
	transferConversation,
	addInternalNote,
	updateConversationStatus,
	getConversationMetrics,
} from "../lib/whatsapp-conversations";
import {
	sendReplyButtons,
	sendListMessage,
	sendFlowMessage,
} from "../lib/whatsapp-interactive";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

app.get("/conversations", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = await createPool(c.env);
	const {
		status,
		assignedTo,
		priority,
		team,
		search,
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
				limit: limitNum,
				offset,
			},
		);

		return c.json({
			data: conversations,
			pagination: {
				page: pageNum,
				limit: limitNum,
				offset,
			},
		});
	} catch (err) {
		console.error("[WhatsApp Inbox] GET /conversations error:", err);
		return c.json({ error: "Failed to fetch conversations" }, 500);
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

		return c.json({ data: result });
	} catch (err) {
		console.error("[WhatsApp Inbox] GET /conversations/:id error:", err);
		return c.json({ error: "Failed to fetch conversation" }, 500);
	}
});

app.post("/conversations/:id/messages", requireAuth, async (c) => {
	const user = c.get("user");
	const { id } = c.req.param();
	const pool = await createPool(c.env);
	const body = (await c.req.json()) as {
		content: string;
		messageType?: string;
		templateName?: string;
		templateLanguage?: string;
		interactiveType?: string;
		sentVia?: string;
	};

	if (!body.content) {
		return c.json({ error: "content is required" }, 400);
	}

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
		const phoneId = c.env.WHATSAPP_PHONE_NUMBER_ID;
		const token = c.env.WHATSAPP_ACCESS_TOKEN;
		let metaMessageId: string | null = null;
		let status = "pending";

		if (phoneId && token && to) {
			try {
				const targetBsuid = conv.bsuid;
				let metaPayload: Record<string, unknown>;

				if (body.messageType === "template" && body.templateName) {
					metaPayload = {
						messaging_product: "whatsapp",
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
					if (targetBsuid) (metaPayload as any).recipient = targetBsuid;
				} else {
					metaPayload = {
						messaging_product: "whatsapp",
						to: to.replace(/\D/g, ""),
						type: "text",
						text: { body: body.content },
					};
					if (targetBsuid) (metaPayload as any).recipient = targetBsuid;
				}

				const metaRes = await fetch(
					`https://graph.facebook.com/v19.0/${phoneId}/messages`,
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
				status = metaRes.ok ? "sent" : "failed";
			} catch (e) {
				console.error("[WhatsApp Inbox] Send error:", e);
				status = "failed";
			}
		}

		const savedMsg = await addMessage(
			pool,
			id,
			conv.org_id,
			conv.contact_id,
			"outbound",
			"agent",
			user.uid,
			body.messageType ?? "text",
			body.content,
			metaMessageId ?? undefined,
			{ templateName: body.templateName },
		);

		if (status === "sent") {
			await pool.query(`UPDATE wa_messages SET status = 'sent' WHERE id = $1`, [
				savedMsg.id,
			]);
			savedMsg.status = "sent";
		}

		await broadcastToOrg(c.env, conv.org_id, {
			type: "whatsapp_message",
			conversationId: id,
			message: savedMsg,
		});

		return c.json({ data: savedMsg }, 201);
	} catch (err) {
		console.error(
			"[WhatsApp Inbox] POST /conversations/:id/messages error:",
			err,
		);
		return c.json({ error: "Failed to send message" }, 500);
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
			conv.org_id,
			conv.contact_id,
			"outbound",
			"agent",
			user.uid,
			"interactive",
			JSON.stringify({ type: body.type, bodyText: body.bodyText, metaResult }),
			metaMessageId ?? undefined,
		);

		await broadcastToOrg(c.env, conv.org_id, {
			type: "whatsapp_message",
			conversationId: id,
			message: savedMsg,
		});

		return c.json({ data: savedMsg }, 201);
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
		const result = await assignConversation(
			pool,
			id,
			body.assignedTo,
			user.uid,
			body.team ?? null,
			body.reason,
		);

		const convResult = await pool.query(
			`SELECT org_id FROM wa_conversations WHERE id = $1`,
			[id],
		);
		if (convResult.rows.length > 0) {
			await broadcastToOrg(c.env, convResult.rows[0].org_id, {
				type: "whatsapp_assignment",
				conversationId: id,
				assignedTo: body.assignedTo,
				assignedBy: user.uid,
			});
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
		const result = await transferConversation(
			pool,
			id,
			body.newAssignee,
			user.uid,
			body.team,
			body.reason,
		);

		const convResult = await pool.query(
			`SELECT org_id FROM wa_conversations WHERE id = $1`,
			[id],
		);
		if (convResult.rows.length > 0) {
			await broadcastToOrg(c.env, convResult.rows[0].org_id, {
				type: "whatsapp_transfer",
				conversationId: id,
				newAssignee: body.newAssignee,
				transferredBy: user.uid,
			});
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

		return c.json({ data: result }, 201);
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

		return c.json({ data: result });
	} catch (err) {
		console.error("[WhatsApp Inbox] PUT /conversations/:id/status error:", err);
		return c.json({ error: "Failed to update status" }, 500);
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
		const conditions = ["org_id = $1"];
		const params: any[] = [user.organizationId];
		let idx = 2;

		if (search) {
			conditions.push(
				`(display_name ILIKE $${idx} OR wa_id ILIKE $${idx} OR username ILIKE $${idx})`,
			);
			params.push(`%${search}%`);
			idx++;
		}

		params.push(limitNum, offset);
		const result = await pool.query(
			`SELECT * FROM whatsapp_contacts WHERE ${conditions.join(" AND ")} ORDER BY updated_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
			params,
		);

		return c.json({
			data: result.rows,
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
			`SELECT * FROM whatsapp_contacts WHERE id = $1 AND org_id = $2`,
			[id, user.organizationId],
		);

		if (result.rows.length === 0) {
			return c.json({ error: "Contact not found" }, 404);
		}

		return c.json({ data: result.rows[0] });
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
			`SELECT * FROM wa_tags WHERE org_id = $1 ORDER BY name`,
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
			`INSERT INTO wa_tags (org_id, name, color) VALUES ($1, $2, $3) RETURNING *`,
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
		const conditions = ["org_id = $1"];
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
			`INSERT INTO wa_quick_replies (org_id, title, content, team, category, variables, created_by)
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

export { app as whatsappInboxRoutes };
