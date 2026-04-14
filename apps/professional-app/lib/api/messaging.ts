import { fetchApi } from "./client";
import type { ApiResponse, ApiConversation, ApiMessage } from "@/types/api";

function normalizeConversation(rawConversation: any): ApiConversation {
	const participantId =
		rawConversation.participantId ??
		rawConversation.participant_id ??
		rawConversation.participantIds?.find(
			(id: unknown) => typeof id === "string" && id !== rawConversation.id,
		) ??
		rawConversation.id;

	const participantName =
		rawConversation.participantName ??
		rawConversation.participant_name ??
		rawConversation.participantNames?.[participantId] ??
		rawConversation.participant_short_name ??
		"Usuário";

	const lastMessage =
		typeof rawConversation.lastMessage === "string"
			? rawConversation.lastMessage
			: (rawConversation.lastMessage?.content ??
				rawConversation.last_message_content ??
				"");

	const lastMessageAt =
		rawConversation.lastMessageAt ??
		rawConversation.last_message_at ??
		rawConversation.lastMessage?.createdAt ??
		rawConversation.lastMessage?.created_at ??
		rawConversation.updatedAt ??
		rawConversation.updated_at;

	const unreadCount =
		typeof rawConversation.unreadCount === "number"
			? rawConversation.unreadCount
			: (rawConversation.unreadCount?.[participantId] ??
				rawConversation.unread_count ??
				0);

	return {
		...rawConversation,
		id: String(rawConversation.id ?? participantId),
		participantId: String(participantId),
		participantName: String(participantName),
		lastMessage,
		lastMessageAt,
		unreadCount: Number(unreadCount),
		updatedAt:
			rawConversation.updatedAt ?? rawConversation.updated_at ?? lastMessageAt,
	};
}

function normalizeMessage(rawMessage: any): ApiMessage {
	return {
		...rawMessage,
		id: String(rawMessage.id),
		sender_id: String(rawMessage.sender_id ?? rawMessage.senderId ?? ""),
		senderId: String(rawMessage.senderId ?? rawMessage.sender_id ?? ""),
		recipient_id: String(
			rawMessage.recipient_id ?? rawMessage.recipientId ?? "",
		),
		recipientId: String(
			rawMessage.recipientId ?? rawMessage.recipient_id ?? "",
		),
		attachment_url:
			rawMessage.attachment_url ?? rawMessage.attachmentUrl ?? null,
		attachmentUrl:
			rawMessage.attachmentUrl ?? rawMessage.attachment_url ?? null,
		attachment_name:
			rawMessage.attachment_name ?? rawMessage.attachmentName ?? null,
		attachmentName:
			rawMessage.attachmentName ?? rawMessage.attachment_name ?? null,
		read_at: rawMessage.read_at ?? rawMessage.readAt ?? null,
		readAt: rawMessage.readAt ?? rawMessage.read_at ?? null,
		created_at:
			rawMessage.created_at ?? rawMessage.createdAt ?? new Date().toISOString(),
		createdAt:
			rawMessage.createdAt ?? rawMessage.created_at ?? new Date().toISOString(),
	};
}

export async function getConversations(): Promise<ApiConversation[]> {
	const response = await fetchApi<ApiResponse<ApiConversation[]>>(
		"/api/messaging/conversations",
	);
	return (response.data || []).map(normalizeConversation);
}

export async function getConversationMessages(
	participantId: string,
): Promise<ApiMessage[]> {
	const response = await fetchApi<ApiResponse<ApiMessage[]>>(
		`/api/messaging/conversations/${encodeURIComponent(participantId)}/messages`,
	);
	return (response.data || []).map(normalizeMessage);
}

export async function sendMessage(
	participantId: string,
	content: string,
): Promise<ApiMessage> {
	const response = await fetchApi<ApiResponse<ApiMessage>>(
		"/api/messaging/messages",
		{
			method: "POST",
			data: { recipientId: participantId, content },
		},
	);
	return normalizeMessage(response.data);
}

export async function markAsRead(
	participantId: string,
): Promise<{ success?: boolean }> {
	return fetchApi<{ success?: boolean }>(
		`/api/messaging/conversations/${encodeURIComponent(participantId)}/read`,
		{ method: "POST" },
	);
}
