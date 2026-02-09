/**
 * API Validation Schemas Tests
 *
 * @description
 * Tests for Zod validation schemas.
 */

import { describe, it, expect } from 'vitest';

import {
  commonSchemas,
  patientSchemas,
  appointmentSchemas,
  exerciseSchemas,
  financialSchemas,
  userSchemas,
  soapSchemas,
} from '@/lib/validations/api';
import {
  validateOrNull,
  validateOrDefault,
  validateOrThrow,
  validateArray,
  validateWithErrors,
} from '@/lib/validation-utils';

describe('commonSchemas', () => {
  describe('entityId', () => {
    const schema = commonSchemas.entityId;

    it('should accept valid IDs', () => {
      expect(() => schema.parse('abc123')).not.toThrow();
      expect(() => schema.parse('user-123')).not.toThrow();
      expect(() => schema.parse('123')).not.toThrow();
    });

    it('should reject empty strings', () => {
      expect(() => schema.parse('')).toThrow();
      expect(() => schema.parse('   ')).toThrow();
    });
  });

  describe('email', () => {
    const schema = commonSchemas.email;

    it('should accept valid emails', () => {
      expect(() => schema.parse('test@example.com')).not.toThrow();
      expect(() => schema.parse('user.name+tag@domain.co')).not.toThrow();
    });

    it('should reject invalid emails', () => {
      expect(() => schema.parse('invalid')).toThrow();
      expect(() => schema.parse('@example.com')).toThrow();
      expect(() => schema.parse('test@')).toThrow();
    });
  });

  describe('phone', () => {
    const schema = commonSchemas.phone;

    it('should accept valid phone numbers', () => {
      expect(() => schema.parse('(11) 98765-4321')).not.toThrow();
      expect(() => schema.parse('11987654321')).not.toThrow();
      expect(() => schema.parse('+55 11 98765-4321')).not.toThrow();
    });

    it('should reject invalid phone numbers', () => {
      expect(() => schema.parse('123')).toThrow();
      expect(() => schema.parse('abc')).toThrow();
    });
  });

  describe('isoDate', () => {
    const schema = commonSchemas.isoDate;

    it('should accept valid ISO dates', () => {
      expect(() => schema.parse('2025-01-29T10:00:00Z')).not.toThrow();
      expect(() => schema.parse('2025-01-29T10:00:00.000Z')).not.toThrow();
    });

    it('should reject invalid dates', () => {
      expect(() => schema.parse('not-a-date')).toThrow();
      expect(() => schema.parse('2025-13-01')).toThrow();
    });
  });

  describe('paginationParams', () => {
    const schema = commonSchemas.paginationParams;

    it('should accept valid pagination params', () => {
      expect(() => schema.parse({ page: 1, limit: 10 })).not.toThrow();
      expect(() => schema.parse({ offset: 20 })).not.toThrow();
      expect(() => schema.parse({})).not.toThrow();
    });

    it('should reject invalid params', () => {
      expect(() => schema.parse({ page: 0 })).toThrow();
      expect(() => schema.parse({ limit: 0 })).toThrow();
      expect(() => schema.parse({ limit: 101 })).toThrow();
      expect(() => schema.parse({ offset: -1 })).toThrow();
    });
  });
});

