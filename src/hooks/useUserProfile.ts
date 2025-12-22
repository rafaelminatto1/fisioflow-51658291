import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

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
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Erro ao buscar perfil:', profileError);
        setError(profileError.message);
        return null;
      }

      // Buscar role do usuário
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .limit(1)
        .single();

      const role = (roleData?.role as UserRole) || 'paciente';

      return {
        ...profileData,
        role,
      } as UserProfile;
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        }
      } catch (err) {
        console.error('Erro na inicialização:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
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
    isAdmin: profile?.role === 'admin',
    isFisio: profile?.role === 'fisioterapeuta' || profile?.role === 'admin',
    isAuthenticated: !!user,
  };
};
