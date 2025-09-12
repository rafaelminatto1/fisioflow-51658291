import { vi } from 'vitest'

// Test utilities for notification system tests

export const createMockSupabaseClient = () => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
    mockResolvedValue: vi.fn().mockReturnThis()
  }

  return {
    from: vi.fn(() => mockQueryBuilder),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ 
        data: { subscription: { unsubscribe: vi.fn() } } 
      }))
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    }))
  }
}

export const createMockNotification = (overrides = {}) => ({
  id: 'test-notification-id',
  userId: 'test-user-id',
  type: 'appointment_reminder',
  title: 'Test Notification',
  body: 'Test notification body',
  data: {},
  sentAt: new Date(),
  status: 'sent',
  errorMessage: null,
  retryCount: 0,
  ...overrides
})

export const createMockSubscription = (overrides = {}) => ({
  id: 'test-subscription-id',
  userId: 'test-user-id',
  endpoint: 'https://fcm.googleapis.com/fcm/send/test',
  keys: {
    p256dh: 'test-p256dh-key',
    auth: 'test-auth-key'
  },
  userAgent: 'Test User Agent',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

export const createMockPreferences = (overrides = {}) => ({
  userId: 'test-user-id',
  appointmentReminders: true,
  exerciseReminders: true,
  progressUpdates: true,
  systemAlerts: true,
  therapistMessages: true,
  paymentReminders: true,
  quietHours: {
    start: '22:00',
    end: '08:00'
  },
  weekendNotifications: false,
  ...overrides
})

export const setupBrowserMocks = () => {
  const mockServiceWorkerRegistration = {
    pushManager: {
      subscribe: vi.fn(),
      getSubscription: vi.fn()
    },
    scope: '/test-scope',
    update: vi.fn(),
    unregister: vi.fn(),
    showNotification: vi.fn(),
    getNotifications: vi.fn()
  }

  const mockNotification = {
    permission: 'default' as NotificationPermission,
    requestPermission: vi.fn()
  }

  Object.defineProperty(global, 'navigator', {
    value: {
      serviceWorker: {
        register: vi.fn().mockResolvedValue(mockServiceWorkerRegistration),
        ready: Promise.resolve(mockServiceWorkerRegistration),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      },
      userAgent: 'Test User Agent',
      onLine: true
    },
    writable: true
  })

  Object.defineProperty(global, 'Notification', {
    value: mockNotification,
    writable: true
  })

  Object.defineProperty(global, 'window', {
    value: {
      PushManager: class MockPushManager {},
      atob: vi.fn((str) => str),
      btoa: vi.fn((str) => str),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      location: {
        origin: 'http://localhost:3000',
        href: 'http://localhost:3000'
      }
    },
    writable: true
  })

  return {
    mockServiceWorkerRegistration,
    mockNotification
  }
}

export const waitForAsync = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))