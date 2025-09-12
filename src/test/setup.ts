import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock environment variables
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis()
    })),
    rpc: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    }))
  }
}))

// Mock browser APIs
const mockServiceWorkerRegistration = {
  pushManager: {
    subscribe: vi.fn(),
    getSubscription: vi.fn()
  },
  scope: '/test-scope',
  update: vi.fn(),
  unregister: vi.fn()
}

const mockNotification = {
  permission: 'default' as NotificationPermission,
  requestPermission: vi.fn()
}

// Setup global mocks
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

// Mock crypto for VAPID key conversion
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      importKey: vi.fn(),
      sign: vi.fn()
    }
  },
  writable: true
})

// Mock environment variables
process.env.VITE_VAPID_PUBLIC_KEY = 'test-vapid-key'

beforeAll(() => {
  // Setup any global test configuration
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

afterAll(() => {
  vi.resetAllMocks()
})