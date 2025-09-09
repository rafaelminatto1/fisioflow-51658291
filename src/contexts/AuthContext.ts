import { createContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Profile, UserRole, RegisterFormData } from '@/types/auth';

interface AuthError {
  message: string;
  status?: number;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  sessionCheckFailed: boolean;
  role?: UserRole;
  signIn: (email: string, password: string, remember?: boolean) => Promise<{ error?: AuthError | null }>;
  signUp: (data: RegisterFormData) => Promise<{ error?: AuthError | null; user?: User | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error?: AuthError | null }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error?: AuthError | null }>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
export type { AuthError, AuthContextType };