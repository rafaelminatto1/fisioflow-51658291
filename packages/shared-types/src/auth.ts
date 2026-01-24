export type UserRole = 'patient' | 'professional' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  professionalId?: string;
  photoURL?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
