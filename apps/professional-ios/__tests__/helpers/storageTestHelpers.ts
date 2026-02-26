import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { expect } from 'vitest';

export const getAuthedStorage = (testEnv: RulesTestEnvironment, userId: string) =>
  testEnv.authenticatedContext(userId, { sub: userId }).storage();

export const assertStorageFails = async (promise: Promise<unknown>) => {
  let error: any = null;
  try {
    await promise;
  } catch (err) {
    error = err;
  }
  expect(error).toBeTruthy();
  const code = error?.code || error?.message;
  const normalized = String(code || '');
  const allowed = ['storage/unauthorized', 'storage/unknown', 'permission-denied'];
  expect(allowed.some((entry) => normalized.includes(entry))).toBe(true);
};
