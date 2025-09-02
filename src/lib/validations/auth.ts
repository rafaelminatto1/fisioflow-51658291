import { z } from "zod";

// Validação para CPF
const cpfSchema = z.string()
  .min(11, "CPF deve ter 11 dígitos")
  .max(14, "CPF inválido")
  .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, "Formato de CPF inválido")
  .optional();

// Validação para CREFITO
const crefitoSchema = z.string()
  .regex(/^CREFITO\d{1,2}-\d{6}-[A-Z]$/, "Formato de CREFITO inválido (ex: CREFITO1-123456-F)")
  .optional();

// Schema para Step 1 - Seleção do tipo de usuário
export const userTypeSchema = z.object({
  userType: z.enum(['paciente', 'fisioterapeuta', 'estagiario', 'admin', 'parceiro'], {
    required_error: "Selecione o tipo de conta"
  })
});

// Schema para Step 2 - Dados pessoais
export const personalDataSchema = z.object({
  email: z.string()
    .email("Digite um email válido")
    .min(1, "Email é obrigatório"),
  password: z.string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Senha deve conter ao menos: 1 minúscula, 1 maiúscula e 1 número"),
  confirmPassword: z.string(),
  full_name: z.string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo"),
  cpf: cpfSchema,
  phone: z.string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Formato: (11) 99999-9999")
    .optional(),
  birth_date: z.string()
    .optional()
    .refine((date) => {
      if (!date) return true;
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 16 && age <= 100;
    }, "Idade deve estar entre 16 e 100 anos")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"]
});

// Schema para Step 3 - Dados profissionais
export const professionalDataSchema = z.object({
  crefito: crefitoSchema,
  specialties: z.array(z.string()).optional(),
  experience_years: z.number()
    .min(0, "Anos de experiência não pode ser negativo")
    .max(50, "Anos de experiência muito alto")
    .optional(),
  bio: z.string()
    .max(500, "Bio muito longa (máximo 500 caracteres)")
    .optional(),
  consultation_fee: z.number()
    .min(0, "Valor da consulta não pode ser negativo")
    .max(9999, "Valor da consulta muito alto")
    .optional()
});

// Schema para Step 4 - Confirmação e termos
export const confirmationSchema = z.object({
  terms_accepted: z.boolean().refine(val => val === true, {
    message: "Você deve aceitar os termos de uso"
  }),
  privacy_accepted: z.boolean().refine(val => val === true, {
    message: "Você deve aceitar a política de privacidade"
  })
});

// Schema completo para registro - todos os campos necessários
export const registerSchema = z.object({
  userType: z.enum(['paciente', 'fisioterapeuta', 'estagiario', 'admin', 'parceiro']),
  email: z.string().email("Digite um email válido").min(1, "Email é obrigatório"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  confirmPassword: z.string(),
  full_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  birth_date: z.string().optional(),
  crefito: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  experience_years: z.number().optional(),
  bio: z.string().optional(),
  consultation_fee: z.number().optional(),
  terms_accepted: z.boolean(),
  privacy_accepted: z.boolean()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"]
});

// Schema para login
export const loginSchema = z.object({
  email: z.string()
    .email("Digite um email válido")
    .min(1, "Email é obrigatório"),
  password: z.string()
    .min(1, "Senha é obrigatória"),
  remember: z.boolean().optional()
});

// Schema para reset de senha
export const resetPasswordSchema = z.object({
  email: z.string()
    .email("Digite um email válido")
    .min(1, "Email é obrigatório")
});

// Schema para nova senha
export const newPasswordSchema = z.object({
  password: z.string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Senha deve conter ao menos: 1 minúscula, 1 maiúscula e 1 número"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"]
});

// Schema para atualização de perfil
export const profileUpdateSchema = z.object({
  full_name: z.string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo"),
  phone: z.string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Formato: (11) 99999-9999")
    .optional(),
  bio: z.string()
    .max(500, "Bio muito longa (máximo 500 caracteres)")
    .optional(),
  birth_date: z.string().optional(),
  address: z.string().optional(),
  crefito: crefitoSchema,
  specialties: z.array(z.string()).optional(),
  experience_years: z.number()
    .min(0, "Anos de experiência não pode ser negativo")
    .max(50, "Anos de experiência muito alto")
    .optional(),
  consultation_fee: z.number()
    .min(0, "Valor da consulta não pode ser negativo")
    .max(9999, "Valor da consulta muito alto")
    .optional(),
  notification_preferences: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean()
  }).optional()
});

export type UserTypeFormData = z.infer<typeof userTypeSchema>;
export type PersonalDataFormData = z.infer<typeof personalDataSchema>;
export type ProfessionalDataFormData = z.infer<typeof professionalDataSchema>;
export type ConfirmationFormData = z.infer<typeof confirmationSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type NewPasswordFormData = z.infer<typeof newPasswordSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;