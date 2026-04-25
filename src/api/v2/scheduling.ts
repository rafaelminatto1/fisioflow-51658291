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

export interface ScheduleBusinessHour {
  id: string;
  organization_id?: string;
  day_of_week: number;
  is_open?: boolean;
  open_time?: string | null;
  close_time?: string | null;
  break_start?: string | null;
  break_end?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleCancellationRule {
  id: string;
  organization_id?: string;
  min_hours_before?: number;
  allow_patient_cancellation?: boolean;
  max_cancellations_month?: number;
  charge_late_cancellation?: boolean;
  late_cancellation_fee?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleNotificationSetting {
  id: string;
  organization_id?: string;
  send_confirmation_email?: boolean;
  send_confirmation_whatsapp?: boolean;
  send_reminder_24h?: boolean;
  send_reminder_2h?: boolean;
  send_cancellation_notice?: boolean;
  custom_confirmation_message?: string | null;
  custom_reminder_message?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleBlockedTime {
  id: string;
  organization_id?: string;
  therapist_id?: string | null;
  title?: string;
  reason?: string | null;
  start_date: string;
  end_date: string;
  start_time?: string | null;
  end_time?: string | null;
  is_all_day?: boolean;
  is_recurring?: boolean;
  recurring_days?: number[];
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleCapacityConfig {
  id: string;
  organization_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_patients: number;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleAppointmentType {
  id: string;
  organization_id?: string;
  name: string;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  color: string;
  max_per_day: number | null;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleBookingWindow {
  id: string;
  organization_id?: string;
  min_advance_days: number;
  max_advance_days: number;
  same_day_booking: boolean;
  online_booking: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleSlotConfig {
  id: string;
  organization_id?: string;
  slot_interval_minutes: number;
  alignment_type: string;
  created_at?: string;
  updated_at?: string;
}

export interface WaitlistEntry {
  id: string;
  patient_id: string;
  organization_id?: string;
  preferred_days?: string[];
  preferred_periods?: string[];
  preferred_therapist_id?: string | null;
  priority?: "normal" | "high" | "urgent" | string;
  status?: "waiting" | "offered" | "scheduled" | "removed" | string;
  notes?: string | null;
  refusal_count?: number;
  offered_slot?: string | null;
  offered_at?: string | null;
  offer_expires_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface RecurringSeries {
  id: string;
  patient_id?: string;
  therapist_id?: string;
  recurrence_type?: string;
  recurrence_interval?: number;
  recurrence_days_of_week?: number[] | null;
  appointment_date?: string;
  appointment_time?: string;
  duration?: number;
  appointment_type?: string;
  notes?: string | null;
  auto_confirm?: boolean;
  is_active?: boolean;
  canceled_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const schedulingApi = {
  capacity: {
    list: () => request<{ data: ScheduleCapacityConfig[] }>("/api/scheduling/capacity-config"),
    create: (data: Record<string, unknown> | Array<Record<string, unknown>>) =>
      request<{ data: ScheduleCapacityConfig[] }>("/api/scheduling/capacity-config", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      request<{ data: ScheduleCapacityConfig }>(
        `/api/scheduling/capacity-config/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      ),
    delete: (id: string) =>
      request<{ ok?: boolean; success?: boolean }>(
        `/api/scheduling/capacity-config/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      ),
  },
  settings: {
    businessHours: {
      list: () =>
        request<{ data: ScheduleBusinessHour[] }>("/api/scheduling/settings/business-hours"),
      upsert: (data: Record<string, unknown>[]) =>
        request<{ data: ScheduleBusinessHour[] }>("/api/scheduling/settings/business-hours", {
          method: "PUT",
          body: JSON.stringify(data),
        }),
    },
    cancellationRules: {
      get: () =>
        request<{ data: ScheduleCancellationRule | null }>(
          "/api/scheduling/settings/cancellation-rules",
        ),
      upsert: (data: Record<string, unknown>) =>
        request<{ data: ScheduleCancellationRule }>("/api/scheduling/settings/cancellation-rules", {
          method: "PUT",
          body: JSON.stringify(data),
        }),
    },
    notificationSettings: {
      get: () =>
        request<{ data: ScheduleNotificationSetting | null }>(
          "/api/scheduling/settings/notification-settings",
        ),
      upsert: (data: Record<string, unknown>) =>
        request<{ data: ScheduleNotificationSetting }>(
          "/api/scheduling/settings/notification-settings",
          {
            method: "PUT",
            body: JSON.stringify(data),
          },
        ),
    },
    blockedTimes: {
      list: () =>
        request<{ data: ScheduleBlockedTime[] }>("/api/scheduling/settings/blocked-times"),
      create: (data: Record<string, unknown>) =>
        request<{ data: ScheduleBlockedTime }>("/api/scheduling/settings/blocked-times", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        request<{ ok?: boolean; success?: boolean }>(
          `/api/scheduling/settings/blocked-times/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
          },
        ),
    },
  },
  blockedTimes: {
    list: () => request<{ data: ScheduleBlockedTime[] }>("/api/scheduling/settings/blocked-times"),
    create: (data: Record<string, unknown>) =>
      request<{ data: ScheduleBlockedTime }>("/api/scheduling/settings/blocked-times", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok?: boolean; success?: boolean }>(
        `/api/scheduling/settings/blocked-times/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      ),
  },
  waitlist: {
    list: (params?: { status?: string; priority?: string }) =>
      request<{ data: WaitlistEntry[] }>(withQuery("/api/scheduling/waitlist", params)),
    create: (data: Record<string, unknown>) =>
      request<{ data: WaitlistEntry }>("/api/scheduling/waitlist", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      request<{ data: WaitlistEntry }>(`/api/scheduling/waitlist/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok?: boolean; success?: boolean }>(
        `/api/scheduling/waitlist/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      ),
  },
  waitlistOffers: {
    list: (waitlistId?: string) =>
      request<{ data: Array<Record<string, unknown>> }>(
        withQuery("/api/scheduling/waitlist-offers", { waitlistId }),
      ),
    create: (data: Record<string, unknown>) =>
      request<{ data: Record<string, unknown> }>("/api/scheduling/waitlist-offers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    respond: (id: string, data: Record<string, unknown>) =>
      request<{ data: Record<string, unknown> }>(
        `/api/scheduling/waitlist-offers/${encodeURIComponent(id)}/respond`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),
  },
  recurringSeries: {
    list: (params?: { patientId?: string; isActive?: boolean }) =>
      request<{ data: RecurringSeries[] }>(withQuery("/api/scheduling/recurring-series", params)),
    create: (data: Record<string, unknown>) =>
      request<{ data: RecurringSeries }>("/api/scheduling/recurring-series", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      request<{ data: RecurringSeries }>(
        `/api/scheduling/recurring-series/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      ),
    delete: (id: string) =>
      request<{ ok?: boolean; success?: boolean }>(
        `/api/scheduling/recurring-series/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      ),
    occurrences: (id: string) =>
      request<{ data: Array<Record<string, unknown>> }>(
        `/api/scheduling/recurring-series/${encodeURIComponent(id)}/occurrences`,
      ),
  },
  appointmentTypes: {
    list: () => request<{ data: ScheduleAppointmentType[] }>("/api/scheduling/appointment-types"),
    create: (data: Record<string, unknown>) =>
      request<{ data: ScheduleAppointmentType }>("/api/scheduling/appointment-types", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      request<{ data: ScheduleAppointmentType }>(
        `/api/scheduling/appointment-types/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      ),
    delete: (id: string) =>
      request<{ ok?: boolean; success?: boolean }>(
        `/api/scheduling/appointment-types/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      ),
  },
  bookingWindow: {
    get: () =>
      request<{ data: ScheduleBookingWindow | null }>("/api/scheduling/settings/booking-window"),
    upsert: (data: Record<string, unknown>) =>
      request<{ data: ScheduleBookingWindow }>("/api/scheduling/settings/booking-window", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },
  slotConfig: {
    get: () => request<{ data: ScheduleSlotConfig | null }>("/api/scheduling/settings/slot-config"),
    upsert: (data: Record<string, unknown>) =>
      request<{ data: ScheduleSlotConfig }>("/api/scheduling/settings/slot-config", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },
};
