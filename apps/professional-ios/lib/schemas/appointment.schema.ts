import { z } from 'zod';
import type { Appointment } from '@/types';

/**
 * Status do agendamento
 */
export const appointmentStatusSchema = z.enum([
  'agendado',
  'confirmado',
  'em_andamento',
  'concluido',
  'cancelado',
  'faltou',
], {
  errorMap: {
    invalid_type_error: 'Status inválido',
    required_error: 'Status é obrigatório',
  },
  description: 'Status atual do agendamento',
});

/**
 * Tipo de agendamento
 */
export const appointmentTypeSchema = z.enum([
  'consulta',
  'avaliação',
  'exercício',
  'retorno',
  'cirurgia',
], {
  errorMap: {
    invalid_type_error: 'Tipo inválido',
    required_error: 'Tipo é obrigatório',
  },
  description: 'Tipo de agendamento',
});

/**
 * Schema completo de agendamento
 */
export const appointmentSchema = z.object({
  id: z.string().uuid({
    errorMap: {
      invalid_string_error: 'ID deve ser um UUID válido',
    },
  }),
  patientId: z.string().uuid({
    errorMap: {
      invalid_string_error: 'ID do paciente deve ser um UUID válido',
    },
  }),
  patientName: z.string().min(1, 'Nome do paciente').max(100, {
    errorMap: {
      invalid_string_error: 'Nome do paciente deve ter entre 1 e 100 caracteres',
    },
  }),
  type: appointmentTypeSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    errorMap: {
      invalid_string_error: 'Data deve ter formato DD/MM/YYYY',
    },
  }),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d{2}$/, {
    errorMap: {
      invalid_string_error: 'Horário deve ter formato HH:mm',
    },
  }),
  status: appointmentStatusSchema.default('agendado'),
  room: z.string().optional(),
  notes: z.string().max(1000, {
    errorMap: {
      invalid_string_error: 'Notas devem ter até 1000 caracteres',
    },
  }).optional(),
  price: z.number().min(0).optional(),
  paymentStatus: z.enum(['pendente', 'pago', 'cancelado']).default('pendente'),
  videoCallUrl: z.string().url().optional(),
  createdAt: z.string().or(z.coerce.date(), z.literal('')),
  updatedAt: z.string().or(z.coerce.date(), z.literal('')),
  syncStatus: z.enum(['synced', 'pending', 'conflict']).default('synced'),
}, {
  errorMap: (issue, ctx) => {
    if (issue.code === 'invalid_type' && ctx.path === 'date') {
      return { ...issue, message: 'Data inválida: deve ter formato DD/MM/YYYY' };
    }
    if (issue.code === 'invalid_type' && ctx.path === 'time') {
      return { ...issue, message: 'Horário inválido: deve ter formato HH:mm' };
    }
    return { message: issue.message || 'Erro de validação' };
  },
});

/**
 * Schema para criação de agendamento
 */
export const createAppointmentSchema = z.object({
  patientId: z.string().uuid({
    errorMap: {
      invalid_string_error: 'ID do paciente deve ser um UUID válido',
    },
  }),
  type: appointmentTypeSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    errorMap: {
      invalid_string_error: 'Data deve ter formato DD/MM/YYYY',
    },
  }),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d{2}$/, {
    errorMap: {
      invalid_string_error: 'Horário deve ter formato HH:mm',
    },
  }),
  room: z.string().optional(),
  notes: z.string().max(1000, {
    errorMap: {
      invalid_string_error: 'Notas devem ter até 1000 caracteres',
    },
  }).optional(),
  price: z.number().min(0).optional(),
});

/**
 * Schema para atualização de agendamento
 */
export const updateAppointmentSchema = z.object({
  id: z.string().uuid().optional(),
  patientId: z.string().uuid(),
  type: appointmentTypeSchema.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    errorMap: {
      invalid_string_error: 'Data deve ter formato DD/MM/YYYY',
    },
  }).optional(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d{2}$/, {
    errorMap: {
      invalid_string_error: 'Horário deve ter formato HH:mm',
    },
  }).optional(),
  room: z.string().optional(),
  status: appointmentStatusSchema.optional(),
  notes: z.string().max(1000).optional(),
  price: z.number().min(0).optional(),
  paymentStatus: z.enum(['pendente', 'pago', 'cancelado']).optional(),
});

/**
 * Type exports para uso em outras partes do código
 */
export type AppointmentCreate = z.infer<typeof createAppointmentSchema>;
export type AppointmentUpdate = z.infer<typeof updateAppointmentSchema>;
export type Appointment = z.infer<typeof appointmentSchema>;
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;
export type AppointmentType = z.infer<typeof appointmentTypeSchema>;
