import { z } from 'zod';

const sanitizeString = (str: string) => str.trim().replace(/[<>]/g, '');

const validateCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  return true;
};

const validateCNPJ = (cnpj: string): boolean => {
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned.length === 14;
};

export const contratadoCreateSchema = z.object({
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
  especialidade: z
    .string()
    .max(100, 'Especialidade não pode ter mais de 100 caracteres')
    .transform(sanitizeString)
    .optional()
    .or(z.literal('')),
  observacoes: z
    .string()
    .max(1000, 'Observações não podem ter mais de 1000 caracteres')
    .transform(sanitizeString)
    .optional()
    .or(z.literal('')),
});

export const contratadoUpdateSchema = contratadoCreateSchema.partial();

export const contratadoSchema = contratadoCreateSchema.extend({
  id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ContratadoCreate = z.infer<typeof contratadoCreateSchema>;
export type ContratadoUpdate = z.infer<typeof contratadoUpdateSchema>;
export type Contratado = z.infer<typeof contratadoSchema>;
