import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
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
});
