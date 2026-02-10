// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'professional' | 'admin';
  clinicId?: string;
  avatarUrl?: string;
  specialty?: string;
  crefito?: string;
  phone?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

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
  organization_id?: string;
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
