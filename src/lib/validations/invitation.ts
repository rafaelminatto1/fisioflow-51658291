import { z } from 'zod';

export const invitationSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'fisioterapeuta', 'estagiario'], {
    errorMap: () => ({ message: 'Selecione uma função válida' }),
  }),
});

export type InvitationInput = z.infer<typeof invitationSchema>;
