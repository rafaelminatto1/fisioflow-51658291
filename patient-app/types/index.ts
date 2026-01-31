// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'professional' | 'admin';
  clinicId?: string;
  avatarUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Exercise types
export interface Exercise {
  id: string;
  name: string;
  description: string;
  sets: number;
  reps: number;
  duration?: number; // in seconds
  videoUrl?: string;
  imageUrl?: string;
  instructions?: string[];
  completed?: boolean;
  completedAt?: Date;
}

// Appointment types
export interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
  professionalName: string;
  type: string;
  date: Date;
  duration: number; // in minutes
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  location?: string;
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
  exercises: Exercise[];
  frequency: 'daily' | 'weekly' | 'custom';
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'appointment' | 'exercise' | 'message' | 'system';
  read: boolean;
  data?: Record<string, any>;
  createdAt: Date;
}
