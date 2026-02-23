/**
 * Índice de Schemas Zod
 *
 * Centraliza os exports de schemas para facilitar importação e uso consistente.
 *
 * Uso:
 * ```ts
 * import { patientSchema, PatientCreate, PatientUpdate, Patient } from '@/lib/schemas/patient.schema';
 * import { appointmentSchema, AppointmentCreate, AppointmentUpdate, Appointment } from '@/lib/schemas/appointment.schema';
 * ```
 */

// Schemas de Paciente
export * from './patient.schema';

// Schemas de Agendamento
export * from './appointment.schema';

// Schemas de Exercícios
export * from './exercise.schema';
