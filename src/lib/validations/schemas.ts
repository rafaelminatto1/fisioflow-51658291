/**
 * Zod Schemas - Validação de Dados do Sistema
 *
 * Implementa schemas Zod para todas as entidades do sistema
 * com sanitização de inputs e proteção contra ataques comuns.
 *
 * @module validations/schemas
 */

import { z } from 'zod';

// ============================================================================================
// UTILITÁRIOS DE SANITIZAÇÃO
// ============================================================================================

/**
 * Sanitiza strings removendo conteúdo perigoso
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    // Remove caracteres nulos
    .replace(/\0/g, '')
    // Remove múltiplos espaços
    .replace(/\s+/g, ' ')
    // Remove tags HTML (básico)
    .replace(/<[^>]*>/g, '')
    .slice(0, 10000); // Limitar tamanho
}

/**
 * Sanitiza email
 */
export function sanitizeEmail(email: string): string {
  return email
    .toLowerCase()
    .trim()
    .slice(0, 255);
}

/**
 * Sanitiza telefone (apenas dígitos)
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(0, 15);
}

/**
 * Sanitiza CPF
 */
export function sanitizeCPF(cpf: string): string {
  return cpf.replace(/\D/g, '').slice(0, 11);
}

/**
 * Sanitiza URL
 */
export function sanitizeUrl(url: string): string {
  return url
    .trim()
    .slice(0, 2048);
}

/**
 * Sanitiza texto longo (notes, descrições)
 */
export function sanitizeLongText(text: string): string {
  return text
    .trim()
    .replace(/\0/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 50000); // 50KB max
}

// ============================================================================================
// TRANSFORMAÇÕES ZOD
// ============================================================================================

const sanitizedString = (maxLength?: number) =>
  z.string()
    .transform(sanitizeString)
    .refine(val => val.length > 0, 'Campo obrigatório')
    .refine(maxLength ? (val) => val.length <= maxLength! : () => true,
      maxLength ? `Máximo de ${maxLength} caracteres` : 'Texto muito longo');

