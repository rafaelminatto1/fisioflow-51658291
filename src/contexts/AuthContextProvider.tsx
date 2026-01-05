import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserRole, RegisterFormData } from '@/types/auth';
import { logger } from '@/lib/errors/logger';
import { useToast } from '@/hooks/use-toast';
import { AuthContextType } from './AuthContext';

export interface AuthError {
  message: string;
  status?: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

    const initAuth = async () => {
      try {
        setLoading(true);
        setSessionCheckFailed(false);

        // Timeout de segurança - inicializa mesmo se demorar
        initTimeout = setTimeout(() => {
          if (mounted && !initialized) {
            logger.warn('Timeout na inicialização - continuando sem sessão', null, 'AuthContextProvider');
            setLoading(false);
            setInitialized(true);
          }
        }, 5000);

        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          logger.error('Erro ao obter sessão', sessionError, 'AuthContextProvider');
          if (mounted) {
            setSessionCheckFailed(true);
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        if (initialSession?.user) {
          if (mounted) {
            setUser(initialSession.user);
            setSession(initialSession);
            
            // Carregar perfil com timeout próprio
            try {
              const profilePromise = fetchProfile(initialSession.user.id);
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
          }
        }

        if (mounted) {
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

  const signIn = async (email: string, password: string, remember?: boolean): Promise<{ error?: AuthError | null }> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
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
    } catch (err: any) {
      logger.error('Erro no login', err, 'AuthContextProvider');
      setLoading(false);
      return { error: { message: err.message || 'Erro ao fazer login' } };
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
    } catch (err: any) {
      logger.error('Erro no cadastro', err, 'AuthContextProvider');
      setLoading(false);
      return { error: { message: err.message || 'Erro ao cadastrar' } };
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
    } catch (err: any) {
      logger.error('Erro ao resetar senha', err, 'AuthContextProvider');
      return { error: { message: err.message || 'Erro ao resetar senha' } };
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
    } catch (err: any) {
      logger.error('Erro ao atualizar senha', err, 'AuthContextProvider');
      return { error: { message: err.message || 'Erro ao atualizar senha' } };
    }
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<{ error?: AuthError | null }> => {
    try {
      if (!user) {
        return { error: { message: 'Usuário não autenticado' } };
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates as any)
        .eq('user_id', user.id);

      if (error) {
        logger.error('Erro ao atualizar perfil', error, 'AuthContextProvider');
        return { error: { message: error.message, status: (error as any).status } };
      }

      // Atualizar estado local
      if (profile) {
        setProfile({ ...profile, ...updates });
      }

      return { error: null };
    } catch (err: any) {
      logger.error('Erro ao atualizar perfil', err, 'AuthContextProvider');
      return { error: { message: err.message || 'Erro ao atualizar perfil' } };
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

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
};

