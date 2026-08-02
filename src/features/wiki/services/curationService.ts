import { request } from "@/api/v2/base";
import type {
  AssignmentInput,
  CurationItemDetail,
  CurationQueueFilters,
  CurationQueuePage,
  TransitionInput,
} from "@/features/wiki/types/curation";

function idempotencyKey(operation: string): string {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `wiki-curation-${operation}-${suffix}`;
}

export const curationService = {
  capabilities: () =>
    request<{ data: { capabilities: string[] } }>(
      "/api/wiki-curation/capabilities",
    ),

  queue: (filters: CurationQueueFilters, cursor?: string) => {
    const params = new URLSearchParams({ limit: "20" });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    if (cursor) params.set("cursor", cursor);
    return request<CurationQueuePage>(
      `/api/wiki-curation/queue?${params.toString()}`,
    );
  },

  detail: (id: string) =>
    request<{ data: CurationItemDetail }>(
      `/api/wiki-curation/items/${encodeURIComponent(id)}`,
    ),

  transition: ({ item, action, reason, validUntil }: TransitionInput) =>
    request<{ data: CurationItemDetail }>(
      `/api/wiki-curation/items/${encodeURIComponent(item.id)}/transitions`,
      {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey(`transition-${item.id}-${action}`),
        },
        body: JSON.stringify({
          action,
          versionId: item.versionId,
          expectedVersion: item.rowVersion,
          ...(reason ? { reason } : {}),
          ...(validUntil ? { validUntil } : {}),
        }),
      },
    ),

  assign: ({ item, assigneeId, priority, dueAt }: AssignmentInput) =>
    request<{ data: CurationItemDetail }>(
      `/api/wiki-curation/items/${encodeURIComponent(item.id)}/assignments`,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey(`assignment-${item.id}`) },
        body: JSON.stringify({
          versionId: item.versionId,
          expectedVersion: item.rowVersion,
          assigneeId: assigneeId || null,
          priority: priority || null,
          dueAt: dueAt || null,
        }),
      },
    ),
};
