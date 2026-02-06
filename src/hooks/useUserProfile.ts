/**
 * useUserProfile - Migrated to Firebase Auth + Firestore
 */

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, getFirebaseAuth, db } from '@/integrations/firebase/app';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { fisioLogger as logger } from '@/lib/errors/logger';

const auth = getFirebaseAuth();

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
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ensureProfile = useCallback(async (userId: string, email: string | null, fullName?: string | null) => {
    try {
      const profileRef = doc(db, 'profiles', userId);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        // Criar perfil se não existir
        await setDoc(profileRef, {
          user_id: userId,
          full_name: fullName || null,
          email: email || null,
          avatar_url: null,
          phone: null,
          organization_id: null,
          onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      logger.error('Erro ao garantir perfil', err, 'useUserProfile');
    }
  }, []);

  /**
   * Buscar perfil do usuário no Firestore
   */
  const fetchProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<UserProfile | null> => {
    try {
      // Buscar perfil
      const profileRef = doc(db, 'profiles', firebaseUser.uid);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        // Criar perfil defensivamente
        await ensureProfile(
          firebaseUser.uid,
          firebaseUser.email,
          firebaseUser.displayName
        );

        // Buscar novamente
        const retrySnap = await getDoc(profileRef);
        if (!retrySnap.exists()) {
          setError('Perfil não encontrado');
          return null;
        }

        const profileData = retrySnap.data();

        // Buscar role do usuário
        const roleRef = doc(db, 'user_roles', firebaseUser.uid);
        const roleSnap = await getDoc(roleRef);
        const role = (roleSnap.data()?.role as UserRole) || 'paciente';

        return {
          id: retrySnap.id,
          ...profileData,
          role,
        } as UserProfile;
      }

      const profileData = profileSnap.data();

      // Buscar role do usuário
      const roleRef = doc(db, 'user_roles', firebaseUser.uid);
      const roleSnap = await getDoc(roleRef);
      const role = (roleSnap.data()?.role as UserRole) || 'paciente';

      return {
        id: profileSnap.id,
        ...profileData,
        role,
      } as UserProfile;
    } catch (err) {
      logger.error('Erro ao buscar perfil', err, 'useUserProfile');
      setError(err instanceof Error ? err.message : 'Erro ao buscar perfil');
      return null;
    }
  }, [ensureProfile]);

  /**
   * Atualizar perfil do usuário no Firestore
   */
  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, {
        ...data,
        updated_at: new Date().toISOString()
      });

      // Atualizar estado local
      setProfile(prev => prev ? { ...prev, ...data } : null);
      return { success: true };
    } catch (err) {
      logger.error('Erro ao atualizar perfil', err, 'useUserProfile');
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Atualizar perfil do usuário
   */
  const refreshProfile = async () => {
    if (user?.uid) {
      setLoading(true);
      const profileData = await fetchProfile(user);
      setProfile(profileData);
      setLoading(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Firebase Auth state listener
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            setUser(firebaseUser);

            // Garantir que o perfil exista (especialmente para novos usuários)
            await ensureProfile(
              firebaseUser.uid,
              firebaseUser.email,
              firebaseUser.displayName
            );

            const profileData = await fetchProfile(firebaseUser);
            setProfile(profileData);
          } else {
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
        });

        return unsubscribe;
      } catch (err) {
        logger.error('Erro na inicialização do perfil', err, 'useUserProfile');
        setLoading(false);
      }
    };

    initAuth();
  }, [ensureProfile, fetchProfile]);

  /**
   * Obter nome de exibição
   */
  const getDisplayName = () => {
    if (profile?.full_name) return profile.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'Usuário';
  };

  /**
   * Obter iniciais do nome
   */
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
    updateProfile,
    getDisplayName,
    getInitials,
    // Todos os usuários autenticados são considerados admin/fisio
    isAdmin: !!user,
    isFisio: !!user,
    isAuthenticated: !!user,
  };
};
