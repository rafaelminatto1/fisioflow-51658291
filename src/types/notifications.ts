// Notification system types and interfaces

export enum NotificationType {
  APPOINTMENT_REMINDER = 'appointment_reminder',
  APPOINTMENT_CHANGE = 'appointment_change',
  EXERCISE_REMINDER = 'exercise_reminder',
  EXERCISE_MILESTONE = 'exercise_milestone',
  PROGRESS_UPDATE = 'progress_update',
  SYSTEM_ALERT = 'system_alert',
  THERAPIST_MESSAGE = 'therapist_message',
  PAYMENT_REMINDER = 'payment_reminder'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  CLICKED = 'clicked',
  FAILED = 'failed'
}

export interface NotificationAction {
  action: string
  title: string
  icon?: string
}

export interface PushSubscription {
  id: string
  userId: string
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userAgent?: string
  createdAt: Date
  updatedAt: Date
}

export interface NotificationPreferences {
  id: string
  userId: string
  appointmentReminders: boolean
  exerciseReminders: boolean
  progressUpdates: boolean
  systemAlerts: boolean
  therapistMessages: boolean
  paymentReminders: boolean
  quietHours: {
    start: string // HH:MM format
    end: string   // HH:MM format
  }
  weekendNotifications: boolean
  createdAt: Date
  updatedAt: Date
}

export interface NotificationPayload {
  type: NotificationType
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: Record<string, unknown>
  actions?: NotificationAction[]
  requireInteraction?: boolean
  silent?: boolean
  tag?: string
  timestamp?: Date
}

export interface NotificationHistory {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  data: Record<string, unknown>
  sentAt: Date
  deliveredAt?: Date
  clickedAt?: Date
  status: NotificationStatus
  errorMessage?: string
  retryCount: number
}

export interface NotificationTemplate {
  id: string
  type: NotificationType
  titleTemplate: string
  bodyTemplate: string
  iconUrl?: string
  badgeUrl?: string
  actions: NotificationAction[]
  defaultData: Record<string, unknown>
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface NotificationTrigger {
  id: string
  name: string
  eventType: string
  conditions: Record<string, unknown>
  templateType: NotificationType
  scheduleDelayMinutes: number
  isRecurring: boolean
  cronExpression?: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface NotificationAnalytics {
  notificationType: NotificationType
  totalSent: number
  totalDelivered: number
  totalClicked: number
  totalFailed: number
  deliveryRate: number
  clickRate: number
}

// Request/Response types for API
export interface CreatePushSubscriptionRequest {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userAgent?: string
}

export interface UpdateNotificationPreferencesRequest {
  appointmentReminders?: boolean
  exerciseReminders?: boolean
  progressUpdates?: boolean
  systemAlerts?: boolean
  therapistMessages?: boolean
  paymentReminders?: boolean
  quietHours?: {
    start: string
    end: string
  }
  weekendNotifications?: boolean
}

export interface SendNotificationRequest {
  userId: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, unknown>
  actions?: NotificationAction[]
  scheduleAt?: Date
}

export interface NotificationPermissionState {
  permission: NotificationPermission
  supported: boolean
  subscribed: boolean
  subscription?: PushSubscription
}

// Service Worker message types
export interface ServiceWorkerMessage {
  type: 'NOTIFICATION_CLICKED' | 'NOTIFICATION_CLOSED' | 'SUBSCRIPTION_CHANGED'
  payload?: unknown
}

export interface PushEventData {
  notification: NotificationPayload
  timestamp: number
}

// Additional utility types
export type NotificationTypeKey = keyof typeof NotificationType
export type NotificationStatusKey = keyof typeof NotificationStatus

export interface NotificationError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface NotificationBatch {
  id: string
  userIds: string[]
  notification: NotificationPayload
  scheduledAt?: Date
  status: 'pending' | 'processing' | 'completed' | 'failed'
  results?: {
    sent: number
    failed: number
    errors: NotificationError[]
  }
  createdAt: Date
  updatedAt: Date
}

export interface NotificationQueue {
  id: string
  userId: string
  notification: NotificationPayload
  priority: 'low' | 'normal' | 'high' | 'urgent'
  scheduledAt: Date
  attempts: number
  maxAttempts: number
  status: 'queued' | 'processing' | 'sent' | 'failed' | 'cancelled'
  createdAt: Date
  updatedAt: Date
}

export interface NotificationMetrics {
  period: 'hour' | 'day' | 'week' | 'month'
  startDate: Date
  endDate: Date
  metrics: {
    [key in NotificationType]?: {
      sent: number
      delivered: number
      clicked: number
      failed: number
    }
  }
  totalMetrics: {
    sent: number
    delivered: number
    clicked: number
    failed: number
    deliveryRate: number
    clickThroughRate: number
  }
}

// Template variable types for dynamic content
export interface TemplateVariables {
  patient?: {
    name: string
    firstName: string
  }
  therapist?: {
    name: string
    firstName: string
  }
  appointment?: {
    date: string
    time: string
    duration: number
  }
  exercise?: {
    name: string
    duration: number
    sets?: number
    reps?: number
  }
  system?: {
    appName: string
    supportEmail: string
    supportPhone: string
  }
}