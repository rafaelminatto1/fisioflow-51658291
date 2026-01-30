/**
 * Firebase App Initialization
 * Inicialização do Firebase no frontend
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, limit, addDoc, deleteDoc, enableMultiTabIndexedDbPersistence, enableIndexedDbPersistence } from 'firebase/firestore';
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

// Nome único da aplicação para isolarar de outros projetos Firebase locais
const APP_NAME = 'fisioflow-app';

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
    if (import.meta.env.PROD && typeof window !== 'undefined') {
      try {
        // Habilitar persistência com multi-tab support
        await enableMultiTabIndexedDbPersistence(dbInstance);
        console.log('🗄️ Firestore: Multi-tab persistence enabled');
      } catch (err: unknown) {
        const error = err as { code?: string };
        if (error.code === 'failed-precondition') {
          console.warn('⚠️ Firestore: Persistence failed - multiple tabs open');
        } else if (error.code === 'unimplemented') {
          console.warn('⚠️ Firestore: Persistence not supported in this browser');
        } else {
          console.error('❌ Firestore: Persistence error:', err);
        }
      }
    } else {
      // Em desenvolvimento, usar cache sem persistência
      console.log('🔥 Firestore: Running in development mode (no persistence)');
    }
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
export function getFirebaseFunctions(region: string = 'southamerica-east1'): Functions {
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
  return getFirestore(getFirebaseApp());
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
 * Exportas instâncias de app e auth como singletons
 */
export const app = getFirebaseApp();
export const auth = getFirebaseAuth();

/**
 * Instância exportada do Firestore
 * IMPORTANTE: Para garantir que a persistência seja configurada, 
 * use preferencialmente getFirebaseDb() ou useFirestore() hook.
 * Mas para compatibilidade com código existente que importa 'db', 
 * exportamos a instância básica aqui.
 */
export const db = getFirestore(app);

export const storage = getFirebaseStorage();
export const functions = getFirebaseFunctions();

/**
 * Inicializa a persistência do Firestore em background
 * Não bloqueia a inicialização da aplicação
 */
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  getFirebaseDb().catch((err) => {
    console.warn('Firestore persistence initialization deferred:', err);
  });
}

/**
 * Re-export Firestore functions for convenience
 */
export { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, limit, addDoc, deleteDoc };

/**
 * Re-export Functions helper for convenience
 */
export { httpsCallable };
