// Centralized validation utilities
import { z } from 'zod';

// ============= CPF Validation =============
export const cleanCPF = (cpf: string): string => cpf.replace(/\D/g, '');

export const validateCPFFormat = (cpf: string): boolean => {
  const cleaned = cleanCPF(cpf);
  if (cleaned.length !== 11) return false;
  
  // Reject sequences like 111.111.111-11
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  return true;
};

export const validateCPFDigits = (cpf: string): boolean => {
  const cleaned = cleanCPF(cpf);
  if (!validateCPFFormat(cpf)) return false;
  
  // Calculate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[9])) return false;
  
  // Calculate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[10])) return false;
  
  return true;
};

export const cpfSchema = z
  .string()
  .min(11, 'CPF deve ter 11 dígitos')
  .max(14, 'CPF inválido')
  .refine(validateCPFFormat, { message: 'CPF deve ter 11 dígitos numéricos' })
  .refine(validateCPFDigits, { message: 'CPF inválido' });

// ============= Email Validation =============
export const validateEmail = (email: string): boolean => {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email.trim());
};

export const emailSchema = z
  .string()
  .trim()
  .min(5, 'Email muito curto')
  .max(255, 'Email muito longo')
  .email('Email inválido');

// ============= Phone Validation =============
export const cleanPhone = (phone: string): string => phone.replace(/\D/g, '');

export const validatePhone = (phone: string): boolean => {
  const cleaned = cleanPhone(phone);
  // Brazilian phone: 10-11 digits (with area code)
  // International: 8-15 digits
  return cleaned.length >= 8 && cleaned.length <= 15;
};

export const formatPhone = (phone: string): string => {
  const cleaned = cleanPhone(phone);
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

export const phoneSchema = z
  .string()
  .min(8, 'Telefone muito curto')
  .max(20, 'Telefone muito longo')
  .refine(validatePhone, { message: 'Telefone inválido' });

// ============= Date Validation =============
export const validateDateRange = (start: Date, end: Date): boolean => {
  return start <= end;
};

export const validateFutureDate = (date: Date): boolean => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return date >= now;
};

// ============= Money Validation =============
export const validatePositiveAmount = (amount: number): boolean => {
  return amount > 0 && Number.isFinite(amount);
};

export const validateNonNegativeAmount = (amount: number): boolean => {
  return amount >= 0 && Number.isFinite(amount);
};

export const moneySchema = z
  .number()
  .nonnegative('Valor não pode ser negativo')
  .max(9999999.99, 'Valor muito alto');

// ============= Sanitization =============
/**
 * Sanitiza string removendo caracteres perigosos e limitando tamanho
 */
export const sanitizeString = (str: string, maxLength: number = 10000): string => {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .substring(0, maxLength)
    .replace(/[<>]/g, '') // Remove tags HTML básicas
    .replace(/javascript:/gi, '') // Remove protocolos javascript
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
};

/**
 * Sanitiza HTML escapando caracteres especiais
 */
export const sanitizeHtml = (str: string): string => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Sanitiza número de telefone removendo caracteres não numéricos
 */
export const sanitizePhone = (phone: string): string => {
  if (typeof phone !== 'string') return '';
  return phone.replace(/\D/g, '').substring(0, 20);
};

/**
 * Sanitiza email removendo caracteres perigosos
 */
export const sanitizeEmail = (email: string): string => {
  if (typeof email !== 'string') return '';
  return email
    .trim()
    .toLowerCase()
    .substring(0, 255)
    .replace(/[<>]/g, '');
};

// ============= Time Slot Validation =============
export const validateTimeSlot = (time: string): boolean => {
  const pattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return pattern.test(time);
};

export const timeSlotSchema = z
  .string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido (use HH:MM)');

// ============= UUID Validation =============
export const validateUUID = (uuid: string): boolean => {
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return pattern.test(uuid);
};

export const uuidSchema = z.string().uuid('ID inválido');
