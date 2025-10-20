import { z } from 'zod';

export const voucherCreateSchema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório').max(100),
  descricao: z.string().optional(),
  tipo: z.enum(['pacote', 'avulso', 'mensal']),
  sessoes: z.number().int().positive().optional(),
  validade_dias: z.number().int().positive(),
  preco: z.number().nonnegative(),
  ativo: z.boolean().default(true),
  stripe_price_id: z.string().optional(),
});

export const voucherUpdateSchema = voucherCreateSchema.partial();

export const voucherSchema = voucherCreateSchema.extend({
  id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type VoucherCreate = z.infer<typeof voucherCreateSchema>;
export type VoucherUpdate = z.infer<typeof voucherUpdateSchema>;
export type Voucher = z.infer<typeof voucherSchema>;
