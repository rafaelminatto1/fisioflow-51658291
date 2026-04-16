import { createPool } from "./db";
import { isUuid } from "./validators";
import { WhatsAppService } from "./whatsapp";
import type { Env } from "../types/env";

type Pool = ReturnType<typeof createPool>;

type JsonRecord = Record<string, unknown>;

export const WHATSAPP_DELETE_FOR_EVERYONE_WINDOW_HOURS = 60;

const WHATSAPP_DELETE_FOR_EVERYONE_WINDOW_MS =
	WHATSAPP_DELETE_FOR_EVERYONE_WINDOW_HOURS * 60 * 60 * 1000;

function asRecord(value: unknown): JsonRecord {
	return value && typeof value === "object" && !Array.isArray(value)
		? { ...(value as JsonRecord) }
		: {};
}

export function getDeleteForEveryoneDeadline(createdAt: unknown): Date | null {
	const createdTime = new Date(String(createdAt)).getTime();
	if (!Number.isFinite(createdTime)) return null;
	return new Date(createdTime + WHATSAPP_DELETE_FOR_EVERYONE_WINDOW_MS);
}

export function canDeleteForEveryone(
	message: { created_at?: unknown; direction?: string; metadata?: unknown },
	now = new Date(),
): boolean {
	const metadata = asRecord(message.metadata);
	if (metadata.deleted_at || metadata.deleted_for_everyone_at) return false;
	if (message.direction !== "outbound") return false;

	const deadline = getDeleteForEveryoneDeadline(message.created_at);
	return Boolean(deadline && now.getTime() <= deadline.getTime());
}

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
			        COALESCE(assignee.full_name, assignee.email, c.assigned_to::text) AS assigned_to_name,
			        COALESCE((
			          SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color) ORDER BY t.name)
			          FROM wa_conversation_tags wct
			          JOIN wa_tags t ON t.id = wct.tag_id
			          WHERE wct.conversation_id = c.id
			        ), '[]'::json) AS tags
	       FROM wa_conversations c
	       LEFT JOIN whatsapp_contacts wc ON wc.id = c.contact_id
	       LEFT JOIN profiles assignee ON assignee.id = c.assigned_to OR assignee.user_id = c.assigned_to::text
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

export async function updateConversationFields(
	pool: Pool,
	conversationId: string,
	orgId: string,
	updates: {
		status?: string;
		priority?: string;
		assignedTo?: string | null;
		team?: string | null;
		patientId?: string | null;
		metadata?: JsonRecord;
		updatedBy: string;
	},
) {
	try {
		const sets: string[] = ["updated_at = now()"];
		const params: unknown[] = [conversationId, orgId];
		let idx = 3;

		if (updates.status !== undefined) {
			sets.push(`status = $${idx++}`);
			params.push(updates.status);
			if (updates.status === "resolved") {
				sets.push("resolved_at = COALESCE(resolved_at, now())");
			}
			if (updates.status === "closed") {
				sets.push("closed_at = COALESCE(closed_at, now())");
			}
		}

		if (updates.priority !== undefined) {
			sets.push(`priority = $${idx++}`);
			params.push(updates.priority);
		}

		if (updates.assignedTo !== undefined) {
			const targetUuid = updates.assignedTo
				? await resolveProfileUuid(pool, updates.assignedTo, orgId)
				: null;
			if (updates.assignedTo && !targetUuid) {
				return { error: "assignee_not_found" as const, row: null };
			}
			sets.push(`assigned_to = $${idx++}`);
			params.push(targetUuid);
		}

		if (updates.team !== undefined) {
			sets.push(`assigned_team = $${idx++}`);
			params.push(updates.team);
		}

		if (updates.patientId !== undefined) {
			sets.push(`patient_id = $${idx++}`);
			params.push(updates.patientId);
		}

		const metadataPatch = {
			...asRecord(updates.metadata),
			last_manual_update_at: new Date().toISOString(),
			last_manual_update_by: updates.updatedBy,
		};
		sets.push(`metadata = COALESCE(metadata, '{}'::jsonb) || $${idx++}::jsonb`);
		params.push(JSON.stringify(metadataPatch));

		const result = await pool.query(
			`UPDATE wa_conversations
			 SET ${sets.join(", ")}
			 WHERE id = $1 AND organization_id = $2
			 RETURNING *`,
			params,
		);

		return { error: null, row: result.rows[0] ?? null };
	} catch (error) {
		console.error(
			"[whatsapp-conversations] updateConversationFields error:",
			error,
		);
		throw error;
	}
}

