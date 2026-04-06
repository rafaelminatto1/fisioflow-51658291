/**
 * Platform mocks
 * Mock implementations for auth and data services.
 */


/**
 * Mock Auth State
 */


let mockAuthUser: any = null;
let _mockAuthError: Error | null = null;

export function setMockAuthUser(user: any | null) {
  mockAuthUser = user;
}

export function setMockAuthError(error: Error | null) {
  _mockAuthError = error;
}

export function getMockAuthUser() {
  return mockAuthUser;
}

/**
 * Mock User Data
 */
const mockUsers: Map<string, any> = new Map();

export function setMockUser(uid: string, userData: any) {
  mockUsers.set(uid, userData);
}

export function getMockUser(uid: string): any {
  return mockUsers.get(uid);
}

export function clearMockUsers() {
  mockUsers.clear();
}

/**
 * Mock Exercise Plans
 */
const mockExercisePlans: Map<string, any> = new Map();

export function setMockExercisePlan(userId: string, plan: any) {
  mockExercisePlans.set(userId, plan);
}

export function getMockExercisePlan(userId: string): any {
  return mockExercisePlans.get(userId);
}

/**
 * Mock Appointments
 */
const mockAppointments: Map<string, any[]> = new Map();

export function setMockAppointments(userId: string, appointments: any[]) {
  mockAppointments.set(userId, appointments);
}

export function getMockAppointments(userId: string): any[] {
  return mockAppointments.get(userId) || [];
}

/**
 * Mock Evolutions
 */
const mockEvolutions: Map<string, any[]> = new Map();

export function setMockEvolutions(userId: string, evolutions: any[]) {
  mockEvolutions.set(userId, evolutions);
}

export function getMockEvolutions(userId: string): any[] {
  return mockEvolutions.get(userId) || [];
}

/**
 * Helper to create a mock user
 */
export function createMockUser(overrides = {}) {
  return {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    emailVerified: true,
    ...overrides,
  };
}

/**
 * Helper to simulate network delay
 */
export async function mockNetworkDelay<T>(data: T, delay: number = 100): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), delay));
}

/**
 * Helper to simulate network error
 */
export async function mockNetworkError(message: string = 'Network error'): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), 100);
  });
}

/**
 * Reset all mocks
 */
export function resetAllMocks() {
  clearMockUsers();
  mockExercisePlans.clear();
  mockAppointments.clear();
  mockEvolutions.clear();
  setMockAuthUser(null);
  setMockAuthError(null);
}
