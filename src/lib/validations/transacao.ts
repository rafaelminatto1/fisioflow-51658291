import { z } from 'zod';

export const transacaoCreateSchema = z.object({
  user_id: z.string().uuid().optional(),
  tipo: z.enum(['voucher_compra', 'evento_receita', 'evento_despesa', 'estorno']),
  valor: z.number(),
  status: z.enum(['pendente', 'processando', 'concluido', 'falhou', 'estornado']).default('pendente'),
  descricao: z.string().optional(),
  stripe_payment_intent_id: z.string().optional(),
  stripe_refund_id: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const transacaoUpdateSchema = transacaoCreateSchema.partial();

export const transacaoSchema = transacaoCreateSchema.extend({
  id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type TransacaoCreate = z.infer<typeof transacaoCreateSchema>;
export type TransacaoUpdate = z.infer<typeof transacaoUpdateSchema>;
export type Transacao = z.infer<typeof transacaoSchema>;
