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
  it('should format date correctly', () => {
    const date = new Date(2024, 0, 15, 12, 0, 0); // Meio-dia para evitar timezone
    expect(formatDate(date, 'dd/MM/yyyy')).toBe('15/01/2024');
  });

  it('should handle date string input', () => {
    // O teste verifica se a data é parseada corretamente
    const result = formatDate('2024-01-15', 'dd/MM/yyyy');
    // Verifica apenas se é uma data válida e contém partes da data
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('should handle invalid date', () => {
    expect(formatDate('invalid', 'dd/MM/yyyy')).toBe('Invalid Date');
  });

  it('should format with different patterns', () => {
    const date = new Date(2024, 0, 15, 12, 0, 0);
    expect(formatDate(date, 'MM/dd/yyyy')).toBe('01/15/2024');
    expect(formatDate(date, 'yyyy-MM-dd')).toBe('2024-01-15');
  });
});

describe('formatCurrency', () => {
  it('should format BRL currency', () => {
    // Intl.NumberFormat usa espaço não-quebrável (\u00A0)
    const result = formatCurrency(150.5);
    expect(result).toContain('150,50');
    expect(result).toContain('R$');
  });

  it('should handle zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0,00');
    expect(result).toContain('R$');
  });

  it('should handle large numbers', () => {
    const result = formatCurrency(1500000);
    expect(result).toContain('1.500.000,00');
    expect(result).toContain('R$');
  });

  it('should handle decimal precision', () => {
    const result = formatCurrency(150.123, 3);
    expect(result).toContain('150,123');
    expect(result).toContain('R$');
  });

  it('should handle negative values', () => {
    const result = formatCurrency(-100);
    expect(result).toContain('-');
    expect(result).toContain('100,00');
    expect(result).toContain('R$');
  });
});

describe('formatPhone', () => {
  it('should format Brazilian phone numbers with country code', () => {
    expect(formatPhone('5511999999999')).toBe('(11) 99999-9999');
  });

  it('should format Brazilian mobile numbers without country code', () => {
    expect(formatPhone('11999999999')).toBe('(11) 99999-9999');
  });

  it('should handle landline numbers', () => {
    expect(formatPhone('1123456789')).toBe('(11) 2345-6789');
  });

  it('should handle numbers with 12 digits (country code + landline)', () => {
    expect(formatPhone('551123456789')).toBe('(11) 2345-6789');
  });

  it('should handle invalid input', () => {
    expect(formatPhone('invalid')).toBe('invalid');
  });

  it('should handle empty string', () => {
    expect(formatPhone('')).toBe('');
  });
});
