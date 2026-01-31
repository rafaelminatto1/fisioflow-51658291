import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  Auth
} from 'firebase/auth';
import * as AuthModule from 'firebase/auth';
// import { getReactNativePersistence } from 'firebase/auth/react-native';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getMessaging, isSupported, Messaging } from 'firebase/messaging';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';


// Safely get environment variable compatible with Vite (Web) and Expo (Native)
const getEnv = (key: string): string | undefined => {
  // 1. Try Vite (import.meta.env)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[`VITE_${key}`]) {
      // @ts-ignore
      return import.meta.env[`VITE_${key}`];
    }
  } catch (e) { /* ignore */ }

  // 2. Try Process Env (Expo/Next.js)
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[`EXPO_PUBLIC_${key}`] || process.env[key];
    }
  } catch (e) { /* ignore */ }

  return undefined;
};

const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY'),
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('FIREBASE_APP_ID'),
  measurementId: getEnv('FIREBASE_MEASUREMENT_ID'),
};

const APP_NAME = 'fisioflow-main';

// Initialize Firebase App
let app: FirebaseApp;
const apps = getApps();
const existingApp = apps.find(a => a.name === APP_NAME || a.name === '[DEFAULT]');

if (existingApp) {
  app = existingApp;
} else if (firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig, APP_NAME);
} else {
  console.warn('[Firebase shared-api] Missing config and no existing app.');
  // Return a dummy app or let it fail gracefully downstream
  app = {} as FirebaseApp;
}

// Initialize Auth
let auth: Auth;
if (app.name) {
  try {
    if (Platform.OS !== 'web') {
      // React Native Persistence
      // Using dynamic import/access to avoid bundler issues in shared code
      // logic: we need 'getReactNativePersistence' from firebase/auth
      const rnPersistence = (AuthModule as any).getReactNativePersistence;

      auth = initializeAuth(app, {
        persistence: rnPersistence ? rnPersistence(AsyncStorage) : undefined
      });
    } else {
      // Web Persistence (Default)
      auth = getAuth(app);
    }
  } catch (error: any) {
    if (error?.code === 'auth/already-initialized') {
      auth = getAuth(app);
    } else {
      console.warn('[Firebase shared-api] Auth init error:', error);
      auth = getAuth(app);
    }
  }
} else {
  auth = {} as Auth;
}

// Initialize Services
export const db: Firestore = app.name ? getFirestore(app) : {} as Firestore;
export const storage: FirebaseStorage = app.name ? getStorage(app) : {} as FirebaseStorage;
export const functions: Functions = app.name ? getFunctions(app, 'southamerica-east1') : {} as Functions;

// Export Auth
export { auth };

// Initialize Messaging (Async)
export const messagingPromise: Promise<Messaging | null> = (async () => {
  if (!app.name || Platform.OS === 'ios') return null; // iOS specifics handled by APNs usually, but allow if configured
  // Note: 'isSupported' is mainly for Web. Native usually supports it via native modules.
  // But for shared-api, we can try/catch
  try {
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
  } catch (e) {
    // ignore
  }
  return null;
})();

// Helper to access messaging synchronously if already initialized (careful)
export let messaging: Messaging | null = null;
messagingPromise.then(m => { messaging = m; });

// Emulator Connection
if (process.env.NODE_ENV === 'development' && getEnv('USE_EMULATOR') === 'true') {
  if (app.name) {
    try {
      connectFunctionsEmulator(functions, 'localhost', 5001);
      console.log('[Firebase] Connected to Functions Emulator');
    } catch (e) { /* ignore already connected */ }
  }
}

export { isSupported } from 'firebase/messaging';
export default app;

