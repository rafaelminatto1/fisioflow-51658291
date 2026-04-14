import { request } from "@/api/v2/base";

const BASE = "/api/whatsapp/inbox";

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

export interface Conversation {
	id: string;
	contactId: string;
	contactName: string;
	contactPhone: string;
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
		| "interactive"
		| "template"
		| "note";
	content: string;
	senderId?: string;
	senderName?: string;
	timestamp: string;
	status?: "sent" | "delivered" | "read" | "failed" | "deleted";
	editedAt?: string;
	editedBy?: string;
	deletedAt?: string;
	deletedBy?: string;
	deleteScope?: "local" | "everyone";
	deletedForEveryone?: boolean;
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

function mapContact(row: any): Contact {
	return {
		id: row.id,
		name:
			row.name ||
			row.display_name ||
			row.displayName ||
			row.username ||
			row.wa_id ||
			"Sem nome",
		phone: row.phone || row.wa_id || row.phoneE164 || "",
		patientId: row.patientId || row.patient_id || undefined,
		patientName: row.patientName || row.patient_name || undefined,
		email: row.email || undefined,
		avatarUrl: row.avatarUrl || row.avatar_url || undefined,
		lastInteraction:
			row.lastInteraction || row.last_interaction || row.updated_at || undefined,
		totalConversations:
			row.totalConversations || row.total_conversations || 0,
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
	status:
		| "APPROVED"
		| "PENDING"
		| "REJECTED"
		| "PAUSED"
		| "DISABLED"
		| "ACTIVE";
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
				phoneNumber:
					stringValue(rawButton.phoneNumber) ??
					stringValue(rawButton.phone_number),
			};
		})
		.filter((button): button is NonNullable<typeof button> => Boolean(button));
}

export function normalizeTemplate(template: RawTemplate): Template {
	const content =
		stringValue(template.body) ?? stringValue(template.content) ?? "";
	const templateKey = stringValue(template.template_key);
	const name = stringValue(template.name) ?? templateKey ?? "Template sem nome";
	const variables = Array.isArray(template.variables)
		? template.variables.filter(
				(variable): variable is string => typeof variable === "string",
			)
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
		isLocal:
			Boolean(template.isLocal) ||
			Boolean(template.localOnly) ||
			Boolean(templateKey),
		createdAt:
			stringValue(template.createdAt) ?? stringValue(template.created_at) ?? "",
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
	if (params?.messageLimit)
		query.set("messageLimit", String(params.messageLimit));
	const qs = query.toString();
	const res = await request<{
		conversation: Conversation;
		messages: Message[];
	}>(`${BASE}/conversations/${id}${qs ? `?${qs}` : ""}`);
	if ("data" in res && !("conversation" in res)) {
		const d = (res as any).data;
		return { conversation: d, messages: d.messages || [] };
	}
	return res;
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
	return "data" in (res as any) ? (res as any).data : res;
}

export async function deleteConversation(
	conversationId: string,
	reason?: string,
) {
	const res = await request<Conversation | { data: Conversation }>(
		`${BASE}/conversations/${conversationId}`,
		{
			method: "DELETE",
			body: JSON.stringify({ reason }),
		},
	);
	return "data" in (res as any) ? (res as any).data : res;
}

export async function restoreConversation(conversationId: string) {
	const res = await request<Conversation | { data: Conversation }>(
		`${BASE}/conversations/${conversationId}/restore`,
		{
			method: "POST",
		},
	);
	return "data" in (res as any) ? (res as any).data : res;
}

export async function sendMessage(
	conversationId: string,
	content: string,
	options?: { type?: string; attachmentUrl?: string; templateName?: string; templateLanguage?: string },
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
	return "data" in (res as any) ? (res as any).data : res;
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
	return "data" in (res as any) ? (res as any).data : res;
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
	return "data" in (res as any) ? (res as any).data : res;
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
	return "data" in (res as any) ? (res as any).data : res;
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
	return "data" in (res as any) ? (res as any).data : res;
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
	return "data" in (res as any) ? (res as any).data : res;
}

export async function addNote(conversationId: string, content: string) {
	const res = await request<Message | { data: Message }>(
		`${BASE}/conversations/${conversationId}/notes`,
		{
			method: "POST",
			body: JSON.stringify({ content }),
		},
	);
	return "data" in (res as any) ? (res as any).data : res;
}

export async function updateStatus(conversationId: string, status: string) {
	const res = await request<Conversation | { data: Conversation }>(
		`${BASE}/conversations/${conversationId}/status`,
		{
			method: "PUT",
			body: JSON.stringify({ status }),
		},
	);
	return "data" in (res as any) ? (res as any).data : res;
}

export async function fetchContacts(filters?: {
	search?: string;
	page?: number;
	limit?: number;
}) {
	const params = new URLSearchParams();
	if (filters?.search) params.set("search", filters.search);
	if (filters?.page) params.set("page", String(filters.page));
	if (filters?.limit) params.set("limit", String(filters.limit));
	const qs = params.toString();
	const res = await request<{
		data: any[];
		pagination: { page: number; limit: number; total: number };
	}>(`${BASE}/contacts${qs ? `?${qs}` : ""}`);
	return {
		...res,
		data: (res.data || []).map(mapContact),
	};
}

export async function fetchContact(id: string) {
	const res = await request<{ data: any } | any>(`${BASE}/contacts/${id}`);
	return mapContact("data" in (res as any) ? (res as any).data : res);
}

export async function resolveContact(data: {
	phone?: string;
	displayName?: string;
	patientId?: string;
}) {
	const res = await request<{ data: any } | any>(`${BASE}/contacts/resolve`, {
		method: "POST",
		body: JSON.stringify(data),
	});
	return mapContact("data" in (res as any) ? (res as any).data : res);
}

