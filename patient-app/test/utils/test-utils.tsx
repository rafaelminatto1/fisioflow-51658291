/**
 * Test Utilities
 * Helper functions for testing
 */

import { render, RenderAPI } from '@testing-library/react-native';
import { ReactElement } from 'react';
import { log } from '../lib/logger';

/**
 * Enhanced render with common providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: {
    withTheme?: boolean;
    withNavigation?: boolean;
  }
): RenderAPI {
  const { withTheme = true, withNavigation = true } = options || {};

  // In a real app, you would wrap with theme provider, navigation provider, etc.
  // For now, we'll just do a basic render
  return render(ui);
}

/**
 * Wait for a specified amount of time
 */
export function wait(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for element to be present
 */
export function waitForElement(
  getBy: any,
  container: any,
  options?: { timeout?: number }
): Promise<any> {
  const { timeout = 3000 } = options || {};
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      try {
        const element = getBy(container);
        if (element) {
          clearInterval(checkInterval);
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error(`Element not found after ${timeout}ms`));
        }
      } catch (error) {
        clearInterval(checkInterval);
        resolve(null);
      }
    }, 50);
  });
}

/**
 * Test data generators
 */
export const TestData = {
  user: (overrides = {}) => ({
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'patient',
    created_at: new Date(),
    updated_at: new Date(),
    professional_id: null,
    professional_name: null,
    ...overrides,
  }),

  exercise: (overrides = {}) => ({
    id: 'exercise-1',
    name: 'Exercicio Teste',
    description: 'Descrição do exercício',
    sets: 3,
    reps: 12,
    hold_time: 5,
    rest_time: 30,
    completed: false,
    video_url: 'https://example.com/video.mp4',
    ...overrides,
  }),

  appointment: (overrides = {}) => ({
    id: 'apt-1',
    type: 'Avaliação',
    date: new Date(Date.now() + 86400000), // Tomorrow
    time: '10:00',
    status: 'scheduled',
    professional_name: 'Dr. Test',
    ...overrides,
  }),

  evolution: (overrides = {}) => ({
    id: 'evo-1',
    date: new Date(),
    subjective: 'Paciente relata melhora',
    objective: 'Sem limitações observadas',
    assessment: 'Paciente evoluindo bem',
    plan: 'Continuar tratamento',
    pain_level: 3,
    session_number: 1,
    professional_name: 'Dr. Test',
    ...overrides,
  }),

  plan: (overrides = {}) => ({
    id: 'plan-1',
    name: 'Plano de Reabilitação',
    description: 'Plano de exercícios diários',
    status: 'active',
    start_date: new Date(),
    created_at: new Date(),
    exercises: [
      TestData.exercise(),
      TestData.exercise({ id: 'exercise-2', name: 'Alongamento' }),
      TestData.exercise({ id: 'exercise-3', name: 'Fortalecimento' }),
    ],
    ...overrides,
  }),
};

/**
 * Mock Firebase data
 */
export const MockFirebase = {
  // Mock user document
  userDoc: (overrides = {}) => ({
    id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
    phone: '(11) 98765-4321',
    role: 'patient',
    professional_id: 'prof-123',
    professional_name: 'Dr. Test',
    created_at: { seconds: 1640995200, nanoseconds: 0 },
    updated_at: { seconds: 1640995200, nanoseconds: 0 },
    ...overrides,
  }),

  // Mock exercise plan
  exercisePlanDoc: (overrides = {}) => ({
    id: 'plan-1',
    name: 'Plano Teste',
    status: 'active',
    exercises: [
      TestData.exercise(),
      TestData.exercise({ id: 'ex-2', name: 'Exercicio 2' }),
    ],
    created_at: { seconds: 1640995200, nanoseconds: 0 },
    ...overrides,
  }),

  // Mock appointment
  appointmentDoc: (overrides = {}) => ({
    id: 'apt-1',
    type: 'Avaliação',
    date: { seconds: 1640995200, nanoseconds: 0 },
    time: '10:00',
    status: 'scheduled',
    professional_name: 'Dr. Test',
    ...overrides,
  }),
};

/**
 * Mock async operations
 */
export const MockAsync = {
  delay: (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  success: async <T,>(data: T, delay: number = 100): Promise<T> => {
    await MockAsync.delay(delay);
    return data;
  },

  error: async (error: Error = new Error('Test error'), delay: number = 100): Promise<never> => {
    await MockAsync.delay(delay);
    throw error;
  },
};

/**
 * Test assertions
 */
export const Assertions = {
  assertElementExists: (getBy: any, container: any) => {
    try {
      const element = getBy(container);
      expect(element).toBeDefined();
    } catch (error) {
      throw new Error(`Element should exist: ${error}`);
    }
  },

  assertTextExists: (getByText: any, text: string) => {
    try {
      const element = getByText(text);
      expect(element).toBeDefined();
    } catch (error) {
      throw new Error(`Text "${text}" should exist: ${error}`);
    }
  },

  assertElementHasText: (element: any, text: string) => {
    try {
      const children = element.props.children;
      const textContent = typeof children === 'string' ? children : JSON.stringify(children);
      expect(textContent).toContain(text);
    } catch (error) {
      throw new Error(`Element should contain "${text}": ${error}`);
    }
  },

  assertElementContains: (container: any, text: string) => {
    try {
      expect(container).toHaveTextContent(text);
    } catch (error) {
      throw new Error(`Container should contain "${text}": ${error}`);
    }
  },
};

/**
 * Test helpers for navigation
 */
export const NavigationTestHelpers = {
  navigateBack: () => {
    // Mock navigation back
    log.info('TEST', 'Navigated back');
  },

  navigateTo: (screen: string, params?: any) => {
    // Mock navigation
    log.info('TEST', `Navigated to ${screen}`, params);
  },
};

/**
 * Clean up function for test teardown
 */
export async function cleanupTest(): Promise<void> {
  // Clean up any test data, mocks, etc.
  log.info('TEST', 'Test cleanup completed');
}

/**
 * Setup function for test suite
 */
export async function setupTest(): Promise<void> {
  // Set up test environment
  log.info('TEST', 'Test setup completed');
}

/**
 * Performance test helpers
 */
export const PerformanceTest = {
  measureRender: async (component: ReactElement, iterations: number = 10) => {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      render(component);
      const end = performance.now();
      times.push(end - start);
    }

    const average = times.reduce((sum, t) => sum + t, 0) / times.length;
    log.info('PERF_TEST', 'Render performance', { iterations, average, min: Math.min(...times), max: Math.max(...times) });

    return { average, times, min: Math.min(...times), max: Math.max(...times) };
  },
};

/**
 * Create mock store
 */
export function createMockStore(initialState?: any) {
  const state = initialState || {};

  return {
    getState: () => state,
    setState: (newState: any) => {
      Object.assign(state, newState);
    },
    reset: () => {
      Object.keys(state).forEach(key => delete state[key]);
    },
    subscribe: () => () => {}, // Mock subscription
  };
}
