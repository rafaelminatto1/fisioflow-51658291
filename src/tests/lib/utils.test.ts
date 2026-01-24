/**
 * Utility Functions Tests
 *
 * Tests for src/lib/utils.ts
 *
 * @module tests/lib/utils
 */

import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatCurrency, formatPhone } from '@/lib/utils';

describe('cn (className utility)', () => {
  it('should merge class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('should handle Tailwind class conflicts', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('should handle undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('should handle empty input', () => {
    expect(cn()).toBe('');
  });
});

describe('formatDate', () => {
  it('should format date string correctly', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    expect(formatDate(date, 'dd/MM/yyyy')).toBe('15/01/2024');
  });

  it('should handle date string input', () => {
    expect(formatDate('2024-01-15', 'dd/MM/yyyy')).toBe('15/01/2024');
  });

  it('should handle invalid date', () => {
    expect(formatDate('invalid', 'dd/MM/yyyy')).toBe('Invalid Date');
  });

  it('should format with different patterns', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    expect(formatDate(date, 'MM/dd/yyyy')).toBe('01/15/2024');
    expect(formatDate(date, 'yyyy-MM-dd')).toBe('2024-01-15');
  });
});

describe('formatCurrency', () => {
  it('should format BRL currency', () => {
    expect(formatCurrency(150.5)).toBe('R$ 150,50');
  });

  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });

  it('should handle large numbers', () => {
    expect(formatCurrency(1500000)).toBe('R$ 1.500.000,00');
  });

  it('should handle decimal precision', () => {
    expect(formatCurrency(150.123, 3)).toBe('R$ 150,123');
  });

  it('should handle negative values', () => {
    expect(formatCurrency(-100)).toBe('R$ -100,00');
  });
});

describe('formatPhone', () => {
  it('should format Brazilian phone numbers', () => {
    expect(formatPhone('5511999999999')).toBe('(11) 99999-9999');
  });

  it('should handle landline numbers', () => {
    expect(formatPhone('551123456789')).toBe('(11) 23456-789');
  });

  it('should handle numbers without country code', () => {
    expect(formatPhone('11999999999')).toBe('(11) 99999-9999');
  });

  it('should handle invalid input', () => {
    expect(formatPhone('invalid')).toBe('invalid');
  });

  it('should handle empty string', () => {
    expect(formatPhone('')).toBe('');
  });
});
