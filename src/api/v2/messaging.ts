import { request } from "./base";

export interface ApiConversation {
	id: string;
	participantId: string;
	participantName: string;
	lastMessage: string;
	lastMessageAt: string;
	unreadCount: number;
	updatedAt: string;
}

export interface ApiMessage {
	id: string;
	senderId: string;
	recipientId: string;
	content: string;
	type: string;
	attachmentUrl?: string | null;
	attachmentName?: string | null;
	status: string;
	readAt?: string | null;
	createdAt: string;
}

export const messagingApi = {
	getConversations: () =>
		request<{ data: ApiConversation[] }>("/api/messaging/conversations"),

	getConversationMessages: (participantId: string, limit?: number) =>
		request<{ data: ApiMessage[] }>(
			`/api/messaging/conversations/${participantId}/messages${limit ? `?limit=${limit}` : ""}`,
		),

	sendMessage: (
		participantId: string,
		content: string,
		type: string = "text",
		attachmentUrl?: string,
		attachmentName?: string,
	) =>
		request<{ data: ApiMessage }>("/api/messaging/messages", {
			method: "POST",
			body: JSON.stringify({
				recipientId: participantId,
				content,
				type,
				attachmentUrl,
				attachmentName,
			}),
		}),

	markAsRead: (participantId: string) =>
		request<{ success: boolean }>(
			`/api/messaging/conversations/${participantId}/read`,
			{
				method: "POST",
			},
		),
};
