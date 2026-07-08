import { request } from "@/api/v2/base";
import { unwrapData, unwrapList } from "@/lib/api/unwrapData";

const BASE = "/api/whatsapp/inbox";
const AUTOMATIONS_BASE = "/api/whatsapp";

export interface ConversationFilters {
  status?: string;
  assignedTo?: string;
  priority?: string;
  team?: string;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  tagId?: string;
}

export type ConversationChannel = "whatsapp" | "instagram" | "webchat";

export interface Conversation {
  id: string;
  contactId: string;
  channel?: ConversationChannel;
  temperature?: "quente" | "morno" | "frio";
  contactName: string;
  contactPhone: string;
  avatarUrl?: string;
  patientId?: string;
  patientName?: string;
  status: "open" | "pending" | "resolved" | "closed";
  assignedTo?: string;
  assignedToName?: string;
  team?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageDirection?: "inbound" | "outbound";
  unreadCount: number;
  tags: Tag[];
  priority?: "low" | "medium" | "high" | "urgent";
  leadScore?: number;
  slaDeadline?: string;
  slaBreached?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  type:
    | "text"
    | "image"
    | "document"
    | "audio"
    | "video"
    | "file"
    | "ephemeral"
    | "story_mention"
    | "attachment"
    | "interactive"
    | "template"
    | "note";
  content: string;
  senderId?: string;
  senderName?: string;
  timestamp: string;
  status?: "sent" | "delivered" | "read" | "failed" | "deleted";
  mediaUrl?: string;
  mediaType?: string;
  editedAt?: string;
  editedBy?: string;
  deletedAt?: string;
  deletedBy?: string;
  deleteScope?: "local" | "everyone";
  deletedForEveryone?: boolean;
  canDeleteForEveryone?: boolean;
  deleteForEveryoneExpiresAt?: string;
  deleteForEveryoneWindowHours?: number;
  metadata?: Record<string, unknown>;
  interactiveData?: {
    type: "button" | "list";
    buttons?: Array<{ id: string; title: string }>;
    listItems?: Array<{ id: string; title: string; description?: string }>;
  };
  templateName?: string;
  templateParams?: string[];
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  patientId?: string;
  patientName?: string;
  email?: string;
  avatarUrl?: string;
  lastInteraction?: string;
  totalConversations: number;
}

export interface InstagramProfileBackfillResult {
  scanned: number;
  updated: number;
  skipped: number;
  failed: number;
}

export interface InstagramProfileSyncSummary {
  scanned: number;
  updated: number;
  skipped: number;
  failed: number;
  syncState?: {
    lastSyncedAt: string | null;
    lastStatus: "synced" | "partial" | "error";
    lastResult: InstagramProfileBackfillResult | null;
    pendingCount: number | null;
  };
}

