import { fetchApi } from "@/lib/api";

const BASE = "/api/whatsapp/inbox";

export interface WaTag {
	id: string;
	name: string;
	color?: string;
}

export interface WaConversation {
	id: string;
	contactId: string;
	contactName?: string;
	contactPhone?: string;
	patientId?: string;
	patientName?: string;
	status: string;
	priority: string;
	assignedTo?: string;
	assignedToName?: string;
	team?: string;
	tags?: WaTag[];
	unreadCount?: number;
	lastMessage?: {
		content?: any;
		messageType?: string;
		direction?: string;
		createdAt?: string;
	};
	lastMessageAt?: string;
	lastMessageDirection?: string;
	createdAt: string;
	updatedAt: string;
	contact?: {
		id: string;
		displayName?: string;
		phoneE164?: string;
		avatarUrl?: string;
	};
}

export interface WaTeamMember {
	id: string;
	userId: string;
	name: string;
	email?: string;
	role?: string;
	active?: boolean;
}

export interface WaMessage {
	id: string;
	conversationId: string;
	direction: string;
	senderType: string;
	messageType: string;
	content: any;
	status: string;
	isInternalNote?: boolean;
	createdAt: string;
}

export interface WaQuickReply {
	id: string;
	title: string;
	content: string;
	category?: string;
	team?: string;
}

