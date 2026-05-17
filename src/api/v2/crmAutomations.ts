import { request } from "./base";

export type CrmTriggerType =
  | "lead_created"
  | "stage_changed"
  | "birthday"
  | "discharge"
  | "nps_low"
  | "appointment_no_show"
  | "inactivity";

export interface CrmAutomationAction {
  type:
    | "send_whatsapp"
    | "send_email"
    | "send_nps"
    | "create_task"
    | "update_stage"
    | "add_tag"
    | "wait"
    | "webhook";
  config: Record<string, unknown>;
  delay_seconds?: number;
}

export interface CrmAutomationRule {
  id: string;
  organization_id: string | null;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  gatilho_tipo: CrmTriggerType;
  gatilho_config: Record<string, unknown>;
  condicoes: Array<Record<string, unknown>>;
  acoes: CrmAutomationAction[];
  prioridade: number;
  cooldown_minutes: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmAutomationExecution {
  id: string;
  organization_id: string;
  rule_id: string;
  contact_id: string | null;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  action_index: number;
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export const crmAutomationsApi = {
  list: () => request<{ data: CrmAutomationRule[] }>(`/api/crm-automations`),

  templates: () => request<{ data: CrmAutomationRule[] }>(`/api/crm-automations/templates`),

  create: (data: Partial<CrmAutomationRule>) =>
    request<{ data: CrmAutomationRule }>(`/api/crm-automations`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CrmAutomationRule>) =>
    request<{ data: CrmAutomationRule }>(`/api/crm-automations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ ok: true }>(`/api/crm-automations/${id}`, { method: "DELETE" }),

  executions: (id: string, limit = 20) =>
    request<{ data: CrmAutomationExecution[] }>(
      `/api/crm-automations/${id}/executions?limit=${limit}`,
    ),

  scan: () =>
    request<{ data: { executed: number; failed: number } }>(`/api/crm-automations/scan`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
};
