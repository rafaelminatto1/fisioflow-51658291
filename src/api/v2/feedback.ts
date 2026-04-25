import { request } from "./base";

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

export const satisfactionSurveysApi = {
  list: (params?: {
    patientId?: string;
    therapistId?: string;
    startDate?: string;
    endDate?: string;
    responded?: boolean;
  }) =>
    request<{ data: Array<Record<string, unknown>> }>(
      withQuery("/api/satisfaction-surveys", params),
    ),

  stats: () => request<{ data: Record<string, unknown> }>("/api/satisfaction-surveys/stats"),

  create: (data: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>("/api/satisfaction-surveys", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>(
      `/api/satisfaction-surveys/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    ),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/satisfaction-surveys/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};
