// Tipos para autenticação e perfis

export type UserRole = 'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente' | 'parceiro' | 'recepcionista' | 'pending';

export interface AvailableHours {
  [day: string]: {
    start: string;
    end: string;
    available: boolean;
  };
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  appointment_reminders: boolean;
  marketing: boolean;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  organization_id?: string;
  slug?: string;
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
  available_hours?: AvailableHours;
  notification_preferences?: NotificationPreferences;
  onboarding_completed: boolean;
  last_login_at?: string;
  timezone?: string;
  is_active: boolean;
  emergency_contact?: EmergencyContact;
  preferences?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: {
    id: string;
    email: string;
    created_at: string;
    updated_at: string;
  } | null;
  profile: Profile | null;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    user: {
      id: string;
      email: string;
    };
  } | null;
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