
// Schema para criar pagamento

import { z } from 'zod';

export const pagamentoCreateSchema = z.object({
  evento_id: z.string().uuid(),
  tipo: z.enum(['prestador', 'insumo', 'outro']),
  descricao: z.string().min(2, 'Descrição é obrigatória'),
  valor: z.number().positive('Valor deve ser maior que zero'),
  pago_em: z.date({
    required_error: 'Data de pagamento é obrigatória',
  }),
  comprovante_url: z.string().url().optional().or(z.literal('')),
});

// Schema para atualizar pagamento
export const pagamentoUpdateSchema = pagamentoCreateSchema.partial();

// Schema completo do pagamento
export const pagamentoSchema = pagamentoCreateSchema.extend({
  id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type PagamentoCreate = z.infer<typeof pagamentoCreateSchema>;
export type PagamentoUpdate = z.infer<typeof pagamentoUpdateSchema>;
export type Pagamento = z.infer<typeof pagamentoSchema>;
