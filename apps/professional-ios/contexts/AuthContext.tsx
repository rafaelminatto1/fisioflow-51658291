import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Profile } from '@/types/auth';
import { HapticFeedback } from '@/lib/haptics';

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        // Fetch user profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setProfile({
              id: user.uid,
              email: user.email!,
              full_name: userData.full_name || user.displayName || '',
              role: userData.role || 'fisioterapeuta',
              phone: userData.phone || '',
              photo_url: userData.photo_url || user.photoURL || '',
              organization_id: userData.organization_id || '',
              created_at: userData.created_at || new Date().toISOString(),
              updated_at: userData.updated_at || new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    HapticFeedback.light();
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signOut = useCallback(async () => {
    HapticFeedback.medium();
    await firebaseSignOut(auth);
    setProfile(null);
  }, []);

  const updateProfile = useCallback(async (data: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');

    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    await updateDoc(doc(db, 'users', user.uid), updateData);

    setProfile((prev) =>
      prev ? { ...prev, ...updateData } : null
    );
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        profile,
        loading,
        signIn,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
