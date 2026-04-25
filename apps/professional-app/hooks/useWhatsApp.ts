import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchConversations,
  fetchConversationDetail,
  sendMessage,
  addNote,
  updateConversationStatus,
  assignConversation,
  addTags,
  removeTag,
  fetchTags,
  fetchTeamMembers,
  fetchQuickReplies,
  fetchContacts,
  resolveContact,
  openConversation,
  ConversationFilters,
  ResolveContactInput,
  WaContact,
  WaConversation,
  WaConversationDetailResponse,
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

export function useWhatsAppTags() {
  return useQuery({
    queryKey: ["whatsapp-tags"],
    queryFn: fetchTags,
    staleTime: 5 * 60_000,
  });
}

export function useWhatsAppTeamMembers() {
  return useQuery({
    queryKey: ["whatsapp-team-members"],
    queryFn: fetchTeamMembers,
    staleTime: 5 * 60_000,
  });
}

export function useWhatsAppContacts(search?: string) {
  return useQuery({
    queryKey: ["whatsapp-contacts", search],
    queryFn: () => fetchContacts(search),
    enabled: !!search?.trim(),
    staleTime: 30_000,
  });
}

export function useWhatsAppSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation<WaMessage, unknown, string, { previous?: WaConversationDetailResponse }>({
    mutationFn: (content: string) => sendMessage(conversationId, content),
    onMutate: async (content: string) => {
      await queryClient.cancelQueries({
        queryKey: ["whatsapp-messages", conversationId],
      });
      const previous = queryClient.getQueryData<WaConversationDetailResponse>([
        "whatsapp-messages",
        conversationId,
      ]);
      queryClient.setQueryData(
        ["whatsapp-messages", conversationId],
        (old: WaConversationDetailResponse | undefined) => ({
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
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["whatsapp-messages", conversationId], ctx?.previous);
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
  return useMutation<WaMessage, unknown, string>({
    mutationFn: (content: string) => addNote(conversationId, content),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["whatsapp-messages", conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
    },
  });
}

export function useWhatsAppAssignConversation() {
  const queryClient = useQueryClient();
  return useMutation<
    WaConversation,
    unknown,
    { conversationId: string; assignedTo: string; team?: string; reason?: string }
  >({
    mutationFn: ({ conversationId, assignedTo, team, reason }) =>
      assignConversation(conversationId, assignedTo, team, reason),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      queryClient.invalidateQueries({
        queryKey: ["whatsapp-messages", variables?.conversationId],
      });
    },
  });
}

export function useWhatsAppAddTags() {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, { conversationId: string; tagIds: string[] }>({
    mutationFn: ({ conversationId, tagIds }) => addTags(conversationId, tagIds),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      queryClient.invalidateQueries({
        queryKey: ["whatsapp-messages", variables?.conversationId],
      });
    },
  });
}

export function useWhatsAppRemoveTag() {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, { conversationId: string; tagId: string }>({
    mutationFn: ({ conversationId, tagId }) => removeTag(conversationId, tagId),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      queryClient.invalidateQueries({
        queryKey: ["whatsapp-messages", variables?.conversationId],
      });
    },
  });
}

export function useWhatsAppUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, status }: { conversationId: string; status: string }) =>
      updateConversationStatus(conversationId, status),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
    },
  });
}

export function useWhatsAppResolveContact() {
  return useMutation<WaContact, unknown, ResolveContactInput>({
    mutationFn: (input) => resolveContact(input),
  });
}

export function useWhatsAppOpenConversation() {
  const queryClient = useQueryClient();
  return useMutation<WaConversation, unknown, string>({
    mutationFn: (contactId) => openConversation(contactId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
    },
  });
}
