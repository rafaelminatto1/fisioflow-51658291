import { request } from "./base";

export interface PortalAppointment {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  therapist_name: string;
  type: string;
  notes?: string;
  location?: string;
  can_cancel?: boolean;
  can_confirm?: boolean;
}

export interface PortalExercise {
  id: string;
  assignment_id: string;
  exercise_id: string;
  name: string;
  description?: string;
  video_url?: string;
  image_url?: string;
  sets: number;
  reps: number;
  duration_seconds?: number;
  rest_seconds?: number;
  frequency: string;
  completed_today?: boolean;
  total_completions?: number;
  notes?: string;
}

export interface PortalNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
  action_url?: string;
}

export interface PortalProgress {
  total_sessions: number;
  sessions_this_month: number;
  exercises_completed: number;
  streak_days: number;
  next_goal?: string;
  progress_percentage: number;
  pain_trend?: "improving" | "stable" | "worsening";
}

export interface PortalStats {
  total_appointments: number;
  completed_appointments: number;
  upcoming_appointments: number;
  exercises_assigned: number;
  exercises_completed_week: number;
  days_in_treatment: number;
}

export interface PortalProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  avatar_url?: string;
  main_condition?: string;
  therapist_name?: string;
  start_date?: string;
}

export const patientPortalApi = {
  async getProfile(): Promise<PortalProfile> {
    const res = await request<{ data: PortalProfile }>("/api/patient-portal/profile");
    return res.data;
  },

  async getAppointments(params?: {
    status?: string;
    limit?: number;
  }): Promise<PortalAppointment[]> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.limit) qs.set("limit", String(params.limit));
    const res = await request<{ data: PortalAppointment[] }>(
      `/api/patient-portal/appointments?${qs}`,
    );
    return res.data ?? [];
  },

  async confirmAppointment(id: string): Promise<void> {
    await request(`/api/patient-portal/appointments/${id}/confirm`, { method: "POST" });
  },

  async cancelAppointment(id: string, reason?: string): Promise<void> {
    await request(`/api/patient-portal/appointments/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async getExercises(): Promise<PortalExercise[]> {
    const res = await request<{ data: PortalExercise[] }>("/api/patient-portal/exercises");
    return res.data ?? [];
  },

  async completeExercise(
    assignmentId: string,
    data: { sets_done?: number; reps_done?: number; pain_level?: number; notes?: string },
  ): Promise<void> {
    await request(`/api/patient-portal/exercises/${assignmentId}/complete`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getNotifications(): Promise<PortalNotification[]> {
    const res = await request<{ data: PortalNotification[] }>("/api/patient-portal/notifications");
    return res.data ?? [];
  },

  async markNotificationRead(id: string): Promise<void> {
    await request(`/api/patient-portal/notifications/${id}/read`, { method: "POST" });
  },

  async markAllNotificationsRead(): Promise<void> {
    await request("/api/patient-portal/notifications/read-all", { method: "POST" });
  },

  async getProgress(): Promise<PortalProgress> {
    const res = await request<{ data: PortalProgress }>("/api/patient-portal/progress");
    return res.data;
  },

  async getStats(): Promise<PortalStats> {
    const res = await request<{ data: PortalStats }>("/api/patient-portal/stats");
    return res.data;
  },
};
