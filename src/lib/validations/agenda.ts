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

export const timeSchema = z.string().regex(timeRegex, "Time must be in HH:MM format");
export const dateSchema = z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format");

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
  notes: z.string().max(1000, "Notes must be less than 1000 characters"),
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
  message: "End time must be after start time",
  path: ["end_time"]
});

export const patientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  phone: z.string().min(10, "Phone must be at least 10 characters").max(15, "Phone must be less than 15 characters"),
  email: z.string().email("Invalid email format").max(255, "Email must be less than 255 characters"),
  session_price: z.number().min(0, "Session price must be positive").max(9999.99, "Session price too high"),
  package_sessions: z.number().int().min(0, "Package sessions must be non-negative").max(999, "Package sessions too high"),
  remaining_sessions: z.number().int().min(0, "Remaining sessions must be non-negative").max(999, "Remaining sessions too high"),
  important_notes: z.string().max(2000, "Important notes must be less than 2000 characters"),
  status: z.enum(['active', 'inactive']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const paymentSchema = z.object({
  id: z.string().uuid(),
  appointment_id: z.string().uuid(),
  amount: z.number().min(0, "Amount must be positive").max(99999.99, "Amount too high"),
  payment_type: paymentTypeSchema,
  sessions_count: z.number().int().min(1, "Sessions count must be at least 1").max(999, "Sessions count too high").optional(),
  payment_method: paymentMethodSchema,
  paid_at: z.string().datetime(),
  notes: z.string().max(500, "Payment notes must be less than 500 characters"),
  created_at: z.string().datetime(),
}).refine((data) => {
  // If payment_type is 'package', sessions_count is required
  if (data.payment_type === 'package' && !data.sessions_count) {
    return false;
  }
  return true;
}, {
  message: "Sessions count is required for package payments",
  path: ["sessions_count"]
});

export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  email: z.string().email("Invalid email format").max(255, "Email must be less than 255 characters"),
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
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional().default(""),
}).refine((data) => {
  // Validate that end_time is after start_time
  const [startHour, startMin] = data.start_time.split(':').map(Number);
  const [endHour, endMin] = data.end_time.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return endMinutes > startMinutes;
}, {
  message: "End time must be after start time",
  path: ["end_time"]
}).refine((data) => {
  // Validate business hours (7:00 - 19:00)
  const [startHour] = data.start_time.split(':').map(Number);
  const [endHour] = data.end_time.split(':').map(Number);
  return startHour >= 7 && endHour <= 19;
}, {
  message: "Appointments must be between 7:00 and 19:00",
  path: ["start_time"]
});

export const updateAppointmentSchema = z.object({
  date: dateSchema.optional(),
  start_time: timeSchema.optional(),
  end_time: timeSchema.optional(),
  status: sessionStatusSchema.optional(),
  payment_status: paymentStatusSchema.optional(),
  session_type: sessionTypeSchema.optional(),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
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
  message: "End time must be after start time",
  path: ["end_time"]
});

export const createPaymentSchema = z.object({
  appointment_id: z.string().uuid(),
  amount: z.number().min(0, "Amount must be positive").max(99999.99, "Amount too high"),
  payment_type: paymentTypeSchema,
  sessions_count: z.number().int().min(1, "Sessions count must be at least 1").max(999, "Sessions count too high").optional(),
  payment_method: paymentMethodSchema,
  notes: z.string().max(500, "Payment notes must be less than 500 characters").optional().default(""),
}).refine((data) => {
  // If payment_type is 'package', sessions_count is required
  if (data.payment_type === 'package' && !data.sessions_count) {
    return false;
  }
  return true;
}, {
  message: "Sessions count is required for package payments",
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
  message: "Date from must be before or equal to date to",
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