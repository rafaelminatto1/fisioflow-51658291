// Core data types for the FisioFlow application

// Re-export agenda types (includes schedule configuration types)
export * from './agenda';
export type { EnhancedAppointment } from './appointment';

// Common type definitions (replaces `any` usages)
// Note: PaymentStatus and UserRole are also exported from agenda.ts with different values
// We're using the common.ts versions as the canonical types
export type {
  ErrorHandler,
  AsyncErrorHandler,
  UnknownError,
  IconComponent,
  LucideIconType,
  ValueChangeHandler,
  AsyncValueChangeHandler,
  ChangeEventHandler,
  AsyncFunction,
  PromiseResult,
  TimerId,
  EntityId,
  UserId,
  PatientId,
  AppointmentId,
  OrganizationId,
  ExerciseId,
  SessionId,
  TreatmentId,
  PaymentStatus,
  UserRole,
  QueryParams,
  PaginationParams,
  PaginatedMeta,
  SelectionState,
  SortDirection,
  FilterOperator,
  Filter,
  DateRange,
  FileUpload,
  ServiceResult,
  Dictionary,
  ErrorMap,
} from './common';

// API type definitions
export * from './api';

// Component type definitions
export * from './components';

// Unified Appointment type that consolidates both camelCase and snake_case
// This provides compatibility between database schema (snake_case) and app code (camelCase)
export interface AppointmentUnified {
  // Primary fields
  id: string;

  // Patient fields - both naming conventions supported
  patientId?: string;
  patient_id?: string;
  patientName?: string;
  patient?: {
    id: string;
    name: string;
    full_name?: string; // Database field
    phone?: string;
    email?: string;
  };

  // Therapist fields
  therapistId?: string;
  therapist_id?: string;
  therapist?: {
    id: string;
    name: string;
    email?: string;
  };

  // Date/Time fields - both naming conventions supported
  date?: string; // Legacy format
  appointment_date?: string; // Database format
  time?: string; // Legacy format
  appointment_time?: string; // Database format
  start_time?: string; // New agenda format
  end_time?: string; // New agenda format
  duration?: number;

  // Status fields
  status?: AppointmentStatus;
  payment_status?: 'pending' | 'paid' | 'partial';
  session_type?: 'individual' | 'group';

  // Notes and metadata
  notes?: string;
  phone?: string;

  // Timestamps
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;

  // Type for appointments
  type?: 'Consulta Inicial' | 'Fisioterapia' | 'Reavaliação' | 'Consulta de Retorno';
}

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'missed'
  | 'cancelled'
  | 'rescheduled'
  | 'Confirmado'
  | 'Pendente'
  | 'Reagendado'
  | 'Cancelado'
  | 'Realizado'
  | 'no_show'
  | 'in_progress';

export interface Patient {
  id: string;
  name: string;
  full_name?: string; // Added for compatibility
  email?: string;
  phone?: string;
  cpf?: string;
  rg?: string;
  birthDate: string;
  birth_date?: string; // Database compatibility
  gender: 'masculino' | 'feminino' | 'outro' | string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  
  // Contact & Emergency
  emergencyContact?: string;
  emergency_contact?: string; // Database compatibility
  emergencyContactRelationship?: string;
  emergency_phone?: string;
  
  // Clinical
  medicalHistory?: string;
  mainCondition: string;
  status: 'Em Tratamento' | 'Recuperação' | 'Inicial' | 'Concluído' | string;
  progress: number;
  observations?: string;
  
  // Insurance
  insurancePlan?: string;
  health_insurance?: string; // Database compatibility
  insuranceNumber?: string;
  insurance_number?: string; // Database compatibility
  insuranceValidity?: string;
  
  // Demographics
  maritalStatus?: string;
  profession?: string;
  educationLevel?: string;
  
  // Medical Details
  bloodType?: string;
  allergies?: string;
  medications?: string;
  weight?: number;
  height?: number;
  
  photo_url?: string;
  
  incomplete_registration?: boolean;
  
  // Retorno médico / médico assistente (vinculado ao paciente)
  referring_doctor_name?: string;
  referringDoctorName?: string; // Alias
  referring_doctor_phone?: string;
  referringDoctorPhone?: string; // Alias
  medical_return_date?: string; // ISO date - data prevista do retorno ao médico
  medicalReturnDate?: string;
  medical_report_done?: boolean; // relatório médico já foi feito
  medicalReportDone?: boolean;
  medical_report_sent?: boolean; // relatório já foi enviado ao médico
  medicalReportSent?: boolean;
  
