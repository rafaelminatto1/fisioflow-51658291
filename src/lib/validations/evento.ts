import { z } from 'zod';

// Schema para criar evento
export const eventoCreateSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  descricao: z.string().optional(),
  categoria: z.enum(['corrida', 'corporativo', 'ativacao', 'workshop', 'outro']),
  local: z.string().min(2, 'Local é obrigatório'),
  data_inicio: z.date({
    required_error: 'Data de início é obrigatória',
  }),
  data_fim: z.date({
    required_error: 'Data de fim é obrigatória',
  }),
  gratuito: z.boolean().default(false),
  link_whatsapp: z.string().url('Link do WhatsApp inválido').optional().or(z.literal('')),
  valor_padrao_prestador: z.number().nonnegative().default(0),
});

// Schema para atualizar evento
export const eventoUpdateSchema = eventoCreateSchema.partial().extend({
  status: z.enum(['AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']).optional(),
});

// Schema completo do evento
export const eventoSchema = eventoCreateSchema.extend({
  id: z.string().uuid(),
  status: z.enum(['AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']),
  created_at: z.string(),
  updated_at: z.string(),
});

export type EventoCreate = z.infer<typeof eventoCreateSchema>;
export type EventoUpdate = z.infer<typeof eventoUpdateSchema>;
export type Evento = z.infer<typeof eventoSchema>;
