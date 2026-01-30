import React, { useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { auth, onAuthStateChange, signIn as firebaseSignIn, signUp as firebaseSignUp, signOut as firebaseSignOut, resetPassword as firebaseResetPassword, updateUserPassword as firebaseUpdatePassword } from '@/integrations/firebase/auth';
import { db, doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, limit, addDoc } from '@/integrations/firebase/app';
import { profileApi } from '@/integrations/firebase/functions'; // Use Firebase Functions API
import { Profile, UserRole, RegisterFormData } from '@/types/auth';
import { logger } from '@/lib/errors/logger';
import { useToast } from '@/hooks/use-toast';
import { AuthContextType } from './AuthContext';

import { AuthContext, AuthError } from './AuthContext';

export const AuthContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [sessionCheckFailed, setSessionCheckFailed] = useState(false);
  const { toast } = useToast();

  /**
   * Obtém ou cria a organização padrão para o usuário
   * Busca por uma organização ativa existente ou cria uma nova
   */
  const getOrCreateDefaultOrganization = async (): Promise<string | null> => {
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
   * Garante que o perfil exista no Firestore (defensivo)
   */
  const ensureProfile = async (firebaseUser: User) => {
    try {
      const profileRef = doc(db, 'profiles', firebaseUser.uid);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        // Obter ou criar organização padrão
        const organizationId = await getOrCreateDefaultOrganization();

        if (!organizationId) {
          logger.error('Não foi possível obter ou criar organização para o usuário', null, 'AuthContextProvider');
          return null;
        }

        // Definição do papel baseada no email (Admin Bootstrap)
        const defaultRole = firebaseUser.email === 'rafael.minatto@yahoo.com.br' ? 'admin' : 'fisioterapeuta';

        // Criar perfil se não existir
        await setDoc(profileRef, {
          user_id: firebaseUser.uid,
          full_name: firebaseUser.displayName || 'Usuário',
          email: firebaseUser.email || null,
          role: defaultRole,
          avatar_url: firebaseUser.photoURL || null,
          phone: null,
          organization_id: organizationId,
          onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // Retornar dados iniciais
        return {
          id: profileRef.id,
          user_id: firebaseUser.uid,
          full_name: firebaseUser.displayName || 'Usuário',
          email: firebaseUser.email || undefined,
          role: defaultRole,
          phone: undefined,
          organization_id: organizationId,
          onboarding_completed: false,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Profile;
      }
      return { id: profileSnap.id, ...profileSnap.data() } as Profile;
    } catch (err) {
      logger.error('Erro ao garantir perfil', err, 'AuthContextProvider');
      return null;
    }
  };

  const fetchProfile = useCallback(async (firebaseUser: User): Promise<Profile | null> => {
    try {
      // TEMPORÁRIO: Usar Firestore para profile como fonte primária
      // TODO: Migrar completamente para Firebase Functions/PostgreSQL quando Cloud SQL estiver 100% estável
      logger.debug('Fetching profile from Firestore', null, 'AuthContextProvider');
      const profile = await ensureProfile(firebaseUser);

      if (profile) {
        // Tentar sincronizar organization_id com PostgreSQL em background
        // Importante: PostgreSQL é a autoridade para organization_id em multi-tenancy
        profileApi.getCurrent().then(pgProfile => {
          if (!pgProfile) {
            logger.warn('PostgreSQL profile not found during sync', null, 'AuthContextProvider');
            return;
          }

          const hasOrgChanged = pgProfile.organization_id &&
            (!profile.organization_id || profile.organization_id !== pgProfile.organization_id);

          if (hasOrgChanged) {
            logger.info('Syncing organization_id from PostgreSQL', { organization_id: pgProfile.organization_id }, 'AuthContextProvider');

            // Atualizar Firestore para manter consistência e permitir cache offline
            const profileRef = doc(db, 'profiles', firebaseUser.uid);
            updateDoc(profileRef, {
              organization_id: pgProfile.organization_id,
              updated_at: new Date().toISOString()
            }).catch(err => {
              logger.error('Failed to sync PostgreSQL organization_id to Firestore', err, 'AuthContextProvider');
            });

            // Atualizar estado local
            setProfile(prev => prev ? { ...prev, organization_id: pgProfile.organization_id } : null);
          }
        }).catch(err => {
          // Registrar erro mas não bloquear o login, pois o Firestore ainda serve como fallback funcional
          logger.warn('Background profile sync with PostgreSQL failed', err, 'AuthContextProvider');
        });
      }

      return profile;
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
          if (mounted) setProfile(profileData);
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
  }, [fetchProfile]);

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
      logger.error('Erro ao resetar senha', error, 'AuthContextProvider');
      return { error: { message: error.message || 'Erro ao resetar senha' } };
    }
  };

  const updatePassword = async (password: string): Promise<{ error?: AuthError | null }> => {
    try {
      await firebaseUpdatePassword(password);
      return { error: null };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Erro ao atualizar senha', error, 'AuthContextProvider');
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



