import { z } from 'zod';

const timeRegex = /^\d{2}:\d{2}$/;

export const eventoContratadoCreateSchema = z.object({
  evento_id: z.string().min(1, 'ID do evento inválido'),
  contratado_id: z.string().min(1, 'ID do contratado inválido'),
  funcao: z.string().max(100, 'Função muito longa').optional().or(z.literal('')),
  valor_acordado: z
    .number({ invalid_type_error: 'Valor deve ser um número' })
    .nonnegative('Valor não pode ser negativo')
    .max(999999.99, 'Valor muito alto')
    .default(0),
  horario_inicio: z.string().regex(timeRegex, 'Horário inválido (use HH:MM)'),
  horario_fim: z.string().regex(timeRegex, 'Horário inválido (use HH:MM)'),
  status_pagamento: z.enum(['PENDENTE', 'PAGO']).default('PENDENTE'),
});

export const eventoContratadoUpdateSchema = eventoContratadoCreateSchema
  .omit({ evento_id: true, contratado_id: true })
  .partial();

export const eventoContratadoSchema = eventoContratadoCreateSchema.extend({
  id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type EventoContratadoCreate = z.infer<typeof eventoContratadoCreateSchema>;
export type EventoContratadoUpdate = z.infer<typeof eventoContratadoUpdateSchema>;
export type EventoContratado = z.infer<typeof eventoContratadoSchema>;
