import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CrmConversationViewModel } from "../crmWhatsAppAdapter";
import {
  applyInboxFilters,
  countActiveFilters,
  EMPTY_INBOX_FILTERS,
  resolveSnoozeTarget,
  sortInboxCards,
  UNASSIGNED_KEY,
} from "../inboxFilters";

function card(overrides: Partial<CrmConversationViewModel>): CrmConversationViewModel {
  return {
    id: "c",
    channel: "whatsapp",
    unreadCount: 0,
    awaitingReply: false,
    hoursSinceLastMessage: 0,
    assignedTo: undefined,
    tags: [],
    metadata: {},
    lastMessageAt: "2026-06-20T10:00:00.000Z",
    isSnoozeDue: false,
    ...overrides,
  } as CrmConversationViewModel;
}

describe("applyInboxFilters", () => {
  it("sem filtros ativos devolve tudo", () => {
    const cards = [card({ id: "a" }), card({ id: "b" })];
    expect(applyInboxFilters(cards, EMPTY_INBOX_FILTERS)).toHaveLength(2);
  });

  it("filtra somente não lidas", () => {
    const cards = [card({ id: "a", unreadCount: 3 }), card({ id: "b", unreadCount: 0 })];
    const result = applyInboxFilters(cards, { ...EMPTY_INBOX_FILTERS, unreadOnly: true });
    expect(result.map((c) => c.id)).toEqual(["a"]);
  });

  it("filtra por tempo sem resposta da equipe", () => {
    const cards = [
      card({ id: "antiga", awaitingReply: true, hoursSinceLastMessage: 8 }),
      card({ id: "recente", awaitingReply: true, hoursSinceLastMessage: 1 }),
      card({ id: "respondida", awaitingReply: false, hoursSinceLastMessage: 40 }),
    ];
    const result = applyInboxFilters(cards, { ...EMPTY_INBOX_FILTERS, awaitingReplyHours: 6 });
    expect(result.map((c) => c.id)).toEqual(["antiga"]);
  });

  it("filtra por canal, responsável e tag", () => {
    const cards = [
      card({ id: "a", channel: "instagram", assignedTo: "u1", tags: [{ id: "t1", name: "Lead", color: "#000" }] }),
      card({ id: "b", channel: "whatsapp", assignedTo: "u2" }),
      card({ id: "c", channel: "instagram" }),
    ];

    expect(
      applyInboxFilters(cards, { ...EMPTY_INBOX_FILTERS, channels: ["instagram"] }).map((c) => c.id),
    ).toEqual(["a", "c"]);

    expect(
      applyInboxFilters(cards, { ...EMPTY_INBOX_FILTERS, assignees: [UNASSIGNED_KEY] }).map((c) => c.id),
    ).toEqual(["c"]);

    expect(
      applyInboxFilters(cards, { ...EMPTY_INBOX_FILTERS, tagIds: ["t1"] }).map((c) => c.id),
    ).toEqual(["a"]);
  });

  it("combina filtros (E lógico entre categorias)", () => {
    const cards = [
      card({ id: "a", channel: "whatsapp", unreadCount: 2 }),
      card({ id: "b", channel: "instagram", unreadCount: 2 }),
    ];
    const result = applyInboxFilters(cards, {
      ...EMPTY_INBOX_FILTERS,
      unreadOnly: true,
      channels: ["instagram"],
    });
    expect(result.map((c) => c.id)).toEqual(["b"]);
  });

  it("conta filtros ativos para o badge", () => {
    expect(countActiveFilters(EMPTY_INBOX_FILTERS)).toBe(0);
    expect(
      countActiveFilters({
        unreadOnly: true,
        awaitingReplyHours: 6,
        channels: ["whatsapp"],
        assignees: ["u1", "u2"],
        tagIds: [],
      }),
    ).toBe(5);
  });
});

describe("sortInboxCards", () => {
  it("põe fixadas no topo, depois lembretes vencidos, depois por recência", () => {
    const cards = [
      card({ id: "antiga", lastMessageAt: "2026-06-20T08:00:00.000Z" }),
      card({ id: "lembrete", isSnoozeDue: true, lastMessageAt: "2026-06-19T08:00:00.000Z" }),
      card({ id: "recente", lastMessageAt: "2026-06-20T11:00:00.000Z" }),
      card({ id: "fixada", metadata: { pinned: true }, lastMessageAt: "2026-06-01T08:00:00.000Z" }),
    ];

    expect(sortInboxCards(cards).map((c) => c.id)).toEqual([
      "fixada",
      "lembrete",
      "recente",
      "antiga",
    ]);
  });
});

describe("resolveSnoozeTarget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calcula 1h, 3h e amanhã 9h", () => {
    const now = new Date("2026-06-20T12:00:00.000Z");
    expect(resolveSnoozeTarget("1h", now)).toBe("2026-06-20T13:00:00.000Z");
    expect(resolveSnoozeTarget("3h", now)).toBe("2026-06-20T15:00:00.000Z");

    const tomorrow = new Date(resolveSnoozeTarget("tomorrow", now)!);
    expect(tomorrow.getHours()).toBe(9);
    expect(tomorrow.getDate()).toBe(21);

    expect(resolveSnoozeTarget("clear", now)).toBeNull();
  });
});
