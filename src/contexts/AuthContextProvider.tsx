import React, { useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange, signIn as firebaseSignIn, signUp as firebaseSignUp, signOut as firebaseSignOut, resetPassword as firebaseResetPassword, updateUserPassword as firebaseUpdatePassword } from '@/integrations/firebase/auth';
import { db, doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, limit, addDoc } from '@/integrations/firebase/app';
import { profileApi } from '@/integrations/firebase/functions';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { useToast } from '@/hooks/use-toast';
import { AuthContextType, AuthContext, AuthError } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { AppointmentService } from '@/services/appointmentService';

export const AuthContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [sessionCheckFailed, _setSessionCheckFailed] = useState(false);
  const { _toast } = useToast();
  const queryClient = useQueryClient();

  // Prefetch dashboard data
  const prefetchDashboardData = useCallback((orgId: string) => {
    if (!orgId) return;

    logger.info('Prefetching dashboard data', { orgId }, 'AuthContextProvider');

    // Prefetch appointments
    queryClient.prefetchQuery({
      queryKey: ['appointments_v2', 'list', orgId],
      queryFn: async () => {
        const data = await AppointmentService.fetchAppointments(orgId);
        return { data, isFromCache: false, cacheTimestamp: null, source: 'firestore' };
      },
      staleTime: 1000 * 60 * 5,
    });

    // Prefetch analytics summary
    queryClient.prefetchQuery({
      queryKey: ["analytics-summary", orgId],
      staleTime: 1000 * 60 * 5,
    });

    // Prefetch admin metrics
    queryClient.prefetchQuery({
      queryKey: ['dashboard-metrics', orgId],
      staleTime: 1000 * 60 * 5,
    });
  }, [queryClient]);

  /**
   * Obtém ou cria a organização padrão para o usuário
   * Busca por uma organização ativa existente ou cria uma nova
   */
  const _getOrCreateDefaultOrganization = async (): Promise<string | null> => {
    try {
      // Buscar a primeira organização ativa disponível
      const orgQuery = query(
        collection(db, 'organizations'),
        where('active', '==', true),
        limit(1)
      );
      const orgSnapshot = await getDocs(orgQuery);

      if (!orgSnapshot.empty) {
        // Retornar a primeira organização encontrada
        return orgSnapshot.docs[0].id;
      }

      // Se não existir, criar a organização padrão
      const now = new Date().toISOString();
      const orgRef = await addDoc(collection(db, 'organizations'), {
        name: 'Clínica Padrão',
        slug: 'clinica-padrao',
        active: true,
        settings: {
          timezone: 'America/Sao_Paulo',
          language: 'pt-BR',
        },
        created_at: now,
        updated_at: now,
      });

      logger.info('Default organization created:', orgRef.id, 'AuthContextProvider');
      return orgRef.id;
    } catch (err) {
      logger.error('Erro ao obter ou criar organização padrão', err, 'AuthContextProvider');
      return null;
    }
  };

  /**
   * Waits for the profile to be created by the backend trigger
   */
  const waitForProfile = async (firebaseUser: User, _attempts = 0): Promise<Profile | null> => {
    try {
      const profileRef = doc(db, 'profiles', firebaseUser.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        return { id: profileSnap.id, ...profileSnap.data() } as Profile;
      }

      // If profile doesn't exist yet, wait and retry (logic handled in fetchProfile recursion)
      // This is expected immediately after registration while the backend trigger runs
      return null;
    } catch (err) {
      logger.error('Error fetching profile', err, 'AuthContextProvider');
      return null;
    }
  };

  const fetchProfile = useCallback(async (firebaseUser: User, attempt = 1): Promise<Profile | null> => {
    try {
      logger.debug(`Fetching profile from Firestore (Attempt ${attempt})`, null, 'AuthContextProvider');
      const profile = await waitForProfile(firebaseUser);

      if (profile) {
        // Sync organization logic (kept from original)
        profileApi.getCurrent().then((resp: unknown) => {
          if (!profile) return;
          const pgProfile = (resp as { data?: { organization_id?: string } })?.data ?? resp;
          const pgOrgId = pgProfile && typeof pgProfile === 'object' && 'organization_id' in pgProfile ? pgProfile.organization_id : undefined;
          if (!pgOrgId) return;

          const hasOrgChanged = !profile.organization_id || profile.organization_id !== pgOrgId;
          if (hasOrgChanged) {
            const profileRef = doc(db, 'profiles', firebaseUser.uid);
            updateDoc(profileRef, {
              organization_id: pgOrgId,
              updated_at: new Date().toISOString()
            }).catch(err => logger.error('Failed to update profile organization_id', err, 'AuthContextProvider'));
          }
        }).catch(err => logger.warn('PG Sync failed', err));

        return profile;
      } else {
        // Profile not found in Firestore. Retry a few times, then try Cloud SQL fallback.
        if (attempt < 5) {
          logger.info(`Profile not found in Firestore, retrying... (${attempt}/5)`, null, 'AuthContextProvider');
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
          return fetchProfile(firebaseUser, attempt + 1);
        }

        // Fallback: buscar perfil no Cloud SQL (quando usuário existe só lá)
        try {
          logger.info('Profile not in Firestore, trying Cloud SQL fallback', null, 'AuthContextProvider');
          const response = await profileApi.getCurrent();
          const pgProfile = (response as { data?: Record<string, unknown> })?.data ?? response;
          if (pgProfile && typeof pgProfile === 'object' && pgProfile.user_id) {
            const mapped: Profile = {
              id: String(pgProfile.id ?? firebaseUser.uid),
              user_id: String(pgProfile.user_id),
              full_name: String(pgProfile.full_name ?? firebaseUser.displayName ?? firebaseUser.email ?? 'Usuário'),
              organization_id: pgProfile.organization_id ? String(pgProfile.organization_id) : undefined,
              role: (pgProfile.role as Profile['role']) ?? 'fisioterapeuta',
              phone: pgProfile.phone ? String(pgProfile.phone) : undefined,
              avatar_url: pgProfile.avatar_url ? String(pgProfile.avatar_url) : undefined,
              onboarding_completed: Boolean(pgProfile.onboarding_completed),
              is_active: pgProfile.is_active !== false,
              created_at: String(pgProfile.created_at ?? new Date().toISOString()),
              updated_at: String(pgProfile.updated_at ?? new Date().toISOString()),
            };
            // Sincronizar para Firestore para próximas cargas
            try {
              const profileRef = doc(db, 'profiles', firebaseUser.uid);
              await setDoc(profileRef, { ...mapped, updated_at: new Date().toISOString() }, { merge: true });
            } catch {
              // Ignorar erro de sync - perfil já está em memória
            }
            return mapped;
          }
        } catch (pgErr) {
          logger.warn('Cloud SQL fallback failed', pgErr, 'AuthContextProvider');
        }

        logger.warn('Profile not found after retries and Cloud SQL fallback.', null, 'AuthContextProvider');
        return null;
      }
    } catch (err) {
      logger.error('Erro crítico ao buscar perfil', err, 'AuthContextProvider');
      return null;
    }
  }, []);

  // ... (refreshProfile implementation adjusting to take user from state or arg)

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    try {
      const profileData = await fetchProfile(user);
      setProfile(profileData);
      if (profileData?.organization_id) {
        prefetchDashboardData(profileData.organization_id);
      }
    } catch (err) {
      logger.error('Erro ao atualizar perfil', err, 'AuthContextProvider');
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // Firebase Auth State Listener
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      if (!mounted) return;

      if (firebaseUser) {
        setUser(firebaseUser);
        setInitialized(true);

        // OTIMIZAÇÃO: Definir loading=false imediatamente para renderizar a UI
        // O perfil será carregado em background
        setLoading(false);

        // Carregar perfil do Firestore em background (não bloqueia a UI)
        fetchProfile(firebaseUser).then(profileData => {
          if (mounted) {
            setProfile(profileData);
            if (profileData?.organization_id) {
              prefetchDashboardData(profileData.organization_id);
            }
          }
        }).catch(err => {
          logger.error('Erro ao carregar perfil', err, 'AuthContextProvider');
        });
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
        setInitialized(true);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
   
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - fetchProfile is stable (useCallback with no deps)

  const signIn = async (email: string, password: string, _remember?: boolean): Promise<{ error?: AuthError | null }> => {
    try {
      setLoading(true);
      await firebaseSignIn(email, password);
      return { error: null };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Erro no login', error, 'AuthContextProvider');
      setLoading(false);
      return { error: { message: error.message || 'Erro ao fazer login' } };
    }
  };

  const signUp = async (data: RegisterFormData): Promise<{ error?: AuthError | null; user?: User | null }> => {
    try {
      setLoading(true);
      const result = await firebaseSignUp(data.email, data.password, data.full_name);
      return { user: result.user, error: null };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Erro no cadastro', error, 'AuthContextProvider');
      setLoading(false);
      return { error: { message: error.message || 'Erro ao cadastrar' } };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      logger.error('Erro ao sair', err, 'AuthContextProvider');
    }
  };

  const resetPassword = async (email: string): Promise<{ error?: AuthError | null }> => {
    try {
      await firebaseResetPassword(email);
      return { error: null };
    } catch (err: unknown) {
      const error = err as Error;
      // Dado sensível removido: operação de reset de senha registrada sem expor a senha (LGPD)
      logger.error('Erro ao resetar senha: operação falhou', error, 'AuthContextProvider');
      return { error: { message: error.message || 'Erro ao resetar senha' } };
    }
  };

  const updatePassword = async (password: string): Promise<{ error?: AuthError | null }> => {
    try {
      await firebaseUpdatePassword(password);
      return { error: null };
    } catch (err: unknown) {
      const error = err as Error;
      // Dado sensível removido: operação de atualização de senha registrada sem expor a senha (LGPD)
      logger.error('Erro ao atualizar senha: operação falhou', error, 'AuthContextProvider');
      return { error: { message: error.message || 'Erro ao atualizar senha' } };
    }
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<{ error?: AuthError | null }> => {
    try {
      if (!user) {
        return { error: { message: 'Usuário não autenticado' } };
      }

      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, {
        ...updates,
        updated_at: new Date().toISOString()
      });

      // const response = await profileApi.update(updates); // Removed

      // if (response.error) ... removed

      // Atualizar estado local
      if (profile) {
        setProfile({ ...profile, ...updates });
      }

      return { error: null };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Erro ao atualizar perfil', error, 'AuthContextProvider');
      return { error: { message: error.message || 'Erro ao atualizar perfil' } };
    }
  };

  const role: UserRole | undefined = profile?.role as UserRole | undefined;
  const organizationId = profile?.organization_id;

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
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};