const sanitizedEmail = z.string()
  .transform(sanitizeEmail)
  .refine(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Email inválido');

const sanitizedOptionalEmail = z.string()
  .transform(sanitizeEmail)
  .refine(email => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Email inválido')
  .optional()
  .nullable();

const sanitizedPhone = z.string()
  .transform(sanitizePhone)
  .refine(phone => phone.length >= 10 && phone.length <= 15, 'Telefone inválido');

const sanitizedOptionalPhone = z.string()
  .transform(sanitizePhone)
  .refine(phone => !phone || (phone.length >= 10 && phone.length <= 15), 'Telefone inválido')
  .optional()
  .nullable();

const sanitizedLongText = (maxBytes: number = 50000) =>
  z.string()
    .transform(sanitizeLongText)
    .refine(val => new Blob([val]).size <= maxBytes,
      `Texto muito grande (máximo ${Math.floor(maxBytes / 1024)}KB)`);

// ============================================================================================
// BASE SCHEMAS
// ============================================================================================

/**
 * Schema base para UUIDs
 */
export const uuidSchema = z.string().uuid('ID inválido');

/**
 * Schema para timestamps
 */
export const timestampSchema = z.string().datetime();

/**
 * Schema para datas
 */
export const dateSchema = z.string().refine(
  (date) => !isNaN(Date.parse(date)),
  'Data inválida'
);

/**
 * Schema para moeda BRL
 */
export const brlCurrencySchema = z.string()
  .transform((val) => val.replace(/[R$\s]/g, '').trim())
  .transform((val) => parseFloat(val.replace(',', '.')))
  .refine((val) => !isNaN(val) && val >= 0, 'Valor monetário inválido')
  .refine((val) => val <= 1000000, 'Valor muito alto (máximo: R$ 1.000.000)');

// ============================================================================================
// USER & AUTH SCHEMAS
// ============================================================================================

/**
 * Roles válidas no sistema
 */
export const UserRoleEnum = z.enum([
  'admin',
  'fisioterapeuta',
  'estagiario',
  'paciente',
], {
  errorMap: () => ({ message: 'Cargo inválido. Use: admin, fisioterapeuta, estagiário ou paciente' }),
});

export type UserRole = z.infer<typeof UserRoleEnum>;

/**
 * Schema para criação de usuário
 */
export const createUserSchema = z.object({
  email: sanitizedEmail,
  displayName: sanitizedString(100),
  phoneNumber: sanitizedOptionalPhone,
  role: UserRoleEnum,
  organizationId: uuidSchema.optional(),
});

export type CreateUserData = z.infer<typeof createUserSchema>;

/**
 * Schema para atualização de usuário
 */
export const updateUserSchema = z.object({
  displayName: sanitizedString(100).optional(),
  phoneNumber: sanitizedOptionalPhone,
  photoURL: z.string().url('URL inválida').optional().nullable(),
});

export type UpdateUserData = z.infer<typeof updateUserSchema>;

// ============================================================================================
// PATIENT SCHEMAS
// ============================================================================================

/**
 * Status de paciente
 */
export const PatientStatusEnum = z.enum([
  'active',
  'inactive',
  'archived',
], {
  errorMap: () => ({ message: 'Status inválido. Use: active, inactive ou archived' }),
});

export type PatientStatus = z.infer<typeof PatientStatusEnum>;

/**
 * Schema para criação de paciente
 */
export const createPatientSchema = z.object({
  fullName: sanitizedString(200),
  email: sanitizedOptionalEmail,
  phone: sanitizedOptionalPhone,
  cpf: z.string()
    .transform(sanitizeCPF)
    .refine(cpf => !cpf || cpf.length === 11, 'CPF deve ter 11 dígitos')
    .optional()
    .nullable(),
  birthDate: dateSchema.optional().nullable(),
  address: z.object({
    street: sanitizedString(200).optional(),
    number: sanitizedString(20).optional(),
    complement: sanitizedString(100).optional(),
    neighborhood: sanitizedString(100).optional(),
    city: sanitizedString(100).optional(),
    state: z.string().length(2, 'Estado deve ter 2 letras').optional(),
    zipCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido').optional(),
  }).optional().nullable(),
  emergencyContact: z.object({
    name: sanitizedString(100),
    phone: sanitizedPhone,
    relationship: sanitizedString(50),
  }).optional().nullable(),
  healthPlan: sanitizedString(100).optional().nullable(),
  observations: sanitizedLongText(10000).optional().nullable(),
  status: PatientStatusEnum.default('active'),
  incompleteRegistration: z.boolean().default(false),
});

export type CreatePatientData = z.infer<typeof createPatientSchema>;

/**
 * Schema para atualização de paciente
 */
export const updatePatientSchema = z.object({
  fullName: sanitizedString(200).optional(),
  email: sanitizedOptionalEmail,
  phone: sanitizedOptionalPhone,
  cpf: z.string()
    .transform(sanitizeCPF)
    .refine(cpf => !cpf || cpf.length === 11, 'CPF deve ter 11 dígitos')
    .optional()
    .nullable(),
  birthDate: dateSchema.optional().nullable(),
  address: z.object({
    street: sanitizedString(200).optional(),
    number: sanitizedString(20).optional(),
    complement: sanitizedString(100).optional(),
    neighborhood: sanitizedString(100).optional(),
    city: sanitizedString(100).optional(),
    state: z.string().length(2, 'Estado deve ter 2 letras').optional(),
    zipCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido').optional(),
  }).optional().nullable(),
  emergencyContact: z.object({
    name: sanitizedString(100).optional(),
    phone: sanitizedPhone.optional(),
    relationship: sanitizedString(50).optional(),
  }).optional().nullable(),
  healthPlan: sanitizedString(100).optional().nullable(),
  observations: sanitizedLongText(10000).optional().nullable(),
  status: PatientStatusEnum.optional(),
  incompleteRegistration: z.boolean().optional(),
});

export type UpdatePatientData = z.infer<typeof updatePatientSchema>;

// ============================================================================================
// APPOINTMENT SCHEMAS
// ============================================================================================

/**
 * Status de agendamento
 */
export const AppointmentStatusEnum = z.enum([
  'agendado',
  'confirmado',
  'em_andamento',
  'concluido',
  'cancelado',
  'falta',
], {
  errorMap: () => ({ message: 'Status inválido' }),
});

export type AppointmentStatus = z.infer<typeof AppointmentStatusEnum>;

/**
 * Schema para criação de agendamento
 */
export const createAppointmentSchema = z.object({
  patientId: uuidSchema,
  therapistId: uuidSchema,
  date: dateSchema,
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido (use HH:MM)'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido (use HH:MM)').optional(),
  duration: z.number().int().min(5).max(480).default(60),
  type: sanitizedString(100),
  status: AppointmentStatusEnum.default('agendado'),
  notes: sanitizedLongText(5000).optional().nullable(),
  room: sanitizedString(50).optional().nullable(),
});

export type CreateAppointmentData = z.infer<typeof createAppointmentSchema>;

/**
 * Schema para atualização de agendamento
 */
export const updateAppointmentSchema = z.object({
  date: dateSchema.optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido (use HH:MM)').optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido (use HH:MM)').optional(),
  duration: z.number().int().min(5).max(480).optional(),
  type: sanitizedString(100).optional(),
  status: AppointmentStatusEnum.optional(),
  notes: sanitizedLongText(5000).optional().nullable(),
  room: sanitizedString(50).optional().nullable(),
  cancellationReason: sanitizedString(500).optional().nullable(),
});

