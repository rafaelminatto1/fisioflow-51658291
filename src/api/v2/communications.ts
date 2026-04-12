import { request } from "./base";
import type {
	AutomationLogEntry,
	CrmCampanha,
	CrmTarefa,
	GamificationNotification,
	Lead,
	LeadHistorico,
	Notification,
	NotificationPreferences,
	PendingConfirmation,
	PushSubscription,
	WhatsAppMessage,
	WhatsAppTemplateRecord,
	WhatsAppWebhookLog,
} from "@/types/workers";

export type {
	AutomationLogEntry,
	CrmCampanha,
	CrmTarefa,
	GamificationNotification,
	Lead,
	LeadHistorico,
	Notification,
	NotificationPreferences,
	PendingConfirmation,
	PushSubscription,
	WhatsAppMessage,
	WhatsAppTemplateRecord,
	WhatsAppWebhookLog,
};

function withQuery(
	path: string,
	params?: Record<string, string | number | boolean | null | undefined>,
): string {
	const qs = new URLSearchParams(
		Object.entries(params ?? {})
			.filter(([, value]) => value != null && String(value) !== "")
			.map(([key, value]) => [key, String(value)]),
	).toString();

	return qs ? `${path}?${qs}` : path;
}

const crm = (path: string, opts?: RequestInit) =>
	request<any>(`/api/crm${path}`, opts);

export const notificationsApi = {
	list: (params?: { limit?: number }) =>
		request<{ data: Notification[] }>(withQuery("/api/notifications", params)),
	create: (d: Partial<Notification>) =>
		request<{ data: Notification }>("/api/notifications", {
			method: "POST",
			body: JSON.stringify(d),
		}),
	markRead: (id: string) =>
		request<{ ok: boolean }>(`/api/notifications/${id}/read`, {
			method: "PUT",
		}),
	markAllRead: () =>
		request<{ ok: boolean }>("/api/notifications/read-all", { method: "PUT" }),
	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/notifications/${id}`, { method: "DELETE" }),
};

export const gamificationNotificationsApi = {
	list: (params: { patientId: string; limit?: number }) =>
		request<{ data: GamificationNotification[] }>(
			withQuery("/api/gamification-notifications", params),
		),
	markRead: (id: string) =>
		request<{ ok: boolean }>(`/api/gamification-notifications/${id}/read`, {
			method: "PUT",
		}),
	markAllRead: (patientId: string) =>
		request<{ ok: boolean }>("/api/gamification-notifications/read-all", {
			method: "PUT",
			body: JSON.stringify({ patientId }),
		}),
	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/gamification-notifications/${id}`, {
			method: "DELETE",
		}),
};

export const notificationPreferencesApi = {
	get: () =>
		request<{ data: NotificationPreferences | null }>(
			"/api/notification-preferences",
		),
	update: (data: Partial<NotificationPreferences>) =>
		request<{ data: NotificationPreferences }>(
			"/api/notification-preferences",
			{
				method: "PUT",
				body: JSON.stringify(data),
			},
		),
};

export const automationApi = {
	logs: (params?: { limit?: number }) =>
		request<{ data: AutomationLogEntry[] }>(
			withQuery("/api/automation/logs", params),
		),
};

export const pushSubscriptionsApi = {
	list: (params?: { userId?: string; activeOnly?: boolean }) =>
		request<{ data: PushSubscription[] }>(
			withQuery("/api/push-subscriptions", params),
		),
	upsert: (data: {
		endpoint: string;
		userId?: string;
		organizationId?: string;
		p256dh?: string;
		auth?: string;
		deviceInfo?: Record<string, unknown>;
		active?: boolean;
	}) =>
		request<{ data: PushSubscription }>("/api/push-subscriptions", {
			method: "POST",
			body: JSON.stringify({
				endpoint: data.endpoint,
				p256dh: data.p256dh,
				auth: data.auth,
				device_info: data.deviceInfo,
				organization_id: data.organizationId,
				active: data.active ?? true,
				user_id: data.userId,
			}),
		}),
	deactivate: (endpoint: string, userId?: string) =>
		request<{ data: PushSubscription | null }>(
			"/api/push-subscriptions/deactivate",
			{
				method: "PUT",
				body: JSON.stringify({ endpoint, userId }),
			},
		),
};

