import { z } from "zod";

// Enum schemas
export const sessionStatusSchema = z.enum(['scheduled', 'completed', 'missed', 'cancelled', 'rescheduled']);
export const paymentStatusSchema = z.enum(['pending', 'paid', 'partial']);
export const sessionTypeSchema = z.enum(['individual', 'group']);
export const paymentTypeSchema = z.enum(['session', 'package']);
export const paymentMethodSchema = z.enum(['cash', 'card', 'pix', 'transfer']);
export const userRoleSchema = z.enum(['admin', 'therapist', 'intern', 'patient']);

// Time validation helpers
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const timeSchema = z.string().regex(timeRegex, "Horário deve estar no formato HH:MM");
export const dateSchema = z.string().regex(dateRegex, "Data deve estar no formato YYYY-MM-DD");

// Base schemas
export const appointmentSchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  therapist_id: z.string().uuid(),
  date: dateSchema,
  start_time: timeSchema,
  end_time: timeSchema,
  status: sessionStatusSchema,
  payment_status: paymentStatusSchema,
  session_type: sessionTypeSchema,
  notes: z.string().max(1000, "Observações não podem ter mais de 1000 caracteres"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
}).refine((data) => {
  // Validate that end_time is after start_time
  const [startHour, startMin] = data.start_time.split(':').map(Number);
  const [endHour, endMin] = data.end_time.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return endMinutes > startMinutes;
}, {
  message: "Horário de término deve ser posterior ao horário de início",
  path: ["end_time"]
});

export const patientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome não pode ter mais de 100 caracteres"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 caracteres").max(15, "Telefone não pode ter mais de 15 caracteres"),
  email: z.string().email("Formato de email inválido").max(255, "Email não pode ter mais de 255 caracteres"),
  session_price: z.number().min(0, "Preço da sessão deve ser positivo").max(9999.99, "Preço da sessão muito alto"),
  package_sessions: z.number().int().min(0, "Sessões do pacote devem ser não negativas").max(999, "Sessões do pacote muito altas"),
  remaining_sessions: z.number().int().min(0, "Sessões restantes devem ser não negativas").max(999, "Sessões restantes muito altas"),
  important_notes: z.string().max(2000, "Observações importantes não podem ter mais de 2000 caracteres"),
  status: z.enum(['active', 'inactive']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const paymentSchema = z.object({
  id: z.string().uuid(),
  appointment_id: z.string().uuid(),
  amount: z.number().min(0, "Valor deve ser positivo").max(99999.99, "Valor muito alto"),
  payment_type: paymentTypeSchema,
  sessions_count: z.number().int().min(1, "Quantidade de sessões deve ser pelo menos 1").max(999, "Quantidade de sessões muito alta").optional(),
  payment_method: paymentMethodSchema,
  paid_at: z.string().datetime(),
  notes: z.string().max(500, "Observações do pagamento não podem ter mais de 500 caracteres"),
  created_at: z.string().datetime(),
}).refine((data) => {
  // If payment_type is 'package', sessions_count is required
  if (data.payment_type === 'package' && !data.sessions_count) {
    return false;
  }
  return true;
}, {
  message: "Quantidade de sessões é obrigatória para pagamentos de pacote",
  path: ["sessions_count"]
});

export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome não pode ter mais de 100 caracteres"),
  email: z.string().email("Formato de email inválido").max(255, "Email não pode ter mais de 255 caracteres"),
  role: userRoleSchema,
  created_at: z.string().datetime(),
});

// Creation/Update schemas (without generated fields)
export const createAppointmentSchema = z.object({
  patient_id: z.string().uuid(),
  therapist_id: z.string().uuid(),
  date: dateSchema,
  start_time: timeSchema,
  end_time: timeSchema,
  session_type: sessionTypeSchema,
  notes: z.string().max(1000, "Observações não podem ter mais de 1000 caracteres").optional().default(""),
}).refine((data) => {
  // Validate that end_time is after start_time
  const [startHour, startMin] = data.start_time.split(':').map(Number);
  const [endHour, endMin] = data.end_time.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return endMinutes > startMinutes;
}, {
  message: "Horário de término deve ser posterior ao horário de início",
  path: ["end_time"]
}).refine((data) => {
  // Validate business hours (7:00 - 19:00)
  const [startHour] = data.start_time.split(':').map(Number);
  const [endHour] = data.end_time.split(':').map(Number);
  return startHour >= 7 && endHour <= 19;
}, {
  message: "Agendamentos devem estar entre 7:00 e 19:00",
  path: ["start_time"]
});

