/**
 * API Validation Schemas with Zod
 *
 * @description
 * Runtime validation schemas for API responses using Zod.
 * These schemas ensure type safety at runtime for external data.
 *
 * @module lib/validations/api
 */

import { z } from 'zod';
import { fisioLogger as logger } from '@/lib/errors/logger';

/**
 * Common validation schemas
 */
export const commonSchemas = {
  /**
   * Entity ID validation (UUID or string ID)
   */
  entityId: z.string().min(1),

  /**
   * Email validation
   */
  email: z.string().email('Email inválido'),

  /**
   * Phone number validation (Brazilian format)
   */
  phone: z.string().regex(/^(\+?\d{1,3}[- ]?)?\(?\d{2,3}\)?[- ]?\d{4,5}[- ]?\d{4}$/, 'Telefone inválido'),

  /**
   * CPF validation (Brazilian tax ID)
   */
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido'),

  /**
   * Date validation (ISO 8601 string)
   */
  isoDate: z.string().datetime(),

  /**
   * Timestamp validation (Unix timestamp in milliseconds)
   */
  timestamp: z.number().int().positive(),

  /**
   * URL validation
   */
  url: z.string().url('URL inválida'),

  /**
   * Pagination params
   */
  paginationParams: z.object({
    page: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
  }),

  /**
   * Sort direction
   */
  sortDirection: z.enum(['asc', 'desc']),

  /**
   * Generic API response wrapper
   */
  apiResponse: <T extends z.ZodType>(dataSchema: T) => z.object({
    data: dataSchema,
    success: z.boolean(),
    message: z.string().optional(),
    meta: z.object({
      timestamp: z.string(),
      requestId: z.string().optional(),
      version: z.string().optional(),
    }).optional(),
  }),

  /**
   * Paginated API response
   */
  paginatedApiResponse: <T extends z.ZodType>(dataSchema: T) => z.object({
    data: z.array(dataSchema),
    success: z.boolean(),
    message: z.string().optional(),
    pagination: z.object({
      total: z.number().int().min(0),
      page: z.number().int().min(1),
      limit: z.number().int().min(1),
      totalPages: z.number().int().min(0),
      hasNext: z.boolean(),
      hasPrevious: z.boolean(),
    }),
  }),

  /**
   * API error response
   */
  apiError: z.object({
    code: z.enum([
      'UNKNOWN_ERROR',
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'AUTH_ERROR',
      'PERMISSION_DENIED',
      'NOT_FOUND',
      'VALIDATION_ERROR',
      'CONFLICT',
      'RATE_LIMIT_EXCEEDED',
      'SERVER_ERROR',
      'SERVICE_UNAVAILABLE',
    ]),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    stack: z.string().optional(),
    timestamp: z.string(),
    requestId: z.string().optional(),
  }),
};

/**
 * Patient validation schemas
 */
export const patientSchemas = {
  /**
   * Base patient schema
   */
  base: z.object({
    id: commonSchemas.entityId,
    name: z.string().min(1, 'Nome é obrigatório'),
    full_name: z.string().optional(),
    email: commonSchemas.email.optional(),
    phone: commonSchemas.phone.optional(),
    cpf: commonSchemas.cpf.optional(),
    birthDate: commonSchemas.isoDate,
    gender: z.enum(['masculino', 'feminino', 'outro']),
    address: z.string().optional(),
    emergencyContact: z.string().optional(),
    emergencyContactRelationship: z.string().optional(),
    medicalHistory: z.string().optional(),
    mainCondition: z.string().min(1, 'Condição principal é obrigatória'),
    status: z.enum(['Em Tratamento', 'Recuperação', 'Inicial', 'Concluído']),
    progress: z.number().min(0).max(100),
    insurancePlan: z.string().optional(),
    insuranceNumber: z.string().optional(),
    insuranceValidity: commonSchemas.isoDate.optional(),
    maritalStatus: z.string().optional(),
    profession: z.string().optional(),
    educationLevel: z.string().optional(),
    bloodType: z.string().optional(),
    allergies: z.string().optional(),
    medications: z.string().optional(),
    weight: z.number().positive().optional(),
    height: z.number().positive().optional(),
    incomplete_registration: z.boolean().optional(),
    createdAt: commonSchemas.isoDate,
    updatedAt: commonSchemas.isoDate,
  }),

  /**
   * Patient list item (simplified)
   */
  listItem: z.object({
    id: commonSchemas.entityId,
    name: z.string(),
    full_name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    mainCondition: z.string().optional(),
    status: z.string(),
    progress: z.number().min(0).max(100),
  }),

  /**
   * Patient form data (for create/update)
   */
  formData: z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: commonSchemas.email.optional(),
    phone: commonSchemas.phone.optional(),
    cpf: commonSchemas.cpf.optional(),
    birthDate: commonSchemas.isoDate,
    gender: z.enum(['masculino', 'feminino', 'outro']),
    address: z.string().optional(),
    emergencyContact: z.string().optional(),
    emergencyContactRelationship: z.string().optional(),
    medicalHistory: z.string().optional(),
    mainCondition: z.string().min(1, 'Condição principal é obrigatória'),
    insurancePlan: z.string().optional(),
    insuranceNumber: z.string().optional(),
    insuranceValidity: commonSchemas.isoDate.optional(),
    maritalStatus: z.string().optional(),
    profession: z.string().optional(),
    educationLevel: z.string().optional(),
    bloodType: z.string().optional(),
    allergies: z.string().optional(),
    medications: z.string().optional(),
    weight: z.number().positive().optional(),
    height: z.number().positive().optional(),
  }),
};

