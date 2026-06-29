import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
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

function getConversationSortTime(conversation: Conversation) {
  const primaryTimestamp = conversation.lastMessageAt ?? conversation.createdAt;
  const primaryTime = primaryTimestamp ? new Date(primaryTimestamp).getTime() : 0;

  if (Number.isFinite(primaryTime) && primaryTime > 0) {
    return primaryTime;
  }

  const fallbackTime = conversation.createdAt ? new Date(conversation.createdAt).getTime() : 0;
  return Number.isFinite(fallbackTime) ? fallbackTime : 0;
}

function sortConversationsByInteraction(conversations: Conversation[]) {
  return [...conversations].sort((a, b) => {
    const timeDiff = getConversationSortTime(b) - getConversationSortTime(a);
    if (timeDiff !== 0) return timeDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

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
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Callers frequently pass an inline `filters` object, which has a new identity
  // on every render. Depending on the object reference would recreate `refetch`
  // each render and retrigger the fetch effect in an infinite loop
  // (ERR_INSUFFICIENT_RESOURCES). Depend on the serialized content instead so
  // equal filters collapse to a single, stable fetch.
  const filtersKey = JSON.stringify(filters ?? {});

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const parsedFilters = JSON.parse(filtersKey) as ConversationFilters;
      const result = await fetchConversations(parsedFilters);
      setConversations(sortConversationsByInteraction(result.data));
      setPagination(result.pagination);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load conversations";
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
  }, [filtersKey]);

  // Fetch on mount and when filters change
  useEffect(() => {
    void refetch();
  }, [refetch]);

  // Poll every 15 seconds as fallback
  useEffect(() => {
    const interval = setInterval(() => {
      void refetch();
    }, 15_000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Listen for real-time WhatsApp new messages via WebSocket
  useEffect(() => {
    const handleNewMessage = (event: Event) => {
      const data = (event as CustomEvent).detail;
      if (!data || data.type !== "whatsapp_new_message" || !data.conversationId) {
        return;
      }

      // Track new message for animation
      setNewMessageIds((prev) => new Set(prev).add(data.conversationId));

      // Remove "new" status after 5 seconds
      setTimeout(() => {
        setNewMessageIds((prev) => {
          const next = new Set(prev);
          next.delete(data.conversationId);
          return next;
        });
      }, 5000);

      // Update conversation in local state immediately
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv.id === data.conversationId) {
            return {
              ...conv,
              lastMessage: data.message?.content || conv.lastMessage,
              lastMessageAt: data.message?.createdAt || new Date().toISOString(),
              unreadCount: (conv.unreadCount || 0) + 1,
            };
          }
          return conv;
        });

        return sortConversationsByInteraction(updated);
      });

      // Also update React Query cache
      queryClient.setQueryData(["whatsapp", "inbox"], (old: any) => {
        if (!old?.data) return old;
        const updatedData = old.data.map((conv: any) => {
          if (conv.id === data.conversationId) {
            return {
              ...conv,
              lastMessage: data.message?.content || conv.lastMessage,
              lastMessageAt: data.message?.createdAt || new Date().toISOString(),
              unreadCount: (conv.unreadCount || 0) + 1,
            };
          }
          return conv;
        });
        const sorted = sortConversationsByInteraction(updatedData);
        return { ...old, data: sorted };
      });

      // Invalidate unread count
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "unread-count"] });
    };

    // Listen on window for WebSocket messages from RealtimeContext
    window.addEventListener("websocket_message", handleNewMessage);
    
    return () => {
      window.removeEventListener("websocket_message", handleNewMessage);
    };
  }, [queryClient]);

  return { 
    conversations, 
    loading, 
    error, 
    refetch, 
    pagination,
    newMessageIds,
    hasNewMessages: newMessageIds.size > 0,
  };
}

type ConversationResult = {
  conversation: Conversation;
  messages: Message[];
};

