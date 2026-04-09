import { useState, useEffect, useCallback } from "react";
import {
	fetchConversations,
	fetchConversation,
	sendMessage as apiSendMessage,
	sendInteractiveMessage as apiSendInteractive,
	addNote as apiAddNote,
	assignConversation as apiAssign,
	transferConversation as apiTransfer,
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
		setError(null);
		try {
			const result = await fetchConversations(filters);
			setConversations(result.data);
			setPagination(result.pagination);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load conversations",
			);
		} finally {
			setLoading(false);
		}
	}, [filters]);

	useEffect(() => {
		refetch();
	}, [refetch]);

	useEffect(() => {
		const interval = setInterval(refetch, 15000);
		return () => clearInterval(interval);
	}, [refetch]);

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
			setError(
				err instanceof Error ? err.message : "Failed to load conversation",
			);
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
			options?: { type?: string; attachmentUrl?: string },
		) => {
			if (!id) return;
			const msg = await apiSendMessage(id, content, options);
			setMessages((prev) => [...prev, msg]);
			return msg;
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

	return {
		conversation,
		messages,
		loading,
		error,
		sendMessage,
		sendInteractive,
		addNote,
		assign,
		transfer,
		updateStatus: updateConversationStatus,
		refetch: load,
	};
}
