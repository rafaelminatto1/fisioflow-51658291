import { createPool } from "./db";
import { isUuid } from "./validators";

type Pool = ReturnType<typeof createPool>;

/**
 * Ensures we are using a UUID for columns like assigned_to.
 * Handles cases where userId is an Auth ID (text) by resolving to profile.id (UUID).
 */
export async function resolveProfileUuid(
	pool: Pool,
	userIdOrUuid: string,
	orgId: string,
): Promise<string | null> {
	if (isUuid(userIdOrUuid)) return userIdOrUuid;

	const result = await pool.query(
		`SELECT id FROM profiles WHERE user_id = $1 AND organization_id = $2 LIMIT 1`,
		[userIdOrUuid, orgId],
	);
	return result.rows[0]?.id || null;
}

export async function findOrCreateConversation(
	pool: Pool,
	orgId: string,
	contactId: string,
) {
	try {
		const existing = await pool.query(
			`SELECT * FROM wa_conversations
       WHERE organization_id = $1 AND contact_id = $2 AND status IN ('open', 'pending')
       ORDER BY updated_at DESC LIMIT 1`,
			[orgId, contactId],
		);

		if (existing.rows.length > 0) {
			return existing.rows[0];
		}

		const created = await pool.query(
			`INSERT INTO wa_conversations (organization_id, contact_id, status, priority)
       VALUES ($1, $2, 'open', 'normal')
       RETURNING *`,
			[orgId, contactId],
		);

		return created.rows[0];
	} catch (error) {
		console.error(
			"[whatsapp-conversations] findOrCreateConversation error:",
			error,
		);
		throw error;
	}
}

export async function assignConversation(
	pool: Pool,
	conversationId: string,
	assignedTo: string,
	assignedBy: string,
	team: string | null,
	reason?: string,
) {
	try {
		// Get organization_id for resolving profile UUID
		const convResult = await pool.query(
			"SELECT organization_id FROM wa_conversations WHERE id = $1",
			[conversationId],
		);
		const orgId = convResult.rows[0]?.organization_id;

		const targetUuid = orgId
			? await resolveProfileUuid(pool, assignedTo, orgId)
			: assignedTo;

		await pool.query(
			`UPDATE wa_conversations
			 SET assigned_to = $1,
			     assigned_team = $3,
			     status = CASE WHEN status IN ('open', 'pending', 'assigned') THEN 'assigned' ELSE status END,
			     updated_at = now()
			 WHERE id = $2`,
			[targetUuid, conversationId, team],
		);

		const assignment = await pool.query(
			`INSERT INTO wa_assignments (conversation_id, organization_id, assigned_to, assigned_by, assigned_team, reason)
	       SELECT id, organization_id, $2, $3, $4, $5
	       FROM wa_conversations
	       WHERE id = $1
	       RETURNING *`,
			[conversationId, targetUuid, assignedBy, team, reason ?? null],
		);

		return assignment.rows[0];
	} catch (error) {
		console.error("[whatsapp-conversations] assignConversation error:", error);
		throw error;
	}
}

export async function transferConversation(
	pool: Pool,
	conversationId: string,
	newAssignee: string,
	transferredBy: string,
	team?: string,
	reason?: string,
) {
	try {
		const convResult = await pool.query(
			"SELECT organization_id FROM wa_conversations WHERE id = $1",
			[conversationId],
		);
		const orgId = convResult.rows[0]?.organization_id;

		const targetUuid = orgId
			? await resolveProfileUuid(pool, newAssignee, orgId)
			: newAssignee;

		await pool.query(
			`UPDATE wa_conversations
			 SET assigned_to = $1,
			     assigned_team = $3,
			     status = CASE WHEN status IN ('open', 'pending', 'assigned') THEN 'assigned' ELSE status END,
			     updated_at = now()
			 WHERE id = $2`,
			[targetUuid, conversationId, team ?? null],
		);

		const transfer = await pool.query(
			`INSERT INTO wa_assignments (conversation_id, organization_id, assigned_to, assigned_by, assigned_team, reason)
	       SELECT id, organization_id, $2, $3, $4, $5
	       FROM wa_conversations
	       WHERE id = $1
	       RETURNING *`,
			[
				conversationId,
				targetUuid,
				transferredBy,
				team ?? null,
				reason ?? null,
			],
		);

		return transfer.rows[0];
	} catch (error) {
		console.error(
			"[whatsapp-conversations] transferConversation error:",
			error,
		);
		throw error;
	}
}

