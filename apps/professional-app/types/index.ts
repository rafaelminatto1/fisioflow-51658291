
export * from './auth';

// Patient types
export interface Patient {
  id: string;
  userId?: string;
  clinicId?: string;
  professionalId?: string;
  name: string;
  email?: string;
  phone?: string;
  birthDate?: Date | string;
  condition?: string;
  diagnosis?: string;
  status: 'active' | 'inactive';
  notes?: string;
  progress?: number;
  startDate?: Date;
  lastVisit?: Date;
  organizationId?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Appointment types
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'agendado' | 'confirmado' | 'em_atendimento' | 'concluido' | 'cancelado';

export interface AppointmentBase {
  id: string;
  patientId: string;
  patientName?: string;
  professionalId: string;
  clinicId?: string;
  date: Date | string;
  time?: string;
  duration: number;
  type: string;
  status: AppointmentStatus;
  notes?: string;
  isGroup?: boolean;
  additionalNames?: string;
  isUnlimited?: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Helper type for status parameter
export type AppointmentStatusParam = AppointmentStatus | string;

export interface Appointment extends AppointmentBase {
  patientName: string;
}

// Exercise types
export interface Exercise {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  videoUrl?: string;
  imageUrl?: string;
  instructions: string[];
  sets?: number;
  reps?: number;
  duration?: number;
  aiConfig?: {
    enabled: boolean;
    type: 'squat' | 'pushup' | 'lateral_raise' | 'plank' | 'lunge';
    targetAngleMin?: number;
    targetAngleMax?: number;
    primaryJoint?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Exercise Program types
export interface ExerciseProgram {
  id: string;
  patientId: string;
  professionalId: string;
  name: string;
  description?: string;
  exercises: ProgramExercise[];
  frequency: 'daily' | 'weekly' | 'custom';
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProgramExercise {
  exerciseId: string;
  exercise: Exercise;
  sets: number;
  reps: number;
  duration?: number;
  notes?: string;
}

// Evolution/Progress types
export interface Evolution {
  id?: string;
  appointmentId?: string;
  patientId: string;
  professionalId: string;
  date?: Date;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  notes?: string;
  painLevel?: number;
  exercises?: any[];
  attachments?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
// Exercise Assignment types
export interface ExerciseAssignment {
  id: string;
  patientId: string;
  exerciseId: string;
  exercise?: Exercise;
  sets: number;
  reps: number;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  completed: boolean;
  progress: number;
  notes?: string;
}

// Treatment Protocol types
export interface TreatmentProtocol {
  id: string;
  name: string;
  description: string;
  category: string;
  condition?: string;
  exercises: ProtocolExercise[];
  professionalId: string;
  isTemplate: boolean;
  isActive: boolean;
  duration?: string;
  evidenceLevel?: string;
  tags?: string[];
  phases?: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProtocolExercise {
  exerciseId: string;
  exercise?: Exercise;
  sets: number;
  reps: number;
  duration?: number;
  frequency: string;
  notes?: string;
  order: number;
}

export interface PatientProtocol {
  id: string;
  patientId: string;
  protocolId: string;
  protocol?: TreatmentProtocol;
  professionalId: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  progress: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