export function useWhatsAppConversation(id: string | null) {
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, error } = useQuery<ConversationResult>({
    queryKey: ["whatsapp", "conversation", id],
    queryFn: () =>
      fetchConversation(id!, { includeMessages: true, messageLimit: 100 }),
    enabled: Boolean(id),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  // Invalidate unread badge when conversation loads.
  useEffect(() => {
    if (data?.conversation) {
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "unread-count"] });
    }
  }, [data?.conversation?.id, queryClient]);

  // Background polling only when data is stale.
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => {
      const cached = queryClient.getQueryState<ConversationResult>([
        "whatsapp",
        "conversation",
        id,
      ]);
      const updatedAt = cached?.dataUpdatedAt ?? 0;
      if (Date.now() - updatedAt > 30_000) {
        queryClient.invalidateQueries({ queryKey: ["whatsapp", "conversation", id] });
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, [id, queryClient]);

  const conversation = data?.conversation ?? null;
  const messages = data?.messages ?? [];
  // Only show loading when there's no cached data at all.
  const loading = isLoading && !data;

  const sendMessage = useCallback(
    async (
      content: string,
      options?: {
        type?: string;
        attachmentUrl?: string;
        templateName?: string;
        templateLanguage?: string;
      },
    ) => {
      if (!id) return;
      const msg = await apiSendMessage(id, content, options);
      queryClient.setQueryData<ConversationResult>(
        ["whatsapp", "conversation", id],
        (old) =>
          old ? { ...old, messages: [...old.messages, msg] } : old,
      );
      return msg;
    },
    [id, queryClient],
  );

  const sendInteractive = useCallback(
    async (type: string, data: Record<string, unknown>) => {
      if (!id) return;
      const msg = await apiSendInteractive(id, type, data);
      queryClient.setQueryData<ConversationResult>(
        ["whatsapp", "conversation", id],
        (old) =>
          old ? { ...old, messages: [...old.messages, msg] } : old,
      );
      return msg;
    },
    [id, queryClient],
  );

  const addNote = useCallback(
    async (content: string) => {
      if (!id) return;
      const msg = await apiAddNote(id, content);
      queryClient.setQueryData<ConversationResult>(
        ["whatsapp", "conversation", id],
        (old) =>
          old ? { ...old, messages: [...old.messages, msg] } : old,
      );
      return msg;
    },
    [id, queryClient],
  );

  const updateMessage = useCallback(
    async (messageId: string, content: string | Record<string, unknown>) => {
      if (!id) return;
      const updated = await apiUpdateMessage(id, messageId, content);
      queryClient.setQueryData<ConversationResult>(
        ["whatsapp", "conversation", id],
        (old) =>
          old
            ? {
                ...old,
                messages: old.messages.map((m) =>
                  m.id === messageId ? updated : m,
                ),
              }
            : old,
      );
      return updated;
    },
    [id, queryClient],
  );

  const deleteMessage = useCallback(
    async (
      messageId: string,
      options?: { scope?: "local" | "everyone"; reason?: string },
    ) => {
      if (!id) return;
      const updated = await apiDeleteMessage(id, messageId, options);
      queryClient.setQueryData<ConversationResult>(
        ["whatsapp", "conversation", id],
        (old) =>
          old
            ? {
                ...old,
                messages: old.messages.map((m) =>
                  m.id === messageId ? updated : m,
                ),
              }
            : old,
      );
      return updated;
    },
    [id, queryClient],
  );

  const assign = useCallback(
    async (assignedTo: string, team?: string, reason?: string) => {
      if (!id) return;
      const updated = await apiAssign(id, assignedTo, team, reason);
      queryClient.setQueryData<ConversationResult>(
        ["whatsapp", "conversation", id],
        (old) => (old ? { ...old, conversation: updated } : old),
      );
      return updated;
    },
    [id, queryClient],
  );

  const transfer = useCallback(
    async (newAssignee: string, team?: string, reason?: string) => {
      if (!id) return;
      const updated = await apiTransfer(id, newAssignee, team, reason);
      queryClient.setQueryData<ConversationResult>(
        ["whatsapp", "conversation", id],
        (old) => (old ? { ...old, conversation: updated } : old),
      );
      return updated;
    },
    [id, queryClient],
  );

  const updateStatus = useCallback(
    async (status: string) => {
      if (!id) return;
      const updated = await apiUpdateStatus(id, status);
      queryClient.setQueryData<ConversationResult>(
        ["whatsapp", "conversation", id],
        (old) => (old ? { ...old, conversation: updated } : old),
      );
      return updated;
    },
    [id, queryClient],
  );

  const updateConversation = useCallback(
    async (data: Partial<Conversation>) => {
      if (!id) return;
      const updated = await apiUpdateConversation(id, data);
      queryClient.setQueryData<ConversationResult>(
        ["whatsapp", "conversation", id],
        (old) => (old ? { ...old, conversation: updated } : old),
      );
      return updated;
    },
    [id, queryClient],
  );

  const deleteConversation = useCallback(
    async (reason?: string) => {
      if (!id) return;
      const deleted = await apiDeleteConversation(id, reason);
      queryClient.removeQueries({ queryKey: ["whatsapp", "conversation", id] });
      return deleted;
    },
    [id, queryClient],
  );

  const refetch = useCallback(() => {
    if (!id) return Promise.resolve();
    return queryClient.invalidateQueries({
      queryKey: ["whatsapp", "conversation", id],
    });
  }, [id, queryClient]);

  return {
    conversation,
    messages,
    loading,
    isFetching,
    error: error instanceof Error ? error.message : null,
    sendMessage,
    sendInteractive,
    updateMessage,
    deleteMessage,
    addNote,
    assign,
    transfer,
    updateStatus,
    updateConversation,
    deleteConversation,
    refetch,
  };
}