export async function addInternalNote(
	pool: Pool,
	conversationId: string,
	orgId: string,
	authorId: string,
	content: string,
) {
	try {
		const result = await pool.query(
			`INSERT INTO wa_messages (conversation_id, organization_id, contact_id, direction, sender_type, sender_id, message_type, content, status, is_internal_note)
	       SELECT id, organization_id, contact_id, 'internal', 'agent', $3, 'note', $4::jsonb, 'sent', true
	       FROM wa_conversations
	       WHERE id = $1 AND organization_id = $2
	       RETURNING *`,
			[conversationId, orgId, authorId, JSON.stringify(content)],
		);

		if (result.rows.length === 0) {
			return null;
		}

		await pool.query(
			`INSERT INTO wa_internal_notes (conversation_id, organization_id, author_id, content)
			 VALUES ($1, $2, $3, $4)`,
			[conversationId, orgId, authorId, content],
		);

		await pool.query(
			`UPDATE wa_conversations SET updated_at = now() WHERE id = $1`,
			[conversationId],
		);

		return result.rows[0];
	} catch (error) {
		console.error("[whatsapp-conversations] addInternalNote error:", error);
		throw error;
	}
}

export async function updateConversationStatus(
	pool: Pool,
	conversationId: string,
	status: string,
) {
	try {
		const timestampCols: string[] = [];
		const params: any[] = [conversationId];
		let idx = 2;

		if (status === "resolved") {
			timestampCols.push(`resolved_at = now()`);
		}
		if (status === "closed") {
			timestampCols.push(`closed_at = now()`);
		}

		params.push(status);
		const result = await pool.query(
			`UPDATE wa_conversations SET status = $${idx}, updated_at = now()${timestampCols.length ? ", " + timestampCols.join(", ") : ""} WHERE id = $1 RETURNING *`,
			params,
		);

		return result.rows[0] ?? null;
	} catch (error) {
		console.error(
			"[whatsapp-conversations] updateConversationStatus error:",
			error,
		);
		throw error;
	}
}

export async function getConversationWithMessages(
	pool: Pool,
	conversationId: string,
	orgId?: string,
	limit: number = 50,
	beforeId?: string,
) {
	try {
		const convParams = orgId ? [conversationId, orgId] : [conversationId];
		const convResult = await pool.query(
			`SELECT c.*, wc.wa_id, wc.display_name, wc.username, wc.bsuid, wc.patient_id,
			        c.assigned_team AS team,
			        COALESCE(assignee.full_name, assignee.name, assignee.email, c.assigned_to::text) AS assigned_to_name,
			        COALESCE((
			          SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color) ORDER BY t.name)
			          FROM wa_conversation_tags wct
			          JOIN wa_tags t ON t.id = wct.tag_id
			          WHERE wct.conversation_id = c.id
			        ), '[]'::json) AS tags
	       FROM wa_conversations c
	       LEFT JOIN whatsapp_contacts wc ON wc.id = c.contact_id
	       LEFT JOIN profiles assignee ON assignee.user_id = c.assigned_to::text
	       WHERE c.id = $1${orgId ? " AND c.organization_id = $2" : ""}`,
			convParams,
		);

		if (convResult.rows.length === 0) return null;

		let msgQuery = `SELECT * FROM wa_messages WHERE conversation_id = $1`;
		const msgParams: any[] = [conversationId];

		if (beforeId) {
			msgParams.push(beforeId);
			msgQuery += ` AND id < $${msgParams.length}`;
		}

		msgParams.push(limit);
		msgQuery += ` ORDER BY created_at DESC LIMIT $${msgParams.length}`;

		const msgsResult = await pool.query(msgQuery, msgParams);

		return {
			...convResult.rows[0],
			messages: msgsResult.rows.reverse(),
		};
	} catch (error) {
		console.error(
			"[whatsapp-conversations] getConversationWithMessages error:",
			error,
		);
		throw error;
	}
}

