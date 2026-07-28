import type { CrmConversationViewModel } from "./crmWhatsAppAdapter";

export interface InboxFilters {
  /** Só conversas com mensagens não lidas. */
  unreadOnly: boolean;
  /** Aguardando resposta da equipe há pelo menos N horas (0 = qualquer). */
  awaitingReplyHours: number | null;
  channels: Array<"whatsapp" | "instagram" | "webchat">;
  /** IDs de responsáveis; `unassigned` cobre conversas sem dono. */
  assignees: string[];
  tagIds: string[];
}

export const EMPTY_INBOX_FILTERS: InboxFilters = {
  unreadOnly: false,
  awaitingReplyHours: null,
  channels: [],
  assignees: [],
  tagIds: [],
};

export const UNASSIGNED_KEY = "unassigned";

export function countActiveFilters(filters: InboxFilters): number {
  return (
    (filters.unreadOnly ? 1 : 0) +
    (filters.awaitingReplyHours !== null ? 1 : 0) +
    filters.channels.length +
    filters.assignees.length +
    filters.tagIds.length
  );
}

export function applyInboxFilters<T extends CrmConversationViewModel>(
  cards: T[],
  filters: InboxFilters,
): T[] {
  return cards.filter((card) => {
    if (filters.unreadOnly && card.unreadCount <= 0) return false;

    if (filters.awaitingReplyHours !== null) {
      if (!card.awaitingReply) return false;
      if (card.hoursSinceLastMessage < filters.awaitingReplyHours) return false;
    }

    if (filters.channels.length > 0 && !filters.channels.includes(card.channel)) return false;

    if (filters.assignees.length > 0) {
      const key = card.assignedTo ?? UNASSIGNED_KEY;
      if (!filters.assignees.includes(key)) return false;
    }

    if (filters.tagIds.length > 0) {
      const cardTagIds = new Set(card.tags.map((tag) => tag.id));
      if (!filters.tagIds.some((tagId) => cardTagIds.has(tagId))) return false;
    }

    return true;
  });
}

function isPinned(card: CrmConversationViewModel): boolean {
  const metadata = card.metadata;
  return Boolean(metadata && typeof metadata === "object" && metadata.pinned === true);
}

/**
 * Ordem da lista: fixadas → lembretes vencidos → resto (mais recente primeiro).
 * A lista já chega ordenada por tempo do hook; aqui só promovemos os grupos.
 */
export function sortInboxCards<T extends CrmConversationViewModel>(cards: T[]): T[] {
  const rank = (card: T) => {
    if (isPinned(card)) return 0;
    if (card.isSnoozeDue) return 1;
    return 2;
  };

  return [...cards].sort((a, b) => {
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;

    const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return timeB - timeA;
  });
}

export type SnoozeOption = "1h" | "3h" | "tomorrow" | "clear";

/** Converte a opção do menu em um instante ISO (ou null para limpar). */
export function resolveSnoozeTarget(option: SnoozeOption, now: Date = new Date()): string | null {
  if (option === "clear") return null;
  if (option === "1h") return new Date(now.getTime() + 3600_000).toISOString();
  if (option === "3h") return new Date(now.getTime() + 3 * 3600_000).toISOString();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow.toISOString();
}