export const updateAppointmentSchema = z.object({
  date: dateSchema.optional(),
  start_time: timeSchema.optional(),
  end_time: timeSchema.optional(),
  status: sessionStatusSchema.optional(),
  payment_status: paymentStatusSchema.optional(),
  session_type: sessionTypeSchema.optional(),
  notes: z.string().max(1000, "Observações não podem ter mais de 1000 caracteres").optional(),
}).refine((data) => {
  // If both start_time and end_time are provided, validate them
  if (data.start_time && data.end_time) {
    const [startHour, startMin] = data.start_time.split(':').map(Number);
    const [endHour, endMin] = data.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return endMinutes > startMinutes;
  }
  return true;
}, {
  message: "Horário de término deve ser posterior ao horário de início",
  path: ["end_time"]
});

export const createPaymentSchema = z.object({
  appointment_id: z.string().uuid(),
  amount: z.number().min(0, "Valor deve ser positivo").max(99999.99, "Valor muito alto"),
  payment_type: paymentTypeSchema,
  sessions_count: z.number().int().min(1, "Quantidade de sessões deve ser pelo menos 1").max(999, "Quantidade de sessões muito alta").optional(),
  payment_method: paymentMethodSchema,
  notes: z.string().max(500, "Observações do pagamento não podem ter mais de 500 caracteres").optional().default(""),
}).refine((data) => {
  // If payment_type is 'package', sessions_count is required
  if (data.payment_type === 'package' && !data.sessions_count) {
    return false;
  }
  return true;
}, {
  message: "Quantidade de sessões é obrigatória para pagamentos de pacote",
  path: ["sessions_count"]
});

// Filter schemas
export const agendaFiltersSchema = z.object({
  therapist_id: z.string().uuid().optional(),
  status: z.array(sessionStatusSchema).optional(),
  payment_status: z.array(paymentStatusSchema).optional(),
  date_from: dateSchema.optional(),
  date_to: dateSchema.optional(),
}).refine((data) => {
  // If both date_from and date_to are provided, validate range
  if (data.date_from && data.date_to) {
    return new Date(data.date_from) <= new Date(data.date_to);
  }
  return true;
}, {
  message: "Data inicial deve ser anterior ou igual à data final",
  path: ["date_to"]
});

// Export inferred types
export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type PatientInput = z.infer<typeof patientSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type AgendaFiltersInput = z.infer<typeof agendaFiltersSchema>;

export const appointmentFormSchema = z.object({
  patient_id: z.string().min(1, "Selecione um paciente"),
  appointment_date: dateSchema,
  appointment_time: timeSchema,
  duration: z.number().min(1, "Duração deve ser pelo menos 1 minuto"),
  type: z.string().min(1, "Selecione o tipo de agendamento"),
  status: sessionStatusSchema,
  notes: z.string().optional().nullable(),
  therapist_id: z.string().optional().nullable(),
  room: z.string().optional().nullable(),
  payment_status: z.string().optional().nullable(),
  payment_amount: z.number().optional().nullable(),
  payment_method: z.string().optional().nullable(),
  installments: z.number().optional().nullable(),
  session_package_id: z.string().optional().nullable(),
  is_recurring: z.boolean().optional().nullable(),
  recurring_until: z.string().optional().nullable(),
}).refine((data) => {
  if (data.is_recurring && data.recurring_until) {
    return new Date(data.recurring_until) > new Date(data.appointment_date);
  }
  return true;
}, {
  message: "Data final da recorrência deve ser posterior à data do agendamento",
  path: ["recurring_until"]
});