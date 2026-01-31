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


// Safely get environment variable
const getEnv = (key: string): string | undefined => {
  try {
    // @ts-ignore - import.meta.env is Vite-specific
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const viteValue = import.meta.env[`VITE_${key}`];
      if (viteValue) return viteValue;
    }
  } catch (e) { }

  try {
    if (typeof process !== 'undefined' && process.env) {
      const envValue = process.env[`EXPO_PUBLIC_${key}`];
      if (envValue) return envValue;
    }
  } catch (e) { }

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
const existingApps = getApps();

let app: FirebaseApp;

// Logic: Prefer existing app, otherwise initialize
if (existingApps.length > 0) {
  app = existingApps[0];
} else if (firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig, APP_NAME);
} else {
  console.warn('[Firebase shared-api] No config found and no existing app. Initialization may fail.');
  // Fallback to avoid immediate crash on import if possible
  app = {} as FirebaseApp;
}

// Initialize Auth with persistence for React Native if applicable
let auth: Auth;
if (app.name) {
  try {
    if (Platform.OS !== 'web') {
      auth = initializeAuth(app, {
        // @ts-ignore
        persistence: (AuthModule as any)['getReactNative' + 'Persistence'](AsyncStorage)
      });
    } else {
      auth = getAuth(app);
    }
  } catch (error) {
    // Already initialized or platform issue
    auth = getAuth(app);
  }
} else {
  auth = {} as Auth;
}

// Initialize other services
export const db: Firestore = app.name ? getFirestore(app) : {} as Firestore;
export const storage: FirebaseStorage = app.name ? getStorage(app) : {} as FirebaseStorage;
export const functions: Functions = app.name ? getFunctions(app, 'southamerica-east1') : {} as Functions;

export { auth };

// Messaging (with platform support check)
export let messaging: Messaging | null = null;
if (app.name) {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  });
}

// Connect to emulator in development
if (process.env.NODE_ENV === 'development' && getEnv('USE_EMULATOR') === 'true') {
  if (app.name) connectFunctionsEmulator(functions, 'localhost', 5001);
}

export { isSupported } from 'firebase/messaging';
export default app;

