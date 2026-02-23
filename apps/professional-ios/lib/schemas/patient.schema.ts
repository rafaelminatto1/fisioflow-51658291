import { z } from 'zod';
import type { Patient } from '@/types';

/**
 * Status do paciente
 */
export const patientStatusSchema = z.enum([
  'Em Tratamento',
  'Recuperação',
  'Inicial',
  'Concluído',
], {
  errorMap: {
    invalid_type_error: 'Status inválido',
    required_error: 'Status é obrigatório',
  },
  description: 'Status atual do paciente no tratamento',
});

/**
 * Schema completo de paciente
 */
export const patientSchema = z.object({
  id: z.string().uuid({
    errorMap: {
      invalid_string_error: 'ID deve ser um UUID válido',
    },
  }),
  name: z.string().min(1, 'Nome completo').max(100, {
    errorMap: {
      invalid_string_error: 'Nome deve ter entre 1 e 100 caracteres',
    },
  }),
  email: z.string().email({
    errorMap: {
      invalid_string_error: 'Email inválido',
    },
  }).optional(),
  phone: z.string()
    .regex(/^\d{11}$/, {
      errorMap: {
        invalid_string_error: 'Telefone deve ter 11 dígitos (DDD + número)',
      },
    })
    .optional(),
  dateOfBirth: z.coerce.date({
    errorMap: {
      invalid_date_error: 'Data de nascimento inválida',
    },
  }).optional(),
  cpf: z.string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
      errorMap: {
        invalid_string_error: 'CPF deve ter formato XXX.XXX.XXX-XX',
      },
    })
    .optional(),
  status: patientStatusSchema.default('Em Tratamento'),
  mainCondition: z.string().max(200, {
    errorMap: {
      invalid_string_error: 'Condição principal deve ter até 200 caracteres',
    },
  }).optional(),
  photoUrl: z.string().url({
    errorMap: {
      invalid_string_error: 'URL da foto inválida',
    },
  }).optional(),
  progress: z.number().min(0).max(100).int({
    errorMap: {
      invalid_type_error: 'Progresso deve ser um número inteiro entre 0 e 100',
    },
  }).default(0),
  createdAt: z.string().or(z.coerce.date(), z.literal('')),
  updatedAt: z.string().or(z.coerce.date(), z.literal('')),
  nextAppointment: z.coerce.date().optional(),
  lastVisit: z.coerce.date().optional(),
  notes: z.string().max(1000, {
    errorMap: {
      invalid_string_error: 'Observações devem ter até 1000 caracteres',
    },
  }).optional(),
  active: z.boolean().default(true),
  emergencyContact: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  medications: z.array(z.object({
    name: z.string(),
    dosage: z.string().optional(),
    frequency: z.string().optional(),
  })).optional(),
}, {
  errorMap: (issue, ctx) => {
    if (issue.code === 'invalid_type' && ctx.path === 'phone') {
      return { ...issue, message: 'Telefone inválido: deve ter 11 dígitos (DDD + número)' };
    }
    return { message: issue.message || 'Erro de validação' };
  },
});

/**
 * Schema simplificado para criação de paciente
 * Menos campos para formulários de criação
 */
export const createPatientSchema = z.object({
  name: z.string().min(1, 'Nome completo').max(100, {
    errorMap: {
      invalid_string_error: 'Nome deve ter entre 1 e 100 caracteres',
    },
  }),
  email: z.string().email({
    errorMap: {
      invalid_string_error: 'Email inválido',
    },
  }).optional(),
  phone: z.string()
    .regex(/^\d{11}$/, {
      errorMap: {
        invalid_string_error: 'Telefone deve ter 11 dígitos (DDD + número)',
      },
    })
    .optional(),
  dateOfBirth: z.coerce.date({
    errorMap: {
      invalid_date_error: 'Data de nascimento inválida',
    },
  }),
  cpf: z.string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
      errorMap: {
        invalid_string_error: 'CPF deve ter formato XXX.XXX.XXX-XX',
      },
    })
    .optional(),
  mainCondition: z.string().max(200, {
    errorMap: {
      invalid_string_error: 'Condição principal deve ter até 200 caracteres',
    },
  }).optional(),
  notes: z.string().max(500, {
    errorMap: {
      invalid_string_error: 'Notas devem ter até 500 caracteres',
    },
  }).optional(),
}, {
  errorMap: (issue, ctx) => {
    if (issue.code === 'invalid_type' && ctx.path === 'phone') {
      return { ...issue, message: 'Telefone inválido: deve ter 11 dígitos (DDD + número)' };
    }
    return { message: issue.message || 'Erro de validação' };
  },
});

/**
 * Schema para atualização de paciente
 */
export const updatePatientSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Nome completo').max(100, {
    errorMap: {
      invalid_string_error: 'Nome deve ter entre 1 e 100 caracteres',
    },
  }).optional(),
  email: z.string().email({
    errorMap: {
      invalid_string_error: 'Email inválido',
    },
  }).optional(),
  phone: z.string()
    .regex(/^\d{11}$/, {
      errorMap: {
        invalid_string_error: 'Telefone deve ter 11 dígitos (DDD + número)',
      },
    })
    .optional(),
  status: patientStatusSchema.default('Em Tratamento').optional(),
  mainCondition: z.string().max(200, {
    errorMap: {
      invalid_string_error: 'Condição principal deve ter até 200 caracteres',
    },
  }).optional(),
  photoUrl: z.string().url({
    errorMap: {
      invalid_string_error: 'URL da foto inválida',
    },
  }).optional(),
  progress: z.number().min(0).max(100).int({
    errorMap: {
      invalid_type_error: 'Progresso deve ser um número inteiro entre 0 e 100',
    },
  }).optional(),
  nextAppointment: z.coerce.date().optional(),
  notes: z.string().max(1000, {
    errorMap: {
      invalid_string_error: 'Observações devem ter até 1000 caracteres',
    },
  }).optional(),
  active: z.boolean().optional(),
  emergencyContact: z.string().optional(),
  lastVisit: z.coerce.date().optional(),
});

/**
 * Type exports para uso em outras partes do código
 */
export type PatientCreate = z.infer<typeof createPatientSchema>;
export type PatientUpdate = z.infer<typeof updatePatientSchema>;
export type Patient = z.infer<typeof patientSchema>;
export type PatientStatus = z.infer<typeof patientStatusSchema>;