/**
 * Appointment status schema - defined separately to avoid "before initialization" error
 * when referenced by base and formData within appointmentSchemas
 */
const appointmentStatusSchema = z.enum([
  'agendado',
  'confirmado',
  'em_atendimento',
  'concluido',
  'cancelado',
  'nao_compareceu',
  'remarcado',
  'aguardando_confirmacao',
  'bloqueado',
  'disponivel',
  'avaliacao',
  'retorno',
  'encaixe',
  'Confirmado',
  'Pendente',
  'Reagendado',
  'Cancelado',
  'Realizado',
]);

/**
 * Appointment validation schemas
 */
export const appointmentSchemas = {
  status: appointmentStatusSchema,

  /**
   * Base appointment schema
   */
  base: z.object({
    id: commonSchemas.entityId,
    patientId: commonSchemas.entityId.optional(),
    patient_id: commonSchemas.entityId.optional(),
    patientName: z.string().optional(),
    patient: z.object({
      id: commonSchemas.entityId,
      name: z.string(),
      full_name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    }).optional(),
    therapistId: commonSchemas.entityId.optional(),
    therapist_id: commonSchemas.entityId.optional(),
    therapist: z.object({
      id: commonSchemas.entityId,
      name: z.string(),
      email: z.string().optional(),
    }).optional(),
    date: z.string().optional(),
    appointment_date: z.string().optional(),
    time: z.string().optional(),
    appointment_time: z.string().optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    duration: z.number().int().positive().optional(),
    status: appointmentStatusSchema.optional(),
    payment_status: z.enum(['pending', 'partial', 'paid', 'overdue', 'cancelled']).optional(),
    session_type: z.enum(['individual', 'group']).optional(),
    notes: z.string().optional(),
    phone: z.string().optional(),
    type: z.enum(['Consulta Inicial', 'Fisioterapia', 'Reavaliação', 'Consulta de Retorno']).optional(),
    createdAt: z.string().optional(),
    created_at: z.string().optional(),
    updatedAt: z.string().optional(),
    updated_at: z.string().optional(),
  }),

  /**
   * Appointment form data
   */
  formData: z.object({
    patientId: commonSchemas.entityId,
    date: z.string(),
    time: z.string(),
    duration: z.number().int().positive(),
    type: z.enum(['Consulta Inicial', 'Fisioterapia', 'Reavaliação', 'Consulta de Retorno']),
    notes: z.string().optional(),
    status: appointmentStatusSchema.default('agendado'),
  }),

  /**
   * Recurring appointment pattern
   */
  recurringPattern: z.object({
    frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
    interval: z.number().int().min(1).default(1),
    endDate: commonSchemas.isoDate.optional(),
    occurrences: z.number().int().positive().optional(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  }),
};

/**
 * Exercise plan item schema - defined separately to avoid self-reference in exerciseSchemas
 */
const exercisePlanItemSchema = z.object({
  exerciseId: commonSchemas.entityId,
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  restTime: z.number().int().nonnegative(),
  notes: z.string().optional(),
});

/**
 * Exercise validation schemas
 */
export const exerciseSchemas = {
  base: z.object({
    id: commonSchemas.entityId,
    name: z.string().min(1),
    category: z.string().optional(),
    difficulty: z.string().optional(),
    video_url: commonSchemas.url.optional(),
    image_url: commonSchemas.url.optional(),
    description: z.string().optional(),
    instructions: z.string().optional(),
    sets: z.number().int().nonnegative().optional(),
    repetitions: z.number().int().nonnegative().optional(),
    duration: z.number().int().nonnegative().optional(),
    targetMuscles: z.array(z.string()).optional(),
    equipment: z.array(z.string()).optional(),
    indicated_pathologies: z.array(z.string()).optional(),
    contraindicated_pathologies: z.array(z.string()).optional(),
    body_parts: z.array(z.string()).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  }),

  planItem: exercisePlanItemSchema,

  plan: z.object({
    id: commonSchemas.entityId,
    name: z.string().min(1),
    description: z.string(),
    patientId: commonSchemas.entityId,
    exercises: z.array(exercisePlanItemSchema),
    status: z.enum(['Ativo', 'Inativo', 'Concluído']),
    createdAt: commonSchemas.isoDate,
    updatedAt: commonSchemas.isoDate,
  }),
};

/**
 * Financial status schema - defined separately to avoid self-reference in financialSchemas
 */
const financialStatusSchema = z.enum(['pending', 'partial', 'paid', 'overdue', 'cancelled']);

/**
 * Financial validation schemas
 */
export const financialSchemas = {
  status: financialStatusSchema,

  payment: z.object({
    id: commonSchemas.entityId,
    patientId: commonSchemas.entityId,
    appointmentId: commonSchemas.entityId.optional(),
    amount: z.number().positive(),
    paidAmount: z.number().nonnegative().optional(),
    status: financialStatusSchema,
    paymentMethod: z.enum(['cash', 'card', 'pix', 'transfer', 'check']).optional(),
    paymentDate: commonSchemas.isoDate.optional(),
    notes: z.string().optional(),
    createdAt: commonSchemas.isoDate,
    updatedAt: commonSchemas.isoDate,
  }),

  /**
   * Transaction schema
   */
  transaction: z.object({
    id: commonSchemas.entityId,
    patientId: commonSchemas.entityId.optional(),
    type: z.enum(['income', 'expense']),
    category: z.string(),
    amount: z.number(),
    description: z.string().optional(),
    date: commonSchemas.isoDate,
    createdAt: commonSchemas.isoDate,
  }),
};

/**
 * User role schema - defined separately to avoid self-reference in userSchemas
 */
const userRoleSchema = z.enum(['admin', 'fisioterapeuta', 'estagiario', 'recepcionista', 'paciente', 'owner']);

/**
 * User/Profile validation schemas
 */
export const userSchemas = {
  role: userRoleSchema,

  profile: z.object({
    id: commonSchemas.entityId,
    uid: commonSchemas.entityId,
    email: commonSchemas.email,
    name: z.string().min(1),
    full_name: z.string().optional(),
    role: userRoleSchema,
    organization_id: commonSchemas.entityId.optional(),
    phone: commonSchemas.phone.optional(),
    specialization: z.string().optional(),
    license_number: z.string().optional(),
    createdAt: commonSchemas.isoDate,
    updatedAt: commonSchemas.isoDate,
  }),

  /**
   * Auth user schema (Firebase Auth)
   */
  authUser: z.object({
    uid: commonSchemas.entityId,
    email: commonSchemas.email,
    emailVerified: z.boolean(),
    displayName: z.string().optional(),
    photoURL: commonSchemas.url.optional(),
    phoneNumber: commonSchemas.phone.optional(),
    disabled: z.boolean(),
    metadata: z.object({
      creationTime: z.string(),
      lastSignInTime: z.string().optional(),
    }),
  }),
};

/**
 * SOAP Record validation schemas
 */
export const soapSchemas = {
  /**
   * Base SOAP record
   */
  base: z.object({
    id: commonSchemas.entityId,
    patientId: commonSchemas.entityId,
    appointmentId: commonSchemas.entityId.optional(),
    sessionNumber: z.number().int().positive(),
    subjective: z.string().optional(),
    objective: z.record(z.unknown()).optional(),
    assessment: z.string().optional(),
    plan: z.record(z.unknown()).optional(),
    vitalSigns: z.object({
      blood_pressure: z.object({
        systolic: z.number().int().positive(),
        diastolic: z.number().int().positive(),
      }).optional(),
      heart_rate: z.number().int().positive().optional(),
      temperature: z.number().positive().optional(),
      respiratory_rate: z.number().int().positive().optional(),
      oxygen_saturation: z.number().int().min(0).max(100).optional(),
    }).optional(),
    functionalTests: z.record(z.unknown()).optional(),
    createdBy: commonSchemas.entityId,
    createdAt: commonSchemas.isoDate,
    updatedAt: commonSchemas.isoDate,
    signedAt: commonSchemas.isoDate.optional(),
    signatureHash: z.string().optional(),
  }),

  /**
   * Form data for creating/editing SOAP
   */
  formData: z.object({
    patientId: commonSchemas.entityId,
    appointmentId: commonSchemas.entityId.optional(),
    sessionNumber: z.number().int().positive().default(1),
    subjective: z.string().optional(),
    assessment: z.string().optional(),
  }),
};

/**
 * Helper functions for safe parsing
 */

/**
 * Safely parse API response with Zod schema
 * Returns validated data or throws ApiError
 */
export async function parseApiResponse<T>(
  schema: z.ZodType<T>,
  response: Response
): Promise<T> {
  const rawData = await response.json();

  try {
    return schema.parse(rawData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('[Zod Validation Error]', error.errors, 'api-validations');
      throw new Error(
        `API response validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }
    throw error;
  }
}

/**
 * Safely parse unknown data with Zod schema
 * Returns { success: true, data } or { success: false, error }
 */
export function safeParse<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Type guard for validated data
 */
export function isValidData<T>(
  schema: z.ZodType<T>,
  data: unknown
): data is T {
  const result = schema.safeParse(data);
  return result.success;
}

/**
 * Validate and log errors if validation fails
 */
export function validateWithLogging<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: string
): T | null {
  const result = schema.safeParse(data);

  if (!result.success) {
    logger.error(`[Validation Error - ${context}]`, result.error.errors, 'api-validations');
    return null;
  }

  return result.data;
}
