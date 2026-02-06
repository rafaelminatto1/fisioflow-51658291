/**
 * Common Types Tests
 *
 * @description
 * Tests for type definitions and utility functions.
 */

import { describe, it, expect } from 'vitest';

  getErrorMessage,
  asError,
  generateId,
  useDebouncedCallback,
} from '../..';

// Note: Since these are type definitions, we test the runtime functions
// Type safety is enforced by TypeScript at compile time

describe('getErrorMessage', () => {
  it('should extract message from Error instance', () => {
    const error = new Error('Test error');
    expect(getErrorMessage(error)).toBe('Test error');
  });

  it('should return string as-is', () => {
    expect(getErrorMessage('Plain string')).toBe('Plain string');
  });

  it('should extract message from error object', () => {
    const error = { message: 'Object error message' };
    expect(getErrorMessage(error)).toBe('Object error message');
  });

  it('should return default message for unknown error', () => {
    expect(getErrorMessage(null)).toBe('An unknown error occurred');
    expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
    expect(getErrorMessage(123)).toBe('An unknown error occurred');
  });
});

describe('asError', () => {
  it('should return Error instance as-is', () => {
    const error = new Error('Test');
    expect(asError(error)).toBe(error);
  });

  it('should convert string to Error', () => {
    const error = asError('String error');
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('String error');
  });

  it('should convert error object to Error', () => {
    const error = asError({ message: 'Object error' });
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('Object error');
  });

  it('should return null for unconvertible values', () => {
    expect(asError(null)).toBeNull();
    expect(asError(123)).toBeNull();
    expect(asError(true)).toBeNull();
  });
});

describe('generateId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateId('test');
    const id2 = generateId('test');

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^test-\d+$/);
    expect(id2).toMatch(/^test-\d+$/);
  });

  it('should use custom prefix', () => {
    const id = generateId('custom');
    expect(id).toMatch(/^custom-\d+$/);
  });

  it('should use default prefix if not provided', () => {
    const id = generateId();
    expect(id).toMatch(/^id-\d+$/);
  });
});
