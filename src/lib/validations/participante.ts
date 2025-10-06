import { z } from 'zod';

// Validação de Instagram (pode ser @usuario ou URL)
const instagramValidation = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(
    (val) => {
      if (!val) return true;
      // Aceita @usuario ou URL do Instagram
      return /^@?[a-zA-Z0-9._]+$/.test(val) || /instagram\.com/.test(val);
    },
    { message: 'Instagram inválido. Use @usuario ou URL do perfil' }
  );

// Schema para criar participante
export const participanteCreateSchema = z.object({
  evento_id: z.string().uuid(),
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  contato: z.string().min(8, 'Contato deve ter pelo menos 8 caracteres').optional().or(z.literal('')),
  instagram: instagramValidation,
  segue_perfil: z.boolean().default(false),
  observacoes: z.string().optional().or(z.literal('')),
});

// Schema para atualizar participante (evento_id não pode ser alterado)
export const participanteUpdateSchema = participanteCreateSchema.omit({ evento_id: true }).partial();

// Schema completo do participante
export const participanteSchema = participanteCreateSchema.extend({
  id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ParticipanteCreate = z.infer<typeof participanteCreateSchema>;
export type ParticipanteUpdate = z.infer<typeof participanteUpdateSchema>;
export type Participante = z.infer<typeof participanteSchema>;
