/**
 * Vitest Setup File
 *
 * Global test configuration and mocks
 *
 * @module tests/setup
 */

import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================================
// MOCKS - Supabase Client
// ============================================================================

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
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
      order: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
  },
}));

// ============================================================================
// MOCKS - Firebase Client
// ============================================================================

vi.mock('@/integrations/firebase/app', () => ({
  firebaseApp: {
    auth: () => ({ }),
    firestore: () => ({ }),
    storage: () => ({ }),
  },
}));

vi.mock('@/integrations/firebase/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

// ============================================================================
// MOCKS - React Router
// ============================================================================

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    useParams: () => ({}),
  };
});

// ============================================================================
// MOCKS - AI Hooks
// ============================================================================

vi.mock('@/hooks/useAIInsights', () => ({
  useAIPatientAssistant: vi.fn(() => ({
    messages: [],
    isLoading: false,
    error: null,
    append: vi.fn(),
    reload: vi.fn(),
    stop: vi.fn(),
  })),
  useAIInsights: vi.fn(() => ({
    completion: null,
    isGenerating: false,
    generate: vi.fn(),
  })),
}));

vi.mock('@/hooks/usePatientAnalytics', () => ({
  usePatientAnalyticsDashboard: vi.fn(() => ({
    data: {
      progress_summary: {
        total_sessions: 0,
        overall_progress_percentage: 0,
      },
    },
    isLoading: false,
    error: null,
  })),
}));

// ============================================================================
// MOCKS - React Markdown
// ============================================================================

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: React.ReactNode }) => {
    const React = require('react');
    return React.createElement('div', { className: 'mock-react-markdown' }, children);
  },
}));

// ============================================================================
// MOCKS - Browser APIs
// ============================================================================

const mockServiceWorkerRegistration = {
  pushManager: {
    subscribe: vi.fn(),
    getSubscription: vi.fn(),
  },
  scope: '/test-scope',
  update: vi.fn(),
  unregister: vi.fn(),
};

Object.defineProperty(global, 'navigator', {
  value: {
    serviceWorker: {
      register: vi.fn().mockResolvedValue(mockServiceWorkerRegistration),
      ready: Promise.resolve(mockServiceWorkerRegistration),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    userAgent: 'Test User Agent',
    onLine: true,
    clipboard: {
      writeText: vi.fn(),
      readText: vi.fn(),
    },
  },
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: {
    PushManager: class MockPushManager { },
    atob: vi.fn((str) => str),
    btoa: vi.fn((str) => str),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    location: {
      origin: 'http://localhost:3000',
      href: 'http://localhost:3000',
    },
    localStorage: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
    sessionStorage: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
  },
  writable: true,
});

// ============================================================================
// MOCKS - Crypto API
// ============================================================================

Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      importKey: vi.fn(),
      sign: vi.fn(),
    },
    randomUUID: vi.fn(() => 'test-uuid-0000-0000-000000000000'),
  },
  writable: true,
});

// ============================================================================
// MOCKS - Notification API
// ============================================================================

const mockNotification = {
  permission: 'default' as NotificationPermission,
  requestPermission: vi.fn(),
};

Object.defineProperty(global, 'Notification', {
  value: mockNotification,
  writable: true,
});

// ============================================================================
// MOCKS - Environment Variables
// ============================================================================

process.env.VITE_VAPID_PUBLIC_KEY = 'test-vapid-key';
process.env.VITE_APP_URL = 'http://localhost:3000';

// ============================================================================
// MOCKS - Web Push
// ============================================================================

vi.mock('web-push', () => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
  generateVAPIDKeys: vi.fn(),
}));

// ============================================================================
// TEST LIFECYCLE
// ============================================================================

beforeAll(() => {
  // Setup any global test configuration
  console.debug('Test suite initialized');
});

afterEach(async () => {
  // Ensure all React updates are flushed before cleanup
  await cleanup();
  vi.clearAllMocks();
});

afterAll(() => {
  vi.resetAllMocks();
  console.debug('Test suite completed');
});

// ============================================================================
// UTILITY FUNCTIONS FOR TESTS
// ============================================================================

/**
 * Creates a mock Supabase response
 */
export function createMockResponse<T>(data: T | null, error: Error | null = null) {
  return {
    data,
    error,
    count: data ? (Array.isArray(data) ? data.length : 1) : null,
  };
}

/**
 * Wraps a component with test providers
 */
export function createMockProviders({ children }: { children: React.ReactNode }) {
  const React = require('react');
  const BrowserRouter = require('react-router-dom').BrowserRouter;
  const QueryClientProvider = require('@tanstack/react-query').QueryClientProvider;
  const QueryClient = require('@tanstack/react-query').QueryClient;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return React.createElement(
    BrowserRouter,
    null,
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    )
  );
}

/**
 * Creates a mock patient
 */
export function createMockPatient(overrides = {}) {
  return {
    id: 'test-patient-id',
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+5511999999999',
    cpf: '12345678900',
    birthDate: '1990-01-01',
    gender: 'male',
    status: 'active',
    ...overrides,
  };
}

/**
 * Creates a mock appointment
 */
export function createMockAppointment(overrides = {}) {
  return {
    id: 'test-appointment-id',
    patientId: 'test-patient-id',
    date: new Date().toISOString(),
    startTime: '10:00',
    endTime: '11:00',
    status: 'scheduled',
    type: 'evaluation',
    ...overrides,
  };
}

/**
 * Waits for all pending promises to resolve
 */
export async function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Creates a mock user
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    email: 'user@example.com',
    displayName: 'Test User',
    role: 'fisioterapeuta',
    organizationId: 'test-org-id',
    ...overrides,
  };
}
