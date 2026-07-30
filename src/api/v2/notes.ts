import { request, requestBlob } from "./base";

type NotesRequestOptions = Pick<RequestInit, "signal">;

export type NoteTaskRecord = {
  id: string;
  organization_id: string;
  titulo: string;
  descricao: string | null;
  status: string;
  prioridade: string;
  responsavel_id: string | null;
  data_vencimento: string | null;
  linked_entity_type?: string | null;
  linked_entity_id?: string | null;
  block_id: string | null;
  sync_mode: "one_way" | "two_way";
  created_at: string;
  updated_at: string;
};

export type NoteRevisionRecord = {
  id: string;
  organizationId: string;
  noteId: string;
  versionNumber: number;
  snapshotJson: Record<string, unknown>;
  contentHtml: string | null;
  contentText: string | null;
  changeSummary: string | null;
  reason: string | null;
  restoredFromRevisionId: string | null;
  createdBy: string;
  isImmutable: boolean;
  createdAt: string;
};

export type NoteMentionRecord = {
  id: string;
  organizationId: string;
  noteId: string;
  blockId: string | null;
  mentionType: "patient" | "profile" | "team" | "task" | "appointment" | "session" | "note" | "document" | "protocol" | "exercise";
  targetId: string;
  displayLabel: string | null;
  startOffset: number | null;
  endOffset: number | null;
  createdBy: string;
  deletedAt: string | null;
  createdAt: string;
};

