import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ========== PATIENTS SCHEMAS ==========

export const patientCreateSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos'),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido'),
  birth_date: z.string().refine(val => !isNaN(Date.parse(val)), 'Data de nascimento inválida'),
  gender: z.enum(['M', 'F', 'O']).optional(),
  address: z.object({
    zip_code: z.string().optional(),
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
  }).optional(),
  emergency_contact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    relationship: z.string().optional(),
  }).optional(),
  insurance: z.object({
    provider: z.string().optional(),
    plan_name: z.string().optional(),
    card_number: z.string().optional(),
    valid_until: z.string().optional(),
  }).optional(),
  origin: z.string().optional(),
  notes: z.string().optional(),
});

export const patientUpdateSchema = patientCreateSchema.partial();

// ========== APPOINTMENTS SCHEMAS ==========

export const appointmentCreateSchema = z.object({
  patient_id: z.string().uuid('ID do paciente inválido'),
  therapist_id: z.string().uuid('ID do terapeuta inválido').optional(),
  start_time: z.string().refine(val => !isNaN(Date.parse(val)), 'Data/hora de início inválida'),
  duration: z.number().refine(val => [30, 60, 90].includes(val), 'Duração deve ser 30, 60 ou 90 minutos'),
  notes: z.string().optional(),
});

export const appointmentUpdateSchema = z.object({
  start_time: z.string().refine(val => !isNaN(Date.parse(val)), 'Data/hora de início inválida').optional(),
  duration: z.number().refine(val => [30, 60, 90].includes(val), 'Duração deve ser 30, 60 ou 90 minutos').optional(),
  therapist_id: z.string().uuid('ID do terapeuta inválido').optional(),
  notes: z.string().optional(),
});

export const appointmentCancelSchema = z.object({
  reason: z.string().optional(),
  cancelled_by: z.enum(['patient', 'clinic', 'system']).optional(),
});

// ========== SESSIONS SCHEMAS ==========

export const sessionCreateSchema = z.object({
  appointment_id: z.string().uuid('ID do agendamento inválido'),
});

export const sessionUpdateSchema = z.object({
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  eva_score: z.number().min(0).max(10).optional(),
});

// ========== PAIN MAP SCHEMAS ==========

export const painPointCreateSchema = z.object({
  region_code: z.string().min(1, 'Código da região é obrigatório'),
  intensity: z.number().min(0).max(10),
  pain_type: z.enum(['sharp', 'throbbing', 'burning', 'tingling', 'numbness', 'stiffness']),
  notes: z.string().optional(),
});

export const painMapCreateSchema = z.object({
  view: z.enum(['front', 'back']),
  points: z.array(painPointCreateSchema).min(1, 'Pelo menos um ponto de dor é obrigatório'),
});

// ========== WAITLIST SCHEMAS ==========

export const waitlistCreateSchema = z.object({
  patient_id: z.string().uuid('ID do paciente inválido'),
  preferred_days: z.array(z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'])),
  preferred_periods: z.array(z.enum(['morning', 'afternoon', 'evening'])),
  preferred_therapist_id: z.string().uuid().optional(),
  priority: z.enum(['normal', 'high', 'urgent']).default('normal'),
  notes: z.string().optional(),
});

export const waitlistOfferSchema = z.object({
  appointment_slot: z.string().refine(val => !isNaN(Date.parse(val)), 'Data/hora inválida'),
});

// ========== PACKAGES SCHEMAS ==========

export const packageCreateSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  sessions_count: z.number().int().min(1, 'Deve ter pelo menos 1 sessão'),
  price: z.number().min(0, 'Preço deve ser positivo'),
  validity_days: z.number().int().min(1, 'Validade deve ser pelo menos 1 dia'),
});

export const patientPackageCreateSchema = z.object({
  patient_id: z.string().uuid('ID do paciente inválido'),
  package_id: z.string().uuid('ID do pacote inválido'),
});

// ========== PAYMENTS SCHEMAS ==========

export const paymentCreateSchema = z.object({
  patient_id: z.string().uuid('ID do paciente inválido'),
  transaction_id: z.string().uuid().optional(),
  amount: z.number().min(0, 'Valor deve ser positivo'),
  method: z.enum(['pix', 'credit_card', 'debit_card', 'cash', 'transfer']),
});

export const checkoutCreateSchema = z.object({
  patient_id: z.string().uuid('ID do paciente inválido'),
  items: z.array(z.object({
    type: z.enum(['session', 'package']),
    id: z.string().uuid(),
    quantity: z.number().int().min(1),
  })),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
});

// ========== EXERCISES SCHEMAS ==========

export const exerciseCreateSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  category_id: z.string().uuid('ID da categoria inválido'),
  video_url: z.string().url('URL do vídeo inválida'),
  thumbnail_url: z.string().url('URL da thumbnail inválida').optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
});

// ========== PRESCRIPTIONS SCHEMAS ==========

export const prescriptionItemSchema = z.object({
  exercise_id: z.string().uuid('ID do exercício inválido'),
  sets: z.number().int().min(1, 'Deve ter pelo menos 1 série'),
  reps: z.number().int().min(1, 'Deve ter pelo menos 1 repetição'),
  hold_seconds: z.number().int().optional(),
  notes: z.string().optional(),
});

export const prescriptionCreateSchema = z.object({
  patient_id: z.string().uuid('ID do paciente inválido'),
  frequency: z.string().min(1, 'Frequência é obrigatória'),
  items: z.array(prescriptionItemSchema).min(1, 'Pelo menos um exercício é obrigatório'),
});

// ========== WHATSAPP SCHEMAS ==========

export const whatsappSendSchema = z.object({
  patient_id: z.string().uuid('ID do paciente inválido'),
  message: z.string().min(1, 'Mensagem é obrigatória').max(4096, 'Mensagem muito longa'),
});

// ========== REPORTS SCHEMAS ==========

export const dashboardQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'quarter', 'year']).default('month'),
});

export const financialReportQuerySchema = z.object({
  start_date: z.string().refine(val => !isNaN(Date.parse(val)), 'Data de início inválida'),
  end_date: z.string().refine(val => !isNaN(Date.parse(val)), 'Data de fim inválida'),
});

// ========== MEDICAL RECORD SCHEMAS ==========

export const medicalRecordUpdateSchema = z.object({
  chief_complaint: z.string().optional(),
  history_current: z.string().optional(),
  history_past: z.string().optional(),
  medications: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  physical_activity: z.string().optional(),
});

// ========== HELPER FUNCTIONS ==========

export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errorMessages = result.error.issues.map(i => i.message).join(', ');
    return { success: false, error: errorMessages };
  }
  
  return { success: true, data: result.data };
}

