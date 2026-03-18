export type UserRole = 'patient' | 'professional' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clinicId?: string;
  avatarUrl?: string;
  professionalId?: string;
  professionalName?: string;
  birthDate?: Date | string;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface AuthSession {
  user: User;
  token?: string;
}