export interface WaContact {
	id: string;
	displayName?: string;
	phoneE164?: string;
	username?: string;
	patientId?: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface ResolveContactInput {
	phone?: string;
	displayName?: string;
	patientId?: string;
}

export interface WaConversationDetailResponse {
	conversation: WaConversation;
	messages: WaMessage[];
}

export interface ConversationFilters {
	status?: string;
	assignedTo?: string;
	tagId?: string;
	priority?: string;
	team?: string;
	search?: string;
	page?: number;
	limit?: number;
}

export interface ConversationsResponse {
	data: WaConversation[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

function unwrapResponse<T = any>(response: any): T {
	return (response?.data ?? response) as T;
}

function getStringDate(...values: Array<unknown>): string {
	const value = values.find(
		(item) => typeof item === "string" && item.length > 0,
	);
	return typeof value === "string" ? value : new Date().toISOString();
}

function normalizeTag(tag: any): WaTag {
	return {
		id: String(tag.id),
		name: String(tag.name ?? "Categoria"),
		color: tag.color ?? undefined,
	};
}

function normalizeMessage(row: any): WaMessage {
	const messageType = row.messageType ?? row.type ?? row.message_type ?? "text";
	const createdAt = getStringDate(row.createdAt, row.created_at, row.timestamp);
	return {
		id: String(row.id),
		conversationId: String(row.conversationId ?? row.conversation_id ?? ""),
		direction: String(row.direction ?? "inbound"),
		senderType: String(row.senderType ?? row.sender_type ?? ""),
		messageType: String(messageType),
		content: row.content,
		status: String(row.status ?? ""),
		isInternalNote:
			Boolean(row.isInternalNote ?? row.is_internal_note) || messageType === "note",
		createdAt,
	};
}

function normalizeConversation(row: any): WaConversation {
	const lastContent =
		row.lastMessageContent ??
		row.last_message_content ??
		(typeof row.lastMessage === "object"
			? row.lastMessage?.content
			: row.lastMessage);
	const lastMessageType =
		row.lastMessageType ??
		row.last_message_type ??
		(typeof row.lastMessage === "object"
			? row.lastMessage?.messageType
			: undefined);
	const lastMessageAt = getStringDate(
		row.lastMessageAt,
		row.last_message_at,
		typeof row.lastMessage === "object" ? row.lastMessage?.createdAt : undefined,
		row.updatedAt,
		row.updated_at,
	);
	const tags = Array.isArray(row.tags) ? row.tags.map(normalizeTag) : [];

	return {
		id: String(row.id),
		contactId: String(row.contactId ?? row.contact_id ?? ""),
		contactName: row.contactName ?? row.contact_name ?? row.display_name,
		contactPhone: row.contactPhone ?? row.contact_phone ?? row.wa_id,
		patientId: row.patientId ?? row.patient_id ?? undefined,
		patientName: row.patientName ?? row.patient_name ?? undefined,
		status: String(row.status ?? "open"),
		priority: String(row.priority ?? "normal"),
		assignedTo: row.assignedTo ?? row.assigned_to ?? undefined,
		assignedToName: row.assignedToName ?? row.assigned_to_name ?? undefined,
		team: row.team ?? row.assignedTeam ?? row.assigned_team ?? undefined,
		tags,
		unreadCount: Number(row.unreadCount ?? row.unread_count ?? 0),
		lastMessage: lastContent
			? {
					content: lastContent,
					messageType: lastMessageType ?? "text",
					direction: row.lastMessageDirection ?? row.last_message_direction,
					createdAt: lastMessageAt,
				}
			: undefined,
		lastMessageAt,
		lastMessageDirection: row.lastMessageDirection ?? row.last_message_direction,
		createdAt: getStringDate(row.createdAt, row.created_at),
		updatedAt: getStringDate(row.updatedAt, row.updated_at, lastMessageAt),
		contact: row.contact,
	};
}

function normalizeTeamMember(member: any): WaTeamMember {
	const profile = member.profiles ?? {};
	const name =
		profile.full_name ??
		profile.name ??
		member.fullName ??
		member.name ??
		profile.email ??
		member.email ??
		"Profissional";
	return {
		id: String(member.id ?? member.user_id ?? member.userId),
		userId: String(member.userId ?? member.user_id ?? member.id),
		name,
		email: profile.email ?? member.email ?? undefined,
		role: member.role ?? undefined,
		active: member.active ?? true,
	};
}

export function getContactName(conv: WaConversation): string {
	return (
		conv.contactName ||
		conv.contact?.displayName ||
		conv.contact?.phoneE164 ||
		conv.contactPhone ||
		"Desconhecido"
	);
}

export function getContactPhone(conv: WaConversation): string {
	return conv.contactPhone || conv.contact?.phoneE164 || "";
}

export function getMessageTextPreview(msg?: WaConversation["lastMessage"]): string {
	if (!msg) return "";
	const c = msg.content;
	if (typeof c === "string") return c;
	return c?.text || c?.body || (msg.messageType ? `[${msg.messageType}]` : "");
}

export function getMessageText(msg: WaMessage): string {
	const c = msg.content;
	if (typeof c === "string") return c;
	return c?.text || c?.body || `[${msg.messageType}]`;
}

export async function fetchConversations(
	filters?: ConversationFilters,
): Promise<ConversationsResponse> {
	const params: Record<string, any> = {
		limit: 50,
		...filters,
	};
	// Remove empty values
	Object.keys(params).forEach((k) => {
		if (params[k] === undefined || params[k] === "" || params[k] === "all") {
			delete params[k];
		}
	});
	// "mine" filter maps to assignedTo=me
	if (filters?.status === "mine") {
		params.assignedTo = "me";
		delete params.status;
	}
	if (filters?.status === "unassigned") {
		params.assignedTo = "unassigned";
		delete params.status;
	}
	const response = await fetchApi<any>(
		`${BASE}/conversations`,
		{ params },
	);

	const result = unwrapResponse<any>(response);

	// Handle both paginated and array responses
	if (Array.isArray(result)) {
		return {
			data: result.map(normalizeConversation),
			pagination: { page: 1, limit: 50, total: result.length, totalPages: 1 },
		};
	}
	return {
		...result,
		data: Array.isArray(result?.data)
			? result.data.map(normalizeConversation)
			: [],
	} as ConversationsResponse;
}

export async function fetchConversationDetail(
	id: string,
): Promise<WaConversationDetailResponse> {
	const response = await fetchApi<any>(
		`${BASE}/conversations/${id}`,
		{ params: { includeMessages: "true", messageLimit: 100 } },
	);
	const result = unwrapResponse<any>(response);
	return {
		conversation: normalizeConversation(result.conversation ?? result),
		messages: Array.isArray(result.messages)
			? result.messages.map(normalizeMessage)
			: [],
	};
}

export async function fetchContacts(search?: string): Promise<WaContact[]> {
	const response = await fetchApi<any>(`${BASE}/contacts`, {
		params: { search, limit: 20 },
	});
	const result = response.data || response;
	return Array.isArray(result) ? result : (result?.data || []);
}

export async function resolveContact(
	input: ResolveContactInput,
): Promise<WaContact> {
	const response = await fetchApi<any>(`${BASE}/contacts/resolve`, {
		method: "POST",
		data: input,
	});
	const result = response.data || response;
	if (!result) {
		throw new Error("Não foi possível resolver o contato.");
	}
	return result;
}

export async function openConversation(contactId: string): Promise<WaConversation> {
	const response = await fetchApi<any>(`${BASE}/conversations`, {
		method: "POST",
		data: { contactId },
	});
	return normalizeConversation(unwrapResponse(response));
}

export async function sendMessage(
	conversationId: string,
	content: string,
): Promise<WaMessage> {
	const response = await fetchApi<any>(
		`${BASE}/conversations/${conversationId}/messages`,
		{
			method: "POST",
			data: { content, messageType: "text" },
		},
	);
	return normalizeMessage(unwrapResponse(response));
}

export async function addNote(
	conversationId: string,
	content: string,
): Promise<WaMessage> {
	const response = await fetchApi<any>(
		`${BASE}/conversations/${conversationId}/notes`,
		{
			method: "POST",
			data: { content },
		},
	);
	return normalizeMessage(unwrapResponse(response));
}

export async function updateConversationStatus(
	conversationId: string,
	status: string,
): Promise<WaConversation> {
	const response = await fetchApi<any>(
		`${BASE}/conversations/${conversationId}/status`,
		{
			method: "PUT",
			data: { status },
		},
	);
	return normalizeConversation(unwrapResponse(response));
}

export async function assignConversation(
	conversationId: string,
	assignedTo: string,
	team?: string,
	reason?: string,
): Promise<WaConversation> {
	const response = await fetchApi<any>(
		`${BASE}/conversations/${conversationId}/assign`,
		{
			method: "POST",
			data: { assignedTo, team, reason },
		},
	);
	return normalizeConversation(unwrapResponse(response));
}

export async function fetchTags(): Promise<WaTag[]> {
	const response = await fetchApi<any>(`${BASE}/tags`);
	const result = unwrapResponse<any>(response);
	return Array.isArray(result) ? result.map(normalizeTag) : [];
}

export async function addTags(
	conversationId: string,
	tagIds: string[],
): Promise<void> {
	await fetchApi(`${BASE}/conversations/${conversationId}/tags`, {
		method: "POST",
		data: { tagIds },
	});
}

export async function removeTag(
	conversationId: string,
	tagId: string,
): Promise<void> {
	await fetchApi(`${BASE}/conversations/${conversationId}/tags/${tagId}`, {
		method: "DELETE",
	});
}

export async function fetchTeamMembers(): Promise<WaTeamMember[]> {
	const response = await fetchApi<any>("/api/organization-members", {
		params: { limit: 1000 },
	});
	const result = unwrapResponse<any>(response);
	const members = Array.isArray(result) ? result : result?.data;
	return Array.isArray(members) ? members.map(normalizeTeamMember) : [];
}

export async function fetchQuickReplies(): Promise<WaQuickReply[]> {
	const response = await fetchApi<any>(`${BASE}/quick-replies`);
	const result = response.data || response;
	return Array.isArray(result) ? result : (result?.data || []);
}
