import { z } from 'zod';

// Schema robusto para validação de senha
export const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiúscula')
  .regex(/[a-z]/, 'Senha deve conter ao menos uma letra minúscula')
  .regex(/[0-9]/, 'Senha deve conter ao menos um número')
  .regex(/[^A-Za-z0-9]/, 'Senha deve conter ao menos um caractere especial (!@#$%^&*)');

// Schema para email
export const emailSchema = z
  .string()
  .email('Email inválido')
  .min(5, 'Email muito curto')
  .max(255, 'Email muito longo');

// Schema para nome completo
export const fullNameSchema = z
  .string()
  .min(3, 'Nome deve ter no mínimo 3 caracteres')
  .max(100, 'Nome muito longo')
  .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras');

// Schema completo para signup
export const signUpSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

// Schema para login
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha é obrigatória'),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
