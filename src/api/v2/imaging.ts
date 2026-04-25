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

export const activityLabApi = {
  patients: {
    list: (params?: { search?: string; limit?: number }) =>
      request<{ data: Array<Record<string, unknown>> }>(
        withQuery("/api/activity-lab/patients", params),
      ),
    get: (id: string) =>
      request<{ data: Record<string, unknown> | null }>(
        `/api/activity-lab/patients/${encodeURIComponent(id)}`,
      ),
  },
  sessions: {
    listByPatient: (patientId: string) =>
      request<{ data: Array<Record<string, unknown>> }>(
        `/api/activity-lab/patients/${encodeURIComponent(patientId)}/sessions`,
      ),
    get: (id: string) =>
      request<{ data: Record<string, unknown> | null }>(
        `/api/activity-lab/sessions/${encodeURIComponent(id)}`,
      ),
  },
  clinic: {
    get: () =>
      request<{ data: Record<string, unknown> | null }>("/api/activity-lab/clinic/profile"),
  },
};
