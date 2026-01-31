import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { COLLECTIONS } from '@fisioflow/shared-constants';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: 'patient' | 'professional';
  professionalId?: string;
}

export async function login({ email, password }: LoginCredentials) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return getUserData(credential.user);
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  return getUserData(credential.user);
}

export async function register({ email, password, name, role, professionalId }: RegisterData) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  // Update profile
  await updateProfile(credential.user, { displayName: name });

  // Create user document
  const userData = {
    id: credential.user.uid,
    email: credential.user.email,
    name,
    role,
    professionalId,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await setDoc(doc(db, COLLECTIONS.USERS, credential.user.uid), userData);

  return userData;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function getCurrentUser() {
  if (!auth.currentUser) return null;
  return getUserData(auth.currentUser);
}

async function getUserData(user: FirebaseUser) {
  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));

  if (!userDoc.exists()) {
    throw new Error('User document not found');
  }

  return {
    uid: user.uid,
    email: user.email,
    ...userDoc.data(),
  };
}

// Auth state observer
export function onAuthStateChanged(callback: (user: any | null) => void) {
  return firebaseOnAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const userData = await getUserData(firebaseUser);
        callback(userData);
      } catch (error) {
        console.error('[Auth] Error getting user data:', error);
        callback(null);
      }
    } else {
      callback(null);
    }
  });
}

