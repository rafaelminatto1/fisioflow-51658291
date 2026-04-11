import { fetchApi } from "@/lib/api";

const BASE = "/api/whatsapp/inbox";

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
	const result = await fetchApi<any>(
		`${BASE}/conversations`,
		{ params },
	);

	// The API returns { data: ConversationsResponse | WaConversation[] }
	const data = result.data || result;

	// Handle both paginated and array responses
	if (Array.isArray(data)) {
		return { data, pagination: { page: 1, limit: 50, total: data.length, totalPages: 1 } };
	}
	return data as ConversationsResponse;
}

export async function fetchConversationDetail(
	id: string,
): Promise<WaConversationDetailResponse> {
	const response = await fetchApi<{ data: WaConversationDetailResponse }>(
		`${BASE}/conversations/${id}`,
		{ params: { includeMessages: "true", messageLimit: 100 } },
	);
	return response.data;
}

export async function fetchContacts(search?: string): Promise<WaContact[]> {
	const response = await fetchApi<{ data?: WaContact[] }>(`${BASE}/contacts`, {
		params: { search, limit: 20 },
	});
	return response.data ?? [];
}

export async function resolveContact(
	input: ResolveContactInput,
): Promise<WaContact> {
	const response = await fetchApi<{ data?: WaContact }>(`${BASE}/contacts/resolve`, {
		method: "POST",
		data: input,
	});
	if (!response.data) {
		throw new Error("Não foi possível resolver o contato.");
	}
	return response.data;
}

export async function openConversation(contactId: string): Promise<WaConversation> {
	const response = await fetchApi<{ data: WaConversation }>(`${BASE}/conversations`, {
		method: "POST",
		data: { contactId },
	});
	return response.data;
}

export async function sendMessage(
	conversationId: string,
	content: string,
): Promise<WaMessage> {
	const response = await fetchApi<{ data: WaMessage }>(
		`${BASE}/conversations/${conversationId}/messages`,
		{
			method: "POST",
			data: { content, messageType: "text" },
		},
	);
	return response.data;
}

export async function addNote(
	conversationId: string,
	content: string,
): Promise<WaMessage> {
	const response = await fetchApi<{ data: WaMessage }>(
		`${BASE}/conversations/${conversationId}/notes`,
		{
			method: "POST",
			data: { content },
		},
	);
	return response.data;
}

export async function updateConversationStatus(
	conversationId: string,
	status: string,
): Promise<WaConversation> {
	const response = await fetchApi<{ data: WaConversation }>(
		`${BASE}/conversations/${conversationId}/status`,
		{
			method: "PUT",
			data: { status },
		},
	);
	return response.data;
}

export async function assignConversation(
	conversationId: string,
	assignedTo: string,
	team?: string,
	reason?: string,
): Promise<WaConversation> {
	const response = await fetchApi<{ data: WaConversation }>(
		`${BASE}/conversations/${conversationId}/assign`,
		{
			method: "POST",
			data: { assignedTo, team, reason },
		},
	);
	return response.data;
}

export async function fetchQuickReplies(): Promise<WaQuickReply[]> {
	const response = await fetchApi<{ data?: WaQuickReply[] }>(`${BASE}/quick-replies`);
	return response.data ?? [];
}
