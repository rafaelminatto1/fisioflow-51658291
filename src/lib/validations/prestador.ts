import { z } from 'zod';

// Sanitização
const sanitizeString = (str: string) => str.trim().replace(/[<>]/g, '');

// Validação de CPF
const validateCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false; // Rejeita sequências
  return true;
};

// Validação de CNPJ
const validateCNPJ = (cnpj: string): boolean => {
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned.length === 14;
};

// Schema para criar prestador com validações rigorosas
export const prestadorCreateSchema = z.object({
  evento_id: z.string().uuid('ID do evento inválido'),
  nome: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome não pode ter mais de 100 caracteres')
    .transform(sanitizeString),
  contato: z
    .string()
    .min(8, 'Contato deve ter pelo menos 8 caracteres')
    .max(50, 'Contato não pode ter mais de 50 caracteres')
    .optional()
    .or(z.literal('')),
  cpf_cnpj: z
    .string()
    .max(18, 'CPF/CNPJ muito longo')
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => {
        if (!val) return true;
        const cleaned = val.replace(/\D/g, '');
        return cleaned.length === 11 ? validateCPF(val) : validateCNPJ(val);
      },
      { message: 'CPF ou CNPJ inválido' }
    ),
  valor_acordado: z
    .number({
      invalid_type_error: 'Valor deve ser um número',
    })
    .nonnegative('Valor não pode ser negativo')
    .max(999999.99, 'Valor muito alto')
    .default(0),
});

// Schema para atualizar prestador (evento_id não pode ser alterado)
export const prestadorUpdateSchema = prestadorCreateSchema.omit({ evento_id: true }).partial().extend({
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
