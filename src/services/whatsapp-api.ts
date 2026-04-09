import { request } from "@/api/v2/base";

const BASE = "/api/whatsapp/inbox";

export interface ConversationFilters {
	status?: string;
	assignedTo?: string;
	team?: string;
	page?: number;
	limit?: number;
	search?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
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
	status?: "sent" | "delivered" | "read" | "failed";
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
	status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED";
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

export async function fetchConversations(filters?: ConversationFilters) {
	const params = new URLSearchParams();
	if (filters) {
		if (filters.status) params.set("status", filters.status);
		if (filters.assignedTo) params.set("assignedTo", filters.assignedTo);
		if (filters.team) params.set("team", filters.team);
		if (filters.page) params.set("page", String(filters.page));
		if (filters.limit) params.set("limit", String(filters.limit));
		if (filters.search) params.set("search", filters.search);
		if (filters.sortBy) params.set("sortBy", filters.sortBy);
		if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
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
	return request<{ conversation: Conversation; messages: Message[] }>(
		`${BASE}/conversations/${id}${qs ? `?${qs}` : ""}`,
	);
}

export async function sendMessage(
	conversationId: string,
	content: string,
	options?: { type?: string; attachmentUrl?: string },
) {
	return request<Message>(`${BASE}/conversations/${conversationId}/messages`, {
		method: "POST",
		body: JSON.stringify({ content, ...options }),
	});
}

export async function sendInteractiveMessage(
	conversationId: string,
	type: string,
	data: Record<string, unknown>,
) {
	return request<Message>(
		`${BASE}/conversations/${conversationId}/interactive`,
		{
			method: "POST",
			body: JSON.stringify({ type, data }),
		},
	);
}

export async function assignConversation(
	conversationId: string,
	assignedTo: string,
	team?: string,
	reason?: string,
) {
	return request<Conversation>(
		`${BASE}/conversations/${conversationId}/assign`,
		{
			method: "POST",
			body: JSON.stringify({ assignedTo, team, reason }),
		},
	);
}

export async function transferConversation(
	conversationId: string,
	newAssignee: string,
	team?: string,
	reason?: string,
) {
	return request<Conversation>(
		`${BASE}/conversations/${conversationId}/transfer`,
		{
			method: "POST",
			body: JSON.stringify({ newAssignee, team, reason }),
		},
	);
}

export async function addNote(conversationId: string, content: string) {
	return request<Message>(`${BASE}/conversations/${conversationId}/notes`, {
		method: "POST",
		body: JSON.stringify({ content }),
	});
}

export async function updateStatus(conversationId: string, status: string) {
	return request<Conversation>(
		`${BASE}/conversations/${conversationId}/status`,
		{
			method: "PUT",
			body: JSON.stringify({ status }),
		},
	);
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
	return request<{
		data: Contact[];
		pagination: { page: number; limit: number; total: number };
	}>(`${BASE}/contacts${qs ? `?${qs}` : ""}`);
}

export async function fetchContact(id: string) {
	return request<Contact>(`${BASE}/contacts/${id}`);
}

export async function fetchMetrics() {
	return request<Metrics>(`${BASE}/metrics`);
}

export async function fetchTags() {
	return request<Tag[]>(`${BASE}/tags`);
}

export async function createTag(name: string, color: string) {
	return request<Tag>(`${BASE}/tags`, {
		method: "POST",
		body: JSON.stringify({ name, color }),
	});
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
	return request<QuickReply[]>(`${BASE}/quick-replies${qs ? `?${qs}` : ""}`);
}

export async function createQuickReply(data: Omit<QuickReply, "id">) {
	return request<QuickReply>(`${BASE}/quick-replies`, {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export async function fetchAutomationRules() {
	return request<AutomationRule[]>(`${BASE}/automations`);
}

export async function createAutomationRule(
	data: Omit<AutomationRule, "id" | "createdAt" | "updatedAt">,
) {
	return request<AutomationRule>(`${BASE}/automations`, {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export async function updateAutomationRule(
	id: string,
	data: Partial<AutomationRule>,
) {
	return request<AutomationRule>(`${BASE}/automations/${id}`, {
		method: "PUT",
		body: JSON.stringify(data),
	});
}

export async function deleteAutomationRule(id: string) {
	return request<void>(`${BASE}/automations/${id}`, {
		method: "DELETE",
	});
}

export async function fetchTemplates() {
	return request<Template[]>(`${BASE}/templates`);
}

export async function syncTemplatesWithMeta() {
	return request<{ synced: number }>(`${BASE}/templates/sync`, {
		method: "POST",
	});
}

export async function updateTemplate(id: string, data: Partial<Template>) {
	return request<Template>(`${BASE}/templates/${id}`, {
		method: "PUT",
		body: JSON.stringify(data),
	});
}
