export type UserRole = 'patient' | 'professional' | 'admin' | 'fisioterapeuta';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clinicId?: string;
  organizationId?: string;
  avatarUrl?: string;
  specialty?: string;
  crefito?: string;
  phone?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}
