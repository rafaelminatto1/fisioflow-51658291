import { describe, it, expect } from 'vitest';
import {
  parseBrazilianDate,
  parseDateFlexible,
  stripNonDigits,
  formatCPF,
  formatPhone,
  isValidCPF,
  isValidPhone,
  isValidEmail,
  sanitizeString,
  isValidName
} from '../validators';

describe('validators.ts', () => {
  describe('parseBrazilianDate', () => {
    it('should parse a valid brazilian date', () => {
      const date = parseBrazilianDate('15/08/2023');
      expect(date).toBeInstanceOf(Date);
      expect(date?.getFullYear()).toBe(2023);
      expect(date?.getMonth()).toBe(7); // August is 7 (0-indexed)
      expect(date?.getDate()).toBe(15);
    });

    it('should return null for invalid date strings', () => {
      expect(parseBrazilianDate('')).toBeNull();
      expect(parseBrazilianDate('invalid')).toBeNull();
      expect(parseBrazilianDate('15-08-2023')).toBeNull(); // Wrong separator
    });

    it('should return null for invalid dates (e.g. 31/02/2023)', () => {
      expect(parseBrazilianDate('31/02/2023')).toBeNull();
      expect(parseBrazilianDate('32/01/2023')).toBeNull();
      expect(parseBrazilianDate('15/13/2023')).toBeNull();
    });

    it('should return null for out of range years', () => {
      expect(parseBrazilianDate('15/08/1899')).toBeNull();
      expect(parseBrazilianDate('15/08/2101')).toBeNull();
    });
  });

  describe('parseDateFlexible', () => {
    it('should parse brazilian date format', () => {
      const date = parseDateFlexible('15/08/2023');
      expect(date?.getFullYear()).toBe(2023);
    });

    it('should parse ISO date format', () => {
      const date = parseDateFlexible('2023-08-15T00:00:00Z');
      expect(date?.getFullYear()).toBe(2023);
      // Depending on timezone it might be 14 or 15, we just check it parses successfully
      expect(date).toBeInstanceOf(Date);
    });

    it('should return null for invalid inputs', () => {
      expect(parseDateFlexible('')).toBeNull();
      expect(parseDateFlexible('invalid-date')).toBeNull();
    });
  });

  describe('stripNonDigits', () => {
    it('should keep only digits', () => {
      expect(stripNonDigits('123.456.789-00')).toBe('12345678900');
      expect(stripNonDigits('(11) 98765-4321')).toBe('11987654321');
      expect(stripNonDigits('abc123def')).toBe('123');
    });
  });

  describe('formatCPF', () => {
    it('should format 11 digits correctly', () => {
      expect(formatCPF('12345678900')).toBe('123.456.789-00');
    });

    it('should handle already formatted strings', () => {
      expect(formatCPF('123.456.789-00')).toBe('123.456.789-00');
    });

    it('should return the unformatted string if not 11 digits', () => {
      expect(formatCPF('123456')).toBe('123456');
    });
  });

  describe('formatPhone', () => {
    it('should format 11 digit cellphone correctly', () => {
      expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
    });

    it('should format 10 digit landline correctly', () => {
      expect(formatPhone('1133334444')).toBe('(11) 3333-4444');
    });

    it('should handle already formatted phones', () => {
      expect(formatPhone('(11) 98765-4321')).toBe('(11) 98765-4321');
    });

    it('should return unformatted string if not 10 or 11 digits', () => {
      expect(formatPhone('12345')).toBe('12345');
    });
  });

  describe('isValidCPF', () => {
    it('should validate correct CPFs', () => {
      // Validating actual calculation (this one actually passes the check in the code)
      // I'll leave the test that expects true for 12345678909 just in case it is a valid CPF from the logic
      expect(isValidCPF('12345678909')).toBe(true);
      // let's use a known valid one: 52998224725
      expect(isValidCPF('52998224725')).toBe(true);
    });

    it('should invalidate incorrect CPFs', () => {
      expect(isValidCPF('11111111111')).toBe(false); // Repeated digits
      expect(isValidCPF('12345678900')).toBe(false); // Invalid calculation
      expect(isValidCPF('123456789')).toBe(false); // Wrong length
    });
  });

  describe('isValidPhone', () => {
    it('should validate valid phones (10 or 11 digits, DDD >= 11)', () => {
      expect(isValidPhone('11987654321')).toBe(true); // SP Cellphone
      expect(isValidPhone('2133334444')).toBe(true); // RJ Landline
    });

    it('should invalidate wrong length or invalid DDD', () => {
      expect(isValidPhone('10987654321')).toBe(false); // Invalid DDD < 11
      expect(isValidPhone('1198765')).toBe(false); // Wrong length
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    it('should invalidate incorrect emails', () => {
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@example')).toBe(false); // Missing TLD
      expect(isValidEmail('test@example.c')).toBe(false); // TLD too short
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should sanitize HTML strings', () => {
      // This relies on the DOM, let's see if JSDOM is working
      expect(sanitizeString('<div>Hello</div>')).toBe('&lt;div&gt;Hello&lt;/div&gt;');
      expect(sanitizeString('Normal text')).toBe('Normal text');
    });
  });

  describe('isValidName', () => {
    it('should validate names with at least two words of 2+ characters', () => {
      expect(isValidName('João Silva')).toBe(true);
      expect(isValidName('Maria de Souza')).toBe(true);
      expect(isValidName('Ana Li')).toBe(true);
    });

    it('should invalidate names with only one word or too short words', () => {
      expect(isValidName('João')).toBe(false);
      expect(isValidName('A B')).toBe(false);
      expect(isValidName('A Silva')).toBe(false); // "A" is too short to count as one of the two needed
    });
  });
});
