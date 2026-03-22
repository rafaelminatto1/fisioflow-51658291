import { User } from './auth';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PatientProfile extends User {
  phone?: string;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other';
  goals?: string[];
  medicalHistory?: string;
  weight?: number;
  height?: number;
  activityLevel?: string;
  professionalId?: string;
  professionalName?: string;
  cpf?: string;
  photoUrl?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
}

export interface Therapist {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  specialty?: string;
  clinicName?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
  professionalName: string;
  date: string;
  time: string;
  type: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  location?: string;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  sets: number;
  reps: number;
  holdTime?: number;
  restTime?: number;
  videoUrl?: string;
  imageUrl?: string;
  instructions?: string[];
  benefits?: string[];
  precautions?: string[];
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface ExerciseAssignment {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  sets: number;
  reps: number;
  holdTime?: number;
  restTime?: number;
  frequency?: string;
  notes?: string;
  completed?: boolean;
  completedAt?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'appointment' | 'exercise' | 'message' | 'system';
  read: boolean;
  createdAt: string;
  data?: Record<string, any>;
}

export interface Evolution {
  id: string;
  date: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  painLevel: number;
  sessionNumber: number;
  professionalName: string;
}

export interface ProgressReport {
  id: string;
  date: string;
  title: string;
  summary: string;
  fileUrl?: string;
}

export interface PatientProgress {
  evolutions: Evolution[];
  reports: ProgressReport[];
}

export interface PatientStats {
  totalAppointments: number;
  totalExercises: number;
  totalMonths: number;
}

export interface GamificationProfile {
  id: string;
  patientId: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  streak: number;
  badges: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  unlockedAt: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participantNames: Record<string, string>;
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string | Date | null;
  };
  unreadCount: Record<string, number>;
  updatedAt: string | Date | null;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string | Date | null;
  read_at?: string | Date | null;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  attachment_url?: string;
  attachment_name?: string;
}

export interface ExerciseFeedback {
  exerciseId: string;
  difficulty: number; // 1-5
  painLevel: number; // 0-10
  notes?: string;
  createdAt?: string;
}
