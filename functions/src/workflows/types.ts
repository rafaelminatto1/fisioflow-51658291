/**
 * Shared Types for Firebase Workflows
 *
 * Common types and interfaces used across workflow functions
 * Ensures consistency and type safety
 *
 * @version 1.0.0
 */

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationChannel = 'email' | 'whatsapp' | 'push' | 'sms';

export type NotificationStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'retrying';

export interface NotificationData {
  to: string;
  subject?: string;
  body: string;
  html?: string;
  templateId?: string;
  templateData?: Record<string, string | number>;
  attachments?: Array<{
    filename: string;
    url: string;
    contentType: string;
  }>;
  [key: string]: any;
}

export interface NotificationRequest {
  userId: string;
  organizationId: string;
  type: NotificationChannel;
  priority?: 'low' | 'normal' | 'high';
  data: NotificationData;
  scheduledFor?: string; // ISO date string for delayed sending
}

export interface NotificationResult {
  sent: boolean;
  channel: NotificationChannel;
  provider?: string;
  providerMessageId?: string;
  error?: string;
  errorCode?: string;
  retryable?: boolean;
}

export interface NotificationDocument {
  id: string;
  user_id: string;
  organization_id: string;
  type: NotificationChannel;
  channel: NotificationChannel;
  status: NotificationStatus;
  priority: 'low' | 'normal' | 'high';
  data: NotificationData;
  result?: NotificationResult;
  created_at: string;
  sent_at?: string;
  error_message?: string | null;
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  scheduled_for?: string;
}

// ============================================================================
// APPOINTMENT TYPES
// ============================================================================

export type AppointmentStatus =
  | 'agendado'
  | 'confirmado'
  | 'em_atendimento'
  | 'concluido'
  | 'cancelado'
  | 'nao_compareceu'
  | 'remarcado';

export interface AppointmentReminderData {
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  date: string;
  time: string;
  therapistName: string;
  organizationName: string;
  location?: string;
  type?: 'consultation' | 'evaluation' | 'follow_up';
}

export interface ReminderSchedule {
  type: 'day_before' | 'same_day' | 'hour_before';
  hoursBefore: number;
  enabled: boolean;
}

// ============================================================================
// PATIENT TYPES
// ============================================================================

export interface PatientPreferences {
  email?: boolean;
  whatsapp?: boolean;
  sms?: boolean;
  push?: boolean;
  language?: 'pt-BR' | 'en-US';
  timezone?: string;
}

export interface PatientNotificationSettings {
  appointment_reminders: boolean;
  birthday_greetings: boolean;
  reactivation_messages: boolean;
  feedback_requests: boolean;
  marketing: boolean;
}

// ============================================================================
// ORGANIZATION TYPES
// ============================================================================

export interface OrganizationSettings {
  email_enabled?: boolean;
  whatsapp_enabled?: boolean;
  sms_enabled?: boolean;
  default_channel?: 'email' | 'whatsapp';
  branding?: {
    name: string;
    logo?: string;
    primary_color?: string;
  };
}

// ============================================================================
// BATCH OPERATION TYPES
// ============================================================================

export interface BatchOperationResult<T = any> {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{
    item: T;
    success: boolean;
    error?: string;
  }>;
  timestamp: string;
}

export interface BatchOptions {
  batchSize?: number;
  continueOnError?: boolean;
  maxConcurrency?: number;
}

// ============================================================================
// SCHEDULED TASK TYPES
// ============================================================================

export interface ScheduledTask {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  scheduled_for: string;
  started_at?: string;
  completed_at?: string;
  data: Record<string, any>;
  result?: any;
  error?: string;
  retry_count: number;
  max_retries: number;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class WorkflowError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

export class RetryableError extends WorkflowError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'RETRYABLE', true, details);
    this.name = 'RetryableError';
  }
}

export class NonRetryableError extends WorkflowError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'NON_RETRYABLE', false, details);
    this.name = 'NonRetryableError';
  }
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export type Nullable<T> = T | null;

export type MaybePromise<T> = T | Promise<T>;

// ============================================================================
// COLLECTION NAMES
// ============================================================================

export const COLLECTIONS = {
  NOTIFICATIONS: 'notifications',
  APPOINTMENTS: 'appointments',
  PATIENTS: 'patients',
  USERS: 'users',
  ORGANIZATIONS: 'organizations',
  APPOINTMENT_REMINDERS: 'appointment_reminders',
  APPOINTMENT_CONFIRMATIONS: 'appointment_confirmations',
  FEEDBACK_TASKS: 'feedback_tasks',
  REACTIVATION_CAMPAIGNS: 'reactivation_campaigns',
  SCHEDULED_TASKS: 'scheduled_tasks',
  USER_TOKENS: 'user_tokens',
} as const;

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];
