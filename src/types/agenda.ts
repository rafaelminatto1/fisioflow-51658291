
// Agenda System Types

import type { AppointmentStatus } from './appointment';

export type SessionStatus = AppointmentStatus;
export type PaymentStatus = 'pending' | 'paid' | 'partial';
export type SessionType = 'individual' | 'group';
export type PaymentType = 'session' | 'package';
export type PaymentMethod = 'cash' | 'card' | 'pix' | 'transfer';
export type UserRole = 'admin' | 'therapist' | 'intern' | 'patient';

// Base Appointment interface
export interface Appointment {
  id: string;
  patient_id: string;
  therapist_id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  status: SessionStatus;
  payment_status: PaymentStatus;
  session_type: SessionType;
  notes: string;
  created_at: string;
  updated_at: string;

  // Relacionamentos (populated via joins)
  patient?: Patient;
  therapist?: User;
  payments?: Payment[];
}

// Extended Patient interface for agenda
export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  session_price: number;
  package_sessions: number;
  remaining_sessions: number;
  important_notes: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// Payment interface
export interface Payment {
  id: string;
  appointment_id: string;
  amount: number;
  payment_type: PaymentType;
  sessions_count?: number; // For package payments
  payment_method: PaymentMethod;
  paid_at: string;
  notes: string;
  created_at: string;
}

// User interface (for therapist relationship)
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

// Status configuration for UI
export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  twBg: string;
  twBorder: string;
  twText: string;
  icon?: React.ComponentType<{ className?: string }>; // Lucide icon type
  allowedActions: string[];
}

// Permission configuration by role
export interface RolePermissions {
  canCreateAppointment: boolean;
  canEditAppointment: boolean;
  canDeleteAppointment: boolean;
  canViewAllAppointments: boolean;
  canManagePayments: boolean;
  canAccessFinancialData: boolean;
  canMarkSessionStatus: boolean;
  canAccessEvolutions: boolean;
}

// Appointment creation/update DTOs
export interface CreateAppointmentData {
  patient_id: string;
  therapist_id: string;
  date: string;
  start_time: string;
  end_time: string;
  session_type: SessionType;
  notes?: string;
}

export interface UpdateAppointmentData {
  date?: string;
  start_time?: string;
  end_time?: string;
  status?: SessionStatus;
  payment_status?: PaymentStatus;
  session_type?: SessionType;
  notes?: string;
}

// Payment creation DTO
export interface CreatePaymentData {
  appointment_id: string;
  amount: number;
  payment_type: PaymentType;
  sessions_count?: number;
  payment_method: PaymentMethod;
  notes?: string;
}

// Agenda filter options
export interface AgendaFilters {
  therapist_id?: string;
  status?: SessionStatus[];
  payment_status?: PaymentStatus[];
  date_from?: string;
  date_to?: string;
}

// Weekly calendar data structure
export interface WeeklyCalendarData {
  weekStart: Date;
  weekEnd: Date;
  appointments: Appointment[];
  timeSlots: string[]; // Array of time slots (e.g., ['07:00', '07:30', ...])
}

// Card size options for calendar display
export type CardSize = 'extra_small' | 'small' | 'medium' | 'large';

// Card size configuration
export interface CardSizeConfig {
  value: CardSize;
  label: string;
  description: string;
  icon: string;
  // Font sizes (px)
  timeFontSize: number;
  nameFontSize: number;
  typeFontSize: number;
  // Padding (rem)
  padding: string;
  // Avatar size (px)
  avatarSize: number;
  // Show avatar
  showAvatar: boolean;
  // Show type
  showType: boolean;
  // Show status icon
  showStatusIcon: boolean;
  // Height multiplier (0.5 to 2.0) - affects card height in calendar
  heightMultiplier: number;
}

// ============================================================================
// SCHEDULE CONFIGURATION TYPES (Database tables: schedule_*)
// ============================================================================

// Day of week enum (0 = Sunday, 6 = Saturday)
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const DAYS_OF_WEEK: { value: DayOfWeek; label: string }[] = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

