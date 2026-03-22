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
  MockAsync,
  Assertions,
  NavigationTestHelpers,
  cleanupTest,
  setupTest,
  PerformanceTest,
  createMockStore,
} from './utils/test-utils';

// Platform mocks
export {
  setMockAuthUser,
  setMockAuthError,
  getMockAuthUser,
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
  mockNetworkDelay,
  mockNetworkError,
  resetAllMocks,
} from './mocks/platform';
