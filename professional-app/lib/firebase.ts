import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence, connectAuthEmulator } from 'firebase/auth';
import { 
  initializeFirestore, 
  CACHE_SIZE_UNLIMITED, 
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Firebase configuration - use environment variables in production
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'YOUR_AUTH_DOMAIN',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'YOUR_STORAGE_BUCKET',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_MESSAGING_SENDER_ID',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'YOUR_APP_ID',
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with React Native persistence
let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (_error) {
  // Auth already initialized
  auth = getAuth(app);
}

// Initialize Firestore with offline persistence
let db: ReturnType<typeof getFirestore>;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      tabManager: persistentMultipleTabManager()
    }),
    experimentalAutoDetectLongPolling: true
  });
} catch (error) {
  // Fallback to regular Firestore
  console.error('Error initializing Firestore with persistence, using default:', error);
  db = getFirestore(app);
}

// Initialize Storage
const storage = getStorage(app);

// Initialize Functions
const functions = getFunctions(app, 'southamerica-east1');

// Initialize Remote Config
const remoteConfig = getRemoteConfig(app);
remoteConfig.settings.minimumFetchIntervalMillis = 3600000;
remoteConfig.defaultConfig = {
  'enable_multimodal_ai': true,
};
fetchAndActivate(remoteConfig);

/**
 * Obtém um valor do Remote Config
 */
export function getRemoteValue(key: string): any {
  return getValue(remoteConfig, key);
}

// Connect to Emulators if configured
if (process.env.EXPO_PUBLIC_USE_EMULATOR === 'true') {
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  
  console.log(`[Firebase] Connecting to emulators at ${host}`);
  
  connectAuthEmulator(auth, `http://${host}:9099`);
  connectFirestoreEmulator(db, host, 8080);
  connectStorageEmulator(storage, host, 9199);
  connectFunctionsEmulator(functions, host, 5001);
}

export { app, auth, db, storage, functions };

