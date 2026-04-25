import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { messagingApi } from "@/api/v2/messaging";
import { useAuth } from "@/contexts/AuthContext";

export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["messaging", "conversations", user?.uid],
    queryFn: async () => {
      const res = await messagingApi.getConversations();
      return res.data || [];
    },
    enabled: !!user?.uid,
    refetchInterval: 15000, // Poll every 15s for new messages
  });
}

export function useConversationMessages(participantId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["messaging", "messages", user?.uid, participantId],
    queryFn: async () => {
      if (!participantId) return [];
      const res = await messagingApi.getConversationMessages(participantId);
      return res.data || [];
    },
    enabled: !!user?.uid && !!participantId,
    refetchInterval: 5000, // Poll every 5s for active conversation
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      participantId,
      content,
      type,
      attachmentUrl,
      attachmentName,
    }: {
      participantId: string;
      content: string;
      type?: string;
      attachmentUrl?: string;
      attachmentName?: string;
    }) => {
      const res = await messagingApi.sendMessage(
        participantId,
        content,
        type,
        attachmentUrl,
        attachmentName,
      );
      return res.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate both the messages list and conversations list
      queryClient.invalidateQueries({
        queryKey: ["messaging", "messages", user?.uid, variables.participantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["messaging", "conversations", user?.uid],
      });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (participantId: string) => {
      const res = await messagingApi.markAsRead(participantId);
      return res;
    },
    onSuccess: (_, participantId) => {
      queryClient.invalidateQueries({
        queryKey: ["messaging", "conversations", user?.uid],
      });
      queryClient.invalidateQueries({
        queryKey: ["messaging", "messages", user?.uid, participantId],
      });
    },
  });
}
