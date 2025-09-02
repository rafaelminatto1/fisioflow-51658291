// Tipos para autenticação e perfis

export type UserRole = 'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente' | 'parceiro';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  crefito?: string;
  specialties?: string[];
  avatar_url?: string;
  cpf?: string;
  birth_date?: string;
  address?: string;
  license_expiry?: string;
  bio?: string;
  experience_years?: number;
  consultation_fee?: number;
  available_hours?: any;
  notification_preferences?: any;
  onboarding_completed: boolean;
  last_login_at?: string;
  timezone?: string;
  is_active: boolean;
  emergency_contact?: any;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: any | null;
  profile: Profile | null;
  session: any | null;
  loading: boolean;
  role?: UserRole;
}

export interface RegisterStep1Data {
  userType: UserRole;
}

export interface RegisterStep2Data {
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
  cpf?: string;
  phone?: string;
  birth_date?: string;
}

export interface RegisterStep3Data {
  crefito?: string;
  specialties?: string[];
  experience_years?: number;
  bio?: string;
  consultation_fee?: number;
}

export interface RegisterFormData extends RegisterStep2Data, RegisterStep3Data {
  userType: UserRole;
  terms_accepted: boolean;
}