export async function findOrCreateConversation(contactId: string) {
	const res = await request<{ data: Conversation } | Conversation>(
		`${BASE}/conversations`,
		{
			method: "POST",
			body: JSON.stringify({ contactId }),
		},
	);
	return "data" in (res as any) ? (res as any).data : res;
}

export async function fetchMetrics() {
	const res = await request<{ data: Metrics } | Metrics>(`${BASE}/metrics`);
	return "data" in (res as any) ? (res as any).data : res;
}

export async function fetchTags() {
	const res = await request<{ data: Tag[] } | Tag[]>(`${BASE}/tags`);
	return Array.isArray(res) ? res : ((res as any).data ?? res);
}

export async function createTag(name: string, color: string) {
	const res = await request<{ data: Tag } | Tag>(`${BASE}/tags`, {
		method: "POST",
		body: JSON.stringify({ name, color }),
	});
	return "data" in (res as any) ? (res as any).data : res;
}

export async function addTags(conversationId: string, tagIds: string[]) {
	return request<void>(`${BASE}/conversations/${conversationId}/tags`, {
		method: "POST",
		body: JSON.stringify({ tagIds }),
	});
}

export async function removeTag(conversationId: string, tagId: string) {
	return request<void>(
		`${BASE}/conversations/${conversationId}/tags/${tagId}`,
		{
			method: "DELETE",
		},
	);
}

export async function fetchQuickReplies(team?: string) {
	const params = new URLSearchParams();
	if (team) params.set("team", team);
	const qs = params.toString();
	const res = await request<{ data: QuickReply[] } | QuickReply[]>(
		`${BASE}/quick-replies${qs ? `?${qs}` : ""}`,
	);
	return Array.isArray(res) ? res : ((res as any).data ?? res);
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
	return (res as any).data ?? res;
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
	return (res as any).data ?? res;
}

export async function fetchPendingConfirmations(limit = 50) {
	const res = await request<{ data: any[] }>(
		`${BASE}/pending-confirmations?limit=${limit}`,
	);
	return Array.isArray(res) ? res : ((res as any).data ?? []);
}

export async function createQuickReply(data: Omit<QuickReply, "id">) {
	const res = await request<{ data: QuickReply } | QuickReply>(
		`${BASE}/quick-replies`,
		{
			method: "POST",
			body: JSON.stringify(data),
		},
	);
	return "data" in (res as any) ? (res as any).data : res;
}

export async function fetchAutomationRules() {
	const res = await request<{ data: AutomationRule[] } | AutomationRule[]>(
		`${BASE}/automations`,
	);
	return Array.isArray(res) ? res : ((res as any).data ?? res);
}

export async function createAutomationRule(
	data: Omit<AutomationRule, "id" | "createdAt" | "updatedAt">,
) {
	const res = await request<{ data: AutomationRule } | AutomationRule>(
		`${BASE}/automations`,
		{
			method: "POST",
			body: JSON.stringify(data),
		},
	);
	return "data" in (res as any) ? (res as any).data : res;
}

export async function updateAutomationRule(
	id: string,
	data: Partial<AutomationRule>,
) {
	const res = await request<{ data: AutomationRule } | AutomationRule>(
		`${BASE}/automations/${id}`,
		{
			method: "PUT",
			body: JSON.stringify(data),
		},
	);
	return "data" in (res as any) ? (res as any).data : res;
}

export async function deleteAutomationRule(id: string) {
	return request<void>(`${BASE}/automations/${id}`, {
		method: "DELETE",
	});
}

export async function fetchTemplates() {
	const res = await request<{ data: Template[] } | Template[]>(
		"/api/whatsapp/templates",
	);
	const templates = Array.isArray(res) ? res : ((res as any).data ?? res);
	return Array.isArray(templates) ? templates.map(normalizeTemplate) : [];
}

export async function syncTemplatesWithMeta() {
	const res = await request<{ data: { synced: number } } | { synced: number }>(
		"/api/whatsapp/templates/sync",
		{
			method: "POST",
		},
	);
	return "data" in (res as any) ? (res as any).data : res;
}

export async function updateTemplate(id: string, data: Partial<Template>) {
	const res = await request<{ data: Template } | Template>(
		`/api/whatsapp/templates/${id}`,
		{
			method: "PUT",
			body: JSON.stringify(data),
		},
	);
	return "data" in (res as any) ? (res as any).data : res;
}

export async function createTemplate(data: {
	name: string;
	category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
	language?: string;
	headerText?: string;
	body: string;
	footer?: string;
	buttons?: Array<{ type: string; text: string; url?: string }>;
}) {
	const res = await request<{ data: unknown }>("/api/whatsapp/templates", {
		method: "POST",
		body: JSON.stringify(data),
	});
	return (res as any).data ?? res;
}

export async function bulkAction(
	ids: string[],
	action: "resolve" | "close" | "assign" | "tag" | "snooze",
	payload?: { assignedTo?: string; tagId?: string; until?: string },
) {
	const res = await request<{ data: { affected: number } }>(
		`${BASE}/conversations/bulk`,
		{
			method: "POST",
			body: JSON.stringify({ ids, action, payload }),
		},
	);
	return (res as any).data ?? res;
}

export async function snoozeConversation(
	conversationId: string,
	until: string,
) {
	const res = await request<{ data: unknown }>(
		`${BASE}/conversations/${conversationId}/snooze`,
		{
			method: "POST",
			body: JSON.stringify({ until }),
		},
	);
	return (res as any).data ?? res;
}

export async function fetchConversationActivity(conversationId: string) {
	const res = await request<{ data: any[] }>(
		`${BASE}/conversations/${conversationId}/activity`,
	);
	return (res as any).data ?? [];
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
	return (res as any).data ?? [];
}
