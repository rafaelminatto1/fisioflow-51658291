/**
 * Firebase Mocks
 * Mock implementations for Firebase services
 */


/**
 * Mock Auth State
 */

import { Result } from '../../lib/async';

let mockAuthUser: any = null;
let mockAuthError: Error | null = null;

export function setMockAuthUser(user: any | null) {
  mockAuthUser = user;
}

export function setMockAuthError(error: Error | null) {
  mockAuthError = error;
}

export function getMockAuthUser() {
  return mockAuthUser;
}

/**
 * Mock Firestore Data
 */
const mockFirestoreData: Map<string, any> = new Map();

export function setMockDocument(collection: string, id: string, data: any) {
  mockFirestoreData.set(`${collection}/${id}`, data);
}

export function getMockDocument(collection: string, id: string): any {
  return mockFirestoreData.get(`${collection}/${id}`);
}

export function clearMockFirestore() {
  mockFirestoreData.clear();
}

/**
 * Mock Firestore Query Results
 */
const mockQueryResults: Map<string, any[]> = new Map();

export function setMockQueryResults(collection: string, results: any[]) {
  mockQueryResults.set(collection, results);
}

export function getMockQueryResults(collection: string): any[] {
  return mockQueryResults.get(collection) || [];
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
 * Helper to create a mock document snapshot
 */
export function createMockDocSnapshot<T>(data: T | null, id: string = 'doc-123') {
  return {
    id,
    exists: data !== null,
    data: () => data,
  };
}

/**
 * Helper to create a mock query snapshot
 */
export function createMockQuerySnapshot<T>(docs: T[]) {
  return {
    docs: docs.map((data, i) => createMockDocSnapshot(data, `doc-${i}`)),
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback: (doc: any) => void) => {
      docs.forEach((data, i) => callback(createMockDocSnapshot(data, `doc-${i}`)));
    },
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
  clearMockFirestore();
  clearMockUsers();
  mockExercisePlans.clear();
  mockAppointments.clear();
  mockEvolutions.clear();
  mockQueryResults.clear();
  setMockAuthUser(null);
  setMockAuthError(null);
}
