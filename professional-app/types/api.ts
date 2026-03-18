export interface ApiPatient {
  id: string;
  name: string;
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  birth_date?: string;
  gender?: string;
  main_condition?: string;
  observations?: string;
  status: string;
  progress?: number;
  incomplete_registration?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ApiAppointment {
  id: string;
  patient_id: string;
  patient_name?: string;
  therapist_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  type?: string;
  notes?: string;
  session_type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiExercise {
  id: string;
  name: string;
  description?: string;
  instructions?: string[];
  category?: string;
  difficulty?: string;
  video_url?: string;
  image_url?: string;
  sets?: number;
  reps?: number;
  duration?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApiEvolution {
  id: string;
  patient_id: string;
  therapist_id: string;
  appointment_id?: string;
  date: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  pain_level?: number;
  attachments?: string[];
  created_at: string;
  updated_at: string;
}

export interface ApiDashboardStats {
  activePatients: number;
  todayAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
  total?: number;
}
