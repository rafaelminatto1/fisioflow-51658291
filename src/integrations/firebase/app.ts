/**
 * Firebase App Initialization
 * Inicialização do Firebase no frontend
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';

import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';

import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

import {

  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
  Firestore,
  doc,
  getDoc,
  setDoc as firestoreSetDoc,
  updateDoc as firestoreUpdateDoc,
  collection,
  collectionGroup,
  getDocs,
  query,
  where,
  limit,
  addDoc as firestoreAddDoc,
  deleteDoc,
  orderBy,
  onSnapshot,
  getDocsFromCache,
  getDocFromCache,
  getDocsFromServer,
  getDocFromServer,
  getCountFromServer,
  Timestamp,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  deleteField,
  runTransaction,
  writeBatch,
  startAfter,
  startAt,
  endBefore,
  endAt,
  and,
  or,
  documentId,
  Query,
  CollectionReference,
  DocumentReference,
  DocumentData,
  QueryDocumentSnapshot,
  QuerySnapshot,
  QueryConstraint,
  Unsubscribe
} from 'firebase/firestore';
import { connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions, httpsCallable } from 'firebase/functions';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { cleanForFirestore } from '@/utils/firestoreData';

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
const _APP_NAME = 'fisioflow-app';

/**
 * Helper para parsear URL do emulator (formato: "host:port")
 * Retorna [host, port] para uso com connectFirestoreEmulator
 */
function parseEmulatorUrl(url: string): [string, number] {
  const [host, portStr] = url.split(':');
  const port = parseInt(portStr, 10);
  return [host, port];
}

/**
 * Obtém a URL do emulator de auth a partir da variável de ambiente
 */
function getAuthEmulatorUrl(): string | null {
  const host = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST;
  return host ? `http://${host}` : null;
}

/**
 * Obtém a URL do emulator de firestore a partir da variável de ambiente
 */
function getFirestoreEmulatorHost(): string | null {
  return import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || null;
}

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
  logger.error(
    `Firebase config: Missing required keys: ${missingKeys.join(', ')}`,
    undefined,
    'firebase-app'
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

    // Inicializar App Check apenas no navegador
    if (typeof window !== 'undefined') {
      // @ts-ignore - self.FIREBASE_APPCHECK_DEBUG_TOKEN can be used for local testing
      if (import.meta.env.DEV) {
        // @ts-ignore
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }

      initializeAppCheck(appInstance, {
        provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_APP_CHECK_SITE_KEY || '6Ld_placeholder'),
        isTokenAutoRefreshEnabled: true
      });
      console.log('[Firebase] App Check initialized');
    }
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

    // Conectar ao Firebase Emulator em testes E2E (se configurado)
    const emulatorUrl = getAuthEmulatorUrl();
    if (emulatorUrl) {
      try {
        connectAuthEmulator(authInstance, emulatorUrl, {
          disableWarnings: true,
        });
        logger.info(`Firebase Auth: Connected to emulator at ${emulatorUrl}`, undefined, 'firebase-app');
      } catch (err) {
        logger.warn('Firebase Auth: Failed to connect to emulator', err, 'firebase-app');
      }
    }
  }
  return authInstance;
}

/**
 * Obtém a instância do Firebase Firestore (Sync)
 * Configura cache persistente para offline support se em produção
 */
function initializeDbInstance(): Firestore {
  if (!dbInstance) {
    const app = getFirebaseApp();
    
    // Configurar cache do Firestore
    // Em produção, usar IndexedDB para persistência (multi-tab support)
    if (import.meta.env.PROD && typeof window !== 'undefined') {
      try {
        dbInstance = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
            cacheSizeBytes: CACHE_SIZE_UNLIMITED
          }),
          experimentalAutoDetectLongPolling: true
        });
        logger.info('Firestore: Multi-tab persistence enabled via localCache', undefined, 'firebase-app');
      } catch (err) {
        // Fallback se initializeFirestore falhar (ex: já inicializado)
        dbInstance = getFirestore(app);
        logger.warn('Firestore: Using fallback instance (persistence might be disabled)', err, 'firebase-app');
      }
    } else {
      // Em desenvolvimento ou ambiente sem window, usar instância padrão
      dbInstance = getFirestore(app);
      logger.info('Firestore: Initialized default instance', undefined, 'firebase-app');
    }

    // Conectar ao Firebase Emulator em testes E2E (se configurado)
    const emulatorHost = getFirestoreEmulatorHost();
    if (emulatorHost) {
      try {
        connectFirestoreEmulator(dbInstance, ...parseEmulatorUrl(emulatorHost));
        logger.info(`Firebase Firestore: Connected to emulator at ${emulatorHost}`, undefined, 'firebase-app');
      } catch (_err) {
        // Ignorar se já estiver conectado ou erro não crítico
      }
    }
  }
  return dbInstance;
}

/**
 * Obtém a instância do Firebase Firestore (Async)
 * Mantido por compatibilidade com código que aguarda a inicialização
 */
export async function getFirebaseDb(): Promise<Firestore> {
  return initializeDbInstance();
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
  return initializeDbInstance();
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
 * exportamos a instância inicializada aqui.
 */
export const db = initializeDbInstance();

export const storage = getFirebaseStorage();
export const functions = getFirebaseFunctions();

/**
 * Expor instâncias do Firebase no window para diagnóstico em desenvolvimento
 */
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as unknown).__fisioflow_firebase__ = {
    app,
    auth,
    db,
    storage,
    functions,
  };
  console.log('[Firebase] Instances exposed at window.__fisioflow_firebase__ for debugging');
}

/**
 * Re-export Firestore functions for convenience
 * Wraps addDoc, updateDoc and setDoc to remove undefined values automatically
 */
export const addDoc = (reference: CollectionReference<unknown>, data: unknown) => {
  return firestoreAddDoc(reference, cleanForFirestore(data));
};

export const updateDoc = (reference: DocumentReference<unknown>, ...args: unknown[]) => {
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
    return firestoreUpdateDoc(reference, cleanForFirestore(args[0]));
  }
  return (firestoreUpdateDoc as unknown)(reference, ...args);
};

export const setDoc = (reference: DocumentReference<unknown>, data: unknown, options?: unknown) => {
  if (options) {
    return firestoreSetDoc(reference, cleanForFirestore(data), options);
  }
  return firestoreSetDoc(reference, cleanForFirestore(data));
};

/**
 * Obtém a contagem de documentos em uma coleção ou query de forma eficiente (servidor)
 */
export const getCount = async (query: Query<unknown>): Promise<number> => {
  const snapshot = await getCountFromServer(query);
  return snapshot.data().count;
};

export {
  doc,
  getDoc,
  collection,
  collectionGroup,
  getDocs,
  query,
  where,
  limit,
  deleteDoc,
  orderBy,
  onSnapshot,
  getDocsFromCache,
  getDocFromCache,
  getDocsFromServer,
  getDocFromServer,
  getCountFromServer,
  Timestamp,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  deleteField,
  runTransaction,
  writeBatch,
  startAfter,
  startAt,
  endBefore,
  endAt,
  and,
  or,
  documentId
};

// Re-export types
export type {
  Query,
  CollectionReference,
  DocumentReference,
  DocumentData,
  QueryDocumentSnapshot,
  QuerySnapshot,
  QueryConstraint,
  Unsubscribe
};

/**
 * Re-export Functions helper for convenience
 */
export { httpsCallable };
