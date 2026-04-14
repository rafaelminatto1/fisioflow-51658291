import { useState, useEffect, useCallback } from "react";
import {
	fetchConversations,
	fetchConversation,
	sendMessage as apiSendMessage,
	sendInteractiveMessage as apiSendInteractive,
	updateMessage as apiUpdateMessage,
	deleteMessage as apiDeleteMessage,
	addNote as apiAddNote,
	assignConversation as apiAssign,
	transferConversation as apiTransfer,
	updateConversation as apiUpdateConversation,
	deleteConversation as apiDeleteConversation,
	updateStatus as apiUpdateStatus,
	type Conversation,
	type ConversationFilters,
	type Message,
} from "@/services/whatsapp-api";

export function useWhatsAppInbox(filters?: ConversationFilters) {
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [pagination, setPagination] = useState({
		page: 1,
		limit: 50,
		total: 0,
		totalPages: 0,
	});

	const refetch = useCallback(async () => {
		setLoading(true);
		try {
			const result = await fetchConversations(filters);
			setConversations(result.data);
			setPagination(result.pagination);
			setError(null);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to load conversations";
			const isAuthError =
				errorMessage.includes("401") ||
				errorMessage.includes("token") ||
				errorMessage.includes("authorized") ||
				errorMessage.includes("sessao");
			if (!isAuthError) {
				setError(errorMessage);
			}
		} finally {
			setLoading(false);
		}
	}, [filters]);

	useEffect(() => {
		void refetch();
	}, [refetch]);

	useEffect(() => {
		const interval = setInterval(() => {
			fetchConversations(filters)
				.then((result) => {
					setConversations(result.data);
					setPagination(result.pagination);
				})
				.catch((err) => {
					if (
						!err.message?.includes("401") &&
						!err.message?.includes("token")
					) {
						console.error("[WhatsAppInbox] Poll error:", err);
					}
				});
		}, 15000);
		return () => clearInterval(interval);
	}, [filters]);

	return { conversations, loading, error, refetch, pagination };
}

export function useWhatsAppConversation(id: string | null) {
	const [conversation, setConversation] = useState<Conversation | null>(null);
	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		if (!id) return;
		setLoading(true);
		setError(null);
		try {
			const result = await fetchConversation(id, {
				includeMessages: true,
				messageLimit: 100,
			});
			setConversation(result.conversation);
			setMessages(result.messages);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to load conversation";
			const isAuthError =
				errorMessage.includes("401") ||
				errorMessage.includes("token") ||
				errorMessage.includes("authorized") ||
				errorMessage.includes("sessao");
			if (!isAuthError) {
				setError(errorMessage);
			}
		} finally {
			setLoading(false);
		}
	}, [id]);

	useEffect(() => {
		load();
	}, [load]);

	useEffect(() => {
		if (!id) return;
		const interval = setInterval(load, 5000);
		return () => clearInterval(interval);
	}, [id, load]);

	const sendMessage = useCallback(
		async (
			content: string,
			options?: { type?: string; attachmentUrl?: string; templateName?: string; templateLanguage?: string },
		) => {
			if (!id) return;
			const context = {
				conversationId: id,
				messageLength: content.length,
				messageType: options?.type ?? "text",
				hasAttachment: Boolean(options?.attachmentUrl),
			};

			try {
				const msg = await apiSendMessage(id, content, options);
				if (msg.status === "failed") {
					console.error("[WhatsAppConversation] Message returned failed status", {
						...context,
						messageId: msg.id,
					});
				}
				setMessages((prev) => [...prev, msg]);
				return msg;
			} catch (err) {
				console.error("[WhatsAppConversation] Failed to send message", {
					...context,
					error: err,
				});
				throw err;
			}
		},
		[id],
	);

	const sendInteractive = useCallback(
		async (type: string, data: Record<string, unknown>) => {
			if (!id) return;
			const msg = await apiSendInteractive(id, type, data);
			setMessages((prev) => [...prev, msg]);
			return msg;
		},
		[id],
	);

	const addNote = useCallback(
		async (content: string) => {
			if (!id) return;
			const msg = await apiAddNote(id, content);
			setMessages((prev) => [...prev, msg]);
			return msg;
		},
		[id],
	);

	const updateMessage = useCallback(
		async (messageId: string, content: string | Record<string, unknown>) => {
			if (!id) return;
			const updated = await apiUpdateMessage(id, messageId, content);
			setMessages((prev) =>
				prev.map((message) => (message.id === messageId ? updated : message)),
			);
			return updated;
		},
		[id],
	);

	const deleteMessage = useCallback(
		async (
			messageId: string,
			options?: { scope?: "local" | "everyone"; reason?: string },
		) => {
			if (!id) return;
			const updated = await apiDeleteMessage(id, messageId, options);
			setMessages((prev) =>
				prev.map((message) => (message.id === messageId ? updated : message)),
			);
			return updated;
		},
		[id],
	);

	const assign = useCallback(
		async (assignedTo: string, team?: string, reason?: string) => {
			if (!id) return;
			const updated = await apiAssign(id, assignedTo, team, reason);
			setConversation(updated);
			return updated;
		},
		[id],
	);

	const transfer = useCallback(
		async (newAssignee: string, team?: string, reason?: string) => {
			if (!id) return;
			const updated = await apiTransfer(id, newAssignee, team, reason);
			setConversation(updated);
			return updated;
		},
		[id],
	);

	const updateConversationStatus = useCallback(
		async (status: string) => {
			if (!id) return;
			const updated = await apiUpdateStatus(id, status);
			setConversation(updated);
			return updated;
		},
		[id],
	);

	const updateConversation = useCallback(
		async (data: Partial<Conversation>) => {
			if (!id) return;
			const updated = await apiUpdateConversation(id, data);
			setConversation(updated);
			return updated;
		},
		[id],
	);

	const deleteConversation = useCallback(
		async (reason?: string) => {
			if (!id) return;
			const deleted = await apiDeleteConversation(id, reason);
			setConversation(deleted);
			return deleted;
		},
		[id],
	);

	return {
		conversation,
		messages,
		loading,
		error,
		sendMessage,
		sendInteractive,
		updateMessage,
		deleteMessage,
		addNote,
		assign,
		transfer,
		updateStatus: updateConversationStatus,
		updateConversation,
		deleteConversation,
		refetch: load,
	};
}
