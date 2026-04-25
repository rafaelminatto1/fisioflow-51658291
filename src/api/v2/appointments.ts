import { request } from "./base";
import type { AppointmentRow, AppointmentsLastUpdated } from "@/types/workers";
import type { PatientRow } from "@/types/workers";

export const appointmentsApi = {
  list: (params?: {
    dateFrom?: string;
    dateTo?: string;
    therapistId?: string;
    status?: string;
    patientId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return request<{ data: AppointmentRow[] }>(`/api/appointments${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) =>
    request<{ data: AppointmentRow & { patient?: PatientRow | null } }>(`/api/appointments/${id}`),
  checkConflict: (data: {
    therapistId: string;
    date: string;
    startTime: string;
    endTime: string;
    excludeAppointmentId?: string;
  }) =>
    request<{ hasConflict: boolean; conflictingAppointments: unknown[] }>(
      "/api/appointments/check-conflict",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),
  create: (data: Record<string, unknown>) =>
    request<{ data: AppointmentRow }>("/api/appointments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<AppointmentRow> & Record<string, unknown>) =>
    request<{ data: AppointmentRow }>(`/api/appointments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  cancel: (id: string, reason?: string) =>
    request<{ success: boolean }>(`/api/appointments/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify(reason ? { reason } : {}),
    }),
  lastUpdated: () => request<{ data: AppointmentsLastUpdated }>("/api/appointments/last-updated"),
};

export const schedulingApi = {
  checkCapacity: (params: { start: string; end: string; therapistId?: string }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return request<{
      data: { capacity: number; used: number; available: number };
    }>(`/api/scheduling/capacity${qs ? `?${qs}` : ""}`);
  },
  getIntervalCapacity: (params: { date: string; startTime: string; endTime: string }) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ capacity: number }>(`/api/scheduling/interval-capacity?${qs}`);
  },
};
