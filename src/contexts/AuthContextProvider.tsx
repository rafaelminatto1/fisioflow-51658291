import React, { useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserRole, RegisterFormData } from '@/types/auth';
import { logger } from '@/lib/errors/logger';
import { useToast } from '@/hooks/use-toast';
import { AuthContextType } from './AuthContext';

import { AuthContext, AuthError } from './AuthContext';

export const AuthContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [sessionCheckFailed, setSessionCheckFailed] = useState(false);
  const { toast } = useToast();

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();



      if (error) {
        logger.error('Erro ao buscar perfil', error, 'AuthContextProvider');
        return null;
      }

      return data as unknown as Profile;
    } catch (err) {

      logger.error('Erro ao buscar perfil', err, 'AuthContextProvider');
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {

    if (!user) {
      setProfile(null);
      return;
    }

    try {
      const profileData = await fetchProfile(user.id);

      setProfile(profileData);
    } catch (err) {

      logger.error('Erro ao atualizar perfil', err, 'AuthContextProvider');
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;
    let initTimeout: NodeJS.Timeout | null = null;

    const isValidUUID = (id: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    };

    const initAuth = async () => {
      // Timeout de segurança mais permissivo - 10 segundos
      initTimeout = setTimeout(() => {
        if (mounted && !initialized) {
          logger.warn('Timeout na inicialização - continuando sem sessão', null, 'AuthContextProvider');
          setLoading(false);
          setInitialized(true);
        }
      }, 10000);

      try {
        setLoading(true);
        setSessionCheckFailed(false);

        // Buscar sessão com timeout interno aumentado para 10s
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null }, error: null }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null }, error: null }), 10000)
        );

        const { data: { session: initialSession }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]);

        if (!mounted) return;

        if (sessionError) {
          logger.error('Erro ao obter sessão', sessionError, 'AuthContextProvider');
          setSessionCheckFailed(true);
          setLoading(false);
          setInitialized(true);
          return;
        }

        if (initialSession?.user) {
          // Validação crítica de UUID
          if (!isValidUUID(initialSession.user.id)) {
            logger.error('ID de usuário inválido detectado (sessão corrompida)', { userId: initialSession.user.id }, 'AuthContextProvider');
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            setLoading(false);
            setInitialized(true);
            return;
          }

          // Setar usuário imediatamente para liberar UI
          setUser(initialSession.user);
          setSession(initialSession);
          setLoading(false);
          setInitialized(true);

          // Carregar perfil em background (não bloqueia)
          fetchProfile(initialSession.user.id)
            .then(profileData => {
              if (mounted) setProfile(profileData);
            })
            .catch(err => logger.error('Erro ao carregar perfil', err, 'AuthContextProvider'));
        } else {
          setLoading(false);
          setInitialized(true);
        }
      } catch (err) {
        logger.error('Erro na inicialização da autenticação', err, 'AuthContextProvider');
        if (mounted) {
          setSessionCheckFailed(true);
          setLoading(false);
          setInitialized(true);
        }
      } finally {
        if (initTimeout) {
          clearTimeout(initTimeout);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;



        if (newSession?.user) {
          // Validação crítica de UUID
          const isUUIDValid = isValidUUID(newSession.user.id);

          if (!isUUIDValid) {
            logger.warn('Sessão com ID inválido bloqueada no listener', { userId: newSession.user.id }, 'AuthContextProvider');
            await supabase.auth.signOut();
            return;
          }

          setUser(newSession.user);
          setSession(newSession);
          setSessionCheckFailed(false);

          // Carregar perfil com timeout
          try {
            const profilePromise = fetchProfile(newSession.user.id);
            const timeoutPromise = new Promise<null>((resolve) =>
              setTimeout(() => resolve(null), 3000)
            );
            const profileData = await Promise.race([profilePromise, timeoutPromise]);

            if (mounted) {
              setProfile(profileData);
            }
          } catch (profileErr) {
            logger.error('Erro ao carregar perfil', profileErr, 'AuthContextProvider');

          }
        } else {
          setUser(null);
          setProfile(null);
          setSession(null);
        }

        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    );

    return () => {
      mounted = false;
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
      subscription.unsubscribe();
    };
  }, [fetchProfile, initialized]);

  const signIn = async (email: string, password: string, _remember?: boolean): Promise<{ error?: AuthError | null }> => {
    try {

      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });



      if (error) {
        logger.error('Erro no login', error, 'AuthContextProvider');
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return { error: { message: error.message, status: error.status } };
      }

      // Profile será carregado pelo onAuthStateChange

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
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
          }
        }
      });

      if (error) {
        logger.error('Erro no cadastro', error, 'AuthContextProvider');
        toast({
          title: "Erro no cadastro",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return { error: { message: error.message, status: error.status } };
      }

      return { user: authData.user, error: null };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Erro no cadastro', error, 'AuthContextProvider');
      setLoading(false);
      return { error: { message: error.message || 'Erro ao cadastrar' } };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error('Erro ao sair', error, 'AuthContextProvider');
        toast({
          title: "Erro ao sair",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setUser(null);
        setProfile(null);
        setSession(null);
      }
    } catch (err) {
      logger.error('Erro ao sair', err, 'AuthContextProvider');
    }
  };

  const resetPassword = async (email: string): Promise<{ error?: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        logger.error('Erro ao resetar senha', error, 'AuthContextProvider');
        return { error: { message: error.message, status: error.status } };
      }
      return { error: null };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Erro ao resetar senha', error, 'AuthContextProvider');
      return { error: { message: error.message || 'Erro ao resetar senha' } };
    }
  };

  const updatePassword = async (password: string): Promise<{ error?: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        logger.error('Erro ao atualizar senha', error, 'AuthContextProvider');
        return { error: { message: error.message, status: error.status } };
      }
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

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        logger.error('Erro ao atualizar perfil', error, 'AuthContextProvider');
        return { error: { message: error.message, status: parseInt(error.code) || 500 } };
      }

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

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    initialized,
    sessionCheckFailed,
    role,
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



