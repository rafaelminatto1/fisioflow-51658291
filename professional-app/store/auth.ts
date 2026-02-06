import { create } from 'zustand';

  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'professional' | 'admin';
  clinicId?: string;
  avatarUrl?: string;
  specialty?: string;
  crefito?: string;
}

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  initialize: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Fetch user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Check if user is a professional
        if (userData.role !== 'professional' && userData.role !== 'admin') {
          await firebaseSignOut(auth);
          throw new Error('Acesso restrito a profissionais');
        }

        const user: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: userData.name || userData.displayName || 'Profissional',
          role: userData.role,
          clinicId: userData.clinicId,
          avatarUrl: userData.avatarUrl || userData.photoURL,
          specialty: userData.specialty,
          crefito: userData.crefito,
        };

        set({
          user,
          firebaseUser,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        await firebaseSignOut(auth);
        throw new Error('Usuario nao encontrado');
      }
    } catch (error: any) {
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
    set({ isLoading: true });
    try {
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

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

          if (userDoc.exists()) {
            const userData = userDoc.data();

            // Only allow professionals
            if (userData.role !== 'professional' && userData.role !== 'admin') {
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
              name: userData.name || userData.displayName || 'Profissional',
              role: userData.role,
              clinicId: userData.clinicId,
              avatarUrl: userData.avatarUrl || userData.photoURL,
              specialty: userData.specialty,
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
