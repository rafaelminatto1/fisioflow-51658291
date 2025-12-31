import { describe, it, expect } from 'vitest';
import { sanitizeString, sanitizeHtml, sanitizePhone, sanitizeEmail } from '../index';

describe('Sanitization Functions', () => {
  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  test  ')).toBe('test');
    });

    it('should limit string length', () => {
      const longString = 'a'.repeat(20000);
      const result = sanitizeString(longString, 10000);
      expect(result.length).toBeLessThanOrEqual(10000);
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeString('javascript:alert("xss")')).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      expect(sanitizeString('onclick=alert("xss")')).toBe('alert("xss")');
    });
  });

  describe('sanitizeHtml', () => {
    it('should escape HTML entities', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should escape quotes', () => {
      expect(sanitizeHtml('"test"')).toBe('&quot;test&quot;');
      expect(sanitizeHtml("'test'")).toBe('&#039;test&#039;');
    });

    it('should escape ampersands', () => {
      expect(sanitizeHtml('A & B')).toBe('A &amp; B');
    });
  });

  describe('sanitizePhone', () => {
    it('should remove non-numeric characters', () => {
      expect(sanitizePhone('(11) 99999-9999')).toBe('11999999999');
    });

    it('should limit phone length', () => {
      const longPhone = '1'.repeat(30);
      const result = sanitizePhone(longPhone);
      expect(result.length).toBeLessThanOrEqual(20);
    });

    it('should handle empty strings', () => {
      expect(sanitizePhone('')).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should trim and lowercase email', () => {
      expect(sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
    });

    it('should remove HTML tags', () => {
      expect(sanitizeEmail('test<script>@example.com')).toBe('testscript@example.com');
    });

    it('should limit email length', () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      const result = sanitizeEmail(longEmail);
      expect(result.length).toBeLessThanOrEqual(255);
    });
  });
});

