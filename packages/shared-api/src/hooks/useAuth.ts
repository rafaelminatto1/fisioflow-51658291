/**
 * FisioFlow - useAuth Hook
 *
 * Custom hook for authentication with Firebase
 * Provides auth state, user data, and auth methods
 */

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { auth, db } from '@fisioflow/shared-api/src/firebase/config';
import { COLLECTIONS } from '@fisioflow/shared-constants';
import type { User as FirebaseUser } from 'firebase/auth';

export interface UserData {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'professional' | 'admin';
  professionalId?: string;
  createdAt: string;
  updatedAt: string;
  phone?: string;
  avatar?: string;
  // Patient specific
  dateOfBirth?: string;
  cpf?: string;
  // Professional specific
  licenseNumber?: string;
  specialties?: string[];
}

export interface AuthState {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isPatient: boolean;
  isProfessional: boolean;
  isAdmin: boolean;
}

export interface UseAuthReturn extends AuthState {
  refreshUserData: () => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * useAuth Hook
 *
 * Provides authentication state and methods
 * Automatically listens to Firebase auth changes
 */
export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    userData: null,
    loading: true,
    error: null,
    isAuthenticated: false,
    isPatient: false,
    isProfessional: false,
    isAdmin: false,
  });

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          // User is signed in
          try {
            // Fetch user data from Firestore
            const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid));

            if (userDoc.exists()) {
              const userData = userDoc.data() as UserData;
              setState({
                user: firebaseUser,
                userData,
                loading: false,
                error: null,
                isAuthenticated: true,
                isPatient: userData.role === 'patient',
                isProfessional: userData.role === 'professional',
                isAdmin: userData.role === 'admin',
              });
            } else {
              // User exists in Auth but not in Firestore
              setState({
                user: firebaseUser,
                userData: null,
                loading: false,
                error: 'Dados do usuário não encontrados',
                isAuthenticated: true,
                isPatient: false,
                isProfessional: false,
                isAdmin: false,
              });
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            setState((prev) => ({
              ...prev,
              loading: false,
              error: error instanceof Error ? error.message : 'Erro ao carregar dados',
            }));
          }
        } else {
          // User is signed out
          setState({
            user: null,
            userData: null,
            loading: false,
            error: null,
            isAuthenticated: false,
            isPatient: false,
            isProfessional: false,
            isAdmin: false,
          });
        }
      },
      (error) => {
        console.error('Auth state change error:', error);
        setState({
          user: null,
          userData: null,
          loading: false,
          error: error.message,
          isAuthenticated: false,
          isPatient: false,
          isProfessional: false,
          isAdmin: false,
        });
      }
    );

    return () => unsubscribe();
  }, []);

  // Refresh user data
  const refreshUserData = useCallback(async () => {
    if (!state.user) return;

    try {
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, state.user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        setState((prev) => ({
          ...prev,
          userData,
        }));
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  }, [state.user]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await auth.signOut();
      setState({
        user: null,
        userData: null,
        loading: false,
        error: null,
        isAuthenticated: false,
        isPatient: false,
        isProfessional: false,
        isAdmin: false,
      });
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, []);

  return {
    ...state,
    refreshUserData,
    signOut,
  };
}

/**
 * useUserData Hook
 *
 * Real-time listener for user document changes
 */
export function useUserData(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.uid;

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      doc(db, COLLECTIONS.USERS, targetUserId),
      (doc) => {
        if (doc.exists()) {
          setUserData(doc.data() as UserData);
          setError(null);
        } else {
          setError('Usuário não encontrado');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to user data:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [targetUserId]);

  return { userData, loading, error };
}

/**
 * useAuthRedirect Hook
 *
 * Redirects based on authentication state
 */
export function useAuthRedirect() {
  const { isAuthenticated, loading, isProfessional } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace('/(auth)/login');
      } else if (isProfessional) {
        // Redirect professional users to their app
        router.replace('/professional');
      }
    }
  }, [isAuthenticated, loading, isProfessional, router]);

  return { isAuthenticated, loading };
}
