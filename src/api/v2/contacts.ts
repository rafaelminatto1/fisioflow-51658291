import { request } from "./base";

export type LifecycleStage = "lead" | "mql" | "sql" | "opportunity" | "customer" | "churned";

export interface Contact {
  id: string;
  organization_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cpf: string | null;
  lifecycle_stage: LifecycleStage;
  score: number;
  score_temperature: "cold" | "warm" | "hot" | null;
  owner_id: string | null;
  origem_first_touch: string | null;
  origem_last_touch: string | null;
  source_campaign_id: string | null;
  primary_lead_id: string | null;
  primary_patient_id: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ContactActivity {
  id: string;
  contact_id: string;
  tipo: string;
  titulo: string | null;
  descricao: string | null;
  ref_lead_id: string | null;
  ref_patient_id: string | null;
  ref_appointment_id: string | null;
  ref_session_id: string | null;
  ref_campaign_id: string | null;
  ref_automation_id: string | null;
  payload: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface ContactScore {
  id: string;
  contact_id: string;
  score: number;
  temperature: "cold" | "warm" | "hot";
  features: Record<string, unknown>;
  model: string;
  created_at: string;
}

export interface Contact360 {
  contact: Contact;
  leads: Array<Record<string, unknown>>;
  patients: Array<Record<string, unknown>>;
  activities: ContactActivity[];
  scores: ContactScore[];
}

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== "");
  if (!entries.length) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
}

export const contactsApi = {
  list: (params?: {
    lifecycle_stage?: LifecycleStage;
    score_temperature?: "cold" | "warm" | "hot";
    owner_id?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }) =>
    request<{ data: Contact[]; limit: number; offset: number }>(`/api/contacts${qs(params ?? {})}`),

  get: (id: string) => request<{ data: Contact360 }>(`/api/contacts/${id}`),

  timeline: (id: string, params?: { tipo?: string; limit?: number; offset?: number }) =>
    request<{ data: ContactActivity[]; limit: number; offset: number }>(
      `/api/contacts/${id}/timeline${qs(params ?? {})}`,
    ),

  convert: (id: string) =>
    request<{ data: { contact_id: string; patient_id: string; already: boolean } }>(
      `/api/contacts/${id}/convert`,
      { method: "POST", body: JSON.stringify({}) },
    ),

  addActivity: (
    id: string,
    data: { tipo: string; titulo?: string; descricao?: string; payload?: Record<string, unknown> },
  ) =>
    request<{ ok: true }>(`/api/contacts/${id}/activities`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  roiBySource: (days = 90) =>
    request<{
      data: Array<{
        origem: string;
        total_contatos: number;
        total_convertidos: number;
        taxa_conversao: number;
        receita: string | number;
        ticket_medio: string | number;
      }>;
      days: number;
    }>(`/api/contacts/roi-by-source?days=${days}`),

  rescore: (id: string) =>
    request<{ data: { score: number; temperature: "cold" | "warm" | "hot" } }>(
      `/api/contacts/${id}/rescore`,
      { method: "POST", body: JSON.stringify({}) },
    ),
};
