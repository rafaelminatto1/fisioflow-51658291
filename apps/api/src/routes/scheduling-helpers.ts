import { createPool } from "../lib/db";

export type Pool = ReturnType<typeof createPool>;

export const emptyData = () => ({ data: [] });
export const emptyObject = () => ({ data: null });

export const parseRecurringDays = (value: unknown): number[] => {
  if (Array.isArray(value))
    return value.map((day) => Number(day)).filter((day) => !Number.isNaN(day));
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map((day) => Number(day)).filter((day) => !Number.isNaN(day))
        : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const parseStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const formatTime = (time: any): string | null => {
  if (!time) return null;
  const s = String(time);
  return s.length >= 5 ? s.slice(0, 5) : s;
};

export const mapBusinessHourRow = (row: Record<string, any>) => ({
  ...row,
  is_open: row.is_open ?? !(row.is_closed ?? false),
  open_time: formatTime(row.open_time ?? row.start_time),
  close_time: formatTime(row.close_time ?? row.end_time),
  break_start: formatTime(row.break_start),
  break_end: formatTime(row.break_end),
});

export const normalizeBusinessHourPayload = (item: Record<string, any>) => {
  const dayOfWeek = Number(item.day_of_week);
  if (Number.isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error(`Dia da semana inválido: ${item.day_of_week}`);
  }

  const isOpen = item.is_open ?? (item.is_closed !== undefined ? !item.is_closed : true);
  const openTime = item.open_time ?? item.start_time ?? "07:00";
  const closeTime = item.close_time ?? item.end_time ?? "21:00";
  const breakStart = item.break_start ?? null;
  const breakEnd = item.break_end ?? null;

  if (isOpen && openTime >= closeTime) {
    throw new Error(`O horário de abertura deve ser anterior ao de fechamento (dia ${dayOfWeek}).`);
  }

  if (isOpen && breakStart && breakEnd) {
    if (breakStart >= breakEnd) {
      throw new Error(`O início da pausa deve ser anterior ao fim da pausa (dia ${dayOfWeek}).`);
    }
    if (breakStart <= openTime || breakEnd >= closeTime) {
      throw new Error(`A pausa deve estar dentro do horário de atendimento (dia ${dayOfWeek}).`);
    }
  }

  return {
    dayOfWeek,
    isOpen: Boolean(isOpen),
    openTime,
    closeTime,
    breakStart,
    breakEnd,
  };
};

export const mapCancellationRuleRow = (row: Record<string, any>) => ({
  ...row,
  min_hours_before: Number(row.min_hours_before ?? row.min_hours_notice ?? 24),
  allow_patient_cancellation: row.allow_patient_cancellation ?? row.allow_reschedule ?? true,
  max_cancellations_month: Number(row.max_cancellations_month ?? 3),
  charge_late_cancellation:
    row.charge_late_cancellation ??
    Number(row.late_cancellation_fee ?? row.cancellation_fee ?? 0) > 0,
  late_cancellation_fee: Number(row.late_cancellation_fee ?? row.cancellation_fee ?? 0),
});

export const normalizeCancellationRulePayload = (body: Record<string, any>) => {
  const minHoursBefore = Number(body.min_hours_before ?? body.min_hours_notice ?? 24);
  const allowPatientCancellation = body.allow_patient_cancellation ?? body.allow_reschedule ?? true;
  const maxCancellationsMonth = Number(body.max_cancellations_month ?? 3);
  const lateCancellationFee = Number(body.late_cancellation_fee ?? body.cancellation_fee ?? 0);
  const chargeLateCancellation = body.charge_late_cancellation ?? lateCancellationFee > 0;

  return {
    minHoursBefore,
    allowPatientCancellation: Boolean(allowPatientCancellation),
    maxCancellationsMonth,
    chargeLateCancellation: Boolean(chargeLateCancellation),
    lateCancellationFee,
  };
};

export const mapNotificationSettingsRow = (row: Record<string, any>) => ({
  ...row,
  send_confirmation_email: row.send_confirmation_email ?? row.enable_confirmation ?? true,
  send_confirmation_whatsapp: row.send_confirmation_whatsapp ?? row.enable_confirmation ?? true,
  send_reminder_24h: row.send_reminder_24h ?? row.enable_reminders ?? true,
  send_reminder_2h: row.send_reminder_2h ?? false,
  send_cancellation_notice: row.send_cancellation_notice ?? true,
  custom_confirmation_message: row.custom_confirmation_message ?? "",
  custom_reminder_message: row.custom_reminder_message ?? "",
});

export const normalizeNotificationSettingsPayload = (body: Record<string, any>) => {
  const sendConfirmationEmail = body.send_confirmation_email ?? body.enable_confirmation ?? true;
  const sendConfirmationWhatsApp =
    body.send_confirmation_whatsapp ?? body.enable_confirmation ?? true;
  const sendReminder24h = body.send_reminder_24h ?? body.enable_reminders ?? true;
  const sendReminder2h = body.send_reminder_2h ?? false;
  const sendCancellationNotice = body.send_cancellation_notice ?? true;
  const customConfirmationMessage = body.custom_confirmation_message ?? "";
  const customReminderMessage = body.custom_reminder_message ?? "";

  return {
    sendConfirmationEmail: Boolean(sendConfirmationEmail),
    sendConfirmationWhatsApp: Boolean(sendConfirmationWhatsApp),
    sendReminder24h: Boolean(sendReminder24h),
    sendReminder2h: Boolean(sendReminder2h),
    sendCancellationNotice: Boolean(sendCancellationNotice),
    customConfirmationMessage,
    customReminderMessage,
    enableReminders: Boolean(sendReminder24h || sendReminder2h),
    reminderHoursBefore: Number(
      body.reminder_hours_before ?? (sendReminder24h ? 24 : sendReminder2h ? 2 : 24),
    ),
    enableConfirmation: Boolean(sendConfirmationEmail || sendConfirmationWhatsApp),
  };
};

export const mapBlockedTimeRow = (row: Record<string, any>) => ({
  ...row,
  title: row.title ?? "Bloqueio",
  start_date: row.start_date,
  end_date: row.end_date,
  start_time: formatTime(row.start_time),
  end_time: formatTime(row.end_time),
  is_all_day: row.is_all_day ?? true,
  is_recurring: row.is_recurring ?? false,
  recurring_days: parseRecurringDays(row.recurring_days),
});

export const normalizeBlockedTimePayload = (body: Record<string, any>) => ({
  therapistId: body.therapist_id ?? null,
  title: body.title?.trim() || body.reason?.trim() || "Bloqueio",
  reason: body.reason?.trim() || null,
  startDate: body.start_date,
  endDate: body.end_date ?? body.start_date,
  startTime: body.start_time ?? null,
  endTime: body.end_time ?? null,
  isAllDay: body.is_all_day !== false,
  isRecurring: body.is_recurring === true,
  recurringDays: JSON.stringify(parseRecurringDays(body.recurring_days)),
});

export const mapCapacityRow = (row: Record<string, any>) => ({
  ...row,
  start_time: formatTime(row.start_time),
  end_time: formatTime(row.end_time),
});

export const normalizeCapacityPayload = (body: Record<string, any>) => {
  const dayOfWeek = Number(body.day_of_week);
  const maxPatients = Number(body.max_patients);
  const startTime = String(body.start_time ?? "").trim();
  const endTime = String(body.end_time ?? "").trim();

  if (Number.isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error("day_of_week inválido");
  }
  if (!startTime || !endTime) {
    throw new Error("start_time e end_time são obrigatórios");
  }
  if (Number.isNaN(maxPatients) || maxPatients < 1) {
    throw new Error("max_patients inválido");
  }

  return { dayOfWeek, startTime, endTime, maxPatients };
};

export const mapWaitlistRow = (row: Record<string, any>) => ({
  ...row,
  preferred_days: parseStringArray(row.preferred_days),
  preferred_periods: parseStringArray(row.preferred_periods),
  offered_slot: formatTime(row.offered_slot),
  refusal_count: Number(row.refusal_count ?? 0),
});

export const normalizeWaitlistPayload = (body: Record<string, any>) => ({
  patientId: String(body.patient_id ?? body.patientId ?? "").trim(),
  preferredDays: JSON.stringify(parseStringArray(body.preferred_days ?? body.preferredDays)),
  preferredPeriods: JSON.stringify(
    parseStringArray(body.preferred_periods ?? body.preferredPeriods),
  ),
  preferredTherapistId: body.preferred_therapist_id ?? body.preferredTherapistId ?? null,
  priority: String(body.priority ?? "normal").trim() || "normal",
  status: String(body.status ?? "waiting").trim() || "waiting",
  notes: body.notes?.trim() || null,
  refusalCount: Number(body.refusal_count ?? body.refusalCount ?? 0),
  offeredSlot: body.offered_slot ?? body.offeredSlot ?? null,
  offeredAt: body.offered_at ?? body.offeredAt ?? null,
  offerExpiresAt: body.offer_expires_at ?? body.offerExpiresAt ?? null,
});

export const mapWaitlistOfferRow = (row: Record<string, any>) => ({
  ...row,
  organization_id: row.organization_id ?? null,
});

export const mapRecurringSeriesRow = (row: Record<string, any>) => ({
  ...row,
  appointment_time: formatTime(row.appointment_time),
  recurrence_interval: Number(row.recurrence_interval ?? 1),
  recurrence_days_of_week:
    row.recurrence_days_of_week == null ? null : parseRecurringDays(row.recurrence_days_of_week),
  auto_confirm: row.auto_confirm === true,
  is_active: row.is_active !== false,
});

export const normalizeRecurringSeriesPayload = (body: Record<string, any>) => {
  const patientId = String(body.patient_id ?? body.patientId ?? "").trim();
  const appointmentDate = String(body.appointment_date ?? body.appointmentDate ?? "").trim();
  const appointmentTime = String(body.appointment_time ?? body.appointmentTime ?? "").trim();
  const recurrenceInterval = Math.max(
    1,
    Number(body.recurrence_interval ?? body.recurrenceInterval ?? 1) || 1,
  );

  if (!patientId) throw new Error("patient_id é obrigatório");
  if (!appointmentDate) throw new Error("appointment_date é obrigatório");
  if (!appointmentTime) throw new Error("appointment_time é obrigatório");

  return {
    patientId,
    therapistId: body.therapist_id ?? body.therapistId ?? null,
    recurrenceType:
      String(body.recurrence_type ?? body.recurrenceType ?? "weekly").trim() || "weekly",
    recurrenceInterval,
    recurrenceDaysOfWeek:
      body.recurrence_days_of_week == null && body.recurrenceDaysOfWeek == null
        ? null
        : JSON.stringify(
            parseRecurringDays(body.recurrence_days_of_week ?? body.recurrenceDaysOfWeek),
          ),
    appointmentDate,
    appointmentTime,
    duration: body.duration == null ? null : Number(body.duration),
    appointmentType: body.appointment_type ?? body.appointmentType ?? null,
    notes: body.notes?.trim() || null,
    autoConfirm: body.auto_confirm === true || body.autoConfirm === true,
    isActive: body.is_active !== false && body.isActive !== false,
    canceledAt: body.canceled_at ?? body.canceledAt ?? null,
  };
};

const toIsoDate = (date: Date) => date.toISOString().split("T")[0];

export const generateRecurringOccurrences = (row: Record<string, any>, limit = 24) => {
  const series = mapRecurringSeriesRow(row) as Record<string, any>;
  const appointmentDate = String(series.appointment_date ?? "").trim();
  const appointmentTime = String(series.appointment_time ?? "").trim();

  if (!appointmentDate || !appointmentTime) return [];

  const recurrenceType = String(series.recurrence_type ?? "weekly");
  const recurrenceInterval = Math.max(1, Number(series.recurrence_interval ?? 1) || 1);
  const recurrenceDays = Array.isArray(series.recurrence_days_of_week)
    ? series.recurrence_days_of_week.map((day: any) => Number(day)).filter((day: number) => !Number.isNaN(day))
    : [];
  const start = new Date(`${appointmentDate}T00:00:00.000Z`);
  const results: Array<Record<string, any>> = [];

  if (recurrenceType === "weekly" && recurrenceDays.length > 0) {
    let current = new Date(start);
    let guard = 0;
    while (results.length < limit && guard < 366) {
      const diffDays = Math.floor((current.getTime() - start.getTime()) / 86400000);
      const weeksSinceStart = Math.floor(diffDays / 7);
      if (
        weeksSinceStart % recurrenceInterval === 0 &&
        recurrenceDays.includes(current.getUTCDay())
      ) {
        results.push({
          id: `${series.id}:${toIsoDate(current)}`,
          series_id: series.id,
          occurrence_date: toIsoDate(current),
          occurrence_time: appointmentTime,
          status: series.is_active === false ? "cancelado" : "agendado",
          created_at: series.created_at ?? new Date().toISOString(),
        });
      }
      current.setUTCDate(current.getUTCDate() + 1);
      guard += 1;
    }
    return results;
  }

  let current = new Date(start);
  for (let index = 0; index < limit; index += 1) {
    results.push({
      id: `${series.id}:${toIsoDate(current)}`,
      series_id: series.id,
      occurrence_date: toIsoDate(current),
      occurrence_time: appointmentTime,
      status: series.is_active === false ? "cancelado" : "agendado",
      created_at: series.created_at ?? new Date().toISOString(),
    });

    if (recurrenceType === "daily") current.setUTCDate(current.getUTCDate() + recurrenceInterval);
    else if (recurrenceType === "monthly")
      current.setUTCMonth(current.getUTCMonth() + recurrenceInterval);
    else if (recurrenceType === "yearly")
      current.setUTCFullYear(current.getUTCFullYear() + recurrenceInterval);
    else current.setUTCDate(current.getUTCDate() + 7 * recurrenceInterval);
  }

  return results;
};

export const mapAppointmentTypeRow = (row: Record<string, any>) => ({
  ...row,
  duration_minutes: Number(row.duration_minutes ?? 30),
  buffer_before_minutes: Number(row.buffer_before_minutes ?? 0),
  buffer_after_minutes: Number(row.buffer_after_minutes ?? 0),
  max_per_day: row.max_per_day != null ? Number(row.max_per_day) : null,
  is_active: row.is_active ?? true,
  is_default: row.is_default ?? false,
  sort_order: Number(row.sort_order ?? 0),
});

export const normalizeAppointmentTypePayload = (body: Record<string, any>) => {
  const name = String(body.name ?? "").trim();
  if (!name) throw new Error("name é obrigatório");

  const duration = Number(body.duration_minutes ?? 30);
  if (Number.isNaN(duration) || duration < 5) throw new Error("duration_minutes inválido");

  return {
    name,
    durationMinutes: duration,
    bufferBefore: Number(body.buffer_before_minutes ?? 0),
    bufferAfter: Number(body.buffer_after_minutes ?? 0),
    color: String(body.color ?? "#195de6"),
    maxPerDay: body.max_per_day != null ? Number(body.max_per_day) : null,
    isActive: body.is_active !== false,
    isDefault: body.is_default === true,
    sortOrder: Number(body.sort_order ?? 0),
  };
};

export const mapBookingWindowRow = (row: Record<string, any>) => ({
  ...row,
  min_advance_days: Number(row.min_advance_days ?? 0),
  max_advance_days: Number(row.max_advance_days ?? 60),
  same_day_booking: row.same_day_booking ?? true,
  online_booking: row.online_booking ?? true,
});

export const mapSlotConfigRow = (row: Record<string, any>) => ({
  ...row,
  slot_interval_minutes: Number(row.slot_interval_minutes ?? 30),
  alignment_type: row.alignment_type ?? "fixed",
});
