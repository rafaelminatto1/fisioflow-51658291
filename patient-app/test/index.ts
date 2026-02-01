/**
 * Test Utilities Index
 * Export all test helpers and mocks
 */

// Test utilities
export {
  renderWithProviders,
  wait,
  waitForElement,
  TestData,
  MockFirebase,
  MockAsync,
  Assertions,
  NavigationTestHelpers,
  cleanupTest,
  setupTest,
  PerformanceTest,
  createMockStore,
} from './utils/test-utils';

// Firebase mocks
export {
  setMockAuthUser,
  setMockAuthError,
  getMockAuthUser,
  setMockDocument,
  getMockDocument,
  clearMockFirestore,
  setMockQueryResults,
  getMockQueryResults,
  setMockUser,
  getMockUser,
  clearMockUsers,
  setMockExercisePlan,
  getMockExercisePlan,
  setMockAppointments,
  getMockAppointments,
  setMockEvolutions,
  getMockEvolutions,
  createMockUser,
  createMockDocSnapshot,
  createMockQuerySnapshot,
  mockNetworkDelay,
  mockNetworkError,
  resetAllMocks,
} from './mocks/firebase';
