/**
 * Authentication and user types
 */

export type UserRole = 'admin' | 'fisioterapeuta' | 'estagiario' | 'recepcionista' | 'paciente' | 'owner';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  photo_url?: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
  // Additional fields for professionals
  specialties?: string[];
  license_number?: string;
  bio?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface SignUpData extends SignInData {
  fullName: string;
  phone?: string;
  role?: UserRole;
}

export interface AuthState {
  profile: Profile | null;
  loading: boolean;
  error: Error | null;
}
