/**
 * Testing Helpers and Utilities
 * 
 * Common utilities for writing tests
 */

import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ReactElement, ReactNode, createElement } from 'react';

/**
 * Create a test query client with sensible defaults
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Suppress errors in tests
    },
  });
}

/**
 * Wrapper with all providers for testing
 */
interface AllProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

function AllProviders({ children, queryClient }: AllProvidersProps) {
  const client = queryClient || createTestQueryClient();

  return createElement(
    QueryClientProvider,
    { client },
    createElement(BrowserRouter, null, children)
  );
}

/**
 * Custom render with providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { queryClient, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) =>
      createElement(AllProviders, { queryClient }, children),
    ...renderOptions,
  });
}

/**
 * Wait for async operations
 */
export const waitFor = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mock Firebase Auth user
 */
export const mockFirebaseUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
  photoURL: null,
  phoneNumber: null,
  isAnonymous: false,
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString(),
  },
  providerData: [],
  refreshToken: 'test-refresh-token',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'test-id-token',
  getIdTokenResult: async () => ({
    token: 'test-id-token',
    expirationTime: new Date(Date.now() + 3600000).toISOString(),
    authTime: new Date().toISOString(),
    issuedAtTime: new Date().toISOString(),
    signInProvider: 'password',
    signInSecondFactor: null,
    claims: {
      role: 'admin',
      organization_id: 'test-org-id',
    },
  }),
  reload: async () => {},
  toJSON: () => ({}),
  providerId: 'firebase',
};

/**
 * Mock patient data
 */
export const mockPatient = {
  id: 'test-patient-id',
  name: 'João Silva',
  email: 'joao@example.com',
  phone: '11999999999',
  cpf: '12345678900',
  birth_date: '1990-01-01',
  gender: 'male',
  address: 'Rua Teste, 123',
  city: 'São Paulo',
  state: 'SP',
  zip_code: '01234-567',
  organization_id: 'test-org-id',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Mock appointment data
 */
export const mockAppointment = {
  id: 'test-appointment-id',
  patient_id: 'test-patient-id',
  therapist_id: 'test-therapist-id',
  organization_id: 'test-org-id',
  start_time: new Date().toISOString(),
  end_time: new Date(Date.now() + 3600000).toISOString(),
  status: 'scheduled',
  type: 'consultation',
  notes: 'Test appointment',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Mock exercise data
 */
export const mockExercise = {
  id: 'test-exercise-id',
  name: 'Agachamento',
  description: 'Exercício de fortalecimento de membros inferiores',
  category: 'strength',
  difficulty: 'intermediate',
  duration: 30,
  repetitions: 10,
  sets: 3,
  video_url: 'https://example.com/video.mp4',
  thumbnail_url: 'https://example.com/thumb.jpg',
  organization_id: 'test-org-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Suppress console errors in tests
 */
export function suppressConsoleErrors(): void {
  const originalError = console.error;
  beforeAll(() => {
    console.error = (...args: any[]) => {
      if (
        typeof args[0] === 'string' &&
        (args[0].includes('Warning: ReactDOM.render') ||
          args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
      ) {
        return;
      }
      originalError.call(console, ...args);
    };
  });

  afterAll(() => {
    console.error = originalError;
  });
}

/**
 * Create mock function with type safety
 */
export function createMockFn<T extends (...args: any[]) => any>(): jest.Mock<
  ReturnType<T>,
  Parameters<T>
> {
  return jest.fn();
}
