// Core data types for the FisioFlow application

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: Date;
  gender: 'masculino' | 'feminino' | 'outro';
  address: string;
  emergencyContact: string;
  medicalHistory?: string;
  mainCondition: string;
  status: 'Em Tratamento' | 'Recuperação' | 'Inicial' | 'Concluído';
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: Date;
  time: string;
  duration: number;
  type: 'Consulta Inicial' | 'Fisioterapia' | 'Reavaliação' | 'Consulta de Retorno';
  status: 'Confirmado' | 'Pendente' | 'Reagendado' | 'Cancelado' | 'Realizado';
  notes?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
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

// Form data types (for react-hook-form)
export type PatientFormData = Omit<Patient, 'id' | 'status' | 'progress' | 'createdAt' | 'updatedAt'>;
export type AppointmentFormData = Omit<Appointment, 'id' | 'patientName' | 'phone' | 'createdAt' | 'updatedAt'>;
export type ExerciseFormData = Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>;