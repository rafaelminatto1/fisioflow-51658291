
// ============================================================================
// VALIDADORES BRASILEIROS
// ============================================================================

/** Valida CPF brasileiro */

import { z } from 'zod';
import { parseBrazilianDate, parseDateFlexible, isValidCPF, isValidPhone, isValidEmail, isValidName } from '@/utils/validators';

const cpfValidator = z.string().refine(
  (val) => !val || isValidCPF(val),
  { message: 'CPF inválido' }
).optional().nullable();

/** Valida telefone brasileiro */
const phoneValidator = z.string().refine(
  (val) => !val || isValidPhone(val),
  { message: 'Telefone inválido. Use (11) 98765-4321 ou 11987654321' }
).optional().nullable();

/** Valida email */
const emailValidator = z.string().refine(
  (val) => !val || isValidEmail(val),
  { message: 'Email inválido' }
).optional().nullable();

/** Valida nome completo (pelo menos nome + sobrenome) */
const nameValidator = z.string().refine(
  (val) => val.trim().length >= 3 && isValidName(val),
  { message: 'Nome completo obrigatório (nome + sobrenome)' }
);

/** Valida data de nascimento (aceita DD/MM/YYYY ou ISO; pessoa entre 0 e 120 anos) */
const birthDateValidator = z.string().refine(
  (val) => {
    if (!val) return true; // Opcional
    const parsed = parseDateFlexible(val);
    if (!parsed) return false;

    const now = new Date();
    const minDate = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
    const maxDate = new Date(now.getFullYear() - 0, now.getMonth(), now.getDate()); // Hoje

    return parsed <= maxDate && parsed >= minDate;
  },
  { message: 'Data de nascimento inválida' }
).optional().nullable();

// ============================================================================
// SCHEMA PRINCIPAL
// ============================================================================

export const PatientSchema = z.object({
    id: z.string().uuid(),
    name: nameValidator,
    email: emailValidator,
    phone: phoneValidator,
    cpf: cpfValidator,
    birthDate: birthDateValidator,
    gender: z.enum(['masculino', 'feminino', 'outro']).optional().nullable(),
    mainCondition: z.string().optional().nullable(),
    status: z.enum(['active', 'inactive', 'Em Tratamento', 'Inicial', 'Alta', 'Arquivado']).default('active'),
    progress: z.number().min(0).max(100).optional().default(0),
    incomplete_registration: z.boolean().optional().default(false),
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date()),
    organization_id: z.string().uuid().optional().nullable(),
});

export type Patient = z.infer<typeof PatientSchema>;

// ============================================================================
// SCHEMA DE FORMULÁRIO (Criação/Edição)
// ============================================================================

export const PatientFormSchema = z.object({
  name: nameValidator,
  email: emailValidator,
  phone: phoneValidator,
  cpf: cpfValidator,
  birthDate: z.string().refine(
    (val) => {
      if (!val) return true; // Opcional
      const parsed = parseBrazilianDate(val);
      if (!parsed) return false;

      const now = new Date();
      const minDate = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
      return parsed <= now && parsed >= minDate;
    },
    { message: 'Data de nascimento inválida' }
  ).optional().nullable(),
  gender: z.enum(['masculino', 'feminino', 'outro']).optional().nullable(),
  mainCondition: z.string().optional().nullable(),
  address: z.object({
    zipCode: z.string().optional().nullable(),
    street: z.string().optional().nullable(),
    number: z.string().optional().nullable(),
    complement: z.string().optional().nullable(),
    neighborhood: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().length(2).optional().nullable(),
  }).optional().nullable(),
  emergencyContact: z.object({
    name: z.string().min(3, 'Nome do contato é obrigatório'),
    phone: z.string().refine(isValidPhone, 'Telefone inválido'),
    relationship: z.string().optional(),
  }).optional().nullable(),
});

export type PatientFormData = z.infer<typeof PatientFormSchema>;

// ============================================================================
// SCHEMA DE FORMULÁRIO SIMPLIFICADO
// ============================================================================

/** Schema para criação rápida de paciente (apenas campos obrigatórios) */
export const PatientQuickFormSchema = z.object({
  name: nameValidator,
  phone: phoneValidator,
  email: emailValidator,
});

export type PatientQuickFormData = z.infer<typeof PatientQuickFormSchema>;
