import { useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, RegisterFormData } from '@/types/auth';
import { toast } from '@/hooks/use-toast';
import { AuthContext, AuthError } from '@/contexts/AuthContext';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);



  // Função para buscar perfil do usuário
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      return null;
    }
  };

  // Função para atualizar perfil
  const refreshProfile = async () => {
    if (!user) return;
    
    const profileData = await fetchProfile(user.id);
    setProfile(profileData);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Buscar perfil do usuário quando logado
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Função de login
  const signIn = async (email: string, password: string, remember = false) => {
    try {
      console.log('🔑 AuthProvider: Iniciando login para:', email);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('📊 AuthProvider: Resposta do Supabase:', { data: data?.user?.email, error });

      if (error) {
        console.error('❌ AuthProvider: Erro do Supabase:', error);
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      console.log('✅ AuthProvider: Login bem-sucedido para:', data?.user?.email);
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo(a) de volta."
      });

      return { error: null };
    } catch (error: unknown) {
      const authError = error as AuthError;
      console.error('💥 AuthProvider: Exceção durante login:', authError);
      toast({
        title: "Erro no login",
        description: authError.message,
        variant: "destructive"
      });
      return { error: authError };
    } finally {
      setLoading(false);
    }
  };

  // Função de registro
  const signUp = async (data: RegisterFormData) => {
    try {
      setLoading(true);

      const redirectUrl = `${window.location.origin}/`;
      
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: data.full_name,
            role: data.userType,
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

      if (error) {
        toast({
          title: "Erro no cadastro",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Verifique seu email para confirmar a conta."
      });

      return { error: null };
    } catch (error: unknown) {
      const authError = error as AuthError;
      toast({
        title: "Erro no cadastro",
        description: authError.message,
        variant: "destructive"
      });
      return { error: authError };
    } finally {
      setLoading(false);
    }
  };

  // Função de logout
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso."
      });
    } catch (error: unknown) {
      const authError = error as AuthError;
      toast({
        title: "Erro no logout",
        description: authError.message,
        variant: "destructive"
      });
    }
  };

  // Função para reset de senha
  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/auth/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });

      if (error) {
        toast({
          title: "Erro ao enviar email",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir a senha."
      });

      return { error: null };
    } catch (error: unknown) {
      const authError = error as AuthError;
      toast({
        title: "Erro ao enviar email",
        description: authError.message,
        variant: "destructive"
      });
      return { error: authError };
    }
  };

  // Função para atualizar senha
  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password
      });

      if (error) {
        toast({
          title: "Erro ao atualizar senha",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi alterada com sucesso."
      });

      return { error: null };
    } catch (error: unknown) {
      const authError = error as AuthError;
      toast({
        title: "Erro ao atualizar senha",
        description: authError.message,
        variant: "destructive"
      });
      return { error: authError };
    }
  };

  // Função para atualizar perfil
  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        toast({
          title: "Erro ao atualizar perfil",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      // Atualizar estado local
      await refreshProfile();

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso."
      });

      return { error: null };
    } catch (error: unknown) {
      const authError = error as AuthError;
      toast({
        title: "Erro ao atualizar perfil",
        description: authError.message,
        variant: "destructive"
      });
      return { error: authError };
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
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