// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'professional' | 'admin';
  clinicId?: string;
  avatarUrl?: string;
  professional_id?: string;
  professional_name?: string;
  birth_date?: Date;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
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
  hold_time?: number;
  rest_time?: number;
  videoUrl?: string;
  video_url?: string;
  imageUrl?: string;
  image_url?: string;
  instructions?: string[];
  completed?: boolean;
  completed_at?: Date;
  completedAt?: Date;
}

// Appointment types
export interface Appointment {
  id: string;
  patientId: string;
  patient_id?: string;
  professionalId: string;
  professional_id?: string;
  professionalName: string;
  professional_name?: string;
  type: string;
  date: Date;
  time?: string;
  duration: number; // in minutes
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  location?: string;
  createdAt: Date;
  created_at?: Date;
  updatedAt: Date;
  updated_at?: Date;
}

// Exercise Program types
export interface ExerciseProgram {
  id: string;
  patientId: string;
  patient_id?: string;
  professionalId: string;
  professional_id?: string;
  name: string;
  description?: string;
  exercises: Exercise[];
  frequency: 'daily' | 'weekly' | 'custom';
  startDate: Date;
  start_date?: Date;
  endDate?: Date;
  end_date?: Date;
  isActive: boolean;
  status?: 'active' | 'completed' | 'paused';
  createdAt: Date;
  created_at?: Date;
  updatedAt: Date;
  updated_at?: Date;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  user_id?: string;
  title: string;
  body: string;
  type: 'appointment' | 'exercise' | 'message' | 'system';
  read: boolean;
  data?: Record<string, any>;
  createdAt: Date;
  created_at?: Date;
}

// Evolution/SOAP types
export interface Evolution {
  id: string;
  patientId: string;
  patient_id?: string;
  professionalId: string;
  professional_id?: string;
  professionalName: string;
  professional_name?: string;
  date: Date;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  pain_level: number;
  session_number: number;
  createdAt: Date;
  created_at?: Date;
}

// Exercise Feedback types
export interface ExerciseFeedback {
  exerciseId: string;
  exercise_id?: string;
  planId: string;
  plan_id?: string;
  difficulty: number; // 1-5
  pain_level: number; // 0-10
  notes?: string;
  created_at?: Date;
}

// Settings types
export interface AppSettings {
  notifications: boolean;
  exerciseReminders: boolean;
  appointmentReminders: boolean;
  autoPlayVideos: boolean;
  hapticFeedback: boolean;
  theme: 'light' | 'dark' | 'auto';
}

// Firestore Timestamp type
export type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
};

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Navigation types
export type RootStackParamList = {
  '(auth)': undefined;
  '(tabs)': undefined;
  onboarding: undefined;
};

export type AuthStackParamList = {
  login: undefined;
  register: undefined;
  'forgot-password': undefined;
  'link-professional': undefined;
};

export type MainTabsParamList = {
  index: undefined;
  exercises: undefined;
  appointments: undefined;
  progress: undefined;
  profile: undefined;
  settings: undefined;
};

// Form types
export interface FormFieldError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: FormFieldError[];
}

// Sync types
export interface QueuedOperation {
  id: string;
  type: 'complete_exercise' | 'submit_feedback' | 'update_profile' | 'appointment';
  data: any;
  timestamp: number;
  retries: number;
  userId: string;
  user_id?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSync?: Date;
}

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}
