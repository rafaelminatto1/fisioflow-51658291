/**
 * Inngest Types for FisioFlow
 *
 * Event types, payload schemas, and workflow data types
 */

// ============================================================================
// EVENT NAMES
// ============================================================================

export const Events = {
  // Cron/Scheduled Events
  CRON_DAILY_CLEANUP: 'cron/daily.cleanup',
  CRON_DAILY_REPORTS: 'cron/daily.reports',
  CRON_BIRTHDAY_MESSAGES: 'cron/daily.birthdays',
  CRON_WEEKLY_SUMMARY: 'cron/weekly.summary',
  CRON_EXPIRING_VOUCHERS: 'cron/daily.expiring-vouchers',
  CRON_DATA_INTEGRITY: 'cron/data-integrity',

  // Notification Events
  NOTIFICATION_SEND: 'notification/send',
  NOTIFICATION_SEND_BATCH: 'notification/send-batch',

  // Email Events
  EMAIL_SEND: 'email/send',
  EMAIL_SEND_BATCH: 'email/send-batch',

  // WhatsApp Events
  WHATSAPP_SEND: 'whatsapp/send',
  WHATSAPP_SEND_BATCH: 'whatsapp/send-batch',

  // AI/Patient Events
  AI_PATIENT_INSIGHTS: 'ai/patient.insights',
  AI_GENERATE_REPORT: 'ai/generate.report',
  AI_EXERCISE_SUGGESTIONS: 'ai/exercise.suggestions',

  // Appointment Events
  APPOINTMENT_CREATED: 'appointment/created',
  APPOINTMENT_UPDATED: 'appointment/updated',
  APPOINTMENT_CANCELLED: 'appointment/cancelled',
  APPOINTMENT_REMINDER: 'appointment/reminder',

  // Payment Events
  PAYMENT_SUCCESS: 'payment/success',
  PAYMENT_FAILED: 'payment/failed',
  PAYMENT_REFUNDED: 'payment/refunded',

  // Patient Events
  PATIENT_CREATED: 'patient/created',
  PATIENT_UPDATED: 'patient/updated',

  // Session Events
  SESSION_COMPLETED: 'session/completed',
  SESSION_CREATED: 'session/created',
} as const;

// ============================================================================
// EVENT PAYLOAD TYPES
// ============================================================================

export interface CronEventPayload {
  timestamp: string;
  scheduledDate?: string;
}

export interface NotificationSendPayload {
  userId: string;
  organizationId: string;
  type: 'email' | 'whatsapp' | 'push';
  priority?: 'critical' | 'high' | 'normal' | 'low';
  data: {
    to: string; // email or phone
    subject?: string;
    body: string;
    template?: string;
    templateData?: Record<string, unknown>;
  };
}

export interface NotificationBatchPayload {
  organizationId: string;
  notifications: Omit<NotificationSendPayload, 'organizationId'>[];
}

export interface EmailSendPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    type?: string;
  }>;
  tags?: Record<string, string>;
}

export interface WhatsAppSendPayload {
  to: string; // phone number
  message: string;
  type?: 'text' | 'template' | 'media';
  mediaUrl?: string;
  templateName?: string;
  templateData?: Record<string, string>;
}

export interface BirthdayMessagePayload {
  patientId: string;
  name: string;
  dateOfBirth: string;
  email?: string;
  phone?: string;
  organizationId: string;
}

export interface DailyReportPayload {
  organizationId: string;
  organizationName: string;
  date: string;
}

export interface CleanupPayload extends CronEventPayload {
  cleanupType?: 'all' | 'notifications' | 'sessions' | 'tokens';
}

// ============================================================================
// WORKFLOW RESULT TYPES
// ============================================================================

export interface WorkflowResult {
  success: boolean;
  timestamp: string;
  runId: string;
  data?: Record<string, unknown>;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
}

export interface NotificationResult {
  success: boolean;
  sent: number;
  failed: number;
  skipped: number;
  errors: Array<{
    recipient: string;
    error: string;
  }>;
}

export interface CleanupResult {
  deletedRecords: {
    notificationHistory: number;
    passwordResetTokens: number;
    systemHealthLogs: number;
    incompleteSessions: number;
  };
  errors: string[];
}

// ============================================================================
// FUNCTION OPTIONS TYPES
// ============================================================================

export interface WorkflowOptions {
  id: string;
  name: string;
  retry?: {
    maxAttempts?: number;
    delay?: 'exponential' | 'linear';
    initialDelay?: number;
    maxDelay?: number;
  };
  throttle?: {
    limit: number;
    period: string;
  };
  idempotent?: boolean;
  concurrency?: number;
}
