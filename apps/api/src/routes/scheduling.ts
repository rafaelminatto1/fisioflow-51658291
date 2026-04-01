import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const emptyData = () => ({ data: [] });
const emptyObject = () => ({ data: null });

type Pool = ReturnType<typeof createPool>;

const schedulingSchemaRanges = {
  businessHours: [[0, 11], [83, 84]],
  blockedTimes: [[11, 20], [84, 85]],
  cancellationRules: [[20, 31], [85, 86]],
  notificationSettings: [[31, 44], [86, 87]],
  capacity: [[44, 47], [87, 88]],
  waitlist: [[47, 60], [88, 89]],
  waitlistOffers: [[60, 68], [89, 90]],
  recurringSeries: [[68, 83], [90, 91]],
} as const;

type SchedulingSchemaSection = keyof typeof schedulingSchemaRanges;

const schedulingSchemaReady = new Map<SchedulingSchemaSection, Promise<void>>();

async function ensureSchedulingSchema(pool: Pool, section: SchedulingSchemaSection) {
  let ready = schedulingSchemaReady.get(section);

  if (!ready) {
    ready = (async () => {
      const statements = [
        `CREATE TABLE IF NOT EXISTS business_hours (
          id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
          organization_id TEXT NOT NULL,
          day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
          start_time TIME,
          end_time TIME,
          is_closed BOOLEAN DEFAULT FALSE,
          open_time TIME,
          close_time TIME,
          is_open BOOLEAN DEFAULT TRUE,
          break_start TIME,
          break_end TIME,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        `ALTER TABLE IF EXISTS business_hours ADD COLUMN IF NOT EXISTS start_time TIME`,
        `ALTER TABLE IF EXISTS business_hours ADD COLUMN IF NOT EXISTS end_time TIME`,
        `ALTER TABLE IF EXISTS business_hours ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT FALSE`,
        `ALTER TABLE IF EXISTS business_hours ADD COLUMN IF NOT EXISTS open_time TIME`,
        `ALTER TABLE IF EXISTS business_hours ADD COLUMN IF NOT EXISTS close_time TIME`,
        `ALTER TABLE IF EXISTS business_hours ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT TRUE`,
        `ALTER TABLE IF EXISTS business_hours ADD COLUMN IF NOT EXISTS break_start TIME`,
        `ALTER TABLE IF EXISTS business_hours ADD COLUMN IF NOT EXISTS break_end TIME`,
        `ALTER TABLE IF EXISTS business_hours ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `ALTER TABLE IF EXISTS business_hours ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `CREATE TABLE IF NOT EXISTS blocked_times (
          id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
          organization_id TEXT NOT NULL,
          therapist_id TEXT,
          title TEXT NOT NULL DEFAULT 'Bloqueio',
          reason TEXT,
          start_date DATE NOT NULL DEFAULT CURRENT_DATE,
          end_date DATE NOT NULL DEFAULT CURRENT_DATE,
          start_time TIME,
          end_time TIME,
          is_all_day BOOLEAN NOT NULL DEFAULT TRUE,
          is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
          recurring_days JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_by TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        `ALTER TABLE IF EXISTS blocked_times ADD COLUMN IF NOT EXISTS therapist_id TEXT`,
        `ALTER TABLE IF EXISTS blocked_times ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Bloqueio'`,
        `ALTER TABLE IF EXISTS blocked_times ADD COLUMN IF NOT EXISTS start_date DATE NOT NULL DEFAULT CURRENT_DATE`,
        `ALTER TABLE IF EXISTS blocked_times ADD COLUMN IF NOT EXISTS end_date DATE NOT NULL DEFAULT CURRENT_DATE`,
        `ALTER TABLE IF EXISTS blocked_times ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN NOT NULL DEFAULT TRUE`,
        `ALTER TABLE IF EXISTS blocked_times ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE`,
        `ALTER TABLE IF EXISTS blocked_times ADD COLUMN IF NOT EXISTS recurring_days JSONB NOT NULL DEFAULT '[]'::jsonb`,
        `ALTER TABLE IF EXISTS blocked_times ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `CREATE TABLE IF NOT EXISTS cancellation_rules (
          id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
          organization_id TEXT NOT NULL,
          min_hours_notice INTEGER DEFAULT 24,
          allow_reschedule BOOLEAN DEFAULT TRUE,
          cancellation_fee NUMERIC(10,2) DEFAULT 0,
          min_hours_before INTEGER DEFAULT 24,
          allow_patient_cancellation BOOLEAN DEFAULT TRUE,
          max_cancellations_month INTEGER DEFAULT 3,
          charge_late_cancellation BOOLEAN DEFAULT FALSE,
          late_cancellation_fee NUMERIC(10,2) DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        `ALTER TABLE IF EXISTS cancellation_rules ADD COLUMN IF NOT EXISTS min_hours_notice INTEGER DEFAULT 24`,
        `ALTER TABLE IF EXISTS cancellation_rules ADD COLUMN IF NOT EXISTS allow_reschedule BOOLEAN DEFAULT TRUE`,
        `ALTER TABLE IF EXISTS cancellation_rules ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC(10,2) DEFAULT 0`,
        `ALTER TABLE IF EXISTS cancellation_rules ADD COLUMN IF NOT EXISTS min_hours_before INTEGER DEFAULT 24`,
        `ALTER TABLE IF EXISTS cancellation_rules ADD COLUMN IF NOT EXISTS allow_patient_cancellation BOOLEAN DEFAULT TRUE`,
        `ALTER TABLE IF EXISTS cancellation_rules ADD COLUMN IF NOT EXISTS max_cancellations_month INTEGER DEFAULT 3`,
        `ALTER TABLE IF EXISTS cancellation_rules ADD COLUMN IF NOT EXISTS charge_late_cancellation BOOLEAN DEFAULT FALSE`,
        `ALTER TABLE IF EXISTS cancellation_rules ADD COLUMN IF NOT EXISTS late_cancellation_fee NUMERIC(10,2) DEFAULT 0`,
        `ALTER TABLE IF EXISTS cancellation_rules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `ALTER TABLE IF EXISTS cancellation_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `CREATE TABLE IF NOT EXISTS scheduling_notification_settings (
          id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
          organization_id TEXT NOT NULL,
          enable_reminders BOOLEAN DEFAULT TRUE,
          reminder_hours_before INTEGER DEFAULT 24,
          enable_confirmation BOOLEAN DEFAULT TRUE,
          send_confirmation_email BOOLEAN DEFAULT TRUE,
          send_confirmation_whatsapp BOOLEAN DEFAULT TRUE,
          send_reminder_24h BOOLEAN DEFAULT TRUE,
          send_reminder_2h BOOLEAN DEFAULT TRUE,
          send_cancellation_notice BOOLEAN DEFAULT TRUE,
          custom_confirmation_message TEXT,
          custom_reminder_message TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        `ALTER TABLE IF EXISTS scheduling_notification_settings ADD COLUMN IF NOT EXISTS enable_reminders BOOLEAN DEFAULT TRUE`,
        `ALTER TABLE IF EXISTS scheduling_notification_settings ADD COLUMN IF NOT EXISTS reminder_hours_before INTEGER DEFAULT 24`,
        `ALTER TABLE IF EXISTS scheduling_notification_settings ADD COLUMN IF NOT EXISTS enable_confirmation BOOLEAN DEFAULT TRUE`,
        `ALTER TABLE IF EXISTS scheduling_notification_settings ADD COLUMN IF NOT EXISTS send_confirmation_email BOOLEAN DEFAULT TRUE`,
        `ALTER TABLE IF EXISTS scheduling_notification_settings ADD COLUMN IF NOT EXISTS send_confirmation_whatsapp BOOLEAN DEFAULT TRUE`,
        `ALTER TABLE IF EXISTS scheduling_notification_settings ADD COLUMN IF NOT EXISTS send_reminder_24h BOOLEAN DEFAULT TRUE`,
        `ALTER TABLE IF EXISTS scheduling_notification_settings ADD COLUMN IF NOT EXISTS send_reminder_2h BOOLEAN DEFAULT TRUE`,
        `ALTER TABLE IF EXISTS scheduling_notification_settings ADD COLUMN IF NOT EXISTS send_cancellation_notice BOOLEAN DEFAULT TRUE`,
        `ALTER TABLE IF EXISTS scheduling_notification_settings ADD COLUMN IF NOT EXISTS custom_confirmation_message TEXT`,
        `ALTER TABLE IF EXISTS scheduling_notification_settings ADD COLUMN IF NOT EXISTS custom_reminder_message TEXT`,
        `ALTER TABLE IF EXISTS scheduling_notification_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `ALTER TABLE IF EXISTS scheduling_notification_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `CREATE TABLE IF NOT EXISTS schedule_capacity (
          id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
          organization_id TEXT NOT NULL,
          day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          max_patients INTEGER NOT NULL CHECK (max_patients >= 1),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        `ALTER TABLE IF EXISTS schedule_capacity ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `ALTER TABLE IF EXISTS schedule_capacity ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `CREATE TABLE IF NOT EXISTS waitlist (
          id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
          organization_id TEXT NOT NULL,
          patient_id TEXT NOT NULL,
          preferred_days JSONB NOT NULL DEFAULT '[]'::jsonb,
          preferred_periods JSONB NOT NULL DEFAULT '[]'::jsonb,
          preferred_therapist_id TEXT,
          priority TEXT NOT NULL DEFAULT 'normal',
          status TEXT NOT NULL DEFAULT 'waiting',
          notes TEXT,
          refusal_count INTEGER NOT NULL DEFAULT 0,
          offered_slot TEXT,
          offered_at TIMESTAMPTZ,
          offer_expires_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        `ALTER TABLE IF EXISTS waitlist ADD COLUMN IF NOT EXISTS preferred_days JSONB NOT NULL DEFAULT '[]'::jsonb`,
        `ALTER TABLE IF EXISTS waitlist ADD COLUMN IF NOT EXISTS preferred_periods JSONB NOT NULL DEFAULT '[]'::jsonb`,
        `ALTER TABLE IF EXISTS waitlist ADD COLUMN IF NOT EXISTS preferred_therapist_id TEXT`,
        `ALTER TABLE IF EXISTS waitlist ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal'`,
        `ALTER TABLE IF EXISTS waitlist ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'waiting'`,
        `ALTER TABLE IF EXISTS waitlist ADD COLUMN IF NOT EXISTS notes TEXT`,
        `ALTER TABLE IF EXISTS waitlist ADD COLUMN IF NOT EXISTS refusal_count INTEGER NOT NULL DEFAULT 0`,
        `ALTER TABLE IF EXISTS waitlist ADD COLUMN IF NOT EXISTS offered_slot TEXT`,
        `ALTER TABLE IF EXISTS waitlist ADD COLUMN IF NOT EXISTS offered_at TIMESTAMPTZ`,
        `ALTER TABLE IF EXISTS waitlist ADD COLUMN IF NOT EXISTS offer_expires_at TIMESTAMPTZ`,
        `ALTER TABLE IF EXISTS waitlist ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `ALTER TABLE IF EXISTS waitlist ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `CREATE TABLE IF NOT EXISTS waitlist_offers (
          id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
          organization_id TEXT NOT NULL,
          waitlist_id TEXT NOT NULL,
          offered_slot TEXT NOT NULL,
          response TEXT NOT NULL DEFAULT 'pending',
          status TEXT NOT NULL DEFAULT 'pending',
          expiration_time TIMESTAMPTZ,
          responded_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        `ALTER TABLE IF EXISTS waitlist_offers ADD COLUMN IF NOT EXISTS organization_id TEXT`,
        `ALTER TABLE IF EXISTS waitlist_offers ADD COLUMN IF NOT EXISTS response TEXT NOT NULL DEFAULT 'pending'`,
        `ALTER TABLE IF EXISTS waitlist_offers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`,
        `ALTER TABLE IF EXISTS waitlist_offers ADD COLUMN IF NOT EXISTS expiration_time TIMESTAMPTZ`,
        `ALTER TABLE IF EXISTS waitlist_offers ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ`,
        `ALTER TABLE IF EXISTS waitlist_offers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `ALTER TABLE IF EXISTS waitlist_offers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `CREATE TABLE IF NOT EXISTS recurring_series (
          id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
          organization_id TEXT NOT NULL,
          patient_id TEXT NOT NULL,
          therapist_id TEXT,
          recurrence_type TEXT NOT NULL DEFAULT 'weekly',
          recurrence_interval INTEGER NOT NULL DEFAULT 1,
          recurrence_days_of_week JSONB,
          appointment_date DATE NOT NULL,
          appointment_time TIME NOT NULL,
          duration INTEGER,
          appointment_type TEXT,
          notes TEXT,
          auto_confirm BOOLEAN NOT NULL DEFAULT FALSE,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          canceled_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        `ALTER TABLE IF EXISTS recurring_series ADD COLUMN IF NOT EXISTS therapist_id TEXT`,
        `ALTER TABLE IF EXISTS recurring_series ADD COLUMN IF NOT EXISTS recurrence_type TEXT NOT NULL DEFAULT 'weekly'`,
        `ALTER TABLE IF EXISTS recurring_series ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER NOT NULL DEFAULT 1`,
        `ALTER TABLE IF EXISTS recurring_series ADD COLUMN IF NOT EXISTS recurrence_days_of_week JSONB`,
        `ALTER TABLE IF EXISTS recurring_series ADD COLUMN IF NOT EXISTS appointment_date DATE`,
        `ALTER TABLE IF EXISTS recurring_series ADD COLUMN IF NOT EXISTS appointment_time TIME`,
        `ALTER TABLE IF EXISTS recurring_series ADD COLUMN IF NOT EXISTS duration INTEGER`,
        `ALTER TABLE IF EXISTS recurring_series ADD COLUMN IF NOT EXISTS appointment_type TEXT`,
        `ALTER TABLE IF EXISTS recurring_series ADD COLUMN IF NOT EXISTS notes TEXT`,
        `ALTER TABLE IF EXISTS recurring_series ADD COLUMN IF NOT EXISTS auto_confirm BOOLEAN NOT NULL DEFAULT FALSE`,
        `ALTER TABLE IF EXISTS recurring_series ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`,
        `ALTER TABLE IF EXISTS recurring_series ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ`,
        `ALTER TABLE IF EXISTS recurring_series ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `ALTER TABLE IF EXISTS recurring_series ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `CREATE INDEX IF NOT EXISTS idx_business_hours_org_day ON business_hours (organization_id, day_of_week)`,
        `CREATE INDEX IF NOT EXISTS idx_blocked_times_org_dates ON blocked_times (organization_id, start_date, end_date)`,
        `CREATE INDEX IF NOT EXISTS idx_cancellation_rules_org ON cancellation_rules (organization_id)`,
        `CREATE INDEX IF NOT EXISTS idx_scheduling_notification_settings_org ON scheduling_notification_settings (organization_id)`,
        `CREATE INDEX IF NOT EXISTS idx_schedule_capacity_org_day ON schedule_capacity (organization_id, day_of_week, start_time)`,
        `CREATE INDEX IF NOT EXISTS idx_waitlist_org_status ON waitlist (organization_id, status, created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_waitlist_offers_org_waitlist ON waitlist_offers (organization_id, waitlist_id, created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_recurring_series_org_patient ON recurring_series (organization_id, patient_id, is_active)`,
      ];

      const selectedStatements = schedulingSchemaRanges[section].flatMap(([start, end]) =>
        statements.slice(start, end),
      );

      for (const statement of selectedStatements) {
        await pool.query(statement);
      }
    })().catch((error) => {
      schedulingSchemaReady.delete(section);
      throw error;
    });

    schedulingSchemaReady.set(section, ready);
  }

  await ready;
}

const parseRecurringDays = (value: unknown): number[] => {
  if (Array.isArray(value)) return value.map((day) => Number(day)).filter((day) => !Number.isNaN(day));
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((day) => Number(day)).filter((day) => !Number.isNaN(day)) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const parseStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const mapBusinessHourRow = (row: Record<string, any>) => ({
  ...row,
  is_open: row.is_open ?? !(row.is_closed ?? false),
  open_time: row.open_time ?? row.start_time,
  close_time: row.close_time ?? row.end_time,
});

const normalizeBusinessHourPayload = (item: Record<string, any>) => {
  const isOpen = item.is_open ?? (item.is_closed !== undefined ? !item.is_closed : true);
  const openTime = item.open_time ?? item.start_time ?? '07:00';
  const closeTime = item.close_time ?? item.end_time ?? '21:00';

  return {
    dayOfWeek: Number(item.day_of_week),
    isOpen: Boolean(isOpen),
    openTime,
    closeTime,
    breakStart: item.break_start ?? null,
    breakEnd: item.break_end ?? null,
  };
};

const mapCancellationRuleRow = (row: Record<string, any>) => ({
  ...row,
  min_hours_before: Number(row.min_hours_before ?? row.min_hours_notice ?? 24),
  allow_patient_cancellation: row.allow_patient_cancellation ?? row.allow_reschedule ?? true,
  max_cancellations_month: Number(row.max_cancellations_month ?? 3),
  charge_late_cancellation: row.charge_late_cancellation ?? Number(row.late_cancellation_fee ?? row.cancellation_fee ?? 0) > 0,
  late_cancellation_fee: Number(row.late_cancellation_fee ?? row.cancellation_fee ?? 0),
});

const normalizeCancellationRulePayload = (body: Record<string, any>) => {
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

const mapNotificationSettingsRow = (row: Record<string, any>) => ({
  ...row,
  send_confirmation_email: row.send_confirmation_email ?? row.enable_confirmation ?? true,
  send_confirmation_whatsapp: row.send_confirmation_whatsapp ?? row.enable_confirmation ?? true,
  send_reminder_24h: row.send_reminder_24h ?? row.enable_reminders ?? true,
  send_reminder_2h: row.send_reminder_2h ?? false,
  send_cancellation_notice: row.send_cancellation_notice ?? true,
  custom_confirmation_message: row.custom_confirmation_message ?? '',
  custom_reminder_message: row.custom_reminder_message ?? '',
});

const normalizeNotificationSettingsPayload = (body: Record<string, any>) => {
  const sendConfirmationEmail = body.send_confirmation_email ?? body.enable_confirmation ?? true;
  const sendConfirmationWhatsApp = body.send_confirmation_whatsapp ?? body.enable_confirmation ?? true;
  const sendReminder24h = body.send_reminder_24h ?? body.enable_reminders ?? true;
  const sendReminder2h = body.send_reminder_2h ?? false;
  const sendCancellationNotice = body.send_cancellation_notice ?? true;
  const customConfirmationMessage = body.custom_confirmation_message ?? '';
  const customReminderMessage = body.custom_reminder_message ?? '';

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
      body.reminder_hours_before ??
      (sendReminder24h ? 24 : sendReminder2h ? 2 : 24)
    ),
    enableConfirmation: Boolean(sendConfirmationEmail || sendConfirmationWhatsApp),
  };
};

const mapBlockedTimeRow = (row: Record<string, any>) => ({
  ...row,
  title: row.title ?? 'Bloqueio',
  start_date: row.start_date,
  end_date: row.end_date,
  is_all_day: row.is_all_day ?? true,
  is_recurring: row.is_recurring ?? false,
  recurring_days: parseRecurringDays(row.recurring_days),
});

const normalizeBlockedTimePayload = (body: Record<string, any>) => ({
  therapistId: body.therapist_id ?? null,
  title: body.title?.trim() || body.reason?.trim() || 'Bloqueio',
  reason: body.reason?.trim() || null,
  startDate: body.start_date,
  endDate: body.end_date ?? body.start_date,
  startTime: body.start_time ?? null,
  endTime: body.end_time ?? null,
  isAllDay: body.is_all_day !== false,
  isRecurring: body.is_recurring === true,
  recurringDays: JSON.stringify(parseRecurringDays(body.recurring_days)),
});

const normalizeCapacityPayload = (body: Record<string, any>) => {
  const dayOfWeek = Number(body.day_of_week);
  const maxPatients = Number(body.max_patients);
  const startTime = String(body.start_time ?? '').trim();
  const endTime = String(body.end_time ?? '').trim();

  if (Number.isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error('day_of_week inválido');
  }
  if (!startTime || !endTime) {
    throw new Error('start_time e end_time são obrigatórios');
  }
  if (Number.isNaN(maxPatients) || maxPatients < 1) {
    throw new Error('max_patients inválido');
  }

  return {
    dayOfWeek,
    startTime,
    endTime,
    maxPatients,
  };
};

const mapWaitlistRow = (row: Record<string, any>) => ({
  ...row,
  preferred_days: parseStringArray(row.preferred_days),
  preferred_periods: parseStringArray(row.preferred_periods),
  refusal_count: Number(row.refusal_count ?? 0),
});

const normalizeWaitlistPayload = (body: Record<string, any>) => ({
  patientId: String(body.patient_id ?? body.patientId ?? '').trim(),
  preferredDays: JSON.stringify(parseStringArray(body.preferred_days ?? body.preferredDays)),
  preferredPeriods: JSON.stringify(parseStringArray(body.preferred_periods ?? body.preferredPeriods)),
  preferredTherapistId: body.preferred_therapist_id ?? body.preferredTherapistId ?? null,
  priority: String(body.priority ?? 'normal').trim() || 'normal',
  status: String(body.status ?? 'waiting').trim() || 'waiting',
  notes: body.notes?.trim() || null,
  refusalCount: Number(body.refusal_count ?? body.refusalCount ?? 0),
  offeredSlot: body.offered_slot ?? body.offeredSlot ?? null,
  offeredAt: body.offered_at ?? body.offeredAt ?? null,
  offerExpiresAt: body.offer_expires_at ?? body.offerExpiresAt ?? null,
});

const mapWaitlistOfferRow = (row: Record<string, any>) => ({
  ...row,
  organization_id: row.organization_id ?? null,
});

const mapRecurringSeriesRow = (row: Record<string, any>) => ({
  ...row,
  recurrence_interval: Number(row.recurrence_interval ?? 1),
  recurrence_days_of_week: row.recurrence_days_of_week == null
    ? null
    : parseRecurringDays(row.recurrence_days_of_week),
  auto_confirm: row.auto_confirm === true,
  is_active: row.is_active !== false,
});

const normalizeRecurringSeriesPayload = (body: Record<string, any>) => {
  const patientId = String(body.patient_id ?? body.patientId ?? '').trim();
  const appointmentDate = String(body.appointment_date ?? body.appointmentDate ?? '').trim();
  const appointmentTime = String(body.appointment_time ?? body.appointmentTime ?? '').trim();
  const recurrenceInterval = Math.max(1, Number(body.recurrence_interval ?? body.recurrenceInterval ?? 1) || 1);

  if (!patientId) throw new Error('patient_id é obrigatório');
  if (!appointmentDate) throw new Error('appointment_date é obrigatório');
  if (!appointmentTime) throw new Error('appointment_time é obrigatório');

  return {
    patientId,
    therapistId: body.therapist_id ?? body.therapistId ?? null,
    recurrenceType: String(body.recurrence_type ?? body.recurrenceType ?? 'weekly').trim() || 'weekly',
    recurrenceInterval,
    recurrenceDaysOfWeek: body.recurrence_days_of_week == null && body.recurrenceDaysOfWeek == null
      ? null
      : JSON.stringify(parseRecurringDays(body.recurrence_days_of_week ?? body.recurrenceDaysOfWeek)),
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

const addUtcDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const addUtcMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
};

const addUtcYears = (date: Date, years: number) => {
  const next = new Date(date);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next;
};

const toIsoDate = (date: Date) => date.toISOString().split('T')[0];

const generateRecurringOccurrences = (row: Record<string, any>, limit = 24) => {
  const series = mapRecurringSeriesRow(row) as Record<string, any>;
  const appointmentDate = String(series.appointment_date ?? '').trim();
  const appointmentTime = String(series.appointment_time ?? '').trim();

  if (!appointmentDate || !appointmentTime) {
    return [];
  }

  const recurrenceType = String(series.recurrence_type ?? 'weekly');
  const recurrenceInterval = Math.max(1, Number(series.recurrence_interval ?? 1) || 1);
  const recurrenceDays = Array.isArray(series.recurrence_days_of_week)
    ? series.recurrence_days_of_week.map((day) => Number(day)).filter((day) => !Number.isNaN(day))
    : [];
  const start = new Date(`${appointmentDate}T00:00:00.000Z`);
  const results: Array<Record<string, any>> = [];

  if (recurrenceType === 'weekly' && recurrenceDays.length > 0) {
    let current = new Date(start);
    let guard = 0;
    while (results.length < limit && guard < 366) {
      const diffDays = Math.floor((current.getTime() - start.getTime()) / 86400000);
      const weeksSinceStart = Math.floor(diffDays / 7);
      if (weeksSinceStart % recurrenceInterval === 0 && recurrenceDays.includes(current.getUTCDay())) {
        results.push({
          id: `${series.id}:${toIsoDate(current)}`,
          series_id: series.id,
          occurrence_date: toIsoDate(current),
          occurrence_time: appointmentTime,
          status: series.is_active === false ? 'cancelado' : 'agendado',
          created_at: series.created_at ?? new Date().toISOString(),
        });
      }
      current = addUtcDays(current, 1);
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
      status: series.is_active === false ? 'cancelado' : 'agendado',
      created_at: series.created_at ?? new Date().toISOString(),
    });

    if (recurrenceType === 'daily') current = addUtcDays(current, recurrenceInterval);
    else if (recurrenceType === 'monthly') current = addUtcMonths(current, recurrenceInterval);
    else if (recurrenceType === 'yearly') current = addUtcYears(current, recurrenceInterval);
    else current = addUtcDays(current, 7 * recurrenceInterval);
  }

  return results;
};

async function handleUpsertBusinessHours(c: any) {
  const user = c.get('user');
  const pool = await createPool(c.env);

  try {
    await ensureSchedulingSchema(pool, 'businessHours');
    const body = (await c.req.json()) as Record<string, any>[] | Record<string, any>;
    const items = Array.isArray(body) ? body : [body];

    await pool.query('DELETE FROM business_hours WHERE organization_id = $1', [user.organizationId]);

    const results = [];
    for (const item of items) {
      const normalized = normalizeBusinessHourPayload(item);
      const res = await pool.query(
        `INSERT INTO business_hours (
          organization_id, day_of_week, start_time, end_time, is_closed,
          open_time, close_time, is_open, break_start, break_end, updated_at
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         RETURNING *`,
        [
          user.organizationId,
          normalized.dayOfWeek,
          normalized.openTime,
          normalized.closeTime,
          !normalized.isOpen,
          normalized.openTime,
          normalized.closeTime,
          normalized.isOpen,
          normalized.breakStart,
          normalized.breakEnd,
        ]
      );
      results.push(mapBusinessHourRow(res.rows[0]));
    }

    return c.json({ data: results });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

async function handleUpsertCancellationRules(c: any) {
  const user = c.get('user');
  const pool = await createPool(c.env);

  try {
    await ensureSchedulingSchema(pool, 'cancellationRules');
    const body = await c.req.json();
    const normalized = normalizeCancellationRulePayload(body);
    const existing = await pool.query(
      `SELECT id FROM cancellation_rules WHERE organization_id = $1 LIMIT 1`,
      [user.organizationId]
    );

    const params = [
      normalized.minHoursBefore,
      normalized.allowPatientCancellation,
      normalized.maxCancellationsMonth,
      normalized.chargeLateCancellation,
      normalized.lateCancellationFee,
      user.organizationId,
    ];

    let res;
    if (existing.rows[0]?.id) {
      res = await pool.query(
        `UPDATE cancellation_rules
         SET min_hours_notice = $1,
             allow_reschedule = $2,
             cancellation_fee = $5,
             min_hours_before = $1,
             allow_patient_cancellation = $2,
             max_cancellations_month = $3,
             charge_late_cancellation = $4,
             late_cancellation_fee = $5,
             updated_at = NOW()
         WHERE organization_id = $6
         RETURNING *`,
        params
      );
    } else {
      res = await pool.query(
        `INSERT INTO cancellation_rules (
          min_hours_notice, allow_reschedule, cancellation_fee,
          min_hours_before, allow_patient_cancellation, max_cancellations_month,
          charge_late_cancellation, late_cancellation_fee, organization_id, updated_at
        )
         VALUES ($1, $2, $5, $1, $2, $3, $4, $5, $6, NOW())
         RETURNING *`,
        params
      );
    }

    return c.json({ data: mapCancellationRuleRow(res.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

async function handleUpsertNotificationSettings(c: any) {
  const user = c.get('user');
  const pool = await createPool(c.env);

  try {
    await ensureSchedulingSchema(pool, 'notificationSettings');
    const body = await c.req.json();
    const normalized = normalizeNotificationSettingsPayload(body);
    const existing = await pool.query(
      `SELECT id FROM scheduling_notification_settings WHERE organization_id = $1 LIMIT 1`,
      [user.organizationId]
    );

    const params = [
      normalized.enableReminders,
      normalized.reminderHoursBefore,
      normalized.enableConfirmation,
      normalized.sendConfirmationEmail,
      normalized.sendConfirmationWhatsApp,
      normalized.sendReminder24h,
      normalized.sendReminder2h,
      normalized.sendCancellationNotice,
      normalized.customConfirmationMessage,
      normalized.customReminderMessage,
      user.organizationId,
    ];

    let res;
    if (existing.rows[0]?.id) {
      res = await pool.query(
        `UPDATE scheduling_notification_settings
         SET enable_reminders = $1,
             reminder_hours_before = $2,
             enable_confirmation = $3,
             send_confirmation_email = $4,
             send_confirmation_whatsapp = $5,
             send_reminder_24h = $6,
             send_reminder_2h = $7,
             send_cancellation_notice = $8,
             custom_confirmation_message = $9,
             custom_reminder_message = $10,
             updated_at = NOW()
         WHERE organization_id = $11
         RETURNING *`,
        params
      );
    } else {
      res = await pool.query(
        `INSERT INTO scheduling_notification_settings (
          enable_reminders, reminder_hours_before, enable_confirmation,
          send_confirmation_email, send_confirmation_whatsapp,
          send_reminder_24h, send_reminder_2h, send_cancellation_notice,
          custom_confirmation_message, custom_reminder_message,
          organization_id, updated_at
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
         RETURNING *`,
        params
      );
    }

    return c.json({ data: mapNotificationSettingsRow(res.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

app.get('/waitlist', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  try {
    await ensureSchedulingSchema(pool, 'waitlist');
    const { status, priority } = c.req.query();
    const params: unknown[] = [user.organizationId];
    let idx = 2;
    let sql = `SELECT * FROM waitlist WHERE organization_id = $1`;

    if (status) {
      sql += ` AND status = $${idx++}`;
      params.push(status);
    }
    if (priority) {
      sql += ` AND priority = $${idx++}`;
      params.push(priority);
    }

    sql += ' ORDER BY created_at ASC';

    const result = await pool.query(sql, params);
    return c.json({ data: result.rows.map(mapWaitlistRow) });
  } catch {
    return c.json(emptyData());
  }
});

app.post('/waitlist', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  try {
    await ensureSchedulingSchema(pool, 'waitlist');
    const body = await c.req.json();
    const normalized = normalizeWaitlistPayload(body);

    if (!normalized.patientId) {
      return c.json({ error: 'patient_id é obrigatório' }, 400);
    }

    const result = await pool.query(
      `INSERT INTO waitlist (
        organization_id, patient_id, preferred_days, preferred_periods,
        preferred_therapist_id, priority, status, notes, refusal_count,
        offered_slot, offered_at, offer_expires_at, updated_at
      )
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       RETURNING *`,
      [
        user.organizationId,
        normalized.patientId,
        normalized.preferredDays,
        normalized.preferredPeriods,
        normalized.preferredTherapistId,
        normalized.priority,
        normalized.status,
        normalized.notes,
        normalized.refusalCount,
        normalized.offeredSlot,
        normalized.offeredAt,
        normalized.offerExpiresAt,
      ],
    );

    return c.json({ data: mapWaitlistRow(result.rows[0]) }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put('/waitlist/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    await ensureSchedulingSchema(pool, 'waitlist');
    const body = await c.req.json();
    const allowed = [
      'preferred_days',
      'preferred_periods',
      'preferred_therapist_id',
      'priority',
      'status',
      'notes',
      'refusal_count',
      'offered_slot',
      'offered_at',
      'offer_expires_at',
    ] as const;
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    for (const key of allowed) {
      if (!(key in body)) continue;

      let value = body[key];
      if (key === 'preferred_days' || key === 'preferred_periods') {
        value = JSON.stringify(parseStringArray(value));
        sets.push(`${key} = $${idx++}::jsonb`);
      } else {
        sets.push(`${key} = $${idx++}`);
      }
      params.push(value);
    }

    if (!sets.length) {
      return c.json({ error: 'Nenhum campo para atualizar' }, 400);
    }

    sets.push('updated_at = NOW()');
    params.push(id, user.organizationId);

    const result = await pool.query(
      `UPDATE waitlist
       SET ${sets.join(', ')}
       WHERE id = $${idx++} AND organization_id = $${idx++}
       RETURNING *`,
      params,
    );

    if (!result.rows[0]) {
      return c.json({ error: 'Entrada da lista de espera não encontrada' }, 404);
    }

    return c.json({ data: mapWaitlistRow(result.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/waitlist/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    await ensureSchedulingSchema(pool, 'waitlist');
    await pool.query(
      `DELETE FROM waitlist WHERE id = $1 AND organization_id = $2`,
      [id, user.organizationId],
    );
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/waitlist-offers', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  try {
    await ensureSchedulingSchema(pool, 'waitlistOffers');
    const { waitlistId } = c.req.query();
    const params: unknown[] = [user.organizationId];
    let sql = `SELECT * FROM waitlist_offers WHERE organization_id = $1`;
    if (waitlistId) {
      sql += ' AND waitlist_id = $2';
      params.push(waitlistId);
    }
    sql += ' ORDER BY created_at DESC';

    const result = await pool.query(sql, params);
    return c.json({ data: result.rows.map(mapWaitlistOfferRow) });
  } catch {
    return c.json(emptyData());
  }
});

app.post('/waitlist-offers', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  try {
    await ensureSchedulingSchema(pool, 'waitlistOffers');
    const body = await c.req.json();
    const waitlistId = String(body.waitlist_id ?? '').trim();
    const offeredSlot = String(body.offered_slot ?? '').trim();

    if (!waitlistId || !offeredSlot) {
      return c.json({ error: 'waitlist_id e offered_slot são obrigatórios' }, 400);
    }

    const result = await pool.query(
      `INSERT INTO waitlist_offers (
        organization_id, waitlist_id, offered_slot, response, status,
        expiration_time, responded_at, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [
        user.organizationId,
        waitlistId,
        offeredSlot,
        body.response ?? 'pending',
        body.status ?? 'pending',
        body.expiration_time ?? null,
        body.responded_at ?? null,
      ],
    );

    return c.json({ data: mapWaitlistOfferRow(result.rows[0]) }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/waitlist-offers/:id/respond', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    await ensureSchedulingSchema(pool, 'waitlistOffers');
    const body = await c.req.json();
    const response = body.response ?? body.status ?? 'pending';
    const result = await pool.query(
      `UPDATE waitlist_offers
       SET response = $1,
           status = $2,
           responded_at = COALESCE($3, NOW()),
           updated_at = NOW()
       WHERE id = $4 AND organization_id = $5
       RETURNING *`,
      [response, body.status ?? response, body.responded_at ?? null, id, user.organizationId],
    );

    if (!result.rows[0]) {
      return c.json({ error: 'Oferta não encontrada' }, 404);
    }

    return c.json({ data: mapWaitlistOfferRow(result.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/settings/business-hours', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  try {
    await ensureSchedulingSchema(pool, 'businessHours');
    const result = await pool.query(
      `SELECT * FROM business_hours WHERE organization_id = $1 ORDER BY day_of_week ASC`,
      [user.organizationId]
    );
    return c.json({ data: result.rows.map(mapBusinessHourRow) });
  } catch {
    return c.json(emptyData());
  }
});

app.post('/settings/business-hours', requireAuth, handleUpsertBusinessHours);
app.put('/settings/business-hours', requireAuth, handleUpsertBusinessHours);

app.get('/settings/blocked-times', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  try {
    await ensureSchedulingSchema(pool, 'blockedTimes');
    const result = await pool.query(
      `SELECT * FROM blocked_times WHERE organization_id = $1 ORDER BY start_date ASC, start_time ASC NULLS FIRST`,
      [user.organizationId]
    );
    return c.json({ data: result.rows.map(mapBlockedTimeRow) });
  } catch {
    return c.json(emptyData());
  }
});

app.post('/settings/blocked-times', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  try {
    await ensureSchedulingSchema(pool, 'blockedTimes');
    const body = await c.req.json();
    const normalized = normalizeBlockedTimePayload(body);
    const result = await pool.query(
      `INSERT INTO blocked_times (
        organization_id, therapist_id, title, reason, start_date, end_date,
        start_time, end_time, is_all_day, is_recurring, recurring_days, created_by, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, NOW())
       RETURNING *`,
      [
        user.organizationId,
        normalized.therapistId,
        normalized.title,
        normalized.reason,
        normalized.startDate,
        normalized.endDate,
        normalized.startTime,
        normalized.endTime,
        normalized.isAllDay,
        normalized.isRecurring,
        normalized.recurringDays,
        user.uid,
      ]
    );
    return c.json({ data: mapBlockedTimeRow(result.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/settings/blocked-times/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    await ensureSchedulingSchema(pool, 'blockedTimes');
    await pool.query(
      `DELETE FROM blocked_times WHERE id = $1 AND organization_id = $2`,
      [id, user.organizationId]
    );
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/settings/cancellation-rules', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  try {
    await ensureSchedulingSchema(pool, 'cancellationRules');
    const result = await pool.query(
      `SELECT * FROM cancellation_rules WHERE organization_id = $1 LIMIT 1`,
      [user.organizationId]
    );
    return c.json({ data: result.rows[0] ? mapCancellationRuleRow(result.rows[0]) : null });
  } catch {
    return c.json(emptyObject());
  }
});

app.post('/settings/cancellation-rules', requireAuth, handleUpsertCancellationRules);
app.put('/settings/cancellation-rules', requireAuth, handleUpsertCancellationRules);

app.get('/settings/notification-settings', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  try {
    await ensureSchedulingSchema(pool, 'notificationSettings');
    const result = await pool.query(
      `SELECT * FROM scheduling_notification_settings WHERE organization_id = $1 LIMIT 1`,
      [user.organizationId]
    );
    return c.json({ data: result.rows[0] ? mapNotificationSettingsRow(result.rows[0]) : null });
  } catch {
    return c.json(emptyObject());
  }
});

app.post('/settings/notification-settings', requireAuth, handleUpsertNotificationSettings);
app.put('/settings/notification-settings', requireAuth, handleUpsertNotificationSettings);

app.get('/capacity-config', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  try {
    await ensureSchedulingSchema(pool, 'capacity');
    const result = await pool.query(
      `SELECT * FROM schedule_capacity WHERE organization_id = $1 ORDER BY day_of_week ASC, start_time ASC`,
      [user.organizationId]
    );
    return c.json({ data: result.rows });
  } catch {
    return c.json(emptyData());
  }
});

app.post('/capacity-config', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  try {
    await ensureSchedulingSchema(pool, 'capacity');
    const body = await c.req.json();
    const configs = Array.isArray(body) ? body : [body];
    const results = [];

    for (const config of configs) {
      const normalized = normalizeCapacityPayload(config);
      const res = await pool.query(
        `INSERT INTO schedule_capacity (organization_id, day_of_week, start_time, end_time, max_patients)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          user.organizationId,
          normalized.dayOfWeek,
          normalized.startTime,
          normalized.endTime,
          normalized.maxPatients,
        ]
      );
      results.push(res.rows[0]);
    }

    return c.json({ data: results });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put('/capacity-config/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    await ensureSchedulingSchema(pool, 'capacity');
    const body = await c.req.json();
    const current = await pool.query(
      `SELECT * FROM schedule_capacity WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [id, user.organizationId]
    );

    if (!current.rows[0]) {
      return c.json({ error: 'Configuração de capacidade não encontrada' }, 404);
    }

    const merged = {
      day_of_week: body.day_of_week ?? current.rows[0].day_of_week,
      start_time: body.start_time ?? current.rows[0].start_time,
      end_time: body.end_time ?? current.rows[0].end_time,
      max_patients: body.max_patients ?? current.rows[0].max_patients,
    };
    const normalized = normalizeCapacityPayload(merged);

    const res = await pool.query(
      `UPDATE schedule_capacity
       SET day_of_week = $1, start_time = $2, end_time = $3, max_patients = $4, updated_at = NOW()
       WHERE id = $5 AND organization_id = $6
       RETURNING *`,
      [
        normalized.dayOfWeek,
        normalized.startTime,
        normalized.endTime,
        normalized.maxPatients,
        id,
        user.organizationId,
      ]
    );

    return c.json({ data: res.rows[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/capacity-config/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    await ensureSchedulingSchema(pool, 'capacity');
    await pool.query(
      `DELETE FROM schedule_capacity WHERE id = $1 AND organization_id = $2`,
      [id, user.organizationId]
    );
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/recurring-series', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  try {
    await ensureSchedulingSchema(pool, 'recurringSeries');
    const { patientId, isActive } = c.req.query();
    const params: unknown[] = [user.organizationId];
    let idx = 2;
    let sql = `SELECT * FROM recurring_series WHERE organization_id = $1`;

    if (patientId) {
      sql += ` AND patient_id = $${idx++}`;
      params.push(patientId);
    }
    if (isActive !== undefined) {
      sql += ` AND is_active = $${idx++}`;
      params.push(isActive === 'true');
    }

    sql += ' ORDER BY created_at DESC';

    const result = await pool.query(sql, params);
    return c.json({ data: result.rows.map(mapRecurringSeriesRow) });
  } catch {
    return c.json(emptyData());
  }
});

app.post('/recurring-series', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  try {
    await ensureSchedulingSchema(pool, 'recurringSeries');
    const body = await c.req.json();
    const normalized = normalizeRecurringSeriesPayload(body);
    const result = await pool.query(
      `INSERT INTO recurring_series (
        organization_id, patient_id, therapist_id, recurrence_type,
        recurrence_interval, recurrence_days_of_week, appointment_date,
        appointment_time, duration, appointment_type, notes, auto_confirm,
        is_active, canceled_at, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
       RETURNING *`,
      [
        user.organizationId,
        normalized.patientId,
        normalized.therapistId,
        normalized.recurrenceType,
        normalized.recurrenceInterval,
        normalized.recurrenceDaysOfWeek,
        normalized.appointmentDate,
        normalized.appointmentTime,
        normalized.duration,
        normalized.appointmentType,
        normalized.notes,
        normalized.autoConfirm,
        normalized.isActive,
        normalized.canceledAt,
      ],
    );

    return c.json({ data: mapRecurringSeriesRow(result.rows[0]) }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put('/recurring-series/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    await ensureSchedulingSchema(pool, 'recurringSeries');
    const body = await c.req.json();
    const allowed = [
      'patient_id',
      'therapist_id',
      'recurrence_type',
      'recurrence_interval',
      'recurrence_days_of_week',
      'appointment_date',
      'appointment_time',
      'duration',
      'appointment_type',
      'notes',
      'auto_confirm',
      'is_active',
      'canceled_at',
    ] as const;
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    for (const key of allowed) {
      if (!(key in body)) continue;

      let value = body[key];
      if (key === 'recurrence_days_of_week') {
        value = JSON.stringify(parseRecurringDays(value));
        sets.push(`${key} = $${idx++}::jsonb`);
      } else {
        sets.push(`${key} = $${idx++}`);
      }
      params.push(value);
    }

    if (!sets.length) {
      return c.json({ error: 'Nenhum campo para atualizar' }, 400);
    }

    sets.push('updated_at = NOW()');
    params.push(id, user.organizationId);

    const result = await pool.query(
      `UPDATE recurring_series
       SET ${sets.join(', ')}
       WHERE id = $${idx++} AND organization_id = $${idx++}
       RETURNING *`,
      params,
    );

    if (!result.rows[0]) {
      return c.json({ error: 'Série recorrente não encontrada' }, 404);
    }

    return c.json({ data: mapRecurringSeriesRow(result.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/recurring-series/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    await ensureSchedulingSchema(pool, 'recurringSeries');
    await pool.query(
      `DELETE FROM recurring_series WHERE id = $1 AND organization_id = $2`,
      [id, user.organizationId],
    );
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/recurring-series/:id/occurrences', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    await ensureSchedulingSchema(pool, 'recurringSeries');
    const result = await pool.query(
      `SELECT * FROM recurring_series WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [id, user.organizationId],
    );

    if (!result.rows[0]) {
      return c.json({ data: [] });
    }

    return c.json({ data: generateRecurringOccurrences(result.rows[0]) });
  } catch {
    return c.json(emptyData());
  }
});

export { app as schedulingRoutes };
