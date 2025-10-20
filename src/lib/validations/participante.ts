import { z } from 'zod';

// Sanitização
const sanitizeString = (str: string) => str.trim().replace(/[<>]/g, '');

// Validação de Instagram aprimorada
const instagramValidation = z
  .string()
  .max(100, 'Instagram muito longo')
  .optional()
  .or(z.literal(''))
  .refine(
    (val) => {
      if (!val) return true;
      // Aceita @usuario, usuario ou URL do Instagram
      const usernamePattern = /^@?[a-zA-Z0-9._]{1,30}$/;
      const urlPattern = /^https?:\/\/(www\.)?instagram\.com\//;
      return usernamePattern.test(val) || urlPattern.test(val);
    },
    { message: 'Instagram inválido. Use @usuario ou URL do perfil' }
  );

// Validação de telefone/email
const contatoValidation = z
  .string()
  .min(8, 'Contato deve ter pelo menos 8 caracteres')
  .max(100, 'Contato muito longo')
  .optional()
  .or(z.literal(''))
  .refine(
    (val) => {
      if (!val) return true;
      // Aceita telefone ou email
      const phonePattern = /^\+?[\d\s()-]{8,}$/;
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return phonePattern.test(val) || emailPattern.test(val);
    },
    { message: 'Contato inválido. Use telefone ou email' }
  );

// Schema para criar participante com validações robustas
export const participanteCreateSchema = z.object({
  evento_id: z.string().uuid('ID do evento inválido'),
  nome: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome não pode ter mais de 100 caracteres')
    .transform(sanitizeString),
  contato: contatoValidation,
  instagram: instagramValidation,
  segue_perfil: z.boolean().default(false),
  observacoes: z
    .string()
    .max(500, 'Observações não podem ter mais de 500 caracteres')
    .transform(sanitizeString)
    .optional()
    .or(z.literal('')),
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
