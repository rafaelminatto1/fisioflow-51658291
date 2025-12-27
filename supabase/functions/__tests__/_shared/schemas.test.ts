import { describe, it, expect } from 'vitest';
import {
  patientCreateSchema,
  patientUpdateSchema,
  appointmentCreateSchema,
  appointmentUpdateSchema,
  validateSchema,
} from '../../_shared/schemas.ts';

describe('Schemas Validation', () => {
  describe('patientCreateSchema', () => {
    it('should validate correct patient data', () => {
      const validData = {
        name: 'João Silva',
        cpf: '12345678901',
        phone: '11999999999',
        email: 'joao@example.com',
        birth_date: '1990-01-01',
        gender: 'M' as const,
      };

      const result = patientCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        name: 'João Silva',
        cpf: '12345678901',
        phone: '11999999999',
        email: 'invalid-email',
        birth_date: '1990-01-01',
      };

      const result = patientCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email');
      }
    });

    it('should reject invalid CPF format', () => {
      const invalidData = {
        name: 'João Silva',
        cpf: '123', // CPF deve ter 11 dígitos
        phone: '11999999999',
        email: 'joao@example.com',
        birth_date: '1990-01-01',
      };

      const result = patientCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const dataWithOptional = {
        name: 'João Silva',
        cpf: '12345678901',
        phone: '11999999999',
        email: 'joao@example.com',
        birth_date: '1990-01-01',
        address: {
          street: 'Rua Teste',
          number: '123',
          city: 'São Paulo',
        },
        emergency_contact: {
          name: 'Maria Silva',
          phone: '11988888888',
        },
      };

      const result = patientCreateSchema.safeParse(dataWithOptional);
      expect(result.success).toBe(true);
    });
  });

  describe('patientUpdateSchema', () => {
    it('should allow partial updates', () => {
      const partialData = {
        name: 'João Silva Updated',
      };

      const result = patientUpdateSchema.safeParse(partialData);
      expect(result.success).toBe(true);
    });

    it('should allow empty object', () => {
      const result = patientUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('appointmentCreateSchema', () => {
    it('should validate correct appointment data', () => {
      const validData = {
        patient_id: '550e8400-e29b-41d4-a716-446655440000',
        therapist_id: '550e8400-e29b-41d4-a716-446655440001',
        start_time: '2024-01-15T14:00:00Z',
        duration: 60,
      };

      const result = appointmentCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid duration', () => {
      const invalidData = {
        patient_id: '550e8400-e29b-41d4-a716-446655440000',
        start_time: '2024-01-15T14:00:00Z',
        duration: 45, // Deve ser 30, 60 ou 90
      };

      const result = appointmentCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        patient_id: 'invalid-uuid',
        start_time: '2024-01-15T14:00:00Z',
        duration: 60,
      };

      const result = appointmentCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('validateSchema helper', () => {
    it('should return success for valid data', () => {
      const validData = {
        name: 'João Silva',
        cpf: '12345678901',
        phone: '11999999999',
        email: 'joao@example.com',
        birth_date: '1990-01-01',
      };

      const result = validateSchema(patientCreateSchema, validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should return error message for invalid data', () => {
      const invalidData = {
        name: 'João Silva',
        cpf: '123', // Inválido
        phone: '11999999999',
        email: 'joao@example.com',
        birth_date: '1990-01-01',
      };

      const result = validateSchema(patientCreateSchema, invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
        expect(typeof result.error).toBe('string');
      }
    });
  });
});

