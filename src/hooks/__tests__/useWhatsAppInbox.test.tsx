import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

const mockFetchConversations = vi.hoisted(() => vi.fn());

vi.mock("@/services/whatsapp-api", () => ({
  fetchConversations: (...args: unknown[]) => mockFetchConversations(...args),
  fetchConversation: vi.fn(),
  sendMessage: vi.fn(),
  sendInteractiveMessage: vi.fn(),
  updateMessage: vi.fn(),
  deleteMessage: vi.fn(),
  addNote: vi.fn(),
  assignConversation: vi.fn(),
  transferConversation: vi.fn(),
  updateConversation: vi.fn(),
  deleteConversation: vi.fn(),
  updateStatus: vi.fn(),
}));

import { useWhatsAppInbox } from "../useWhatsApp";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useWhatsAppInbox", () => {
  beforeEach(() => {
    // O setup global (src/tests/setup.ts) troca window.addEventListener por
    // vi.fn(), o que impediria os eventos de WebSocket de chegarem ao hook.
    // Repõe um barramento mínimo só para este arquivo.
    const bus = new EventTarget();
    window.addEventListener = ((...args: Parameters<EventTarget["addEventListener"]>) =>
      bus.addEventListener(...args)) as typeof window.addEventListener;
    window.removeEventListener = ((...args: Parameters<EventTarget["removeEventListener"]>) =>
      bus.removeEventListener(...args)) as typeof window.removeEventListener;
    window.dispatchEvent = ((event: Event) => bus.dispatchEvent(event)) as typeof window.dispatchEvent;
    vi.clearAllMocks();
    mockFetchConversations.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
    });
  });

  it("does not refetch in a loop when filters are passed as a new object each render", async () => {
    const { rerender } = renderHook(
      // Inline object literal — new identity every render, like CrmWhatsApp does.
      () => useWhatsAppInbox({ search: undefined, limit: 100 }),
      { wrapper },
    );

    await waitFor(() => expect(mockFetchConversations).toHaveBeenCalled());

    // Force several re-renders with fresh-but-equal filter objects.
    rerender();
    rerender();
    rerender();

    // Give any runaway effects a chance to fire.
    await new Promise((r) => setTimeout(r, 50));

    // Equal filters must collapse to a single fetch, not one per render.
    expect(mockFetchConversations).toHaveBeenCalledTimes(1);
  });

  it("zera o badge de não lidas da conversa ao marcá-la como lida", async () => {
    mockFetchConversations.mockResolvedValue({
      data: [
        { id: "c1", unreadCount: 3, createdAt: "2026-07-28T11:00:00Z", lastMessageAt: "2026-07-28T11:26:00Z" },
        { id: "c2", unreadCount: 2, createdAt: "2026-07-28T10:00:00Z", lastMessageAt: "2026-07-28T10:10:00Z" },
      ],
      pagination: { page: 1, limit: 100, total: 2, totalPages: 1 },
    });

    const { result } = renderHook(() => useWhatsAppInbox({ limit: 100 }), { wrapper });

    await waitFor(() => expect(result.current.conversations).toHaveLength(2));

    act(() => {
      result.current.clearUnreadBadge("c1");
    });

    expect(result.current.conversations.find((c) => c.id === "c1")?.unreadCount).toBe(0);
    expect(result.current.conversations.find((c) => c.id === "c2")?.unreadCount).toBe(2);
  });

  it("zera o badge quando outro dispositivo marca a conversa como lida (whatsapp_read)", async () => {
    mockFetchConversations.mockResolvedValue({
      data: [
        { id: "c1", unreadCount: 3, createdAt: "2026-07-28T11:00:00Z", lastMessageAt: "2026-07-28T11:26:00Z" },
      ],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });

    const { result } = renderHook(() => useWhatsAppInbox({ limit: 100 }), { wrapper });

    await waitFor(() => expect(result.current.conversations).toHaveLength(1));

    act(() => {
      window.dispatchEvent(
        new CustomEvent("websocket_message", {
          detail: { type: "whatsapp_read", conversationId: "c1" },
        }),
      );
    });

    expect(result.current.conversations[0].unreadCount).toBe(0);
  });
});