export type UpdateAppointmentData = z.infer<typeof updateAppointmentSchema>;

// ============================================================================================
// SESSION/SOAP SCHEMAS
// ============================================================================================

/**
 * Status de sessão
 */
export const SessionStatusEnum = z.enum([
  'draft',
  'completed',
], {
  errorMap: () => ({ message: 'Status inválido' }),
});

export type SessionStatus = z.infer<typeof SessionStatusEnum>;

/**
 * Schema para criação de sessão (SOAP)
 */
export const createSessionSchema = z.object({
  patientId: uuidSchema,
  therapistId: uuidSchema,
  appointmentId: uuidSchema.optional().nullable(),
  sessionNumber: z.number().int().positive().optional(),
  sessionDate: dateSchema,
  status: SessionStatusEnum.default('draft'),
  subjective: sanitizedLongText(10000).optional().nullable(),
  objective: sanitizedLongText(10000).optional().nullable(),
  assessment: sanitizedLongText(10000).optional().nullable(),
  plan: sanitizedLongText(10000).optional().nullable(),
  painLevel: z.number().int().min(0).max(10).optional(),
});

export type CreateSessionData = z.infer<typeof createSessionSchema>;

/**
 * Schema para atualização de sessão
 */
export const updateSessionSchema = z.object({
  sessionDate: dateSchema.optional(),
  status: SessionStatusEnum.optional(),
  subjective: sanitizedLongText(10000).optional().nullable(),
  objective: sanitizedLongText(10000).optional().nullable(),
  assessment: sanitizedLongText(10000).optional().nullable(),
  plan: sanitizedLongText(10000).optional().nullable(),
  painLevel: z.number().int().min(0).max(10).optional(),
});

export type UpdateSessionData = z.infer<typeof updateSessionSchema>;

// ============================================================================================
// PAYMENT SCHEMAS
// ============================================================================================

/**
 * Status de pagamento
 */
export const PaymentStatusEnum = z.enum([
  'pending',
  'paid',
  'cancelled',
  'refunded',
], {
  errorMap: () => ({ message: 'Status inválido' }),
});

export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

/**
 * Métodos de pagamento
 */
export const PaymentMethodEnum = z.enum([
  'cash',
  'credit_card',
  'debit_card',
  'pix',
  'bank_transfer',
  'check',
  'voucher',
]);

export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

/**
 * Schema para criação de pagamento
 */
export const createPaymentSchema = z.object({
  patientId: uuidSchema,
  appointmentId: uuidSchema.optional().nullable(),
  amount: z.number().nonnegative('Valor não pode ser negativo').max(1000000, 'Valor muito alto'),
  status: PaymentStatusEnum.default('pending'),
  paymentMethod: PaymentMethodEnum.optional().nullable(),
  paymentDate: dateSchema.optional().nullable(),
  notes: sanitizedLongText(2000).optional().nullable(),
});

export type CreatePaymentData = z.infer<typeof createPaymentSchema>;

