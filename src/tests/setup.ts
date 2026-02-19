/**
 * Vitest Setup File
 *
 * Global test configuration and mocks
 *
 * @module tests/setup
 */


// ============================================================================
// MOCKS - Firebase Client
// ============================================================================

import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/integrations/firebase/app', () => ({
  db: null,
  firebaseApp: {
    auth: () => ({}),
    firestore: () => ({}),
    storage: () => ({}),
  },
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
}));

vi.mock('@/integrations/firebase/auth', () => ({
  auth: {
    currentUser: null,
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn(),
    onIdTokenChanged: vi.fn(),
  },
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('@/integrations/firebase/functions', () => ({
  httpsCallable: vi.fn(() => ({ data: null })),
  getFirebaseFunctions: vi.fn(() => ({ httpsCallable: vi.fn() })),
  functionsInstance: { httpsCallable: vi.fn() },
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

// Setup global mocks safely
Object.defineProperty(global.navigator, 'serviceWorker', {
  value: {
    register: vi.fn().mockResolvedValue(mockServiceWorkerRegistration),
    ready: Promise.resolve(mockServiceWorkerRegistration),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(global.navigator, 'userAgent', {
  value: 'Test User Agent',
  writable: true,
  configurable: true,
});

Object.defineProperty(global.navigator, 'onLine', {
  value: true,
  writable: true,
  configurable: true,
});

Object.defineProperty(global.navigator, 'clipboard', {
  value: {
    writeText: vi.fn(),
    readText: vi.fn(),
  },
  writable: true,
  configurable: true,
});

// Extend window safely
Object.assign(global.window, {
  PushManager: class MockPushManager { },
  atob: vi.fn((str) => str),
  btoa: vi.fn((str) => str),
});

// Mock window events
global.window.addEventListener = vi.fn();
global.window.removeEventListener = vi.fn();

// Mock window.matchMedia
Object.defineProperty(global.window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage and sessionStorage
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global.window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true
});

Object.defineProperty(global.window, 'sessionStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true
});

// Mock getComputedStyle
Object.defineProperty(global.window, 'getComputedStyle', {
  value: vi.fn(() => ({
    getPropertyValue: vi.fn(() => ''),
    paddingLeft: '0px',
    paddingRight: '0px',
    marginLeft: '0px',
    marginRight: '0px',
    borderLeftWidth: '0px',
    borderRightWidth: '0px',
  })),
  writable: true,
  configurable: true
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

  // Create portal container for modals/dialogs
  const portalRoot = document.createElement('div');
  portalRoot.setAttribute('id', 'portal-root');
  document.body.appendChild(portalRoot);
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
 * Creates a mock API response
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
