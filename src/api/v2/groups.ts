import { request } from "./base";

export interface GroupClass {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  modality: string;
  therapist_id?: string;
  location?: string;
  max_capacity: number;
  duration_minutes: number;
  color: string;
  is_active: boolean;
  enrolled_count: number;
  waitlist_count: number;
  schedules: Array<{ weekday: number; start_time: string }>;
  created_at: string;
  updated_at: string;
}

export interface GroupSession {
  id: string;
  class_id: string;
  date: string;
  start_time: string;
  end_time?: string;
  status: string;
  notes?: string;
  checkin_count: number;
}

export interface GroupEnrollment {
  id: string;
  patient_id: string;
  full_name: string;
  phone?: string;
  whatsapp?: string;
  enrolled_at: string;
}

export interface GroupCheckin {
  id: string;
  patient_id: string;
  full_name: string;
  checked_in_at: string;
  method: string;
}

const BASE = "/api/groups";

export const groupsApi = {
  list: (active?: boolean) =>
    request<{ data: GroupClass[] }>(`${BASE}${active !== undefined ? `?active=${active}` : ""}`),

  create: (body: Partial<GroupClass> & { schedules?: Array<{ weekday: number; start_time: string }> }) =>
    request<{ data: GroupClass }>(BASE, { method: "POST", body: JSON.stringify(body) }),

  update: (id: string, body: Partial<GroupClass>) =>
    request<{ data: GroupClass }>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  delete: (id: string) =>
    request<{ success: boolean }>(`${BASE}/${id}`, { method: "DELETE" }),

  sessions: {
    list: (classId: string, params?: { from?: string; to?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<{ data: GroupSession[] }>(`${BASE}/${classId}/sessions${qs ? `?${qs}` : ""}`);
    },
    create: (classId: string, body: Partial<GroupSession>) =>
      request<{ data: GroupSession }>(`${BASE}/${classId}/sessions`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    generate: (classId: string, weeks = 4) =>
      request<{ data: { created: number } }>(`${BASE}/${classId}/sessions/generate`, {
        method: "POST",
        body: JSON.stringify({ weeks }),
      }),
  },

  enrollments: {
    list: (classId: string) =>
      request<{ data: GroupEnrollment[] }>(`${BASE}/${classId}/enrollments`),
    enroll: (classId: string, patient_id: string, notes?: string) =>
      request<{ data: { status: string; position?: number } }>(`${BASE}/${classId}/enroll`, {
        method: "POST",
        body: JSON.stringify({ patient_id, notes }),
      }),
    unenroll: (classId: string, patient_id: string) =>
      request<{ success: boolean }>(`${BASE}/${classId}/unenroll`, {
        method: "POST",
        body: JSON.stringify({ patient_id }),
      }),
  },

  checkins: {
    list: (sessionId: string) =>
      request<{ data: { checkins: GroupCheckin[]; enrolled: Array<{ patient_id: string; full_name: string; checked_in: boolean }> } }>(
        `${BASE}/sessions/${sessionId}/checkins`,
      ),
    add: (sessionId: string, patient_id: string, method?: string) =>
      request<{ data: GroupCheckin }>(`${BASE}/sessions/${sessionId}/checkins`, {
        method: "POST",
        body: JSON.stringify({ patient_id, method: method ?? "manual" }),
      }),
    remove: (sessionId: string, patientId: string) =>
      request<{ success: boolean }>(`${BASE}/sessions/${sessionId}/checkins/${patientId}`, {
        method: "DELETE",
      }),
  },

  waitlist: (classId: string) =>
    request<{ data: Array<{ patient_id: string; full_name: string; position: number; status: string }> }>(
      `${BASE}/${classId}/waitlist`,
    ),
};
