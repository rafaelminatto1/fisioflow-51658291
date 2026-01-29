/**
 * Firebase App Initialization
 * Inicialização do Firebase no frontend
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, addDoc, deleteDoc, enableMultiTabIndexedDbPersistence, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions, httpsCallable } from 'firebase/functions';

// Configuração do Firebase (carregada das variáveis de ambiente)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validar configuração
const requiredKeys: (keyof typeof firebaseConfig)[] = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'appId',
];

const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key]);

if (missingKeys.length > 0) {
  console.error(
    `Firebase config: Missing required keys: ${missingKeys.join(', ')}`
  );
}

// Inicializar Firebase (singleton pattern)
let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;
let functionsInstance: Functions | null = null;

/**
 * Obtém a instância do Firebase App
 */
export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return appInstance;
}

/**
 * Obtém a instância do Firebase Auth
 */
export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());

    // Configurar persistência de auth
    // Note: Para web, usamos localStorage por padrão
  }
  return authInstance;
}

/**
 * Obtém a instância do Firebase Firestore
 * Configura cache persistente para offline support
 */
export async function getFirebaseDb(): Promise<Firestore> {
  if (!dbInstance) {
    const app = getFirebaseApp();
    dbInstance = getFirestore(app);

    // Configurar cache do Firestore
    // Em desenvolvimento, usar cache em memória para evitar problemas
    // Em produção, usar IndexedDB para persistência
    if (import.meta.env.PROD) {
      try {
        // Habilitar persistência com multi-tab support
        await enableMultiTabIndexedDbPersistence(dbInstance);
        console.log('🗄️ Firestore: Multi-tab persistence enabled');
      } catch (err: any) {
        if (err.code === 'failed-precondition') {
          console.warn('⚠️ Firestore: Persistence failed - multiple tabs open');
        } else if (err.code === 'unimplemented') {
          console.warn('⚠️ Firestore: Persistence not supported in this browser');
        } else {
          console.error('❌ Firestore: Persistence error:', err);
        }
      }
    } else {
      // Em desenvolvimento, usar cache sem persistência
      console.log('🔥 Firestore: Running in development mode (no persistence)');
    }

    // Configurar cache settings otimizados
    // Aumentar o tamanho do cache em memória (40 MB padrão)
    dbInstance.settings({
      cacheSizeBytes: 40 * 1024 * 1024, // 40 MB
    });
  }
  return dbInstance;
}

/**
 * Obtém a instância do Firebase Storage
 */
export function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getStorage(getFirebaseApp());
  }
  return storageInstance;
}

/**
 * Obtém a instância do Firebase Functions
 * Configurada para usar a região correta
 */
export function getFirebaseFunctions(region: string = 'us-central1'): Functions {
  if (!functionsInstance) {
    functionsInstance = getFunctions(getFirebaseApp(), region);
  }
  return functionsInstance;
}

/**
 * Tipos TypeScript para autocompletar
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * Hook React para usar o Firebase App
 */
export function useFirebase(): FirebaseApp {
  return getFirebaseApp();
}

/**
 * Hook React para usar o Firebase Auth
 */
export function useAuth(): Auth {
  return getFirebaseAuth();
}

/**
 * Hook React para usar o Firestore
 */
export function useFirestore(): Firestore {
  return getFirebaseDb();
}

/**
 * Hook React para usar o Storage
 */
export function useStorage(): FirebaseStorage {
  return getFirebaseStorage();
}

/**
 * Verifica se o Firebase está devidamente configurado
 */
export function isFirebaseConfigured(): boolean {
  return missingKeys.length === 0;
}

/**
 * Exporta as instâncias padrão
 * Nota: db agora é async devido à configuração de persistência
 */
export const app = getFirebaseApp();
export const auth = getFirebaseAuth();
export const db = getFirebaseDb(); // Promise<Firestore>
export const storage = getFirebaseStorage();
export const functions = getFirebaseFunctions();

/**
 * Versão síncrona para compatibilidade (use com cautela)
 * A persistência pode não estar inicializada
 */
export const dbSync = getFirestore(getFirebaseApp());

/**
 * Re-export Firestore functions for convenience
 */
export { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, addDoc, deleteDoc };

/**
 * Re-export Functions helper for convenience
 */
export { httpsCallable };
