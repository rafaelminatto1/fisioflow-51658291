import { z } from 'zod';

// Sanitização de string
const sanitizeString = (str: string) => str.trim().replace(/[<>]/g, '');

// Schema base para criar evento (sem refinement)
const eventoBaseSchema = z.object({
  nome: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome não pode ter mais de 100 caracteres')
    .transform(sanitizeString),
  descricao: z
    .string()
    .max(1000, 'Descrição não pode ter mais de 1000 caracteres')
    .transform(sanitizeString)
    .optional(),
  categoria: z.enum(['corrida', 'corporativo', 'ativacao', 'workshop', 'outro'], {
    errorMap: () => ({ message: 'Categoria inválida' }),
  }),
  local: z
    .string()
    .min(2, 'Local é obrigatório')
    .max(200, 'Local não pode ter mais de 200 caracteres')
    .transform(sanitizeString),
  data_inicio: z.date({
    required_error: 'Data de início é obrigatória',
    invalid_type_error: 'Data de início inválida',
  }),
  data_fim: z.date({
    required_error: 'Data de fim é obrigatória',
    invalid_type_error: 'Data de fim inválida',
  }),
  gratuito: z.boolean().default(false),
  link_whatsapp: z
    .string()
    .url('Link do WhatsApp inválido')
    .max(500, 'Link muito longo')
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.includes('whatsapp') || val.includes('wa.me'), {
      message: 'Deve ser um link válido do WhatsApp',
    }),
  valor_padrao_prestador: z
    .number({
      invalid_type_error: 'Valor deve ser um número',
    })
    .nonnegative('Valor não pode ser negativo')
    .max(999999.99, 'Valor muito alto')
    .default(0),
});

// Schema para criar evento com validação de datas
export const eventoCreateSchema = eventoBaseSchema.refine(
  (data) => data.data_fim >= data.data_inicio,
  {
    message: 'Data de fim deve ser posterior ou igual à data de início',
    path: ['data_fim'],
  }
);

// Schema para atualizar evento (baseado no schema base, não no refinado)
export const eventoUpdateSchema = eventoBaseSchema.partial().extend({
  status: z.enum(['AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']).optional(),
});

// Schema completo do evento
export const eventoSchema = eventoBaseSchema.extend({
  id: z.string().uuid(),
  status: z.enum(['AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']),
  created_at: z.string(),
  updated_at: z.string(),
});

export type EventoCreate = z.infer<typeof eventoCreateSchema>;
export type EventoUpdate = z.infer<typeof eventoUpdateSchema>;
export type Evento = z.infer<typeof eventoSchema>;
