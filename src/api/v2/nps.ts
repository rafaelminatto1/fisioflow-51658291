import { request, requestPublic } from "./base";

export interface NpsSurvey {
  id: string;
  organization_id: string;
  contact_id: string;
  patient_id: string | null;
  token: string;
  score: number | null;
  comentario: string | null;
  classification: "promoter" | "passive" | "detractor" | null;
  channel: string | null;
  rule_id: string | null;
  campaign_id: string | null;
  sent_at: string;
  responded_at: string | null;
  expires_at: string | null;
}

export interface NpsStats {
  total_sent: number;
  total_responded: number;
  promotores: number;
  neutros: number;
  detratores: number;
  score_medio: string | number | null;
  nps: string | number | null;
}

export const npsApi = {
  list: (params?: { classification?: "promoter" | "passive" | "detractor"; status?: "responded" | "pending"; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v != null) as [string, string][],
    ).toString();
    return request<{ data: NpsSurvey[] }>(`/api/nps${qs ? `?${qs}` : ""}`);
  },

  stats: (days = 90) =>
    request<{ data: NpsStats; days: number }>(`/api/nps/stats?days=${days}`),

  get: (id: string) => request<{ data: NpsSurvey }>(`/api/nps/${id}`),

  create: (data: {
    contact_id: string;
    channel?: string;
    message_sent?: string;
    campaign_id?: string;
    rule_id?: string;
  }) =>
    request<{ data: NpsSurvey }>("/api/nps", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (id: string) => request<{ ok: true }>(`/api/nps/${id}`, { method: "DELETE" }),

  // Públicos (sem auth)
  publicGet: (token: string) =>
    requestPublic<{ data: { already_answered: boolean; contact_name: string } }>(
      `/api/public-nps/${token}`,
    ),

  publicRespond: (token: string, score: number, comentario?: string) =>
    requestPublic<{ data: { id: string; classification: string } }>(
      `/api/public-nps/${token}/respond`,
      {
        method: "POST",
        body: JSON.stringify({ score, comentario }),
      },
    ),
};
