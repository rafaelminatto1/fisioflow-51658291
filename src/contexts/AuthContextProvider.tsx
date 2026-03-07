import React, { useEffect, useState, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange as onFirebaseAuthStateChange, signIn as firebaseSignIn, signUp as firebaseSignUp, signOut as firebaseSignOut, resetPassword as firebaseResetPassword, updateUserPassword as firebaseUpdatePassword } from '@/integrations/firebase/auth';
import { authClient, isNeonAuthEnabled } from '@/integrations/neon/auth';
import { db, doc, getDoc, updateDoc } from '@/integrations/firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { getNeonAccessToken, invalidateNeonTokenCache } from '@/lib/auth/neon-token';
import { AuthContextType, AuthContext, AuthError } from './AuthContext';
import { Profile, RegisterFormData, UserRole } from '@/types/auth';
import { useQueryClient } from '@tanstack/react-query';
import { AppointmentService } from '@/services/appointmentService';

/** ID da Organização Padrão (Clínica Única) */
export const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

export const AuthContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [sessionCheckFailed, _setSessionCheckFailed] = useState(false);
  const queryClient = useQueryClient();
  const prefetchedOrgIdsRef = useRef(new Set<string>());

  const adaptNeonUser = useCallback((neonUser: any): User => {
    if (!neonUser) return null as any;
    return {
      uid: neonUser.id,
      email: neonUser.email,
      displayName: neonUser.name,
      photoURL: neonUser.image,
      emailVerified: neonUser.emailVerified,
      getIdToken: async () => {
        return getNeonAccessToken();
      },
      metadata: {},
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdTokenResult: async () => ({ claims: {}, expirationTime: '', authTime: '', issuedAtTime: '', signInProvider: '', token: '' }),
      reload: async () => {},
      toJSON: () => ({}),
      phoneNumber: null,
      isAnonymous: false,
    } as unknown as User;
  }, []);

  const prefetchDashboardData = useCallback((orgId: string) => {
    if (!orgId || prefetchedOrgIdsRef.current.has(orgId)) return;
    prefetchedOrgIdsRef.current.add(orgId);

    const runPrefetch = () => {
      queryClient.prefetchQuery({
        queryKey: ['appointments_v2', 'list', orgId],
        queryFn: async () => {
          const data = await AppointmentService.fetchAppointments(orgId);
          return { data, isFromCache: false, cacheTimestamp: null, source: 'workers' };
        },
        staleTime: 1000 * 60 * 5,
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => runPrefetch(), { timeout: 3000 });
    } else {
      setTimeout(runPrefetch, 1200);
    }
  }, [queryClient]);

  const fetchProfile = useCallback(async (firebaseUser: User): Promise<Profile | null> => {
    try {
      if (isNeonAuthEnabled()) {
        const session = await authClient.getSession();
        const neonUser = session?.data?.user as Record<string, unknown> | undefined;
        const userMeta = (neonUser?.user_metadata ?? neonUser?.metadata ?? {}) as Record<string, unknown>;

        const organizationId =
          (typeof neonUser?.organization_id === 'string' && neonUser.organization_id) ||
          (typeof neonUser?.organizationId === 'string' && neonUser.organizationId) ||
          (typeof userMeta.organization_id === 'string' && userMeta.organization_id) ||
          (typeof userMeta.organizationId === 'string' && userMeta.organizationId) ||
          DEFAULT_ORG_ID;

        const role =
          (typeof neonUser?.role === 'string' && neonUser.role) ||
          (typeof userMeta.role === 'string' && userMeta.role) ||
          'admin';

        return {
          id: String(neonUser?.id ?? firebaseUser.uid),
          user_id: String(neonUser?.id ?? firebaseUser.uid),
          full_name: String(neonUser?.name ?? firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'Usuário'),
          role: role as UserRole,
          organization_id: organizationId,
          onboarding_completed: true,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      // 1. Tentar Firestore (legado)
      const profileRef = doc(db, 'profiles', firebaseUser.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const data = profileSnap.data();
        return { 
          id: profileSnap.id, 
          user_id: firebaseUser.uid,
          full_name: data.full_name || firebaseUser.displayName || 'Usuário',
          role: data.role || 'fisioterapeuta',
          organization_id: data.organization_id || DEFAULT_ORG_ID,
          ...data 
        } as Profile;
      }

      // 2. Fallback: Gerar perfil básico a partir do User (Neon/Firebase)
      // Em modo Single-Tenant, isso é seguro.
      return {
        id: firebaseUser.uid,
        user_id: firebaseUser.uid,
        full_name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
        role: 'admin', // Default para o dono da clínica
        organization_id: DEFAULT_ORG_ID,
        onboarding_completed: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (err) {
      logger.error('Error fetching profile', err, 'AuthContextProvider');
      return null;
    }
  }, []);

  const loadUserAndProfile = useCallback(async (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      const profileData = await fetchProfile(newUser);
      setProfile(profileData);
      const orgId = profileData?.organization_id || DEFAULT_ORG_ID;
      prefetchDashboardData(orgId);
    } else {
      setProfile(null);
    }
    setInitialized(true);
    setLoading(false);
  }, [fetchProfile, prefetchDashboardData]);

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      if (!isNeonAuthEnabled()) {
        if (!mounted) return;
        await loadUserAndProfile(null);
        return;
      }

      let neonUser: ReturnType<typeof adaptNeonUser> | null = null;
      try {
        // Limita a 4s para não travar o carregamento quando o endpoint retorna 404 lentamente
        const timeout = new Promise<null>((res) => setTimeout(() => res(null), 4000));
        const result = await Promise.race([authClient.getSession(), timeout]);
        if (result && 'data' in result && result.data?.user) {
          neonUser = adaptNeonUser(result.data.user);
        }
      } catch {
        // authClient.getSession() pode falhar (ex: endpoint 404) — usa Firebase como fallback
      }

      if (!mounted) return;

      if (neonUser) {
        await loadUserAndProfile(neonUser);
      } else {
        onFirebaseAuthStateChange(async (firebaseUser) => {
          if (!mounted) return;
          await loadUserAndProfile(firebaseUser);
        });
      }
    };

    initializeAuth();
    return () => { mounted = false; };
  }, [adaptNeonUser, loadUserAndProfile]);

  const signIn = async (email: string, password: string): Promise<{ error?: AuthError | null }> => {
    try {
      setLoading(true);
      if (isNeonAuthEnabled()) {
        const { data, error } = await authClient.signIn.email({ email, password });
        if (error) throw new Error(error.message || 'Erro ao fazer login no Neon Auth');
        if (data?.user) {
          await loadUserAndProfile(adaptNeonUser(data.user));
        }
        return { error: null };
      } else {
        const result = await firebaseSignIn(email, password);
        await loadUserAndProfile(result.user);
        return { error: null };
      }
    } catch (err: any) {
      logger.error('Erro no login', err, 'AuthContextProvider');
      setLoading(false);
      return { error: { message: err.message || 'Erro ao fazer login' } };
    }
  };

  const signUp = async (data: RegisterFormData): Promise<{ error?: AuthError | null; user?: User | null }> => {
    try {
      setLoading(true);
      if (isNeonAuthEnabled()) {
        const { data: neonData, error } = await authClient.signUp.email({
          email: data.email,
          password: data.password,
          name: data.full_name,
        });
        if (error) throw new Error(error.message || 'Erro ao cadastrar no Neon Auth');
        const adapted = adaptNeonUser(neonData.user);
        await loadUserAndProfile(adapted);
        return { user: adapted, error: null };
      } else {
        const result = await firebaseSignUp(data.email, data.password, data.full_name);
        await loadUserAndProfile(result.user);
        return { user: result.user, error: null };
      }
    } catch (err: any) {
      logger.error('Erro no cadastro', err, 'AuthContextProvider');
      setLoading(false);
      return { error: { message: err.message || 'Erro ao cadastrar' } };
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    // Sempre tenta invalidar sessões remotas, mas nunca deixa falha impedir a limpeza local
    if (isNeonAuthEnabled()) {
      try { await authClient.signOut(); } catch (e) {
        logger.warn('Neon Auth signOut remoto falhou (ignorado)', e, 'AuthContextProvider');
      }
    }
    try { await firebaseSignOut(); } catch (e) {
      logger.warn('Firebase signOut remoto falhou (ignorado)', e, 'AuthContextProvider');
    }
    // Limpa JWT cache, dados em memória e estado local
    invalidateNeonTokenCache();
    queryClient.clear();
    await loadUserAndProfile(null);
  };

  const resetPassword = async (email: string) => {
    try {
      if (isNeonAuthEnabled()) {
        await authClient.forgetPassword({ email, redirectTo: window.location.origin + '/auth/reset-password' });
      } else {
        await firebaseResetPassword(email);
      }
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || 'Erro ao resetar senha' } };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      if (isNeonAuthEnabled()) {
        await authClient.changePassword({ newPassword: password });
      } else {
        await firebaseUpdatePassword(password);
      }
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || 'Erro ao atualizar senha' } };
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) return { error: { message: 'Usuário não autenticado' } };
      if (isNeonAuthEnabled() && (updates.full_name || updates.avatar_url)) {
        await authClient.updateUser({ name: updates.full_name, image: updates.avatar_url });
      }
      // Sync to Firestore if possible
      try {
        const profileRef = doc(db, 'profiles', user.uid);
        await updateDoc(profileRef, { ...updates, updated_at: new Date().toISOString() });
      } catch (e) { logger.warn('Firestore profile sync skipped', e); }

      if (profile) setProfile({ ...profile, ...updates });
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || 'Erro ao atualizar perfil' } };
    }
  };

  const role: UserRole | undefined = profile?.role as UserRole | undefined;
  const organizationId = profile?.organization_id || DEFAULT_ORG_ID;

  const value: AuthContextType = {
    user,
    profile,
    loading,
    initialized,
    sessionCheckFailed,
    role,
    organizationId,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile: () => loadUserAndProfile(user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
