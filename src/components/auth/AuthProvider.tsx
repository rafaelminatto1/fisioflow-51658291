import { useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session, AuthError as SupabaseAuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, RegisterFormData } from '@/types/auth';
import { toast } from '@/hooks/use-toast';
import { AuthContext, AuthError } from '@/contexts/AuthContext';
import { ErrorHandler, withRetry, apiCircuitBreaker } from '@/lib/errors';
import { errorLogger } from '@/lib/errors/logger';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [sessionCheckFailed, setSessionCheckFailed] = useState(false);

  // Função para buscar perfil do usuário com retry e circuit breaker
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      return await withRetry(async () => {
        return await apiCircuitBreaker.execute(async () => {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (error) {
            errorLogger.logError(new Error(`Failed to fetch profile: ${error.message}`), {
              context: 'AuthProvider.fetchProfile',
              userId,
              error: error.message,
              code: error.code
            });
            
            // Se é "not found", não é um erro crítico
            if (error.code === 'PGRST116') {
              return null;
            }
            throw error;
          }

          return data;
        });
      }, 3);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'AuthProvider.fetchProfile',
        userId
      });
      return null;
    }
  }, []);

  // Função para atualizar perfil
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    
    try {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'AuthProvider.refreshProfile',
        userId: user.id
      });
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // Primeiro, obter sessão atual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          errorLogger.logError(sessionError, {
            context: 'AuthProvider.initializeAuth',
            action: 'getSession'
          });
          setSessionCheckFailed(true);
        } else if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            const profileData = await fetchProfile(session.user.id);
            if (isMounted) {
              setProfile(profileData);
            }
          }
        }
      } catch (error) {
        errorLogger.logError(error as Error, {
          context: 'AuthProvider.initializeAuth'
        });
        if (isMounted) {
          setSessionCheckFailed(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        try {
          errorLogger.logInfo(`Auth state changed: ${event}`, {
            context: 'AuthProvider.onAuthStateChange',
            event,
            userId: session?.user?.id
          });
          
          setSession(session);
          setUser(session?.user ?? null);
          setSessionCheckFailed(false);
          
          if (session?.user) {
            const profileData = await fetchProfile(session.user.id);
            if (isMounted) {
              setProfile(profileData);
            }
          } else {
            setProfile(null);
          }
          
          // Sempre definir loading como false após mudança de estado
          setLoading(false);
          if (!initialized) {
            setInitialized(true);
          }
        } catch (error) {
          errorLogger.logError(error as Error, {
            context: 'AuthProvider.onAuthStateChange',
            event
          });
        }
      }
    );

    // Inicializar autenticação
    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, initialized]);

  // Função de login com melhor tratamento de erro
  const signIn = async (email: string, password: string, remember?: boolean) => {
    try {
      errorLogger.logInfo('Login attempt started', {
        context: 'AuthProvider.signIn',
        email: email.replace(/(.{3}).*@/, '$1***@'), // Mascarar email no log
        remember
      });
      
      setLoading(true);
      
      const { data, error } = await withRetry(async () => {
        return await supabase.auth.signInWithPassword({
          email,
          password,
        });
      }, 2); // Retry até 2 vezes para problemas de rede

      if (error) {
        // Usar ErrorHandler para tratar erros de autenticação
        const authError = ErrorHandler.handleAuthError(error, 'signIn');
        
        // Mensagens específicas por tipo de erro
        let userMessage = authError.message;
        if (error.message.includes('Email not confirmed')) {
          userMessage = 'Email não confirmado. Verifique sua caixa de entrada ou contate o administrador.';
        } else if (error.message.includes('Invalid login credentials')) {
          userMessage = 'Email ou senha incorretos. Verifique suas credenciais.';
        } else if (error.message.includes('Too many requests')) {
          userMessage = 'Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.';
        }
        
        toast({
          title: 'Erro no login',
          description: userMessage,
          variant: 'destructive'
        });
        
        return { error: authError };
      }

      errorLogger.logInfo('Login successful', {
        context: 'AuthProvider.signIn',
        userId: data.user?.id,
        email: email.replace(/(.{3}).*@/, '$1***@')
      });
      
      toast({
        title: 'Login realizado com sucesso!',
        description: 'Bem-vindo(a) de volta.'
      });

      return { error: null };
    } catch (error: unknown) {
      const authError = ErrorHandler.handleAuthError(error, 'signIn');
      toast({
        title: 'Erro no login',
        description: 'Falha inesperada no login. Tente novamente.',
        variant: 'destructive'
      });
      return { error: authError };
    } finally {
      setLoading(false);
    }
  };

  // Função de registro com melhor tratamento de erro
  const signUp = async (data: RegisterFormData) => {
    try {
      errorLogger.logInfo('Registration attempt started', {
        context: 'AuthProvider.signUp',
        email: data.email.replace(/(.{3}).*@/, '$1***@'),
        userType: data.userType
      });
      
      setLoading(true);

      const redirectUrl = `${window.location.origin}/auth/login?message=confirmed`;
      
      const { data: authData, error } = await withRetry(async () => {
        return await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: data.full_name,
              role: data.userType || 'paciente',
              phone: data.phone,
              cpf: data.cpf,
              birth_date: data.birth_date,
              crefito: data.crefito,
              specialties: data.specialties,
              experience_years: data.experience_years,
              bio: data.bio,
              consultation_fee: data.consultation_fee
            }
          }
        });
      }, 2);

      if (error) {
        const authError = ErrorHandler.handleAuthError(error, 'signUp');
        
        let userMessage = authError.message;
        if (error.message.includes('User already registered')) {
          userMessage = 'Este email já está cadastrado. Tente fazer login ou recuperar a senha.';
        } else if (error.message.includes('Password should be')) {
          userMessage = 'A senha deve ter pelo menos 6 caracteres.';
        } else if (error.message.includes('Invalid email')) {
          userMessage = 'Email inválido. Verifique o formato do email.';
        }
        
        toast({
          title: 'Erro no cadastro',
          description: userMessage,
          variant: 'destructive'
        });
        return { error: authError };
      }

      errorLogger.logInfo('Registration successful', {
        context: 'AuthProvider.signUp',
        userId: authData.user?.id,
        email: data.email.replace(/(.{3}).*@/, '$1***@'),
        needsConfirmation: !authData.user?.email_confirmed_at
      });
      
      const message = authData.user?.email_confirmed_at 
        ? 'Cadastro realizado com sucesso! Você já pode fazer login.'
        : 'Cadastro realizado com sucesso! Verifique seu email para confirmar a conta.';
      
      toast({
        title: 'Cadastro realizado com sucesso!',
        description: message
      });

      return { error: null, user: authData.user };
    } catch (error: unknown) {
      const authError = ErrorHandler.handleAuthError(error, 'signUp');
      toast({
        title: 'Erro no cadastro',
        description: 'Falha inesperada no cadastro. Tente novamente.',
        variant: 'destructive'
      });
      return { error: authError };
    } finally {
      setLoading(false);
    }
  };

  // Função de logout com limpeza completa
  const signOut = async () => {
    try {
      errorLogger.logInfo('Logout started', {
        context: 'AuthProvider.signOut',
        userId: user?.id
      });
      
      await supabase.auth.signOut();
      
      // Limpar estado local
      setUser(null);
      setProfile(null);
      setSession(null);
      setSessionCheckFailed(false);
      
      // Limpar qualquer cache local
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
      
      errorLogger.logInfo('Logout completed successfully', {
        context: 'AuthProvider.signOut'
      });
      
      toast({
        title: 'Logout realizado',
        description: 'Você foi desconectado com sucesso.'
      });
    } catch (error: unknown) {
      const authError = ErrorHandler.handleAuthError(error, 'signOut');
      toast({
        title: 'Erro no logout',
        description: 'Houve um problema ao desconectar. Tente novamente.',
        variant: 'destructive'
      });
    }
  };

  // Função para reset de senha com melhor tratamento
  const resetPassword = async (email: string) => {
    try {
      errorLogger.logInfo('Password reset requested', {
        context: 'AuthProvider.resetPassword',
        email: email.replace(/(.{3}).*@/, '$1***@')
      });
      
      const redirectUrl = `${window.location.origin}/auth/reset-password`;
      
      const { error } = await withRetry(async () => {
        return await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl
        });
      }, 2);

      if (error) {
        const authError = ErrorHandler.handleAuthError(error, 'resetPassword');
        
        let userMessage = authError.message;
        if (error.message.includes('User not found')) {
          userMessage = 'Email não encontrado. Verifique se o email está correto.';
        } else if (error.message.includes('Email rate limit')) {
          userMessage = 'Muitas solicitações. Aguarde alguns minutos antes de tentar novamente.';
        }
        
        toast({
          title: 'Erro ao enviar email',
          description: userMessage,
          variant: 'destructive'
        });
        return { error: authError };
      }

      errorLogger.logInfo('Password reset email sent successfully', {
        context: 'AuthProvider.resetPassword',
        email: email.replace(/(.{3}).*@/, '$1***@')
      });
      
      toast({
        title: 'Email enviado!',
        description: 'Verifique sua caixa de entrada para redefinir a senha.'
      });

      return { error: null };
    } catch (error: unknown) {
      const authError = ErrorHandler.handleAuthError(error, 'resetPassword');
      toast({
        title: 'Erro ao enviar email',
        description: 'Falha inesperada ao enviar email. Tente novamente.',
        variant: 'destructive'
      });
      return { error: authError };
    }
  };

  // Função para atualizar senha com validação
  const updatePassword = async (password: string) => {
    try {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      errorLogger.logInfo('Password update started', {
        context: 'AuthProvider.updatePassword',
        userId: user.id
      });
      
      const { error } = await withRetry(async () => {
        return await supabase.auth.updateUser({
          password
        });
      }, 2);

      if (error) {
        const authError = ErrorHandler.handleAuthError(error, 'updatePassword');
        
        let userMessage = authError.message;
        if (error.message.includes('Same password')) {
          userMessage = 'A nova senha deve ser diferente da senha atual.';
        } else if (error.message.includes('Password should be')) {
          userMessage = 'A senha deve ter pelo menos 6 caracteres.';
        }
        
        toast({
          title: 'Erro ao atualizar senha',
          description: userMessage,
          variant: 'destructive'
        });
        return { error: authError };
      }

      errorLogger.logInfo('Password updated successfully', {
        context: 'AuthProvider.updatePassword',
        userId: user.id
      });
      
      toast({
        title: 'Senha atualizada!',
        description: 'Sua senha foi alterada com sucesso.'
      });

      return { error: null };
    } catch (error: unknown) {
      const authError = ErrorHandler.handleAuthError(error, 'updatePassword');
      toast({
        title: 'Erro ao atualizar senha',
        description: 'Falha inesperada ao atualizar senha. Tente novamente.',
        variant: 'destructive'
      });
      return { error: authError };
    }
  };

  // Função para atualizar perfil com validação e retry
  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      errorLogger.logInfo('Profile update started', {
        context: 'AuthProvider.updateProfile',
        userId: user.id,
        updateFields: Object.keys(updates)
      });

      const { error } = await withRetry(async () => {
        return await apiCircuitBreaker.execute(async () => {
          return await supabase
            .from('profiles')
            .update({
              ...updates,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
        });
      }, 3);

      if (error) {
        const dbError = new Error(`Database error: ${error.message}`);
        errorLogger.logError(dbError, {
          context: 'AuthProvider.updateProfile',
          userId: user.id,
          error: error.message,
          code: error.code
        });
        
        toast({
          title: 'Erro ao atualizar perfil',
          description: 'Não foi possível salvar as alterações. Tente novamente.',
          variant: 'destructive'
        });
        return { error: dbError };
      }

      // Atualizar estado local
      await refreshProfile();

      errorLogger.logInfo('Profile updated successfully', {
        context: 'AuthProvider.updateProfile',
        userId: user.id
      });
      
      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram salvas com sucesso.'
      });

      return { error: null };
    } catch (error: unknown) {
      const authError = ErrorHandler.handleAuthError(error, 'updateProfile');
      toast({
        title: 'Erro ao atualizar perfil',
        description: 'Falha inesperada ao atualizar perfil. Tente novamente.',
        variant: 'destructive'
      });
      return { error: authError };
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    initialized,
    sessionCheckFailed,
    role: profile?.role,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}