// ============================================================================================
// EXERCISE SCHEMAS
// ============================================================================================

/**
 * Categorias de exercícios
 */
export const ExerciseCategoryEnum = z.enum([
  'alongamento',
  'fortalecimento',
  'mobilizacao',
  'equilibrio',
  'cardio',
  'postura',
  'funcional',
  'outro',
]);

export type ExerciseCategory = z.infer<typeof ExerciseCategoryEnum>;

/**
 * Níveis de dificuldade
 */
export const ExerciseDifficultyEnum = z.enum([
  'facil',
  'medio',
  'dificil',
  'avancado',
]);

export type ExerciseDifficulty = z.infer<typeof ExerciseDifficultyEnum>;

/**
 * Schema para criação de exercício
 */
export const createExerciseSchema = z.object({
  name: sanitizedString(200),
  description: sanitizedLongText(5000).optional().nullable(),
  category: ExerciseCategoryEnum,
  difficulty: ExerciseDifficultyEnum,
  instructions: sanitizedLongText(10000).optional().nullable(),
  videoUrl: z.string().url('URL inválida').optional().nullable(),
  imageUrl: z.string().url('URL inválida').optional().nullable(),
  sets: z.number().int().min(0).max(20).optional(),
  reps: z.number().int().min(0).max(100).optional(),
  durationSeconds: z.number().int().min(0).max(3600).optional(),
  restSeconds: z.number().int().min(0).max(600).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export type CreateExerciseData = z.infer<typeof createExerciseSchema>;

// ============================================================================================
// PATHOLOGY SCHEMAS
// ============================================================================================

/**
 * Status de patologia
 */
export const PathologyStatusEnum = z.enum([
  'em_tratamento',
  'tratada',
  'cronica',
], {
  errorMap: () => ({ message: 'Status inválido' }),
});

export type PathologyStatus = z.infer<typeof PathologyStatusEnum>;

/**
 * Schema para criação de patologia
 */
export const createPathologySchema = z.object({
  patientId: uuidSchema,
  pathologyName: sanitizedString(200),
  diagnosisDate: dateSchema.optional().nullable(),
  status: PathologyStatusEnum.default('em_tratamento'),
  notes: sanitizedLongText(5000).optional().nullable(),
});

export type CreatePathologyData = z.infer<typeof createPathologySchema>;

// ============================================================================================
// VALIDATION HELPERS
// ============================================================================================

/**
 * Valida dados de criação de paciente
 */
export function validatePatientData(data: unknown): CreatePatientData {
  return createPatientSchema.parse(data);
}

/**
 * Valida dados de atualização de paciente
 */
export function validatePatientUpdate(data: unknown): UpdatePatientData {
  return updatePatientSchema.parse(data);
}

/**
 * Valida dados de criação de agendamento
 */
export function validateAppointmentData(data: unknown): CreateAppointmentData {
  return createAppointmentSchema.parse(data);
}

/**
 * Valida dados de criação de sessão SOAP
 */
export function validateSessionData(data: unknown): CreateSessionData {
  return createSessionSchema.parse(data);
}

/**
 * Valida dados de pagamento
 */
export function validatePaymentData(data: unknown): CreatePaymentData {
  return createPaymentSchema.parse(data);
}

/**
 * Valida dados de exercício
 */
export function validateExerciseData(data: unknown): CreateExerciseData {
  return createExerciseSchema.parse(data);
}

/**
 * Valida dados de patologia
 */
export function validatePathologyData(data: unknown): CreatePathologyData {
  return createPathologySchema.parse(data);
}

// ============================================================================================
// ERROR HANDLING
// ============================================================================================

/**
 * Formata erro Zod para exibição amigável
 */
export function formatZodError(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.') || 'form';
    errors[path] = err.message;
  });

  return errors;
}

/**
 * Hook React para validação de formulários com Zod
 */
export function useFormValidation<T extends z.ZodType>(
  schema: T,
  data: unknown
): { valid: boolean; errors: Record<string, string>; data?: z.infer<T> } {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      valid: false,
      errors: formatZodError(result.error),
    };
  }

  return {
    valid: true,
    errors: {},
    data: result.data,
  };
}
