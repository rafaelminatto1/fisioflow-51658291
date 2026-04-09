import { fetchApi } from "@/lib/api";

const BASE = "/api/whatsapp/inbox";

export interface WaConversation {
	id: string;
	contactId: string;
	patientId?: string;
	status: string;
	priority: string;
	assignedTo?: string;
	lastMessageAt?: string;
	createdAt: string;
	updatedAt: string;
	contact?: {
		id: string;
		displayName?: string;
		phoneE164?: string;
		avatarUrl?: string;
	};
	lastMessage?: {
		content?: any;
		messageType?: string;
		direction?: string;
		createdAt?: string;
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
	createdAt: string;
}

export interface WaQuickReply {
	id: string;
	title: string;
	content: string;
	category?: string;
	team?: string;
}

export async function fetchMyConversations(
	token: string,
): Promise<WaConversation[]> {
	return fetchApi<WaConversation[]>(`${BASE}/conversations`, {
		params: { assignedTo: "me" },
	});
}

export async function fetchConversation(
	token: string,
	id: string,
): Promise<WaConversation> {
	return fetchApi<WaConversation>(`${BASE}/conversations/${id}`);
}

export async function fetchConversationMessages(
	token: string,
	conversationId: string,
): Promise<WaMessage[]> {
	return fetchApi<WaMessage[]>(
		`${BASE}/conversations/${conversationId}/messages`,
	);
}

export async function sendMessage(
	token: string,
	conversationId: string,
	content: string,
): Promise<WaMessage> {
	return fetchApi<WaMessage>(
		`${BASE}/conversations/${conversationId}/messages`,
		{
			method: "POST",
			data: { content, messageType: "text" },
		},
	);
}

export async function fetchQuickReplies(
	token: string,
): Promise<WaQuickReply[]> {
	return fetchApi<WaQuickReply[]>(`${BASE}/quick-replies`);
}

export async function updateConversationStatus(
	token: string,
	conversationId: string,
	status: string,
): Promise<WaConversation> {
	return fetchApi<WaConversation>(`${BASE}/conversations/${conversationId}`, {
		method: "PUT",
		data: { status },
	});
}
