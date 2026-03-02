import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
  connectFirestoreEmulator
} from 'firebase/firestore';
import {
  getAuth,
  initializeAuth,
  connectAuthEmulator
} from 'firebase/auth';
// @ts-expect-error - TypeScript no Firebase v11 não mapeia corretamente o export de react-native, mas o Metro resolve no runtime
import { getReactNativePersistence } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '@/lib/logger';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required env var: ${key}. Check your .env and EAS config.`
    );
  }
  return value;
}

// Firebase configuration
const firebaseConfig = {
  apiKey: requireEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: requireEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: requireEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: requireEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requireEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: requireEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
};

// Initialize Firebase app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Storage
const storage = getStorage(app);

// Initialize Functions
const functions = getFunctions(app, 'southamerica-east1');

// Initialize Firestore
const db = (Platform.OS === 'web')
  ? initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
      cacheSizeBytes: CACHE_SIZE_UNLIMITED
    }),
    experimentalAutoDetectLongPolling: false
  })
  : getFirestore(app);

// Initialize Auth
const auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });

// Connect to Emulators if configured
if (process.env.EXPO_PUBLIC_USE_EMULATOR === 'true') {
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

  log.info(`[Firebase] Connecting to emulators at ${host}`);

  connectAuthEmulator(auth, `http://${host}:9099`);
  connectFirestoreEmulator(db, host, 8080);
  connectStorageEmulator(storage, host, 9199);
  connectFunctionsEmulator(functions, host, 5001);
}

export { auth, db, storage, functions };
