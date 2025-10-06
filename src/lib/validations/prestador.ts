import { z } from 'zod';

// Schema para criar prestador
export const prestadorCreateSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  contato: z.string().min(8, 'Contato deve ter pelo menos 8 caracteres').optional().or(z.literal('')),
  cpf_cnpj: z.string().min(11, 'CPF/CNPJ inválido').optional().or(z.literal('')),
  valor_acordado: z.number().nonnegative().default(0),
  evento_id: z.string().uuid(),
});

// Schema para atualizar prestador
export const prestadorUpdateSchema = prestadorCreateSchema.partial().extend({
  status_pagamento: z.enum(['PENDENTE', 'PAGO']).optional(),
});

// Schema completo do prestador
export const prestadorSchema = prestadorCreateSchema.extend({
  id: z.string().uuid(),
  status_pagamento: z.enum(['PENDENTE', 'PAGO']),
  created_at: z.string(),
  updated_at: z.string(),
});

// Schema para pagamento
export const pagamentoSchema = z.object({
  prestador_id: z.string().uuid(),
  valor: z.number().positive('Valor deve ser maior que zero'),
  data_pagamento: z.date(),
  comprovante_url: z.string().url().optional().or(z.literal('')),
});

export type PrestadorCreate = z.infer<typeof prestadorCreateSchema>;
export type PrestadorUpdate = z.infer<typeof prestadorUpdateSchema>;
export type Prestador = z.infer<typeof prestadorSchema>;
export type Pagamento = z.infer<typeof pagamentoSchema>;
