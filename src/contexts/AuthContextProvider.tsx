import React, { useEffect, useState, useCallback, useRef } from 'react';
import { authClient } from '@/integrations/neon/auth';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { auditApi } from '@/lib/api/workers-client';
import { getNeonAccessToken, invalidateNeonTokenCache } from '@/lib/auth/neon-token';
import { getNeonAuthUrl } from '@/lib/config/neon';
import { AuthContextType, AuthContext, AuthError, AuthUser } from './AuthContext';
import { Profile, RegisterFormData, UserRole } from '@/types/auth';
import { useQueryClient } from '@tanstack/react-query';
import { AppointmentService } from '@/services/appointmentService';

/** ID da Organização Padrão (Clínica Única) */
export const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

export const AuthContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [sessionCheckFailed, _setSessionCheckFailed] = useState(false);
  const queryClient = useQueryClient();
  const prefetchedOrgIdsRef = useRef(new Set<string>());

  const adaptNeonUser = useCallback((neonUser: any): AuthUser => {
    if (!neonUser) return null as any;
    return {
      uid: neonUser.id,
      email: neonUser.email,
      displayName: neonUser.name,
      photoURL: neonUser.image,
      emailVerified: neonUser.emailVerified ?? false,
      getIdToken: async () => getNeonAccessToken(),
    };
  }, []);

  const prefetchDashboardData = useCallback((orgId: string) => {
    if (!orgId || prefetchedOrgIdsRef.current.has(orgId)) return;
    prefetchedOrgIdsRef.current.add(orgId);
    const run = () => {
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
      window.requestIdleCallback(() => run(), { timeout: 3000 });
    } else {
      setTimeout(run, 1200);
    }
  }, [queryClient]);

  const buildProfile = useCallback((neonUser: any, adaptedUser: AuthUser): Profile => {
    const meta = (neonUser?.user_metadata ?? neonUser?.metadata ?? {}) as Record<string, unknown>;
    const organizationId =
      (typeof neonUser?.organization_id === 'string' && neonUser.organization_id) ||
      (typeof neonUser?.organizationId === 'string' && neonUser.organizationId) ||
      (typeof meta.organization_id === 'string' && meta.organization_id) ||
      (typeof meta.organizationId === 'string' && meta.organizationId) ||
      (adaptedUser as any).organizationId ||
      DEFAULT_ORG_ID;

    const role =
      (typeof neonUser?.role === 'string' && neonUser.role) ||
      (typeof meta.role === 'string' && meta.role) ||
      (adaptedUser as any).role ||
      'admin';
    return {
      id: String(neonUser?.id ?? adaptedUser.uid),
      user_id: String(neonUser?.id ?? adaptedUser.uid),
      full_name: String(neonUser?.name ?? adaptedUser.displayName ?? adaptedUser.email?.split('@')[0] ?? 'Usuário'),
      role: role as UserRole,
      organization_id: organizationId,
      onboarding_completed: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }, []);

  const loadUserAndProfile = useCallback(async (newUser: AuthUser | null, neonUser?: any) => {
    setUser(newUser);
    if (newUser) {
      const profileData = buildProfile(neonUser, newUser);
      setProfile(profileData);
      prefetchDashboardData(profileData?.organization_id || DEFAULT_ORG_ID);
    } else {
      setProfile(null);
    }
    setInitialized(true);
    setLoading(false);
  }, [buildProfile, prefetchDashboardData]);

  // Inicializa sessão Neon Auth
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        console.log('[AuthContext] Iniciando verificação de sessão...');
        if (!initialized) setLoading(true); // Só mostra loading na primeira vez
        
        // Limita a 5s para não travar o carregamento
        const timeout = new Promise<null>((res) => setTimeout(() => res(null), 5000));
        const result = await Promise.race([authClient.getSession(), timeout]) as any;
        
        console.log('[AuthContext] Sessão recuperada:', result ? 'Sim' : 'Não/Timeout');
        
        if (!mounted) return;
        
        if (result && 'data' in result && result.data?.user) {
          await loadUserAndProfile(adaptNeonUser(result.data.user), result.data.user);
        } else {
          await loadUserAndProfile(null);
        }
      } catch (error) {
        console.error('[AuthContext] Erro fatal na inicialização:', error);
        if (mounted) await loadUserAndProfile(null);
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };
    init();
    return () => { mounted = false; };
  }, [adaptNeonUser, loadUserAndProfile]);

  const signIn = async (email: string, password: string): Promise<{ error?: AuthError | null }> => {
    try {
      setLoading(true);
      const { data, error } = await authClient.signIn.email({ email, password });
      
      if (error) {
        // Log de falha de login (antes do throw)
        try {
          await auditApi.create({
            action: 'LOGIN_FAILURE',
            entity_type: 'auth',
            metadata: { 
              email, 
              error: error.message,
              reason: 'invalid_credentials',
              timestamp: new Date().toISOString()
            }
          });
        } catch (e) { /* silent fail for audit */ }
        
        throw new Error(error.message || 'Credenciais inválidas');
      }

      if (data?.user) {
        await loadUserAndProfile(adaptNeonUser(data.user));
        
        // Log de sucesso de login
        try {
          await auditApi.create({
            action: 'LOGIN_SUCCESS',
            entity_type: 'auth',
            entity_id: data.user.id,
            metadata: { 
              email, 
              user_id: data.user.id,
              name: data.user.name,
              timestamp: new Date().toISOString()
            }
          });
        } catch (e) { /* silent fail for audit */ }
      }
      
      return { error: null };
    } catch (err: any) {
      logger.error('Erro no login', err, 'AuthContextProvider');
      setLoading(false);
      return { error: { message: err.message || 'Erro ao fazer login' } };
    }
  };

  const signUp = async (data: RegisterFormData): Promise<{ error?: AuthError | null; user?: AuthUser | null }> => {
    try {
      setLoading(true);
      const { data: neonData, error } = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.full_name,
      });
      if (error) throw new Error(error.message || 'Erro ao cadastrar');
      const adapted = adaptNeonUser(neonData.user);
      await loadUserAndProfile(adapted);
      return { user: adapted as any, error: null };
    } catch (err: any) {
      logger.error('Erro no cadastro', err, 'AuthContextProvider');
      setLoading(false);
      return { error: { message: err.message || 'Erro ao cadastrar' } };
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    // 1. SDK signOut (clears internal session cache + broadcasts to other tabs)
    try { await authClient.signOut(); } catch (e) {
      logger.warn('Neon Auth signOut (SDK) falhou (ignorado)', e, 'AuthContextProvider');
    }
    // 2. Direct fetch to ensure server-side session/cookie invalidation.
    // The SDK does not always hit the network, so we call the endpoint directly.
    // We await this before clearing local state so the cookie is cleared before navigation.
    const neonAuthUrl = getNeonAuthUrl();
    if (neonAuthUrl) {
      try {
        await fetch(`${neonAuthUrl}/sign-out`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
      } catch (e) {
        logger.warn('Neon Auth signOut (direct) falhou (ignorado)', e, 'AuthContextProvider');
      }
    }
    invalidateNeonTokenCache();
    queryClient.clear();
    await loadUserAndProfile(null);
  };

  const resetPassword = async (email: string) => {
    try {
      await authClient.forgetPassword.emailOtp({ email, redirectTo: `${window.location.origin}/auth/reset-password` });
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || 'Erro ao resetar senha' } };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      // Nota: O SDK do Neon Auth pode exigir a senha atual.
      // Aqui estamos fazendo o melhor esforço conforme a API sugere.
      await authClient.changePassword({ 
        newPassword: password,
        currentPassword: '', // Caso seja obrigatório mas não tenhamos no contexto
      } as any);
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || 'Erro ao atualizar senha' } };
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) return { error: { message: 'Usuário não autenticado' } };
      if (updates.full_name || updates.avatar_url) {
        await authClient.updateUser({ name: updates.full_name, image: updates.avatar_url });
      }
      if (profile) setProfile({ ...profile, ...updates });
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || 'Erro ao atualizar perfil' } };
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    initialized,
    sessionCheckFailed,
    role: profile?.role as UserRole | undefined,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile: () => loadUserAndProfile(user),
    organizationId: profile?.organization_id || DEFAULT_ORG_ID,
    organization_id: profile?.organization_id || DEFAULT_ORG_ID,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
