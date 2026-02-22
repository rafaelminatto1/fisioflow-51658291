import { create } from 'zustand';

import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { auditLogger } from '@/lib/services/auditLogger';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'professional' | 'admin' | 'fisioterapeuta';
  clinicId?: string;
  organizationId?: string;
  avatarUrl?: string;
  specialty?: string;
  crefito?: string;
  phone?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
}

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  isLocked: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  initialize: () => () => void;
  updateUserData: (data: Partial<User>) => void;
  lockSession: () => void;
  unlockSession: () => Promise<void>;
  clearSession: () => void;
}

export const unlockSessionWithPIN = async (pin: string) => {
  // Global helper or state action
  return true;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  isLocked: false,

  signIn: async (email: string, password: string) => {
    console.log('[Auth] =====================');
    console.log('[Auth] =====================');
    console.log('[Auth] Tentando fazer login com:', email);
    set({ isLoading: true, error: null });
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log('[Auth] Firebase login bem-sucedido. UID:', firebaseUser.uid);
      console.log('[Auth] Firebase user:', firebaseUser);

      // Fetch user profile from Firestore - try usuarios collection first, then users, then profiles
      let userDoc = await getDoc(doc(db, 'usuarios', firebaseUser.uid));
      let userData = userDoc.exists() ? userDoc.data() : null;
      console.log('[Auth] Usuario encontrado em usuarios:', !!userData);

      // If not found in usuarios, try users collection
      if (!userData) {
        userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        userData = userDoc.exists() ? userDoc.data() : null;
        console.log('[Auth] Usuario encontrado em users:', !!userData);
      }

      // If not found in users, try profiles collection
      if (!userData) {
        console.log('[Auth] Buscando em profiles...');
        const profileDoc = await getDoc(doc(db, 'profiles', firebaseUser.uid));
        if (profileDoc.exists()) {
          userData = profileDoc.data();
          console.log('[Auth] Usuario encontrado em profiles:', userData);
        }
      }

      if (userData) {
        // Check if user is a professional (accept fisioterapeuta, professional, or admin)
        const userRole = userData.role || userData.tipoUsuario || userData.type;
        console.log('[Auth] Role do usuario:', userRole);
        if (userRole !== 'professional' && userRole !== 'fisioterapeuta' && userRole !== 'admin') {
          await firebaseSignOut(auth);
          throw new Error('Acesso restrito a profissionais');
        }

        const user: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: userData.name || userData.nome || userData.displayName || userData.full_name || userData.nomeCompleto || 'Profissional',
          role: userRole as any,
          clinicId: userData.clinicId || userData.clinic_id || userData.clinicaId,
          // Use a default organizationId if not set (for development/testing)
          organizationId: userData.organizationId || userData.organization_id || 'org-default',
          avatarUrl: userData.avatarUrl || userData.photoURL,
          specialty: userData.specialty || userData.especialidade,
          crefito: userData.crefito,
        };

        console.log('[Auth] Login completo. Usuario:', user);
        
        // Log audit event
        await auditLogger.logLogin(user.id);

        set({
          user,
          firebaseUser,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        await firebaseSignOut(auth);
        throw new Error('Usuario nao encontrado no Firestore. Entre em contato com o administrador.');
      }
    } catch (error: any) {
      console.log('[Auth] =====================');
      console.log('[Auth] Erro no login:', error);
      console.log('[Auth] Error code:', error.code);
      console.log('[Auth] Error message:', error.message);
      let errorMessage = 'Erro ao fazer login';

      if (error.message === 'Acesso restrito a profissionais') {
        errorMessage = error.message;
      } else if (error.message === 'Usuario nao encontrado') {
        errorMessage = error.message;
      } else {
        switch (error.code) {
          case 'auth/invalid-email':
            errorMessage = 'Email invalido';
            break;
          case 'auth/user-disabled':
            errorMessage = 'Usuario desativado';
            break;
          case 'auth/user-not-found':
            errorMessage = 'Usuario nao encontrado';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Senha incorreta';
            break;
          case 'auth/invalid-credential':
            errorMessage = 'Credenciais invalidas';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
            break;
        }
      }

      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  signOut: async () => {
    const currentUser = get().user;
    set({ isLoading: true });
    try {
      if (currentUser) {
        await auditLogger.logLogout(currentUser.id);
      }
      await firebaseSignOut(auth);
      set({
        user: null,
        firebaseUser: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  updateUserData: (data: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      set({
        user: {
          ...currentUser,
          ...data,
        },
      });
    }
  },

  lockSession: () => set({ isLocked: true }),
  unlockSession: async () => set({ isLocked: false }),
  clearSession: () => set({ isLocked: false, isAuthenticated: false, user: null, firebaseUser: null }),

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Try usuarios collection first, then users, then profiles
          let userDoc = await getDoc(doc(db, 'usuarios', firebaseUser.uid));
          let userData = userDoc.exists() ? userDoc.data() : null;

          // If not found in usuarios, try users collection
          if (!userData) {
            userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            userData = userDoc.exists() ? userDoc.data() : null;
          }

          // If not found in users, try profiles collection
          if (!userData) {
            const profileDoc = await getDoc(doc(db, 'profiles', firebaseUser.uid));
            if (profileDoc.exists()) {
              userData = profileDoc.data();
            }
          }

          if (userData) {
            // Only allow professionals (fisioterapeuta, professional, or admin)
            const userRole = userData.role || userData.tipoUsuario || userData.type;
            if (userRole !== 'professional' && userRole !== 'fisioterapeuta' && userRole !== 'admin') {
              await firebaseSignOut(auth);
              set({
                user: null,
                firebaseUser: null,
                isAuthenticated: false,
                isLoading: false,
              });
              return;
            }

            const user: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: userData.name || userData.nome || userData.displayName || userData.full_name || userData.nomeCompleto || 'Profissional',
              role: userRole as any,
              clinicId: userData.clinicId || userData.clinic_id || userData.clinicaId,
              // Use a default organizationId if not set (for development/testing)
              organizationId: userData.organizationId || userData.organization_id || 'org-default',
              avatarUrl: userData.avatarUrl || userData.photoURL,
              specialty: userData.specialty || userData.especialidade,
              crefito: userData.crefito,
            };

            set({
              user,
              firebaseUser,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({
              user: null,
              firebaseUser: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            user: null,
            firebaseUser: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        set({
          user: null,
          firebaseUser: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    });

    return unsubscribe;
  },
}));
