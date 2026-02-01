/**
 * Main types file for FisioFlow Professional iOS App
 * Re-exports common types from the main project
 */

// Re-export types from the main project when available
// For now, define the essential types here

export type AppointmentStatus =
  | 'agendado'
  | 'confirmado'
  | 'em_andamento'
  | 'concluido'
  | 'cancelado'
  | 'faltou'
  | 'avaliacao'
  | 'aguardando_confirmacao'
  | 'em_espera'
  | 'atrasado'
  | 'remarcado'
  | 'reagendado'
  | 'atendido';

export type AppointmentType =
  | 'Consulta Inicial'
  | 'Fisioterapia'
  | 'Reavaliação'
  | 'Consulta de Retorno'
  | 'Avaliação Funcional'
  | 'Terapia Manual'
  | 'Pilates Clínico'
  | 'RPG'
  | 'Dry Needling'
  | 'Liberação Miofascial';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: Date | string;
  time: string;
  duration: number;
  type: AppointmentType;
  status: AppointmentStatus;
  notes?: string;
  phone?: string;
  therapistId?: string;
  room?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type PatientStatus = 'Inicial' | 'Em Tratamento' | 'Recuperação' | 'Concluído';

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  rg?: string;
  birthDate: string;
  gender: 'masculino' | 'feminino' | 'outro' | string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  emergencyContact?: string;
  emergencyContactRelationship?: string;
  emergency_phone?: string;
  medicalHistory?: string;
  mainCondition: string;
  status: PatientStatus;
  progress: number;
  observations?: string;
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
  photo_url?: string;
  incomplete_registration?: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
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
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface ExercisePlan {
  id: string;
  name: string;
  description: string;
  patientId: string;
  exercises: ExercisePlanItem[];
  status: 'Ativo' | 'Inativo' | 'Concluído';
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ExercisePlanItem {
  exerciseId: string;
  sets: number;
  reps: number;
  restTime: number;
  notes?: string;
}

export interface SOAPRecord {
  id: string;
  patientId: string;
  appointmentId?: string;
  sessionNumber: number;
  subjective?: string;
  objective?: {
    inspection?: string;
    palpation?: string;
    movement_tests?: Record<string, string>;
    special_tests?: Record<string, boolean>;
    posture_analysis?: string;
  };
  assessment?: string;
  plan?: {
    short_term_goals?: string[];
    long_term_goals?: string[];
    interventions?: string[];
    frequency?: string;
    duration?: string;
    home_exercises?: string[];
  };
  vitalSigns?: {
    blood_pressure?: string;
    heart_rate?: number;
    temperature?: number;
    respiratory_rate?: number;
    oxygen_saturation?: number;
  };
  functionalTests?: {
    range_of_motion?: Record<string, number>;
    muscle_strength?: Record<string, number>;
    balance_tests?: Record<string, string>;
    functional_scales?: Record<string, number>;
  };
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  signedAt?: Date | string;
  signatureHash?: string;
}

export interface Notification {
  id: string;
  type: 'lembrete_consulta' | 'confirmacao_agendamento' | 'cancelamento' | 'exercicio_pendente' | 'evolucao_pendente';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date | string;
}

export interface Evaluation {
  id: string;
  patientId: string;
  patientName?: string;
  appointmentId?: string;
  chiefComplaint: string;
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  medications?: string;
  examination?: {
    inspection?: string;
    palpation?: string;
    range_of_motion?: Record<string, string>;
    muscle_strength?: Record<string, string>;
    special_tests?: Record<string, boolean>;
  };
  vitalSigns?: {
    blood_pressure?: string;
    heart_rate?: number;
    temperature?: number;
    respiratory_rate?: number;
    oxygen_saturation?: number;
  };
  diagnosis?: string;
  prognosis?: string;
  treatmentPlan?: string;
  recommendations?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Re-export auth types
export * from './auth';
