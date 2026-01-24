import { createContext, useContext } from 'react';
import { User } from 'firebase/auth';
import { Profile, UserRole, RegisterFormData } from '@/types/auth';

interface AuthError {
  message: string;
  status?: number;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  sessionCheckFailed: boolean;
  role?: UserRole;
  organizationId?: string;
  signIn: (email: string, password: string, remember?: boolean) => Promise<{ error?: AuthError | null }>;
  signUp: (data: RegisterFormData) => Promise<{ error?: AuthError | null; user?: User | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error?: AuthError | null }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error?: AuthError | null }>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
};

export type { AuthError, AuthContextType };