describe('patientSchemas', () => {
  const validPatient = {
    id: 'patient-123',
    name: 'João Silva',
    full_name: 'João Silva',
    email: 'joao@example.com',
    phone: '(11) 98765-4321',
    cpf: '123.456.789-00',
    birthDate: '1990-01-01T00:00:00Z',
    gender: 'masculino',
    mainCondition: 'Lombalgia',
    status: 'Em Tratamento',
    progress: 50,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  describe('base', () => {
    const schema = patientSchemas.base;

    it('should accept valid patient data', () => {
      const result = schema.safeParse(validPatient);
      expect(result.success).toBe(true);
    });

    it('should require required fields', () => {
      const invalid = { ...validPatient, name: '' };
      const result = schema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const minimal = {
        id: 'patient-123',
        name: 'Maria Santos',
        birthDate: '1995-05-15T00:00:00Z',
        gender: 'feminino',
        mainCondition: 'Cervicalgia',
        status: 'Inicial',
        progress: 0,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };
      const result = schema.safeParse(minimal);
      expect(result.success).toBe(true);
    });
  });

  describe('listItem', () => {
    const schema = patientSchemas.listItem;

    it('should accept valid list item', () => {
      const item = {
        id: 'patient-123',
        name: 'João Silva',
        phone: '(11) 98765-4321',
        mainCondition: 'Lombalgia',
        status: 'Em Tratamento',
        progress: 50,
      };
      const result = schema.safeParse(item);
      expect(result.success).toBe(true);
    });
  });
});

describe('appointmentSchemas', () => {
  describe('status', () => {
    const schema = appointmentSchemas.status;

    it('should accept all valid status values', () => {
      const validStatuses = [
        'agendado', 'confirmado', 'em_atendimento', 'concluido',
        'cancelado', 'nao_compareceu', 'remarcado', 'Confirmado',
        'Pendente', 'Reagendado', 'Cancelado', 'Realizado'
      ];

      validStatuses.forEach(status => {
        expect(() => schema.parse(status)).not.toThrow();
      });
    });
  });

  describe('base', () => {
    const schema = appointmentSchemas.base;

    it('should accept valid appointment', () => {
      const appointment = {
        id: 'apt-123',
        patientId: 'patient-123',
        patientName: 'João Silva',
        date: '2025-01-29',
        time: '10:00',
        duration: 60,
        type: 'Fisioterapia',
        status: 'confirmado',
      };

      const result = schema.safeParse(appointment);
      expect(result.success).toBe(true);
    });
  });

  describe('formData', () => {
    const schema = appointmentSchemas.formData;

    it('should accept valid form data', () => {
      const formData = {
        patientId: 'patient-123',
        date: '2025-01-29',
        time: '10:00',
        duration: 60,
        type: 'Fisioterapia',
      };

      const result = schema.safeParse(formData);
      expect(result.success).toBe(true);
    });

    it('should require patientId', () => {
      const invalid = {
        date: '2025-01-29',
        time: '10:00',
        duration: 60,
        type: 'Fisioterapia',
      };

      const result = schema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});

describe('validation utilities', () => {
  describe('validateOrNull', () => {
    it('should return parsed data on success', () => {
      const schema = commonSchemas.entityId;
      const result = validateOrNull(schema, 'valid-id');
      expect(result).toBe('valid-id');
    });

    it('should return null on failure', () => {
      const schema = commonSchemas.entityId;
      const result = validateOrNull(schema, '');
      expect(result).toBeNull();
    });
  });

  describe('validateOrDefault', () => {
    it('should return parsed data on success', () => {
      const schema = commonSchemas.entityId;
      const result = validateOrDefault(schema, 'valid-id', 'default-id');
      expect(result).toBe('valid-id');
    });

    it('should return default value on failure', () => {
      const schema = commonSchemas.entityId;
      const result = validateOrDefault(schema, '', 'default-id');
      expect(result).toBe('default-id');
    });
  });

  describe('validateOrThrow', () => {
    it('should return parsed data on success', () => {
      const schema = commonSchemas.entityId;
      const result = validateOrThrow(schema, 'valid-id');
      expect(result).toBe('valid-id');
    });

    it('should throw on failure', () => {
      const schema = commonSchemas.entityId;
      expect(() => validateOrThrow(schema, '')).toThrow();
    });
  });

  describe('validateArray', () => {
    it('should filter out invalid items', () => {
      const schema = commonSchemas.entityId;
      const items = ['valid-1', '', 'valid-2', '   ', 'valid-3'];
      const result = validateArray(schema, items);

      expect(result).toEqual(['valid-1', 'valid-2', 'valid-3']);
    });

    it('should return empty array if all items are invalid', () => {
      const schema = commonSchemas.entityId;
      const items = ['', '', ''];
      const result = validateArray(schema, items);

      expect(result).toEqual([]);
    });
  });

  describe('validateWithErrors', () => {
    it('should return data and empty errors on success', () => {
      const schema = commonSchemas.entityId;
      const result = validateWithErrors(schema, 'valid-id');

      expect(result.data).toBe('valid-id');
      expect(result.errors).toEqual([]);
    });

    it('should return null data and error messages on failure', () => {
      const schema = commonSchemas.entityId;
      const result = validateWithErrors(schema, '');

      expect(result.data).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('userSchemas', () => {
  describe('role', () => {
    const schema = userSchemas.role;

    it('should accept all valid roles', () => {
      const roles = ['admin', 'fisioterapeuta', 'estagiario', 'recepcionista', 'paciente', 'owner'];

      roles.forEach(role => {
        expect(() => schema.parse(role)).not.toThrow();
      });
    });

    it('should reject invalid role', () => {
      expect(() => schema.parse('invalid')).toThrow();
    });
  });
});

describe('soapSchemas', () => {
  describe('base', () => {
    const schema = soapSchemas.base;

    it('should accept valid SOAP record', () => {
      const soap = {
        id: 'soap-123',
        patientId: 'patient-123',
        sessionNumber: 1,
        subjective: 'Patient reports pain',
        assessment: 'Lumbar strain',
        plan: { shortTermGoals: ['Reduce pain'] },
        createdBy: 'user-123',
        createdAt: '2025-01-29T10:00:00Z',
        updatedAt: '2025-01-29T10:00:00Z',
      };

      const result = schema.safeParse(soap);
      expect(result.success).toBe(true);
    });

    it('should accept nested objects', () => {
      const soap = {
        id: 'soap-123',
        patientId: 'patient-123',
        sessionNumber: 1,
        subjective: 'Patient reports pain',
        objective: {
          inspection: 'Normal gait',
          palpation: 'Tenderness in lumbar region',
        },
        assessment: 'Lumbar strain',
        plan: {
          interventions: ['Manual therapy', 'Exercises'],
          frequency: '2x/week',
        },
        createdBy: 'user-123',
        createdAt: '2025-01-29T10:00:00Z',
        updatedAt: '2025-01-29T10:00:00Z',
      };

      const result = schema.safeParse(soap);
      expect(result.success).toBe(true);
    });
  });
});
