import { z } from 'zod'
import { NotificationType, NotificationStatus } from '@/types/notifications'

// Validation schemas for notification system

export const notificationActionSchema = z.object({
  action: z.string().min(1, 'Action is required'),
  title: z.string().min(1, 'Title is required'),
  icon: z.string().optional()
})

export const pushSubscriptionKeysSchema = z.object({
  p256dh: z.string().min(1, 'p256dh key is required'),
  auth: z.string().min(1, 'auth key is required')
})

export const createPushSubscriptionSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
  keys: pushSubscriptionKeysSchema,
  userAgent: z.string().optional()
})

export const quietHoursSchema = z.object({
  start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
})

export const updateNotificationPreferencesSchema = z.object({
  appointmentReminders: z.boolean().optional(),
  exerciseReminders: z.boolean().optional(),
  progressUpdates: z.boolean().optional(),
  systemAlerts: z.boolean().optional(),
  therapistMessages: z.boolean().optional(),
  paymentReminders: z.boolean().optional(),
  quietHours: quietHoursSchema.optional(),
  weekendNotifications: z.boolean().optional()
})

export const notificationPayloadSchema = z.object({
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  body: z.string().min(1, 'Body is required').max(300, 'Body too long'),
  icon: z.string().url().optional(),
  badge: z.string().url().optional(),
  image: z.string().url().optional(),
  data: z.record(z.any()).optional(),
  actions: z.array(notificationActionSchema).max(2, 'Maximum 2 actions allowed').optional(),
  requireInteraction: z.boolean().optional(),
  silent: z.boolean().optional(),
  tag: z.string().optional(),
  timestamp: z.date().optional()
})

export const sendNotificationSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  body: z.string().min(1, 'Body is required').max(300, 'Body too long'),
  data: z.record(z.any()).optional(),
  actions: z.array(notificationActionSchema).max(2, 'Maximum 2 actions allowed').optional(),
  scheduleAt: z.date().optional()
})

export const notificationTemplateSchema = z.object({
  type: z.nativeEnum(NotificationType),
  titleTemplate: z.string().min(1, 'Title template is required'),
  bodyTemplate: z.string().min(1, 'Body template is required'),
  iconUrl: z.string().url().optional(),
  badgeUrl: z.string().url().optional(),
  actions: z.array(notificationActionSchema).optional(),
  defaultData: z.record(z.any()).optional(),
  active: z.boolean().default(true)
})

export const notificationTriggerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  eventType: z.string().min(1, 'Event type is required'),
  conditions: z.record(z.any()).optional(),
  templateType: z.nativeEnum(NotificationType),
  scheduleDelayMinutes: z.number().min(0, 'Delay must be non-negative').default(0),
  isRecurring: z.boolean().default(false),
  cronExpression: z.string().optional(),
  active: z.boolean().default(true)
})

// Additional validation schemas
export const pushSubscriptionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  endpoint: z.string().url(),
  keys: pushSubscriptionKeysSchema,
  userAgent: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const notificationPreferencesSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  appointmentReminders: z.boolean().default(true),
  exerciseReminders: z.boolean().default(true),
  progressUpdates: z.boolean().default(true),
  systemAlerts: z.boolean().default(true),
  therapistMessages: z.boolean().default(true),
  paymentReminders: z.boolean().default(true),
  quietHours: quietHoursSchema.default({ start: '22:00', end: '08:00' }),
  weekendNotifications: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const notificationHistorySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.record(z.any()).default({}),
  sentAt: z.date(),
  deliveredAt: z.date().optional(),
  clickedAt: z.date().optional(),
  status: z.nativeEnum(NotificationStatus),
  errorMessage: z.string().optional(),
  retryCount: z.number().min(0).default(0)
})

export const serviceWorkerMessageSchema = z.object({
  type: z.enum(['NOTIFICATION_CLICKED', 'NOTIFICATION_CLOSED', 'SUBSCRIPTION_CHANGED']),
  payload: z.any().optional()
})

export const pushEventDataSchema = z.object({
  notification: notificationPayloadSchema,
  timestamp: z.number()
})

export const notificationPermissionStateSchema = z.object({
  permission: z.enum(['default', 'granted', 'denied']),
  supported: z.boolean(),
  subscribed: z.boolean(),
  subscription: pushSubscriptionSchema.optional()
})

// Batch notification schemas
export const batchNotificationSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'At least one user ID required'),
  notification: notificationPayloadSchema,
  scheduleAt: z.date().optional()
})

export const notificationAnalyticsSchema = z.object({
  notificationType: z.nativeEnum(NotificationType),
  totalSent: z.number().min(0),
  totalDelivered: z.number().min(0),
  totalClicked: z.number().min(0),
  totalFailed: z.number().min(0),
  deliveryRate: z.number().min(0).max(100),
  clickRate: z.number().min(0).max(100)
})

// Validation helper functions
export const validateNotificationPermission = (permission: string): permission is NotificationPermission => {
  return ['default', 'granted', 'denied'].includes(permission)
}

export const validateNotificationSupport = (): boolean => {
  return typeof window !== 'undefined' && 
         'Notification' in window && 
         'serviceWorker' in navigator && 
         'PushManager' in window
}

export const validateVapidKey = (key: string): boolean => {
  // VAPID keys should be base64url encoded and 65 bytes long
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/
  return base64UrlRegex.test(key) && key.length >= 87 // Base64url encoded 65 bytes
}

// Generic notification data validation - checks if data is JSON serializable
export const validateNotificationData = (data: unknown): boolean => {
  try {
    // Notification data must be serializable
    JSON.stringify(data)
    return true
  } catch {
    return false
  }
}

export const validateQuietHours = (start: string, end: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  if (!timeRegex.test(start) || !timeRegex.test(end)) {
    return false
  }
  
  const [startHour, startMin] = start.split(':').map(Number)
  const [endHour, endMin] = end.split(':').map(Number)
  
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin
  
  // Allow overnight quiet hours (e.g., 22:00 to 08:00)
  return startMinutes !== endMinutes
}