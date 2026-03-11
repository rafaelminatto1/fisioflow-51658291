import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authClient, isNeonAuthEnabled } from '@/lib/neonAuth';
import type { Profile } from '@/types/auth';
import { HapticFeedback } from '@/lib/haptics';
import { clearPhotoCache } from '@/hooks/usePhotoDecryption';

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes (Neon Auth / Better Auth)
  useEffect(() => {
    if (!isNeonAuthEnabled()) {
      setLoading(false);
      return;
    }

    const unsubscribe = authClient.useSession.subscribe(async (session) => {
      const neonUser = session?.data?.user;

      if (neonUser) {
        // No Neon, o profile já vem junto no session ou pode ser buscado via API
        // Por compatibilidade, mapeamos os campos do better-auth
        setProfile({
          id: neonUser.id,
          uid: neonUser.id,
          email: neonUser.email,
          full_name: neonUser.name || '',
          name: neonUser.name || '',
          role: (neonUser as any).role || 'fisioterapeuta',
          phone: (neonUser as any).phone || '',
          photo_url: neonUser.image || '',
          organization_id: (neonUser as any).organization_id || (neonUser as any).organizationId || DEFAULT_ORG_ID,
          created_at: neonUser.createdAt?.toISOString() || new Date().toISOString(),
          updated_at: neonUser.updatedAt?.toISOString() || new Date().toISOString(),
        });
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    HapticFeedback.light();
    if (!isNeonAuthEnabled()) throw new Error('Neon Auth não configurado.');

    const { error } = await authClient.signIn.email({ 
      email: email.trim().toLowerCase(), 
      password 
    });

    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    HapticFeedback.medium();
    
    // Clear decrypted photo cache from memory
    clearPhotoCache();
    console.log('[AuthContext] Cleared photo cache on logout');
    
    if (isNeonAuthEnabled()) {
      await authClient.signOut();
    }
    setProfile(null);
  }, []);

  const updateProfile = useCallback(async (data: Partial<Profile>) => {
    if (!profile) throw new Error('No user logged in');

    const { error } = await authClient.updateUser({
      name: data.full_name,
      image: data.photo_url,
      // outros campos precisam ser via API de Workers para o Neon DB
    });

    if (error) throw new Error(error.message);

    setProfile((prev) =>
      prev ? { ...prev, ...data, updated_at: new Date().toISOString() } : null
    );
  }, [profile]);

  return (
    <AuthContext.Provider
      value={{
        profile,
        loading,
        signIn,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