  createdAt: string;
  created_at?: string; // Database compatibility
  updatedAt: string;
  updated_at?: string; // Database compatibility
}

export interface PatientDocument {
  id: string;
  patientId: string;
  name: string;
  type: 'identity' | 'medical_exam' | 'insurance' | 'consent' | 'prescription' | 'other';
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientConsent {
  id: string;
  patientId: string;
  consentType: 'data_processing' | 'image_usage' | 'treatment_terms' | 'communication';
  granted: boolean;
  grantedAt?: Date;
  grantedBy?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface SOAPRecord {
  id: string;
  patientId: string;
  appointmentId?: string;
  sessionNumber: number;
  subjective?: string; // Queixa do paciente
  objective?: {
    inspection?: string;
    palpation?: string;
    movement_tests?: Record<string, string>;
    special_tests?: Record<string, boolean>;
    posture_analysis?: string;
  }; // Exame físico estruturado (JSON)
  assessment?: string; // Avaliação/Diagnóstico
  plan?: {
    short_term_goals?: string[];
    long_term_goals?: string[];
    interventions?: string[];
    frequency?: string;
    duration?: string;
    home_exercises?: string[];
  }; // Plano de tratamento (JSON)
  vitalSigns?: {
    blood_pressure?: string;
    heart_rate?: number;
    temperature?: number;
    respiratory_rate?: number;
    oxygen_saturation?: number;
  }; // Sinais vitais (JSON)
  functionalTests?: {
    range_of_motion?: Record<string, number>;
    muscle_strength?: Record<string, number>;
    balance_tests?: Record<string, string>;
    functional_scales?: Record<string, number>;
  }; // Testes funcionais (JSON)
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  signedAt?: Date;
  signatureHash?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  duration: number;
  type: 'Consulta Inicial' | 'Fisioterapia' | 'Reavaliação' | 'Consulta de Retorno';
  status: 'Confirmado' | 'Pendente' | 'Reagendado' | 'Cancelado' | 'Realizado';
  notes?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  category?: string;
  difficulty?: string;
  video_url?: string;
  image_url?: string;
  description?: string;
  instructions?: string;
  sets?: number;
  repetitions?: number;
  duration?: number;
  targetMuscles?: string[];
  equipment?: string[];
  indicated_pathologies?: string[];
  contraindicated_pathologies?: string[];
  body_parts?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ExercisePlan {
  id: string;
  name: string;
  description: string;
  patientId: string;
  exercises: ExercisePlanItem[];
  status: 'Ativo' | 'Inativo' | 'Concluído';
  createdAt: Date;
  updatedAt: Date;
}

export interface ExercisePlanItem {
  exerciseId: string;
  sets: number;
  reps: number;
  restTime: number;
  notes?: string;
}

// Medical Record types
export interface MedicalRecord {
  id: string;
  patientId: string;
  type: 'Anamnese' | 'Evolução' | 'Avaliação' | 'Exame' | 'Receituário';
  title: string;
  content: string;
  attachments?: MedicalAttachment[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // professional ID/name
}

export interface MedicalAttachment {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'document';
  url: string;
  size: number;
  uploadedAt: Date;
}

export interface TreatmentSession {
  id: string;
  patientId: string;
  appointmentId: string;
  exercisePlanId?: string;
  observations: string;
  painLevel: number; // 0-10 scale
  evolutionNotes: string;
  exercisesPerformed: SessionExercise[];
  nextSessionGoals?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionExercise {
  exerciseId: string;
  exerciseName: string;
  setsCompleted: number;
  repsCompleted: number;
  observations?: string;
  difficulty: 'fácil' | 'adequado' | 'difícil';
}

export interface Notification {
  id: string;
  patientId?: string;
  type: 'lembrete_consulta' | 'confirmacao_agendamento' | 'cancelamento' | 'exercicio_pendente';
  title: string;
  message: string;
  status: 'pendente' | 'enviado' | 'lido' | 'falhou';
  scheduledFor?: Date;
  sentAt?: Date;
  method: 'email' | 'sms' | 'whatsapp' | 'push';
  createdAt: Date;
}

// Enhanced ExercisePlan with smart features
export interface SmartExercisePlan {
  id: string;
  name: string;
  description: string;
  patientId: string;
  condition: string;
  objectives: string[];
  exercises: SmartExercisePlanItem[];
  progressionRules: ProgressionRule[];
  status: 'Ativo' | 'Inativo' | 'Concluído';
  createdAt: Date;
  updatedAt: Date;
  lastProgressionDate?: Date;
}

export interface SmartExercisePlanItem {
  exerciseId: string;
  currentSets: number;
  currentReps: number;
  currentWeight?: number;
  restTime: number;
  progressionLevel: number; // 1-10
  notes?: string;
  videoUrl?: string;
  adaptations?: string[];
}

export interface ProgressionRule {
  id: string;
  triggerCondition: 'sessions_completed' | 'pain_reduction' | 'performance_improvement';
  triggerValue: number;
  action: 'increase_reps' | 'increase_sets' | 'increase_weight' | 'advance_exercise';
  actionValue: number;
  description: string;
}

export interface PatientProgress {
  id: string;
  patientId: string;
  date: Date;
  painLevel: number;
  functionalScore: number; // 0-100
  exerciseCompliance: number; // percentage
  notes: string;
  measurements?: BodyMeasurement[];
  createdAt: Date;
}

export interface BodyMeasurement {
  location: string;
  value: number;
  unit: 'cm' | 'kg' | 'degrees' | 'score';
  notes?: string;
}

// Form data types (for react-hook-form)
export type PatientFormData = Omit<Patient, 'id' | 'status' | 'progress' | 'createdAt' | 'updatedAt'>;
export type AppointmentFormData = Omit<Appointment, 'id' | 'patientName' | 'phone' | 'createdAt' | 'updatedAt'>;
export type ExerciseFormData = Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>;
export type MedicalRecordFormData = Omit<MedicalRecord, 'id' | 'createdAt' | 'updatedAt'>;
export type TreatmentSessionFormData = Omit<TreatmentSession, 'id' | 'createdAt' | 'updatedAt'>;
export type SmartExercisePlanFormData = Omit<SmartExercisePlan, 'id' | 'createdAt' | 'updatedAt' | 'lastProgressionDate'>;

// Helper functions for type-safe data access
export const PatientHelpers = {
  getName(patient: Patient | { name?: string; full_name?: string } | null | undefined): string {
    if (!patient) return 'Paciente';
    return patient.full_name || patient.name || 'Paciente';
  },

  getPhone(patient: Patient | { phone?: string } | null | undefined): string | undefined {
    return patient?.phone;
  },

  getId(patient: Patient | { id: string } | null | undefined): string {
    if (!patient) return '';
    return patient.id;
  },

  getInitials(patient: Patient | { name?: string; full_name?: string } | null | undefined): string {
    const name = this.getName(patient);
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
};

// Error handling utility exports (from common.ts) - value exports for runtime
export { getErrorMessage, asError } from './common';

// Appointment utility functions
export function getPatientName(appointment: AppointmentUnified | { patient?: { name?: string; full_name?: string }; patientName?: string } | null | undefined): string {
  if (!appointment) return 'Paciente';
  return appointment.patientName || appointment.patient?.full_name || appointment.patient?.name || 'Paciente';
}

export function getPatientId(appointment: AppointmentUnified | { patientId?: string; patient_id?: string } | null | undefined): string {
  if (!appointment) return '';
  return appointment.patientId || appointment.patient_id || '';
}

export function getDate(appointment: AppointmentUnified | { date?: string; appointment_date?: string } | null | undefined): string {
  if (!appointment) return '';
  return appointment.appointment_date || appointment.date || '';
}

export function getTime(appointment: AppointmentUnified | { time?: string; appointment_time?: string; start_time?: string } | null | undefined): string {
  if (!appointment) return '';
  return appointment.appointment_time || appointment.start_time || appointment.time || '';
}

export function getStatus(appointment: AppointmentUnified | { status?: string } | null | undefined): string {
  if (!appointment) return 'scheduled';
  return appointment.status || 'scheduled';
}

// ============================================================================
// ENTERPRISE TYPES - Novas funcionalidades estratégicas
// ============================================================================

// Time Tracking - Sistema completo de tracking de tempo faturável
export * from './timetracking';

// Wiki/Knowledge Base - Documentação colaborativa estilo Notion
export * from './wiki';

// Automation - Sistema de automações visuais (monday.com/Make style)
export * from './automation';

// Integrations - Integrações com serviços terceiros
export * from './integrations';

// Gantt Chart - Visualização timeline/Gantt avançada
export * from './gantt';