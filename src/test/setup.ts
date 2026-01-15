import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Fix for "Right-hand side of 'instanceof' is not an object" error in React 18
// This is caused by jsdom's implementation not being compatible with React 18's instanceof checks

// Store original Node class
const OriginalNode = global.Node

// Monkey patch to prevent instanceof errors
if (typeof document !== 'undefined') {
  // Ensure document.activeElement works properly
  Object.defineProperty(document, 'activeElement', {
    get: function() {
      return document.body || null
    },
    configurable: true
  })

  // Fix instanceof checks by ensuring Node is properly defined
  if (!global.Node) {
    global.Node = class Node {
      static ELEMENT_NODE = 1
      static TEXT_NODE = 3
      static DOCUMENT_NODE = 9
    }
  }
}

// Mock web-push for Edge Function tests
vi.mock('web-push', () => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
  generateVAPIDKeys: vi.fn()
}))

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

// Mock AI hooks
vi.mock('@/hooks/useAIInsights', () => ({
  useAIPatientAssistant: vi.fn(() => ({
    messages: [],
    isLoading: false,
    error: null,
    append: vi.fn(),
    reload: vi.fn(),
    stop: vi.fn()
  })),
  useAIInsights: vi.fn(() => ({
    completion: null,
    isGenerating: false,
    generate: vi.fn()
  }))
}))

vi.mock('@/hooks/usePatientAnalytics', () => ({
  usePatientAnalyticsDashboard: vi.fn(() => ({
    data: {
      progress_summary: {
        total_sessions: 0,
        overall_progress_percentage: 0
      }
    },
    isLoading: false,
    error: null
  }))
}))

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: React.ReactNode }) => {
    const React = require('react')
    return React.createElement('div', { className: 'mock-react-markdown' }, children)
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

afterEach(async () => {
  // Ensure all React updates are flushed before cleanup
  await cleanup()
  vi.clearAllMocks()
})

afterAll(() => {
  vi.resetAllMocks()
})