
// ============================================================================
// VALIDADORES BRASILEIROS
// ============================================================================

/** Valida CPF brasileiro */

import { z } from 'zod';
import { parseDateFlexible, isValidCPF, isValidPhone, isValidEmail, isValidName } from '@/utils/validators';

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
  id: z.string().min(1),
  full_name: z.string().min(2).max(200),
  name: z.string().optional(), // Alias often used in UI helpers
  email: emailValidator,
  phone: phoneValidator,
  cpf: cpfValidator,
  birth_date: birthDateValidator, // Renamed from birthDate to match hook/DB convention often seen
  gender: z.enum(['masculino', 'feminino', 'outro']).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip_code: z.string().optional().nullable(),
  main_condition: z.string().optional().nullable(), // Renamed from mainCondition
  status: z.enum(['active', 'inactive', 'Em Tratamento', 'Inicial', 'Alta', 'Arquivado', 'Recuperação', 'Concluído']).default('active'),
  progress: z.number().min(0).max(100).optional().default(0),
  incomplete_registration: z.boolean().optional().default(false),
  created_at: z.string().or(z.date()).optional(), // Renamed from createdAt
  updated_at: z.string().or(z.date()).optional(), // Renamed from updatedAt
  organization_id: z.string().min(1).optional().nullable(),
});

export type Patient = z.infer<typeof PatientSchema>;

// ============================================================================
// SCHEMA DE FORMULÁRIO (Criação/Edição)
// ============================================================================

export const PatientFormSchema = z.object({
  // Informações Básicas
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200, 'Nome muito longo')
    .refine(val => isValidName(val), { message: 'Digite o nome completo (nome + sobrenome)' }),
  email: emailValidator.optional().or(z.literal('')),
  phone: phoneValidator.optional().or(z.literal('')),
  cpf: cpfValidator.optional().or(z.literal('')),
  birth_date: z.string().min(1, 'Data de nascimento é obrigatória').refine(
    (val) => {
      if (!val) return true;
      const parsed = parseDateFlexible(val); // Use flexible parser to handle YYYY-MM-DD from input
      if (!parsed) return false;

      const now = new Date();
      const minDate = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
      return parsed <= now && parsed >= minDate;
    },
    { message: 'Data de nascimento inválida' }
  ),
  gender: z.enum(['masculino', 'feminino', 'outro'], { required_error: 'Selecione o gênero' }),

  // Endereço
  address: z.string().max(500, 'Endereço muito longo').optional().nullable(),
  city: z.string().max(100, 'Cidade muito longa').optional().nullable(),
  state: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().length(2, 'Estado deve ter 2 caracteres').optional()
  ),
  zip_code: z.string().optional().nullable(),

  // Contato de Emergência
  emergency_contact: z.string().max(200, 'Contato muito longo').optional().nullable(),
  emergency_contact_relationship: z.string().max(100, 'Parentesco muito longo').optional().nullable(),
  emergency_phone: phoneValidator.optional().or(z.literal('')).nullable(),

  // Informações Médicas
  medical_history: z.string().max(5000, 'Histórico muito longo').optional().nullable(),
  main_condition: z.string().min(1, 'Condição principal é obrigatória').max(500, 'Condição muito longa'),
  allergies: z.string().max(500, 'Alergias muito longas').optional().nullable(),
  medications: z.string().max(500, 'Medicamentos muito longos').optional().nullable(),
  weight_kg: z.preprocess(
    (val) => (val === '' || val === null || Number.isNaN(val) ? undefined : val),
    z.coerce.number().positive().max(500, 'Peso inválido').optional()
  ),
  height_cm: z.preprocess(
    (val) => (val === '' || val === null || Number.isNaN(val) ? undefined : val),
    z.coerce.number().positive().max(300, 'Altura inválida').optional()
  ),
  blood_type: z.string().optional().nullable(),

  // Informações Adicionais
  marital_status: z.string().optional().nullable(),
  profession: z.string().max(200, 'Profissão muito longa').optional().nullable(),
  education_level: z.string().optional().nullable(),
  health_insurance: z.string().max(200, 'Plano muito longo').optional().nullable(),
  insurance_number: z.string().max(100, 'Número muito longo').optional().nullable(),
  observations: z.string().max(5000, 'Observações muito longas').optional().nullable(),

  // Status
  status: z.enum(['active', 'inactive', 'Inicial', 'Em Tratamento', 'Recuperação', 'Concluído', 'Alta', 'Arquivado']).default('Inicial').optional(),
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