export const whatsappApi = {
	listMessages: (params?: {
		appointmentId?: string;
		patientId?: string;
		limit?: number;
	}) =>
		request<{ data: WhatsAppMessage[] }>(
			withQuery("/api/whatsapp/messages", params),
		),
	createMessage: (data: {
		appointment_id?: string;
		patient_id?: string;
		message_type?: string;
		message_content: string;
		from_phone?: string;
		to_phone?: string;
		status?: string;
		metadata?: Record<string, unknown>;
	}) =>
		request<{ data: WhatsAppMessage }>("/api/whatsapp/messages", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	pendingConfirmations: (params?: { limit?: number }) =>
		request<{ data: PendingConfirmation[] }>(
			withQuery("/api/whatsapp/pending-confirmations", params),
		),
	getConfig: () =>
		request<{ data: Record<string, unknown> }>("/api/whatsapp/config"),
	listTemplates: () =>
		request<{ data: WhatsAppTemplateRecord[] }>("/api/whatsapp/templates"),
	createTemplate: (data: {
		name: string;
		content: string;
		category?: string;
		status?: string;
		template_key?: string;
		variables?: string[];
		localOnly?: boolean;
	}) =>
		request<{ data: WhatsAppTemplateRecord }>("/api/whatsapp/templates", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	updateTemplate: (
		id: string,
		data: {
			name?: string;
			content?: string;
			category?: string;
			status?: string;
			template_key?: string;
			variables?: string[];
		},
	) =>
		request<{ data: WhatsAppTemplateRecord }>(`/api/whatsapp/templates/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	deleteTemplate: (id: string) =>
		request<{ ok: boolean }>(`/api/whatsapp/templates/${id}`, {
			method: "DELETE",
		}),
	listWebhookLogs: (params?: { limit?: number }) =>
		request<{ data: WhatsAppWebhookLog[] }>(
			withQuery("/api/whatsapp/webhook-logs", params),
		),
};

export const crmApi = {
	leads: {
		list: (p?: { estagio?: string }) => crm(withQuery("/leads", p)),
		get: (id: string) => crm(`/leads/${id}`),
		create: (d: Partial<Lead>) =>
			crm("/leads", { method: "POST", body: JSON.stringify(d) }),
		update: (id: string, d: Partial<Lead>) =>
			crm(`/leads/${id}`, { method: "PUT", body: JSON.stringify(d) }),
		delete: (id: string) => crm(`/leads/${id}`),
		historico: (id: string) => crm(`/leads/${id}/historico`),
		addHistorico: (id: string, d: Partial<LeadHistorico>) =>
			crm(`/leads/${id}/historico`, {
				method: "POST",
				body: JSON.stringify(d),
			}),
	},
	tarefas: {
		list: (p?: { status?: string; leadId?: string }) =>
			crm(withQuery("/tarefas", p)),
		create: (d: Partial<CrmTarefa>) =>
			crm("/tarefas", { method: "POST", body: JSON.stringify(d) }),
		update: (id: string, d: Partial<CrmTarefa>) =>
			crm(`/tarefas/${id}`, { method: "PUT", body: JSON.stringify(d) }),
		delete: (id: string) => crm(`/tarefas/${id}`, { method: "DELETE" }),
	},
	campanhas: {
		list: (p?: {
			status?: string;
			tipo?: string;
			limit?: number;
			offset?: number;
		}) => crm(withQuery("/campanhas", p)),
		create: (d: Partial<CrmCampanha> & { patient_ids?: string[] }) =>
			crm("/campanhas", { method: "POST", body: JSON.stringify(d) }),
		update: (id: string, d: Partial<CrmCampanha>) =>
			crm(`/campanhas/${id}`, { method: "PUT", body: JSON.stringify(d) }),
		delete: (id: string) => crm(`/campanhas/${id}`, { method: "DELETE" }),
	},
};
