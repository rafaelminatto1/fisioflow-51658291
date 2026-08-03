import { request } from "@/api/v2/base";
import type {
  AssignmentInput,
  CurationItemDetail,
  CurationPerson,
  CurationProvenance,
  CurationQueueItem,
  CurationQueueFilters,
  CurationQueuePage,
  TransitionInput,
} from "@/features/wiki/types/curation";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function valueOf(row: UnknownRecord, camel: string, snake: string = camel) {
  return row[camel] ?? row[snake];
}

function person(value: unknown): CurationPerson | null {
  if (typeof value === "string" && value) return { id: value, name: value };
  const row = record(value);
  const id = String(row.id ?? row.userId ?? row.user_id ?? "");
  if (!id) return null;
  return {
    id,
    name: String(row.name ?? row.fullName ?? row.full_name ?? id),
  };
}

function provenance(value: unknown): CurationProvenance {
  const row = record(value);
  return {
    sourceType: String(row.sourceType ?? row.source_type ?? row.type ?? "") || undefined,
    sourceId: String(row.sourceId ?? row.source_id ?? "") || undefined,
    sourceTitle: String(row.sourceTitle ?? row.source_title ?? row.title ?? "") || undefined,
    sourceUrl: String(row.sourceUrl ?? row.source_url ?? row.url ?? "") || undefined,
    doi: String(row.doi ?? "") || undefined,
    pmid: String(row.pmid ?? "") || undefined,
    license: String(row.license ?? "") || undefined,
  };
}

export function normalizeCurationQueueItem(value: unknown): CurationQueueItem {
  const row = record(value);
  const rawProvenance = valueOf(row, "provenance");
  const sources = Array.isArray(rawProvenance) ? rawProvenance : [rawProvenance];
  return {
    id: String(row.id ?? ""),
    versionId: String(valueOf(row, "versionId", "version_id") ?? ""),
    rowVersion: Number(valueOf(row, "rowVersion", "row_version") ?? 0),
    title: String(row.title ?? row.version_title ?? "Item sem título"),
    kind: String(row.kind ?? "page"),
    editorialStatus: String(
      valueOf(row, "editorialStatus", "editorial_status") ?? "draft",
    ) as CurationQueueItem["editorialStatus"],
    technicalStatus: String(
      valueOf(row, "technicalStatus", "technical_status") ?? "not_started",
    ),
    assignee: person(valueOf(row, "assignee", "assignee_id")),
    priority: String(row.priority ?? "normal"),
    dueAt: (valueOf(row, "dueAt", "due_at") as string | null) ?? null,
    validUntil:
      (valueOf(row, "validUntil", "valid_until") as string | null) ?? null,
    provenance: sources[0] ? provenance(sources[0]) : null,
    allowedActions: Array.isArray(row.allowedActions)
      ? (row.allowedActions as CurationQueueItem["allowedActions"])
      : [],
  };
}

export function normalizeCurationDetail(value: unknown): CurationItemDetail {
  const row = record(value);
  const assignments = Array.isArray(row.assignments) ? row.assignments.map(record) : [];
  const sources = Array.isArray(row.sources) ? row.sources.map(provenance) : [];
  const reviews = Array.isArray(row.reviews)
    ? row.reviews.map((entry) => {
        const review = record(entry);
        return {
          reviewer: person(review.reviewer ?? review.reviewer_id),
          submittedBy: person(review.submittedBy ?? review.submitted_by),
          approvedBy: person(review.approvedBy ?? review.approved_by),
          decision: String(review.decision ?? review.action ?? review.to_status ?? "") || null,
          reason: String(review.reason ?? "") || null,
          reviewedAt: (review.reviewedAt ?? review.created_at ?? null) as string | null,
          validUntil: (review.validUntil ?? review.valid_until ?? null) as string | null,
        };
      })
    : [];
  const activeOwner = assignments.find(
    (assignment) => (assignment.assignment_type ?? assignment.assignmentType) === "owner",
  );
  const metadata = record(row.metadata);
  const base = normalizeCurationQueueItem({
    ...row,
    assignee: activeOwner?.assignee_id ?? row.assignee,
    priority: activeOwner?.priority ?? row.priority,
    due_at: activeOwner?.due_at ?? row.due_at,
    provenance: sources,
  });
  return {
    ...base,
    summary: String(row.summary ?? metadata.summary ?? "") || null,
    limitations: String(row.limitations ?? metadata.limitations ?? "") || null,
    sources,
    review: reviews[0] ?? null,
    reviews,
    assignments: assignments.map((assignment) => ({
      id: String(assignment.id ?? "") || undefined,
      assignee: person(assignment.assignee_id ?? assignment.assignee) ?? {
        id: "unknown",
        name: "Não informado",
      },
      assignmentType: String(
        assignment.assignment_type ?? assignment.assignmentType ?? "owner",
      ),
      priority: String(assignment.priority ?? "normal"),
      dueAt: (assignment.due_at ?? assignment.dueAt ?? null) as string | null,
    })),
  };
}

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

  queue: async (filters: CurationQueueFilters, cursor?: string) => {
    const params = new URLSearchParams({ limit: "20" });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    if (cursor) params.set("cursor", cursor);
    const response = await request<CurationQueuePage>(
      `/api/wiki-curation/queue?${params.toString()}`,
    );
    return { ...response, data: response.data.map(normalizeCurationQueueItem) };
  },

  detail: async (id: string) => {
    const response = await request<{ data: CurationItemDetail }>(
      `/api/wiki-curation/items/${encodeURIComponent(id)}`,
    );
    return { ...response, data: normalizeCurationDetail(response.data) };
  },

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
          assigneeId,
          priority: priority || "normal",
          dueAt: dueAt || null,
        }),
      },
    ),
};
