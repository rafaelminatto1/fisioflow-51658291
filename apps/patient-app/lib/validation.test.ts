/**
 * Validation Utilities Tests
 */

import {
  validators,
  isValidEmail,
  getPasswordStrength,
  formatCPF,
  formatPhone,
} from './validation';

describe('Validation Utilities', () => {
  describe('validators.email', () => {
    it('should validate correct email addresses', () => {
      expect(validators.email('test@example.com')).toBeNull();
      expect(validators.email('user.name@domain.co.br')).toBeNull();
      expect(validators.email('valid+tag@example.com')).toBeNull();
    });

    it('should reject invalid email addresses', () => {
      expect(validators.email('invalid')).not.toBeNull();
      expect(validators.email('@example.com')).not.toBeNull();
      expect(validators.email('test@')).not.toBeNull();
      expect(validators.email('')).not.toBeNull();
    });
  });

  describe('validators.password', () => {
    it('should accept strong passwords', () => {
      expect(validators.password('SecureP@ss123')).toBeNull();
      expect(validators.password('MyStr0ng!Pwd')).toBeNull();
    });

    it('should reject weak passwords', () => {
      expect(validators.password('123')).not.toBeNull();
      expect(validators.password('short')).not.toBeNull();
      // Note: long lowercase passwords may pass the length check
      // but need to meet minimum score
      expect(validators.password('abc')).not.toBeNull();
    });
  });

  describe('validators.cpf', () => {
    it('should reject invalid CPFs', () => {
      expect(validators.cpf('111.111.111-11')).not.toBeNull();
      expect(validators.cpf('000.000.000-00')).not.toBeNull();
      expect(validators.cpf('123.456.789-00')).not.toBeNull();
      expect(validators.cpf('invalid')).not.toBeNull();
      expect(validators.cpf('123.456')).not.toBeNull();
    });

    it('should require CPF', () => {
      expect(validators.cpf('')).not.toBeNull();
    });
  });

  describe('validators.phone', () => {
    it('should accept valid Brazilian phone numbers', () => {
      expect(validators.phone('(11) 98765-4321')).toBeNull();
      expect(validators.phone('11987654321')).toBeNull();
      expect(validators.phone('(21) 1234-5678')).toBeNull();
    });

    it('should reject invalid phone numbers', () => {
      expect(validators.phone('123')).not.toBeNull();
      expect(validators.phone('')).not.toBeNull();
      // Phone with 10 digits but starting with 00 might still be valid format
      // Let's test truly invalid formats
      expect(validators.phone('12')).not.toBeNull();
      expect(validators.phone('123456789012')).not.toBeNull();
    });
  });

  describe('isValidEmail', () => {
    it('should validate email correctly', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('getPasswordStrength', () => {
    it('should calculate password strength correctly', () => {
      expect(getPasswordStrength('').score).toBe(0);
      expect(getPasswordStrength('abc').score).toBeLessThan(2);
      expect(getPasswordStrength('abc123').score).toBeLessThan(3);
      expect(getPasswordStrength('Abc123').score).toBeLessThan(4);
      expect(getPasswordStrength('Abc123!@#').score).toBeGreaterThanOrEqual(3);
    });

    it('should return correct label', () => {
      expect(getPasswordStrength('abc').label).toBe('Fraca');
      expect(getPasswordStrength('Abc123').label).toBe('Boa');
    });
  });

  describe('formatCPF', () => {
    it('should format CPF correctly', () => {
      expect(formatCPF('52998274725')).toBe('529.982.747-25');
      expect(formatCPF('529.982.747-25')).toBe('529.982.747-25');
    });

    it('should handle invalid CPF formatting', () => {
      expect(formatCPF('123')).toBe('123');
      expect(formatCPF('')).toBe('');
    });
  });

  describe('formatPhone', () => {
    it('should format phone numbers correctly', () => {
      expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
      expect(formatPhone('2112345678')).toBe('(21) 1234-5678');
    });

    it('should handle invalid phone formatting', () => {
      expect(formatPhone('123')).toBe('123');
      expect(formatPhone('')).toBe('');
    });
  });
});