function mapContact(row: Record<string, unknown>): Contact {
  const str = (key: string): string | undefined => {
    const v = row[key];
    return typeof v === "string" && v ? v : undefined;
  };
  const num = (key: string): number => {
    const v = row[key];
    return typeof v === "number" ? v : 0;
  };
  return {
    id: String(row.id ?? ""),
    name:
      str("name") ??
      str("display_name") ??
      str("displayName") ??
      str("username") ??
      str("wa_id") ??
      "Sem nome",
    phone: str("phone") ?? str("wa_id") ?? str("phoneE164") ?? "",
    patientId: str("patientId") ?? str("patient_id"),
    patientName: str("patientName") ?? str("patient_name"),
    email: str("email"),
    avatarUrl: str("avatarUrl") ?? str("avatar_url"),
    lastInteraction: str("lastInteraction") ?? str("last_interaction") ?? str("updated_at"),
    totalConversations: num("totalConversations") || num("total_conversations"),
  };
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface QuickReply {
  id: string;
  name: string;
  content: string;
  team?: string;
  category?: string;
}

export interface Metrics {
  totalConversations: number;
  openConversations: number;
  pendingConversations: number;
  resolvedConversations: number;
  avgFirstResponseTime: number;
  avgResolutionTime: number;
  slaBreached: number;
  agentWorkload: Array<{
    agentId: string;
    agentName: string;
    activeConversations: number;
    resolvedToday: number;
  }>;
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  triggerType:
    | "message_received"
    | "conversation_created"
    | "status_changed"
    | "keyword_match"
    | "no_response";
  conditions: Record<string, unknown>;
  actions: Array<{ type: string; params: Record<string, unknown> }>;
  active: boolean;
  team?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  category: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED" | "ACTIVE";
  language: string;
  header?: { type: string; text?: string };
  body: string;
  footer?: string;
  buttons?: Array<{
    type: string;
    text: string;
    url?: string;
    phoneNumber?: string;
  }>;
  variables?: string[];
  isLocal?: boolean;
  createdAt: string;
}

type RawTemplate = Record<string, unknown> & Partial<Template>;

const DEFAULT_TEMPLATE_LANGUAGE = "pt_BR";

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function normalizeTemplateStatus(value: unknown): Template["status"] {
  const status = stringValue(value)?.toUpperCase();

  switch (status) {
    case "APPROVED":
      return "APPROVED";
    case "PENDING":
      return "PENDING";
    case "REJECTED":
      return "REJECTED";
    case "PAUSED":
      return "PAUSED";
    case "ACTIVE":
    case "ATIVO":
    case "ENABLED":
      return "ACTIVE";
    case "DISABLED":
    case "INACTIVE":
    case "INATIVO":
      return "DISABLED";
    default:
      return "DISABLED";
  }
}

function extractTemplateVariables(content: string): string[] {
  return Array.from(content.matchAll(/\{\{([^}]+)\}\}/g))
    .map((match) => match[1]?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index);
}

function normalizeButtons(value: unknown): Template["buttons"] {
  if (!Array.isArray(value)) return undefined;

  return value
    .map((button) => {
      if (!button || typeof button !== "object") return null;
      const rawButton = button as Record<string, unknown>;
      const text = stringValue(rawButton.text);
      if (!text) return null;
      return {
        type: stringValue(rawButton.type) ?? "QUICK_REPLY",
        text,
        url: stringValue(rawButton.url),
        phoneNumber: stringValue(rawButton.phoneNumber) ?? stringValue(rawButton.phone_number),
      };
    })
    .filter((button): button is NonNullable<typeof button> => Boolean(button));
}

export function normalizeTemplate(template: RawTemplate): Template {
  const content = stringValue(template.body) ?? stringValue(template.content) ?? "";
  const templateKey = stringValue(template.template_key);
  const name = stringValue(template.name) ?? templateKey ?? "Template sem nome";
  const variables = Array.isArray(template.variables)
    ? template.variables.filter((variable): variable is string => typeof variable === "string")
    : extractTemplateVariables(content);

  return {
    id: stringValue(template.id) ?? templateKey ?? name,
    name,
    category: stringValue(template.category) ?? "general",
    status: normalizeTemplateStatus(template.status),
    language: stringValue(template.language) ?? DEFAULT_TEMPLATE_LANGUAGE,
    header: template.header,
    body: content,
    footer: stringValue(template.footer),
    buttons: normalizeButtons(template.buttons),
    variables,
    isLocal: Boolean(template.isLocal) || Boolean(template.localOnly) || Boolean(templateKey),
    createdAt: stringValue(template.createdAt) ?? stringValue(template.created_at) ?? "",
  };
}

