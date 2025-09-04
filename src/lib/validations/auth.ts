import { z } from 'zod';

// Schema para login
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(100, 'Senha muito longa'),
  rememberMe: z.boolean().optional()
});

// Schema para registro
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(100, 'Senha muito longa')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'
    ),
  confirmPassword: z
    .string()
    .min(1, 'Confirmação de senha é obrigatória'),
  firstName: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(50, 'Nome muito longo')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras'),
  lastName: z
    .string()
    .min(1, 'Sobrenome é obrigatório')
    .min(2, 'Sobrenome deve ter pelo menos 2 caracteres')
    .max(50, 'Sobrenome muito longo')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Sobrenome deve conter apenas letras'),
  phone: z
    .string()
    .min(1, 'Telefone é obrigatório')
    .regex(
      /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/,
      'Formato de telefone inválido (ex: (11) 99999-9999)'
    ),
  profession: z
    .string()
    .min(1, 'Profissão é obrigatória')
    .max(100, 'Profissão muito longa'),
  crefito: z
    .string()
    .optional(),
  acceptTerms: z
    .boolean()
    .refine(val => val === true, 'Você deve aceitar os termos de uso'),
  // Additional wizard fields
  full_name: z.string().optional(),
  userType: z.enum(['fisioterapeuta', 'paciente', 'admin', 'estagiario', 'parceiro']).optional(),
  cpf: z.string().optional(),
  birth_date: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  experience_years: z.number().optional(),
  bio: z.string().optional(),
  consultation_fee: z.number().optional(),
  terms_accepted: z.boolean().optional()
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Senhas não coincidem',
    path: ['confirmPassword']
  }
);

// Schema para recuperação de senha
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .max(255, 'Email muito longo')
});

// Schema para redefinição de senha
export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(100, 'Senha muito longa')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'
    ),
  confirmPassword: z
    .string()
    .min(1, 'Confirmação de senha é obrigatória'),
  token: z
    .string()
    .min(1, 'Token é obrigatório')
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Senhas não coincidem',
    path: ['confirmPassword']
  }
);

// Schema para alteração de senha
export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Senha atual é obrigatória'),
  newPassword: z
    .string()
    .min(1, 'Nova senha é obrigatória')
    .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
    .max(100, 'Nova senha muito longa')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Nova senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'
    ),
  confirmNewPassword: z
    .string()
    .min(1, 'Confirmação da nova senha é obrigatória')
}).refine(
  (data) => data.newPassword === data.confirmNewPassword,
  {
    message: 'Senhas não coincidem',
    path: ['confirmNewPassword']
  }
).refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: 'A nova senha deve ser diferente da senha atual',
    path: ['newPassword']
  }
);

// Schema para nova senha (usado em reset de senha)
export const newPasswordSchema = z.object({
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(100, 'Senha muito longa')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'
    ),
  confirmPassword: z
    .string()
    .min(1, 'Confirmação de senha é obrigatória')
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Senhas não coincidem',
    path: ['confirmPassword']
  }
);

// Schema para atualização de perfil
export const profileUpdateSchema = z.object({
  firstName: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(50, 'Nome muito longo')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras'),
  lastName: z
    .string()
    .min(1, 'Sobrenome é obrigatório')
    .min(2, 'Sobrenome deve ter pelo menos 2 caracteres')
    .max(50, 'Sobrenome muito longo')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Sobrenome deve conter apenas letras'),
  phone: z
    .string()
    .min(1, 'Telefone é obrigatório')
    .regex(
      /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/,
      'Formato de telefone inválido (ex: (11) 99999-9999)'
    ),
  profession: z
    .string()
    .min(1, 'Profissão é obrigatória')
    .max(100, 'Profissão muito longa'),
  crefito: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{5,6}-F$/.test(val),
      'CREFITO deve estar no formato 12345-F'
    )
});

// Wizard schemas
export const userTypeSchema = z.object({
  userType: z.enum(['fisioterapeuta', 'paciente', 'admin', 'estagiario', 'parceiro']).default('fisioterapeuta')
});

export const personalDataSchema = z.object({
  full_name: z.string().min(2, 'Nome completo é obrigatório'),
  cpf: z.string().min(11, 'CPF é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone é obrigatório'),
  birth_date: z.string().min(1, 'Data de nascimento é obrigatória'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword']
});

export const professionalDataSchema = z.object({
  specialties: z.array(z.string()).min(1, 'Pelo menos uma especialidade é obrigatória'),
  experience_years: z.number().min(0, 'Anos de experiência é obrigatório'),
  bio: z.string().optional(),
  consultation_fee: z.number().min(0, 'Valor da consulta é obrigatório'),
  profession: z.string().min(1, 'Profissão é obrigatória'),
  crefito: z.string().optional()
});

export const confirmationSchema = z.object({
  acceptTerms: z.boolean().refine(val => val === true, 'Você deve aceitar os termos')
});

// Tipos TypeScript derivados dos schemas
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type NewPasswordFormData = z.infer<typeof newPasswordSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

// Wizard types
export type UserTypeFormData = z.infer<typeof userTypeSchema>;
export type PersonalDataFormData = z.infer<typeof personalDataSchema>;
export type ProfessionalDataFormData = z.infer<typeof professionalDataSchema>;
export type ConfirmationFormData = z.infer<typeof confirmationSchema>;