export async function markConversationDeleted(
	pool: Pool,
	conversationId: string,
	orgId: string,
	deletedBy: string,
	reason?: string,
) {
	try {
		const metadataPatch = {
			deleted_at: new Date().toISOString(),
			deleted_by: deletedBy,
			delete_scope: "local",
			delete_reason: reason ?? null,
		};

		const result = await pool.query(
			`UPDATE wa_conversations
			 SET status = 'closed',
			     closed_at = COALESCE(closed_at, now()),
			     updated_at = now(),
			     metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
			 WHERE id = $1 AND organization_id = $2
			 RETURNING *`,
			[conversationId, orgId, JSON.stringify(metadataPatch)],
		);

		return result.rows[0] ?? null;
	} catch (error) {
		console.error(
			"[whatsapp-conversations] markConversationDeleted error:",
			error,
		);
		throw error;
	}
}

export async function restoreConversation(
	pool: Pool,
	conversationId: string,
	orgId: string,
	restoredBy: string,
) {
	try {
		const metadataPatch = {
			deleted_at: null,
			deleted_by: null,
			delete_scope: null,
			delete_reason: null,
			restored_at: new Date().toISOString(),
			restored_by: restoredBy,
		};

		const result = await pool.query(
			`UPDATE wa_conversations
			 SET status = CASE WHEN status = 'closed' THEN 'open' ELSE status END,
			     updated_at = now(),
			     metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
			 WHERE id = $1 AND organization_id = $2
			 RETURNING *`,
			[conversationId, orgId, JSON.stringify(metadataPatch)],
		);

		return result.rows[0] ?? null;
	} catch (error) {
		console.error(
			"[whatsapp-conversations] restoreConversation error:",
			error,
		);
		throw error;
	}
}

async function getMessageForMutation(
	pool: Pool,
	conversationId: string,
	messageId: string,
	orgId: string,
) {
	const result = await pool.query(
		`SELECT m.*
		 FROM wa_messages m
		 JOIN wa_conversations c ON c.id = m.conversation_id
		 WHERE m.id = $1
		   AND m.conversation_id = $2
		   AND c.organization_id = $3
		   AND m.organization_id = $3
		 LIMIT 1`,
		[messageId, conversationId, orgId],
	);

	return result.rows[0] ?? null;
}

export async function editMessageContent(
	pool: Pool,
	conversationId: string,
	messageId: string,
	orgId: string,
	editedBy: string,
	content: string | JsonRecord,
) {
	try {
		const existing = await getMessageForMutation(
			pool,
			conversationId,
			messageId,
			orgId,
		);

		if (!existing) return { error: "not_found" as const, row: null };

		const metadata = asRecord(existing.metadata);
		if (metadata.deleted_at || metadata.deleted_for_everyone_at) {
			return { error: "deleted" as const, row: null };
		}

		const now = new Date().toISOString();
		const editHistory = Array.isArray(metadata.edit_history)
			? metadata.edit_history
			: [];
		const nextMetadata = {
			...metadata,
			edited_at: now,
			edited_by: editedBy,
			edit_scope: "local",
			edit_history: [
				...editHistory,
				{
					edited_at: now,
					edited_by: editedBy,
					previous_content: existing.content,
				},
			],
		};

		const result = await pool.query(
			`UPDATE wa_messages
			 SET content = $4::jsonb,
			     metadata = $5::jsonb
			 WHERE id = $1 AND conversation_id = $2 AND organization_id = $3
			 RETURNING *`,
			[
				messageId,
				conversationId,
				orgId,
				JSON.stringify(content),
				JSON.stringify(nextMetadata),
			],
		);

		await pool.query(
			`UPDATE wa_conversations SET updated_at = now() WHERE id = $1 AND organization_id = $2`,
			[conversationId, orgId],
		);

		return { error: null, row: result.rows[0] ?? null };
	} catch (error) {
		console.error("[whatsapp-conversations] editMessageContent error:", error);
		throw error;
	}
}

