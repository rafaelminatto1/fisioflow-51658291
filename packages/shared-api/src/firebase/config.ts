import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Safely get environment variable
const getEnv = (key: string): string | undefined => {
  // Try web env (Vite)
  try {
    // @ts-ignore - import.meta.env is Vite-specific
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const viteValue = import.meta.env[`VITE_${key}`];
      if (viteValue) return viteValue;
    }
  } catch (e) {
    // Ignore
  }

  // Try native env (Expo/React Native)
  try {
    if (typeof process !== 'undefined' && process.env) {
      const envValue = process.env[`EXPO_PUBLIC_${key}`];
      if (envValue) return envValue;
    }
  } catch (e) {
    // Ignore
  }

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

// Validate config - only create app if we have valid config
const requiredKeys: (keyof typeof firebaseConfig)[] = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0 && typeof window !== 'undefined') {
  console.warn('[Firebase shared-api] Missing config keys:', missingKeys.join(', '));
  console.warn('[Firebase shared-api] Skipping initialization, will use main Firebase app');
}

// Initialize Firebase with unique app name to avoid conflicts
// ONLY if we have valid config - otherwise use existing app
const APP_NAME = 'fisioflow-shared-api';
const existingApps = getApps();

let app;
if (missingKeys.length === 0) {
  // Only create new app if config is valid
  const existingApp = existingApps.find(a => a.name === APP_NAME);
  if (existingApp) {
    app = existingApp;
  } else {
    app = initializeApp(firebaseConfig, APP_NAME);
  }
} else {
  // Use existing app (from main Firebase initialization)
  // This ensures shared-api uses the same app as the main application
  app = existingApps.length > 0 ? existingApps[0] : null;
}

// If no app is available, we can't initialize services
if (!app) {
  throw new Error('[Firebase shared-api] No Firebase app available. Ensure Firebase is initialized before importing shared-api.');
}

// Initialize services using the shared app instance
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Cloud Functions
export const functions = getFunctions(app, 'us-central1');

// Messaging (with platform support check)
export let messaging: ReturnType<typeof getMessaging> | null = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
});

// Connect to emulator in development
if (process.env.NODE_ENV === 'development' && process.env.EXPO_PUBLIC_USE_EMULATOR === 'true') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

// Re-export isSupported
export { isSupported } from 'firebase/messaging';

export default app;