// Schedule Capacity Config
export interface ScheduleCapacityConfig {
  id: string;
  organization_id: string;
  day_of_week: DayOfWeek;
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  max_parallel_sessions: number;
  session_duration_minutes: number;
  buffer_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduleCapacityConfigData {
  organization_id: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  max_parallel_sessions?: number;
  session_duration_minutes?: number;
  buffer_minutes?: number;
  is_active?: boolean;
}

export interface UpdateScheduleCapacityConfigData {
  day_of_week?: DayOfWeek;
  start_time?: string;
  end_time?: string;
  max_parallel_sessions?: number;
  session_duration_minutes?: number;
  buffer_minutes?: number;
  is_active?: boolean;
}

// Schedule Business Hours
export interface ScheduleBusinessHours {
  id: string;
  organization_id: string;
  day_of_week: DayOfWeek;
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduleBusinessHoursData {
  organization_id: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  is_active?: boolean;
  notes?: string;
}

export interface UpdateScheduleBusinessHoursData {
  day_of_week?: DayOfWeek;
  start_time?: string;
  end_time?: string;
  is_active?: boolean;
  notes?: string;
}

// Schedule Cancellation Rules
export interface ScheduleCancellationRules {
  id: string;
  organization_id: string;
  name: string;
  min_hours_before_cancellation: number;
  cancellation_fee_percentage: number;
  allow_patient_cancellation: boolean;
  allow_auto_refund: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduleCancellationRulesData {
  organization_id: string;
  name: string;
  min_hours_before_cancellation?: number;
  cancellation_fee_percentage?: number;
  allow_patient_cancellation?: boolean;
  allow_auto_refund?: boolean;
  is_active?: boolean;
}

export interface UpdateScheduleCancellationRulesData {
  name?: string;
  min_hours_before_cancellation?: number;
  cancellation_fee_percentage?: number;
  allow_patient_cancellation?: boolean;
  allow_auto_refund?: boolean;
  is_active?: boolean;
}

// Schedule Blocked Times
export interface ScheduleBlockedTimes {
  id: string;
  organization_id: string;
  start_date: string; // ISO date-time string
  end_date: string; // ISO date-time string
  reason: string | null;
  is_recurring: boolean;
  recurring_pattern: RecurringPattern | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  days?: DayOfWeek[]; // For weekly frequency
  end_date?: string; // ISO date string
}

export interface CreateScheduleBlockedTimesData {
  organization_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  is_recurring?: boolean;
  recurring_pattern?: RecurringPattern;
}

export interface UpdateScheduleBlockedTimesData {
  start_date?: string;
  end_date?: string;
  reason?: string;
  is_recurring?: boolean;
  recurring_pattern?: RecurringPattern;
}

// Schedule Notification Settings
export interface ScheduleNotificationSettings {
  id: string;
  organization_id: string;
  notification_type: NotificationType;
  notification_channel: NotificationChannel;
  enabled: boolean;
  timing_value: number;
  timing_unit: TimingUnit;
  template: string | null;
  created_at: string;
  updated_at: string;
}

export type NotificationType =
  | 'appointment_reminder'
  | 'cancellation'
  | 'reschedule'
  | 'confirmation'
  | 'no_show'
  | 'follow_up';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'whatsapp';

export type TimingUnit = 'minutes' | 'hours' | 'days';

export const NOTIFICATION_TYPES: { value: NotificationType; label: string }[] = [
  { value: 'appointment_reminder', label: 'Lembrete de Consulta' },
  { value: 'cancellation', label: 'Cancelamento' },
  { value: 'reschedule', label: 'Reagendamento' },
  { value: 'confirmation', label: 'Confirmação' },
  { value: 'no_show', label: 'Não Compareceu' },
  { value: 'follow_up', label: 'Acompanhamento' },
];

export const NOTIFICATION_CHANNELS: { value: NotificationChannel; label: string; icon: string }[] = [
  { value: 'email', label: 'E-mail', icon: 'mail' },
  { value: 'sms', label: 'SMS', icon: 'message-square' },
  { value: 'push', label: 'Push', icon: 'bell' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'message-circle' },
];

export const TIMING_UNITS: { value: TimingUnit; label: string }[] = [
  { value: 'minutes', label: 'Minutos' },
  { value: 'hours', label: 'Horas' },
  { value: 'days', label: 'Dias' },
];

export interface CreateScheduleNotificationSettingsData {
  organization_id: string;
  notification_type: NotificationType;
  notification_channel: NotificationChannel;
  enabled?: boolean;
  timing_value: number;
  timing_unit?: TimingUnit;
  template?: string;
}

export interface UpdateScheduleNotificationSettingsData {
  notification_type?: NotificationType;
  notification_channel?: NotificationChannel;
  enabled?: boolean;
  timing_value?: number;
  timing_unit?: TimingUnit;
  template?: string;
}