export type NoteCommentRecord = {
  id: string;
  organizationId: string;
  noteId: string;
  blockId: string | null;
  parentCommentId: string | null;
  selection: Record<string, unknown> | null;
  body: string;
  status: "open" | "resolved";
  authorId: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NoteBacklinkRecord = { id: string; title: string; type: string; updatedAt: string; relationTypes: string[] };

export type NoteRecord = {
  id: string;
  title: string;
  type: "personal" | "team" | "patient_context" | "appointment" | "meeting" | "clinical_protocol" | "operational" | "template";
  status: "draft" | "active" | "under_review" | "archived";
  classification: "private" | "team" | "operational" | "clinical";
  sensitivity: "internal" | "patient_personal" | "clinical_sensitive" | "restricted";
  patientId: string | null;
  patient_id?: string | null;
  appointmentId?: string | null;
  appointment_id?: string | null;
  sessionId?: string | null;
  session_id?: string | null;
  contentJson: Record<string, unknown>;
  contentHtml: string | null;
  contentText: string | null;
  tags: string[];
  ownerId: string;
  metadataVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type NotePermissionRecord = {
  id: string;
  noteId: string;
  subjectType: "user" | "role" | "organization";
  subjectId: string | null;
  accessRole: "owner" | "editor" | "commenter" | "viewer" | "no_access";
  capabilities: string[];
  expiresAt: string | null;
  revokedAt: string | null;
};
export type NoteAttachmentRecord = { id: string; originalName: string; mimeType: string; sizeBytes: number; createdAt: string };
export type NoteSemanticSearchRecord = { id: string; title: string; preview: string; score: number };
export type NoteMentionableRecord = { id: string; type: NoteMentionRecord["mentionType"]; label: string; subtitle?: string };
export type NotePortalPublicationRecord = { id: string; noteId: string; patientId: string; title: string; contentText: string; expiresAt: string; revokedAt?: string | null; createdAt: string };

export const notesApi = {
  list: (params?: { patientId?: string }) => {
    const query = params?.patientId ? `?patientId=${encodeURIComponent(params.patientId)}` : "";
    return request<{ data: NoteRecord[] }>(`/api/notes${query}`);
  },
  get: (id: string) => request<{ data: NoteRecord }>(`/api/notes/${encodeURIComponent(id)}`),
  semanticSearch: (query: string, options?: NotesRequestOptions) =>
    request<{ data: NoteSemanticSearchRecord[] }>(`/api/notes/semantic-search?q=${encodeURIComponent(query)}`, options),
  mentionables: (query: string, types?: NoteMentionRecord["mentionType"][], options?: NotesRequestOptions) => {
    const params = new URLSearchParams({ q: query });
    if (types?.length) params.set("types", types.join(","));
    return request<{ data: NoteMentionableRecord[] }>(`/api/notes/mentionables?${params.toString()}`, options);
  },
  listFavorites: () => request<{ data: string[] }>("/api/notes/favorites"),
  favorite: (id: string) => request<{ ok: boolean }>(`/api/notes/${encodeURIComponent(id)}/favorite`, { method: "PUT" }),
  unfavorite: (id: string) => request<{ ok: boolean }>(`/api/notes/${encodeURIComponent(id)}/favorite`, { method: "DELETE" }),
  summarizeWithAi: (id: string) => request<{ data: { summary: string; generatedBy: string; sourceChars: number } }>(`/api/notes/${encodeURIComponent(id)}/ai/summary`, { method: "POST" }),
  exportHtml: (id: string) => requestBlob(`/api/notes/${encodeURIComponent(id)}/export`),
  publishToPatientPortal: (id: string, data: { title?: string; contentText: string; contentHtml?: string; expiresAt?: string }) => request<{ data: NotePortalPublicationRecord }>(`/api/notes/${encodeURIComponent(id)}/portal-publications`, { method: "POST", body: JSON.stringify(data) }),
  listPatientPortalPublications: (id: string) => request<{ data: NotePortalPublicationRecord[] }>(`/api/notes/${encodeURIComponent(id)}/portal-publications`),
  revokePatientPortalPublication: (id: string, publicationId: string) => request<{ ok: boolean }>(`/api/notes/${encodeURIComponent(id)}/portal-publications/${encodeURIComponent(publicationId)}`, { method: "DELETE" }),
  create: (data: Partial<Pick<NoteRecord, "title" | "type" | "classification" | "sensitivity" | "contentJson" | "contentText" | "tags">> & { patientId?: string }) =>
    request<{ data: NoteRecord }>("/api/notes", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  openForAppointment: (appointmentId: string) =>
    request<{ data: NoteRecord; created: boolean }>(`/api/notes/from-appointment/${encodeURIComponent(appointmentId)}`, { method: "POST" }),
  openForSession: (sessionId: string) =>
    request<{ data: NoteRecord; created: boolean }>(`/api/notes/from-session/${encodeURIComponent(sessionId)}`, { method: "POST" }),
  update: (id: string, data: Partial<Pick<NoteRecord, "title" | "contentJson" | "contentText" | "tags" | "status">>, version?: number) =>
    request<{ data: NoteRecord }>(`/api/notes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: version ? { "If-Match": `\"${version}\"` } : undefined,
      body: JSON.stringify(data),
    }),
  createTask: (id: string, data: { title: string; description?: string; priority?: "BAIXA" | "MEDIA" | "ALTA" | "URGENTE"; assigneeId?: string }) =>
    request<{ data: { task: { id: string; titulo: string }; link: { id: string } } }>(`/api/notes/${encodeURIComponent(id)}/tasks`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  grantPermission: (id: string, data: Omit<Pick<NotePermissionRecord, "subjectType" | "subjectId" | "accessRole">, "subjectId"> & { subjectId?: string; capabilities: string[] }) =>
    request<{ data: NotePermissionRecord }>(`/api/notes/${encodeURIComponent(id)}/permissions`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  listPermissions: (id: string) => request<{ data: NotePermissionRecord[] }>(`/api/notes/${encodeURIComponent(id)}/permissions`),
  listTasks: (id: string, options?: NotesRequestOptions) =>
    request<{ data: NoteTaskRecord[] }>(`/api/notes/${encodeURIComponent(id)}/tasks`, options),
  listComments: (id: string, options?: NotesRequestOptions) =>
    request<{ data: NoteCommentRecord[] }>(`/api/notes/${encodeURIComponent(id)}/comments`, options),
  createComment: (id: string, data: { body: string; parentCommentId?: string; blockId?: string; selection?: Record<string, unknown> }) =>
    request<{ data: NoteCommentRecord }>(`/api/notes/${encodeURIComponent(id)}/comments`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCommentStatus: (id: string, commentId: string, status: NoteCommentRecord["status"]) =>
    request<{ data: NoteCommentRecord }>(`/api/notes/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  listRevisions: (id: string, options?: NotesRequestOptions) =>
    request<{ data: NoteRevisionRecord[] }>(`/api/notes/${encodeURIComponent(id)}/revisions`, options),
  restoreRevision: (id: string, revisionId: string) => request<{ data: { note: NoteRecord; revision: NoteRevisionRecord; resetRequired: boolean } }>(`/api/notes/${encodeURIComponent(id)}/revisions/${encodeURIComponent(revisionId)}/restore`, { method: "POST" }),
  listMentions: (id: string, options?: NotesRequestOptions) =>
    request<{ data: NoteMentionRecord[] }>(`/api/notes/${encodeURIComponent(id)}/mentions`, options),
  listBacklinks: (id: string, options?: NotesRequestOptions) =>
    request<{ data: NoteBacklinkRecord[] }>(`/api/notes/${encodeURIComponent(id)}/backlinks`, options),
  revokePermission: (id: string, permissionId: string) =>
    request<{ ok: boolean }>(`/api/notes/${encodeURIComponent(id)}/permissions/${encodeURIComponent(permissionId)}`, { method: "DELETE" }),
  createMention: (id: string, data: { mentionType: NoteMentionRecord["mentionType"]; targetId: string; displayLabel?: string }) =>
    request<{ data: { id: string } }>(`/api/notes/${encodeURIComponent(id)}/mentions`, { method: "POST", body: JSON.stringify(data) }),
  listAttachments: (id: string) => request<{ data: NoteAttachmentRecord[] }>(`/api/notes/${encodeURIComponent(id)}/attachments`),
  uploadAttachment: (id: string, file: File) => { const body = new FormData(); body.append("file", file); return request<{ data: NoteAttachmentRecord }>(`/api/notes/${encodeURIComponent(id)}/attachments`, { method: "POST", body }); },
  downloadAttachment: (id: string, attachmentId: string) =>
    requestBlob(`/api/notes/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}/download`),
  deleteAttachment: (id: string, attachmentId: string) => request<{ ok: boolean }>(`/api/notes/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}`, { method: "DELETE" }),
};
