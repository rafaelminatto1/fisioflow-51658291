import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { logger } from '@/lib/errors/logger';
import { ensureProfile } from '@/lib/database/profiles';

export type UserRole = 'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  organization_id: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
  role?: UserRole;
}

export const useUserProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      // Buscar perfil
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url, email, phone, organization_id, onboarding_completed, created_at, updated_at')
        .eq('user_id', userId)
        .single();

      // Se não encontrou perfil, tenta garantir que ele exista (defensivo)
      if (profileError || !profileData) {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user;

        if (currentUser && currentUser.id === userId) {
          const fullName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name;
          await ensureProfile(userId, currentUser.email, fullName);

          // Tentar buscar novamente após garantir
          const { data: retryData, error: retryError } = await supabase
            .from('profiles')
            .select('id, user_id, full_name, avatar_url, email, phone, organization_id, onboarding_completed, created_at, updated_at')
            .eq('user_id', userId)
            .single();

          if (!retryError) {
            profileData = retryData;
            profileError = null;
          }
        }
      }

      if (profileError || !profileData) {
        logger.error('Erro ao buscar perfil', profileError, 'useUserProfile');
        setError(profileError?.message || 'Perfil não encontrado');
        return null;
      }

      // Buscar role do usuário
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      const role = (roleData?.role as UserRole) || 'paciente';

      return {
        ...profileData,
        role,
      } as UserProfile;
    } catch (err) {
      logger.error('Erro ao buscar perfil', err, 'useUserProfile');
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      setLoading(true);
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
      setLoading(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          // Antes de buscar, garante que o perfil exista (especialmente para novos usuários ou dev environments)
          const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name;
          await ensureProfile(session.user.id, session.user.email, fullName);

          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        }
      } catch (err) {
        logger.error('Erro na inicialização do perfil', err, 'useUserProfile');
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name;
          await ensureProfile(session.user.id, session.user.email, fullName);

          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const getDisplayName = () => {
    if (profile?.full_name) return profile.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'Usuário';
  };

  const getInitials = () => {
    const name = getDisplayName();
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return {
    user,
    profile,
    loading,
    error,
    refreshProfile,
    getDisplayName,
    getInitials,
    // Todos os usuários autenticados são considerados admin/fisio
    isAdmin: !!user,
    isFisio: !!user,
    isAuthenticated: !!user,
  };
};
