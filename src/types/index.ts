// Core data types for the FisioFlow application

// Re-export agenda types
export * from './agenda';
export type { EnhancedAppointment } from './appointment';

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  rg?: string;
  birthDate: string;
  gender: 'masculino' | 'feminino' | 'outro';
  address?: string;
  emergencyContact?: string;
  emergencyContactRelationship?: string;
  medicalHistory?: string;
  mainCondition: string;
  status: 'Em Tratamento' | 'Recuperação' | 'Inicial' | 'Concluído';
  progress: number;
  insurancePlan?: string;
  insuranceNumber?: string;
  insuranceValidity?: string;
  maritalStatus?: string;
  profession?: string;
  educationLevel?: string;
  bloodType?: string;
  allergies?: string;
  medications?: string;
  weight?: number;
  height?: number;
  createdAt: string;
  updatedAt: string;
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
  category: 'fortalecimento' | 'alongamento' | 'mobilidade' | 'cardio' | 'equilibrio' | 'respiratorio';
  difficulty: 'iniciante' | 'intermediario' | 'avancado';
  duration: string;
  description: string;
  instructions: string;
  targetMuscles: string[];
  equipment?: string[];
  contraindications?: string;
  createdAt: Date;
  updatedAt: Date;
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