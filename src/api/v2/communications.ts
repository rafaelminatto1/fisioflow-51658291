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

const crm = (path: string, opts?: RequestInit) => request<any>(`/api/crm${path}`, opts);

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
  markAllRead: () => request<{ ok: boolean }>("/api/notifications/read-all", { method: "PUT" }),
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
  get: () => request<{ data: NotificationPreferences | null }>("/api/notification-preferences"),
  update: (data: Partial<NotificationPreferences>) =>
    request<{ data: NotificationPreferences }>("/api/notification-preferences", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

export type AutomationRecord = {
  id: string;
  name: string;
  description?: string | null;
  trigger_event?: string | null;
  enabled: boolean;
  definition: unknown;
  created_at?: string;
};

type AutomationWrite = {
  name: string;
  description?: string;
  triggerEvent?: string;
  enabled?: boolean;
  definition: unknown;
};

export type AutomationStats = {
  total: number;
  active: number;
  runsThisMonth: number;
  successRate: number;
  lastRunAt: string | null;
  perAutomation: Array<{
    id: string;
    name: string;
    runsThisMonth: number;
    failures: number;
    lastRunAt: string | null;
  }>;
};

export const automationApi = {
  logs: (params?: { limit?: number }) =>
    request<{ data: AutomationLogEntry[] }>(withQuery("/api/automation/logs", params)),
  stats: () => request<{ data: AutomationStats }>("/api/automation/stats"),
  list: () => request<{ data: AutomationRecord[] }>("/api/automation"),
  get: (id: string) => request<{ data: AutomationRecord }>(`/api/automation/${id}`),
  create: (data: AutomationWrite) =>
    request<{ data: AutomationRecord }>("/api/automation", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: AutomationWrite) =>
    request<{ data: AutomationRecord }>(`/api/automation/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: string) =>
    request<{ ok: boolean }>(`/api/automation/${id}`, { method: "DELETE" }),
  simulate: (definition: unknown, context: Record<string, unknown> = {}) =>
    request<{ trace: Array<Record<string, unknown>>; steps: number; completed: boolean }>(
      "/api/automation/simulate",
      { method: "POST", body: JSON.stringify({ definition, context }) },
    ),
};

export type CopilotChatMessage = { role: "system" | "user" | "assistant" | "tool"; content: string };

export const copilotApi = {
  chat: (messages: CopilotChatMessage[]) =>
    request<{ answer: string; toolCalls: Array<{ name: string }> }>("/api/copilot/chat", {
      method: "POST",
      body: JSON.stringify({ messages }),
    }),
};

export type ActivityFeedItem = { kind: "automation" | "calendar"; title: string; status: string; at: string };

export const eventsApi = {
  feed: () => request<{ data: ActivityFeedItem[] }>("/api/events/feed"),
};

export type DailyBriefing = {
  date: string;
  total: number;
  countsByStatus: Record<string, number>;
  appointmentsToday: Array<{ id: string; startTime: string | null; status: string; patientId: string | null }>;
  noShowsYesterday: number;
  inactivePatients: number;
  summary: string;
};

export const briefingApi = {
  get: () => request<DailyBriefing>("/api/briefing"),
};

export const pushSubscriptionsApi = {
  list: (params?: { userId?: string; activeOnly?: boolean }) =>
    request<{ data: PushSubscription[] }>(withQuery("/api/push-subscriptions", params)),
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
    request<{ data: PushSubscription | null }>("/api/push-subscriptions/deactivate", {
      method: "PUT",
      body: JSON.stringify({ endpoint, userId }),
    }),
};

export const whatsappApi = {
  listMessages: (params?: { appointmentId?: string; patientId?: string; limit?: number }) =>
    request<{ data: WhatsAppMessage[] }>(withQuery("/api/whatsapp/messages", params)),
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
  getConfig: () => request<{ data: Record<string, unknown> }>("/api/whatsapp/config"),
  listTemplates: () => request<{ data: WhatsAppTemplateRecord[] }>("/api/whatsapp/templates"),
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
    request<{ data: WhatsAppWebhookLog[] }>(withQuery("/api/whatsapp/webhook-logs", params)),
};

export const crmApi = {
  leads: {
    list: (p?: { estagio?: string }) => crm(withQuery("/leads", p)),
    get: (id: string) => crm(`/leads/${id}`),
    create: (d: Partial<Lead>) => crm("/leads", { method: "POST", body: JSON.stringify(d) }),
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
    list: (p?: { status?: string; leadId?: string }) => crm(withQuery("/tarefas", p)),
    create: (d: Partial<CrmTarefa>) => crm("/tarefas", { method: "POST", body: JSON.stringify(d) }),
    update: (id: string, d: Partial<CrmTarefa>) =>
      crm(`/tarefas/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    delete: (id: string) => crm(`/tarefas/${id}`, { method: "DELETE" }),
  },
  campanhas: {
    list: (p?: { status?: string; tipo?: string; limit?: number; offset?: number }) =>
      crm(withQuery("/campanhas", p)),
    create: (
      d: Partial<CrmCampanha> & {
        nome?: string;
        tipo?: string;
        conteudo?: string;
        template_key?: string;
        agendada_em?: string | null;
        patient_ids?: string[];
        total_destinatarios?: number;
      },
    ) => crm("/campanhas", { method: "POST", body: JSON.stringify(d) }),
    update: (id: string, d: Partial<CrmCampanha>) =>
      crm(`/campanhas/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    delete: (id: string) => crm(`/campanhas/${id}`, { method: "DELETE" }),
    summary: (id: string) =>
      crm(`/campanhas/${id}/summary`) as Promise<{
        data: { total: number; enviados: number; entregues: number; lidos: number; falhas: number };
      }>,
    audienceCount: (filtro_estagios: string[]) =>
      crm("/campanhas/audience-count", {
        method: "POST",
        body: JSON.stringify({ filtro_estagios }),
      }) as Promise<{ data: { count: number } }>,
  },
};