export async function getInboxConversations(
	pool: Pool,
	orgId: string,
	filters: {
		status?: string;
		assignedTo?: string;
		priority?: string;
		team?: string;
		search?: string;
		tagId?: string;
		limit?: number;
		offset?: number;
	} = {},
): Promise<{ data: any[]; total: number }> {
	try {
		const conditions: string[] = ["c.organization_id = $1"];
		const params: any[] = [orgId];
		let idx = 2;

		if (filters.status) {
			conditions.push(`c.status = $${idx++}`);
			params.push(filters.status);
		}
		if (filters.assignedTo) {
			if (filters.assignedTo === "unassigned") {
				conditions.push("c.assigned_to IS NULL");
			} else {
				conditions.push(`c.assigned_to::text = $${idx++}`);
				params.push(filters.assignedTo);
			}
		}
		if (filters.priority) {
			conditions.push(`c.priority = $${idx++}`);
			params.push(filters.priority);
		}
		if (filters.team) {
			conditions.push(
				`EXISTS (SELECT 1 FROM wa_assignments wa WHERE wa.conversation_id = c.id AND wa.assigned_team = $${idx++})`,
			);
			params.push(filters.team);
		}
		if (filters.tagId) {
			conditions.push(
				`EXISTS (SELECT 1 FROM wa_conversation_tags wct WHERE wct.conversation_id = c.id AND wct.tag_id::text = $${idx++})`,
			);
			params.push(filters.tagId);
		}
		if (filters.search) {
			conditions.push(
				`EXISTS (SELECT 1 FROM whatsapp_contacts wc WHERE wc.id = c.contact_id AND (wc.display_name ILIKE $${idx} OR wc.wa_id ILIKE $${idx} OR wc.username ILIKE $${idx}))`,
			);
			params.push(`%${filters.search}%`);
			idx++;
		}

		const where =
			conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

		// Total count with same conditions
		const countResult = await pool.query(
			`SELECT COUNT(*)::int as total FROM wa_conversations c ${where}`,
			params,
		);
		const total = countResult.rows[0]?.total ?? 0;

		const limit = filters.limit ?? 50;
		const offset = filters.offset ?? 0;
		params.push(limit, offset);

		const result = await pool.query(
			`SELECT c.id, c.organization_id, c.contact_id, c.patient_id, c.status, c.priority, 
			        c.channel, c.assigned_to, c.assigned_team, c.created_at, c.updated_at, c.snoozed_until,
			        wc.wa_id, wc.display_name, wc.username, wc.bsuid,
			        c.assigned_team AS team,
			        COALESCE(assignee.full_name, assignee.name, assignee.email, c.assigned_to::text) AS assigned_to_name,
	              (SELECT m.content FROM wa_messages m WHERE m.conversation_id = c.id AND m.direction != 'internal' ORDER BY m.created_at DESC LIMIT 1) AS last_message,
	              (SELECT m.message_type FROM wa_messages m WHERE m.conversation_id = c.id AND m.direction != 'internal' ORDER BY m.created_at DESC LIMIT 1) AS last_message_type,
	              (SELECT m.created_at FROM wa_messages m WHERE m.conversation_id = c.id AND m.direction != 'internal' ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
	              (SELECT m.direction FROM wa_messages m WHERE m.conversation_id = c.id AND m.direction != 'internal' ORDER BY m.created_at DESC LIMIT 1) AS last_message_direction,
	              COALESCE((
	                SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color) ORDER BY t.name)
	                FROM wa_conversation_tags wct
	                JOIN wa_tags t ON t.id = wct.tag_id
	                WHERE wct.conversation_id = c.id
	              ), '[]'::json) AS tags
	       FROM wa_conversations c
	       LEFT JOIN whatsapp_contacts wc ON wc.id = c.contact_id
	       LEFT JOIN profiles assignee ON assignee.user_id = c.assigned_to::text
	       ${where}
       ORDER BY c.updated_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
			params,
		);

		return { data: result.rows, total };
	} catch (error) {
		console.error(
			"[whatsapp-conversations] getInboxConversations error:",
			error,
		);
		throw error;
	}
}

export async function addMessage(
	pool: Pool,
	conversationId: string,
	orgId: string,
	contactId: string,
	direction: "inbound" | "outbound" | "internal",
	senderType: "contact" | "agent" | "system",
	senderId: string,
	messageType: string,
	content: string | Record<string, unknown>,
	metaMessageId?: string,
	options?: {
		mediaUrl?: string;
		mediaType?: string;
		templateName?: string;
		replyTo?: string;
		status?: string;
		metadata?: Record<string, unknown>;
	},
) {
	try {
		// O campo 'content' no banco é jsonb. Se for string, precisamos garantir que seja um JSON válido (com aspas).
		const contentJson =
			typeof content === "string" ? JSON.stringify(content) : JSON.stringify(content);

		const result = await pool.query(
			`INSERT INTO wa_messages (conversation_id, organization_id, contact_id, direction, sender_type, sender_id, message_type, content, meta_message_id, media_url, media_type, template_name, reply_to, status, metadata)
       VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14, $15::jsonb)
       RETURNING *`,
			[
				conversationId,
				orgId,
				contactId,
				direction,
				senderType,
				senderId,
				messageType,
				contentJson,
				metaMessageId ?? null,
				options?.mediaUrl ?? null,
				options?.mediaType ?? null,
				options?.templateName ?? null,
				options?.replyTo ?? null,
				options?.status ?? "pending",
				options?.metadata ? JSON.stringify(options.metadata) : null,
			],
		);

		await pool.query(
			`UPDATE wa_conversations SET updated_at = now() WHERE id = $1`,
			[conversationId],
		);

		return result.rows[0];
	} catch (error) {
		console.error("[whatsapp-conversations] addMessage error:", error);
		throw error;
	}
}

export async function getConversationMetrics(pool: Pool, orgId: string) {
	try {
		const statusResult = await pool.query(
			`SELECT status, COUNT(*)::int AS count
       FROM wa_conversations
       WHERE organization_id = $1
       GROUP BY status`,
			[orgId],
		);

		const byStatus: Record<string, number> = {};
		let total = 0;
		for (const row of statusResult.rows) {
			byStatus[row.status] = row.count;
			total += row.count;
		}

		const avgResponseResult = await pool.query(
			`SELECT COALESCE(EXTRACT(EPOCH FROM AVG(
         first_reply.created_at - first_inbound.created_at
       ))::int, 0) AS avg_response_seconds
       FROM (
         SELECT DISTINCT ON (c.id)
           c.id AS conversation_id,
           m.created_at
         FROM wa_conversations c
         JOIN wa_messages m ON m.conversation_id = c.id
         WHERE c.organization_id = $1 AND m.direction = 'inbound'
         ORDER BY c.id, m.created_at ASC
       ) first_inbound
       JOIN LATERAL (
         SELECT m2.created_at
         FROM wa_messages m2
         WHERE m2.conversation_id = first_inbound.conversation_id
           AND m2.direction = 'outbound'
         ORDER BY m2.created_at ASC
         LIMIT 1
       ) first_reply ON true`,
			[orgId],
		);

		return {
			total,
			byStatus,
			avgResponseSeconds: avgResponseResult.rows[0]?.avg_response_seconds ?? 0,
		};
	} catch (error) {
		console.error(
			"[whatsapp-conversations] getConversationMetrics error:",
			error,
		);
		throw error;
	}
}