export async function markMessageDeleted(
	pool: Pool,
	conversationId: string,
	messageId: string,
	orgId: string,
	deletedBy: string,
	scope: "local" | "everyone",
	env?: Env,
	reason?: string,
) {
	try {
		const existing = await getMessageForMutation(
			pool,
			conversationId,
			messageId,
			orgId,
		);

		if (!existing) return { error: "not_found" as const, row: null };

		if (scope === "everyone") {
			if (existing.direction !== "outbound") {
				return { error: "not_outbound" as const, row: null };
			}

			if (!canDeleteForEveryone(existing)) {
				return {
					error: "delete_for_everyone_window_expired" as const,
					row: null,
					deleteForEveryoneExpiresAt:
						getDeleteForEveryoneDeadline(existing.created_at)?.toISOString() ??
						null,
				};
			}
		}

		const metadata = asRecord(existing.metadata);
		const now = new Date().toISOString();
		const deletionHistory = Array.isArray(metadata.deletion_history)
			? metadata.deletion_history
			: [];
		const nextMetadata = {
			...metadata,
			deleted_at: now,
			deleted_by: deletedBy,
			delete_scope: scope,
			delete_reason: reason ?? null,
			deleted_for_everyone_at:
				scope === "everyone"
					? metadata.deleted_for_everyone_at ?? now
					: metadata.deleted_for_everyone_at,
			deletion_history: [
				...deletionHistory,
				{
					deleted_at: now,
					deleted_by: deletedBy,
					scope,
					reason: reason ?? null,
					previous_status: existing.status,
				},
			],
		};

		const result = await pool.query(
			`UPDATE wa_messages
			 SET status = 'deleted',
			     metadata = $4::jsonb
			 WHERE id = $1 AND conversation_id = $2 AND organization_id = $3
			 RETURNING *`,
			[messageId, conversationId, orgId, JSON.stringify(nextMetadata)],
		);

		await pool.query(
			`UPDATE wa_conversations SET updated_at = now() WHERE id = $1 AND organization_id = $2`,
			[conversationId, orgId],
		);

		// Remote deletion if scope is 'everyone' and we have env
		let providerResult: {
			attempted: boolean;
			status: string;
			reason: string;
			metaMessageId: string | null;
			error?: unknown;
		} = {
			attempted: false,
			status: "not_attempted",
			reason: "Exclusão remota não solicitada (escopo local).",
			metaMessageId: existing.meta_message_id ?? null,
		};

		if (scope === "everyone") {
			if (env && existing.meta_message_id) {
				try {
					const whatsapp = new WhatsAppService(env);
					const res: any = await whatsapp.deleteMessage(existing.meta_message_id);

					if (res.error) {
						providerResult = {
							attempted: true,
							status: "failed",
							reason: `Falha na exclusão remota via Meta: ${JSON.stringify(res.error)}`,
							metaMessageId: existing.meta_message_id,
							error: res.error,
						};
					} else {
						providerResult = {
							attempted: true,
							status: "success",
							reason: "Exclusão remota concluída com sucesso no WhatsApp.",
							metaMessageId: existing.meta_message_id,
						};
					}
				} catch (err) {
					console.error("[whatsapp-conversations] Remote delete error:", err);
					providerResult = {
						attempted: true,
						status: "error",
						reason: `Erro inesperado ao tentar exclusão remota: ${err instanceof Error ? err.message : String(err)}`,
						metaMessageId: existing.meta_message_id,
						error: err,
					};
				}
			} else if (!env) {
				providerResult = {
					attempted: false,
					status: "not_supported",
					reason: "Credenciais (Env) não fornecidas para exclusão remota.",
					metaMessageId: existing.meta_message_id ?? null,
				};
			} else {
				providerResult = {
					attempted: false,
					status: "not_possible",
					reason: "Mensagem não possui ID remoto (meta_message_id).",
					metaMessageId: null,
				};
			}
		}

		return {
			error: null,
			row: result.rows[0] ?? null,
			provider: providerResult,
		};
	} catch (error) {
		console.error("[whatsapp-conversations] markMessageDeleted error:", error);
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
		includeDeleted?: boolean;
	} = {},
): Promise<{ data: any[]; total: number }> {
	try {
		const conditions: string[] = ["c.organization_id = $1"];
		const params: any[] = [orgId];
		let idx = 2;

		if (!filters.includeDeleted) {
			conditions.push("(c.metadata->>'deleted_at') IS NULL");
		}

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
			        COALESCE(assignee.full_name, assignee.email, c.assigned_to::text) AS assigned_to_name,
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
	       LEFT JOIN profiles assignee ON assignee.id = c.assigned_to OR assignee.user_id = c.assigned_to::text
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