export async function fetchConversations(filters?: ConversationFilters) {
  const params = new URLSearchParams();
  if (filters) {
    if (filters.status) params.set("status", filters.status);
    if (filters.assignedTo) params.set("assignedTo", filters.assignedTo);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.team) params.set("team", filters.team);
    if (filters.includeDeleted) params.set("includeDeleted", "true");
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.search) params.set("search", filters.search);
    if (filters.sortBy) params.set("sortBy", filters.sortBy);
    if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
    if (filters.tagId) params.set("tagId", filters.tagId);
  }
  const qs = params.toString();
  return request<{
    data: Conversation[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>(`${BASE}/conversations${qs ? `?${qs}` : ""}`);
}

export async function fetchConversation(
  id: string,
  params?: { includeMessages?: boolean; messageLimit?: number },
) {
  const query = new URLSearchParams();
  if (params?.includeMessages) query.set("includeMessages", "true");
  if (params?.messageLimit) query.set("messageLimit", String(params.messageLimit));
  const qs = query.toString();
  const res = await request<{
    conversation: Conversation;
    messages: Message[];
  }>(`${BASE}/conversations/${id}${qs ? `?${qs}` : ""}`);
  if ("data" in res && !("conversation" in res)) {
    const d = (res as { data: Conversation & { messages?: Message[] } }).data;
    return { conversation: d, messages: d.messages ?? [] };
  }
  return res;
}

export async function backfillInstagramProfiles(params?: {
  limit?: number;
  force?: boolean;
}) {
  return request<{ data: InstagramProfileSyncSummary }>(`${BASE}/instagram/backfill-profiles`, {
    method: "POST",
    body: JSON.stringify({
      limit: params?.limit ?? 100,
      force: params?.force ?? false,
    }),
  }).then(unwrapData);
}

export async function updateConversation(
  conversationId: string,
  data: {
    status?: string;
    priority?: string;
    assignedTo?: string | null;
    team?: string | null;
    patientId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const res = await request<Conversation | { data: Conversation }>(
    `${BASE}/conversations/${conversationId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
  return unwrapData(res);
}

export async function deleteConversation(conversationId: string, reason?: string) {
  const res = await request<Conversation | { data: Conversation }>(
    `${BASE}/conversations/${conversationId}`,
    {
      method: "DELETE",
      body: JSON.stringify({ reason }),
    },
  );
  return unwrapData(res);
}

export async function restoreConversation(conversationId: string) {
  const res = await request<Conversation | { data: Conversation }>(
    `${BASE}/conversations/${conversationId}/restore`,
    {
      method: "POST",
    },
  );
  return unwrapData(res);
}

export async function markConversationRead(conversationId: string) {
  const res = await request<{ data: { lastReadAt: string | null } } | { lastReadAt: string | null }>(
    `${BASE}/conversations/${conversationId}/read`,
    {
      method: "POST",
    },
  );
  return unwrapData(res);
}

export async function markConversationUnread(conversationId: string) {
  return updateConversation(conversationId, { metadata: { _forceUnread: true } });
}

export async function pinConversation(conversationId: string, pinned: boolean) {
  return updateConversation(conversationId, { metadata: { pinned } });
}

export async function muteConversation(conversationId: string, mutedUntil: string | null) {
  return updateConversation(conversationId, { metadata: { mutedUntil } });
}

/** Faz upload de um anexo do CRM para o R2 e retorna a URL pública + tipo. */
export async function uploadAttachment(
  file: File,
): Promise<{ url: string; type: string; contentType: string; name: string }> {
  const { getNeonAccessToken } = await import("@/lib/auth/neon-token");
  const { getWorkersApiUrl } = await import("@/lib/api/config");
  const token = await getNeonAccessToken();
  const form = new FormData();
  form.append("file", file);
  // Sem Content-Type manual: o browser define o boundary do multipart.
  const res = await fetch(`${getWorkersApiUrl()}${BASE}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    let msg = `Upload falhou (${res.status})`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const json = (await res.json()) as { data?: any } & any;
  return json.data ?? json;
}

export async function sendMessage(
  conversationId: string,
  content: string,
  options?: {
    type?: string;
    attachmentUrl?: string;
    templateName?: string;
    templateLanguage?: string;
  },
) {
  const res = await request<Message | { data: Message }>(
    `${BASE}/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        content,
        messageType: options?.type,
        attachmentUrl: options?.attachmentUrl,
        templateName: options?.templateName,
        templateLanguage: options?.templateLanguage,
      }),
    },
  );
  return unwrapData(res);
}

export async function updateMessage(
  conversationId: string,
  messageId: string,
  content: string | Record<string, unknown>,
) {
  const res = await request<Message | { data: Message }>(
    `${BASE}/conversations/${conversationId}/messages/${messageId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ content }),
    },
  );
  return unwrapData(res);
}

export async function deleteMessage(
  conversationId: string,
  messageId: string,
  options?: { scope?: "local" | "everyone"; reason?: string },
) {
  const res = await request<
    | Message
    | {
        data: Message;
        provider?: {
          attempted: boolean;
          status: string;
          reason?: string;
          metaMessageId?: string | null;
        };
      }
  >(`${BASE}/conversations/${conversationId}/messages/${messageId}`, {
    method: "DELETE",
    body: JSON.stringify(options ?? {}),
  });
  return unwrapData(res);
}

export async function sendInteractiveMessage(
  conversationId: string,
  type: string,
  data: Record<string, unknown>,
) {
  const res = await request<Message | { data: Message }>(
    `${BASE}/conversations/${conversationId}/interactive`,
    {
      method: "POST",
      body: JSON.stringify({ type, data }),
    },
  );
  return unwrapData(res);
}

export async function assignConversation(
  conversationId: string,
  assignedTo: string,
  team?: string,
  reason?: string,
) {
  const res = await request<Conversation | { data: Conversation }>(
    `${BASE}/conversations/${conversationId}/assign`,
    {
      method: "POST",
      body: JSON.stringify({ assignedTo, team, reason }),
    },
  );
  return unwrapData(res);
}

export async function transferConversation(
  conversationId: string,
  newAssignee: string,
  team?: string,
  reason?: string,
) {
  const res = await request<Conversation | { data: Conversation }>(
    `${BASE}/conversations/${conversationId}/transfer`,
    {
      method: "POST",
      body: JSON.stringify({ newAssignee, team, reason }),
    },
  );
  return unwrapData(res);
}

export async function addNote(conversationId: string, content: string) {
  const res = await request<Message | { data: Message }>(
    `${BASE}/conversations/${conversationId}/notes`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
  );
  return unwrapData(res);
}

export async function updateStatus(conversationId: string, status: string) {
  const res = await request<Conversation | { data: Conversation }>(
    `${BASE}/conversations/${conversationId}/status`,
    {
      method: "PUT",
      body: JSON.stringify({ status }),
    },
  );
  return unwrapData(res);
}

export async function fetchContacts(filters?: { search?: string; page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  const res = await request<{
    data: { data: unknown } | unknown[];
    pagination: { page: number; limit: number; total: number };
  }>(`${BASE}/contacts${qs ? `?${qs}` : ""}`);
  return {
    ...res,
    data: (res.data || []).map(mapContact),
  };
}

export async function fetchContact(id: string) {
  const res = await request<{ data: unknown } | unknown | { data: unknown } | unknown>(
    `${BASE}/contacts/${id}`,
  );
  return mapContact(unwrapData(res));
}

export async function resolveContact(data: {
  phone?: string;
  displayName?: string;
  patientId?: string;
}) {
  const res = await request<{ data: unknown } | unknown | { data: unknown } | unknown>(
    `${BASE}/contacts/resolve`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
  return mapContact(unwrapData(res));
}

export async function findOrCreateConversation(contactId: string) {
  const res = await request<{ data: Conversation } | Conversation>(`${BASE}/conversations`, {
    method: "POST",
    body: JSON.stringify({ contactId }),
  });
  return unwrapData(res);
}

export async function fetchMetrics() {
  const res = await request<{ data: Metrics } | Metrics>(`${BASE}/metrics`);
  return unwrapData(res);
}

export async function fetchUnreadCount() {
  const res = await request<{ data: { unread: number } } | { unread: number }>(
    `${BASE}/unread-count`,
  );
  const data = unwrapData(res) as { unread?: number };
  return typeof data?.unread === "number" ? data.unread : 0;
}

export async function fetchTags() {
  const res = await request<{ data: Tag[] } | Tag[]>(`${BASE}/tags`);
  return Array.isArray(res) ? res : unwrapData(res);
}

export async function createTag(name: string, color: string) {
  const res = await request<{ data: Tag } | Tag>(`${BASE}/tags`, {
    method: "POST",
    body: JSON.stringify({ name, color }),
  });
  return unwrapData(res);
}

export async function addTags(conversationId: string, tagIds: string[]) {
  return request<void>(`${BASE}/conversations/${conversationId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tagIds }),
  });
}

export async function removeTag(conversationId: string, tagId: string) {
  return request<void>(`${BASE}/conversations/${conversationId}/tags/${tagId}`, {
    method: "DELETE",
  });
}

export async function fetchQuickReplies(team?: string) {
  const params = new URLSearchParams();
  if (team) params.set("team", team);
  const qs = params.toString();
  const res = await request<{ data: QuickReply[] } | QuickReply[]>(
    `${BASE}/quick-replies${qs ? `?${qs}` : ""}`,
  );
  return Array.isArray(res) ? res : unwrapData(res);
}

export async function updatePriority(
  conversationId: string,
  priority: "low" | "medium" | "high" | "urgent",
) {
  const res = await request<{ data: { id: string; priority: string } }>(
    `${BASE}/conversations/${conversationId}/priority`,
    {
      method: "PUT",
      body: JSON.stringify({ priority }),
    },
  );
  return unwrapData(res);
}

export async function sendBroadcast(
  contactIds: string[],
  content: string,
  options?: { templateName?: string; templateLanguage?: string },
) {
  const res = await request<{
    data: { sent: number; failed: number; total: number };
  }>(`${BASE}/broadcast`, {
    method: "POST",
    body: JSON.stringify({ contactIds, content, ...options }),
  });
  return unwrapData(res);
}

export async function fetchPendingConfirmations(limit = 50) {
  const res = await request<{ data: unknown[] }>(`${BASE}/pending-confirmations?limit=${limit}`);
  return unwrapList(res);
}

export async function createQuickReply(data: Omit<QuickReply, "id">) {
  const res = await request<{ data: QuickReply } | QuickReply>(`${BASE}/quick-replies`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return unwrapData(res);
}

export async function fetchAutomationRules() {
  const res = await request<{ data: AutomationRule[] } | AutomationRule[]>(
    `${AUTOMATIONS_BASE}/automations`,
  );
  return Array.isArray(res) ? res : unwrapData(res);
}

export async function createAutomationRule(
  data: Omit<AutomationRule, "id" | "createdAt" | "updatedAt">,
) {
  const res = await request<{ data: AutomationRule } | AutomationRule>(
    `${AUTOMATIONS_BASE}/automations`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
  return unwrapData(res);
}

export async function updateAutomationRule(id: string, data: Partial<AutomationRule>) {
  const res = await request<{ data: AutomationRule } | AutomationRule>(
    `${AUTOMATIONS_BASE}/automations/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
  return unwrapData(res);
}

export async function deleteAutomationRule(id: string) {
  return request<void>(`${AUTOMATIONS_BASE}/automations/${id}`, {
    method: "DELETE",
  });
}

export async function fetchTemplates() {
  const res = await request<{ data: Template[] } | Template[]>("/api/whatsapp/templates");
  const templates = Array.isArray(res) ? res : unwrapData(res);
  return Array.isArray(templates) ? templates.map(normalizeTemplate) : [];
}

export async function syncTemplatesWithMeta() {
  const res = await request<{ data: { synced: number } } | { synced: number }>(
    "/api/whatsapp/templates/sync",
    {
      method: "POST",
    },
  );
  return unwrapData(res);
}

export async function updateTemplate(id: string, data: Partial<Template>) {
  const res = await request<{ data: Template } | Template>(`/api/whatsapp/templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return unwrapData(res);
}

export function buildCreateTemplatePayload(data: {
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language?: string;
  headerText?: string;
  body: string;
  bodyExample?: string[];
  footer?: string;
  buttons?: Array<{ type: string; text: string; url?: string; phone?: string }>;
}) {
  return {
    name: data.name,
    category: data.category,
    language: data.language ?? "pt_BR",
    ...(data.headerText ? { headerText: data.headerText } : {}),
    body: data.body,
    ...(data.bodyExample?.length ? { bodyExample: data.bodyExample } : {}),
    ...(data.footer ? { footer: data.footer } : {}),
    ...(data.buttons?.length ? { buttons: data.buttons } : {}),
  };
}

export async function createTemplate(data: {
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language?: string;
  headerText?: string;
  body: string;
  bodyExample?: string[];
  footer?: string;
  buttons?: Array<{ type: string; text: string; url?: string; phone?: string }>;
}) {
  const res = await request<{ data: unknown }>("/api/whatsapp/templates", {
    method: "POST",
    body: JSON.stringify(buildCreateTemplatePayload(data)),
  });
  return unwrapData(res);
}

export async function deleteTemplate(id: string): Promise<void> {
  await request(`/api/whatsapp/templates/${id}`, { method: "DELETE" });
}

export async function bulkAction(
  ids: string[],
  action: "resolve" | "close" | "assign" | "tag" | "snooze",
  payload?: { assignedTo?: string; tagId?: string; until?: string },
) {
  const res = await request<{ data: { affected: number } }>(`${BASE}/conversations/bulk`, {
    method: "POST",
    body: JSON.stringify({ ids, action, payload }),
  });
  return unwrapData(res);
}

export async function snoozeConversation(conversationId: string, until: string) {
  const res = await request<{ data: unknown }>(`${BASE}/conversations/${conversationId}/snooze`, {
    method: "POST",
    body: JSON.stringify({ until }),
  });
  return unwrapData(res);
}

export async function fetchConversationActivity(conversationId: string) {
  const res = await request<{ data: unknown[] }>(
    `${BASE}/conversations/${conversationId}/activity`,
  );
  return (res as { data: unknown } | unknown).data ?? [];
}

export async function fetchAgentsWorkload() {
  const res = await request<{
    data: Array<{
      agentId: string;
      agentName: string;
      openConversations: number;
      resolvedToday: number;
    }>;
  }>(`${BASE}/agents/workload`);
  return (res as { data: unknown } | unknown).data ?? [];
}

// ─── Configurações do CRM·WhatsApp ───
export interface CrmConnectionInfo {
  phoneNumberId: string | null;
  businessAccountId: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  webhookUrl: string;
  connected: boolean;
}

export type ConciergeIntent = "scheduling" | "information" | "urgent" | "other";

export interface ConciergeConfig {
  enabled: boolean;
  autoReplyNewLeads: boolean;
  approvalIntents: ConciergeIntent[];
  greetingTone: "acolhedor" | "direto" | "formal";
  availabilityAutoReply: boolean;
  availabilityScope: "organization" | "public_profile";
  availabilityProfileSlug: string;
  slaEnabled: boolean;
  slaMinutes: number;
  instagramAutoReply: boolean;
  instagramReplyDelayMinutes: number;
  /**
   * Horas de silêncio do Concierge após um atendente humano responder na
   * conversa. 0 = pausa até a conversa ser resolvida/fechada (o humano é o dono).
   */
  humanReplyPauseHours: number;
  /** Auto-resposta do Concierge no chat do site (independente do WhatsApp). */
  webchatAutoReply: boolean;
  /** Delay antes de responder no chat do site (0–20s; dá chance do humano atender). */
  webchatReplyDelaySeconds: number;
  /** Nome com que o Concierge se apresenta (default "Rafael"). */
  attendantName: string;
  /** Nome da clínica usado na apresentação e no prompt (default "Activity Fisioterapia"). */
  clinicName: string;
  /** Base de conhecimento oficial usada nas respostas; vazio = padrão da Activity. */
  knowledgeBase: string;
}

export interface FunnelStage {
  key: string;
  label: string;
  color: string;
}

export interface ReminderBand {
  fromHour: number;
  toHour: number;
  sendDayOffset: number;
  sendHour: number;
  sendMinute: number;
}

export interface ReminderConfig {
  enabled: boolean;
  defaultHoursBefore: number;
  tzOffsetMinutes: number;
  bands: ReminderBand[];
  sendAddressOnlyFirstVisit: boolean;
  addressText: string;
  useButtons: boolean;
}

export interface CrmSettings {
  connection: CrmConnectionInfo;
  concierge: ConciergeConfig;
  funnel: FunnelStage[];
  reminders: ReminderConfig;
  /** Gate mestre das automações de WhatsApp (welcome/feedback/review/lembrete). */
  automationsEnabled: boolean;
  /** Roteamento automático de conversas para atendentes. */
  routing: { enabled: boolean; strategy: "round_robin" | "least_busy" };
  intents: ConciergeIntent[];
  instagramProfileSync?: {
    lastSyncedAt: string | null;
    lastStatus: "synced" | "partial" | "error";
    lastResult: InstagramProfileBackfillResult | null;
    pendingCount: number | null;
  } | null;
  instagramProfilePendingCount?: number;
}

export interface QuickReplyRow {
  id: string;
  title: string;
  content: string;
  team?: string | null;
  category?: string | null;
}

export async function fetchCrmSettings() {
  const res = await request<{ data: CrmSettings } | CrmSettings>(`${BASE}/crm-settings`);
  return unwrapData(res) as CrmSettings;
}

export async function updateCrmSettings(patch: {
  concierge?: Partial<ConciergeConfig>;
  funnel?: FunnelStage[];
  reminders?: Partial<ReminderConfig>;
  automationsEnabled?: boolean;
  routing?: { enabled?: boolean; strategy?: "round_robin" | "least_busy" };
}) {
  const res = await request<{
    data: {
      concierge: ConciergeConfig;
      funnel: FunnelStage[];
      reminders: ReminderConfig;
      automationsEnabled: boolean;
      routing: { enabled: boolean; strategy: "round_robin" | "least_busy" };
    };
  }>(`${BASE}/crm-settings`, { method: "PATCH", body: JSON.stringify(patch) });
  return unwrapData(res);
}

export interface AutomationLogEntry {
  template_key: string;
  phone: string | null;
  accepted: boolean;
  error: string | null;
  created_at: string;
}

export interface FunnelReport {
  stages: Array<{ stage: string; count: number; pct: number }>;
  total: number;
  winRate: number;
}

export async function fetchFunnelReport() {
  const res = await request<{ data: FunnelReport } | FunnelReport>(`${BASE}/metrics/funnel`);
  return unwrapData(res) as FunnelReport;
}

export async function fetchAutomationLog() {
  const res = await request<{ data: AutomationLogEntry[] } | AutomationLogEntry[]>(
    `${BASE}/crm-settings/automation-log`,
  );
  return unwrapData(res) as AutomationLogEntry[];
}

export async function summarizeConversation(conversationId: string) {
  const res = await request<{ data: { text: string } } | { text: string }>(
    `${BASE}/conversations/${conversationId}/ai/summary`,
    { method: "POST", body: "{}" },
  );
  return unwrapData(res) as { text: string };
}

export async function suggestNextAction(conversationId: string) {
  const res = await request<{ data: { text: string } } | { text: string }>(
    `${BASE}/conversations/${conversationId}/ai/next-action`,
    { method: "POST", body: "{}" },
  );
  return unwrapData(res) as { text: string };
}

export async function suggestReply(conversationId: string) {
  const res = await request<{ data: { text: string } } | { text: string }>(
    `${BASE}/conversations/${conversationId}/ai/suggest-reply`,
    { method: "POST", body: "{}" },
  );
  return unwrapData(res) as { text: string };
}

export async function sendTestMessage(
  to: string,
  opts?: { templateName?: string; language?: string },
) {
  const res = await request<{ data: { accepted: boolean; raw: unknown } }>(
    `${BASE}/crm-settings/test`,
    { method: "POST", body: JSON.stringify({ to, ...opts }) },
  );
  return unwrapData(res);
}

export async function createQuickReplyRow(data: {
  title: string;
  content: string;
  team?: string | null;
  category?: string | null;
}) {
  const res = await request<{ data: QuickReplyRow } | QuickReplyRow>(`${BASE}/quick-replies`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return unwrapData(res) as QuickReplyRow;
}

export async function updateQuickReply(
  id: string,
  data: Partial<Pick<QuickReplyRow, "title" | "content" | "team" | "category">>,
) {
  const res = await request<{ data: QuickReplyRow } | QuickReplyRow>(`${BASE}/quick-replies/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return unwrapData(res);
}

export async function deleteQuickReply(id: string) {
  return request<void>(`${BASE}/quick-replies/${id}`, { method: "DELETE" });
}

export async function updateTag(id: string, data: { name?: string; color?: string }) {
  const res = await request<{ data: Tag } | Tag>(`${BASE}/tags/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return unwrapData(res);
}

export async function deleteTag(id: string) {
  return request<void>(`${BASE}/tags/${id}`, { method: "DELETE" });
}
