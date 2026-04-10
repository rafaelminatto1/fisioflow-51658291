import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	fetchConversations,
	fetchConversationDetail,
	sendMessage,
	addNote,
	updateConversationStatus,
	fetchQuickReplies,
	ConversationFilters,
	WaMessage,
} from "@/services/whatsapp-api";

export function useWhatsAppConversations(filters?: ConversationFilters) {
	return useQuery({
		queryKey: ["whatsapp-conversations", filters],
		queryFn: () => fetchConversations(filters),
		refetchInterval: 15_000,
		staleTime: 5_000,
	});
}

export function useWhatsAppMessages(conversationId: string | null) {
	return useQuery({
		queryKey: ["whatsapp-messages", conversationId],
		queryFn: () => fetchConversationDetail(conversationId!),
		enabled: !!conversationId,
		refetchInterval: 5_000,
		staleTime: 2_000,
	});
}

export function useWhatsAppQuickReplies() {
	return useQuery({
		queryKey: ["whatsapp-quick-replies"],
		queryFn: fetchQuickReplies,
		staleTime: 60_000,
	});
}

export function useWhatsAppSendMessage(conversationId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (content: string) => sendMessage(conversationId, content),
		onMutate: async (content: string) => {
			await queryClient.cancelQueries({
				queryKey: ["whatsapp-messages", conversationId],
			});
			const previous = queryClient.getQueryData([
				"whatsapp-messages",
				conversationId,
			]);
			queryClient.setQueryData(
				["whatsapp-messages", conversationId],
				(old: any) => ({
					...old,
					messages: [
						...(old?.messages || []),
						{
							id: `temp-${Date.now()}`,
							conversationId,
							direction: "outbound",
							senderType: "agent",
							messageType: "text",
							content,
							status: "pending",
							isInternalNote: false,
							createdAt: new Date().toISOString(),
						} satisfies WaMessage,
					],
				}),
			);
			return { previous };
		},
		onError: (_err: unknown, _vars: unknown, ctx: any) => {
			queryClient.setQueryData(
				["whatsapp-messages", conversationId],
				ctx?.previous,
			);
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: ["whatsapp-messages", conversationId],
			});
			queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
		},
	});
}

export function useWhatsAppAddNote(conversationId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (content: string) => addNote(conversationId, content),
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: ["whatsapp-messages", conversationId],
			});
		},
	});
}

export function useWhatsAppUpdateStatus() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			conversationId,
			status,
		}: {
			conversationId: string;
			status: string;
		}) => updateConversationStatus(conversationId, status),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
			queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
		},
	});
}
