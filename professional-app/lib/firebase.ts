import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
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

// Initialize Auth - platform-specific initialization
let auth: ReturnType<typeof getAuth>;
if (Platform.OS !== 'web') {
  try {
    // Use initializeAuth for React Native (async-storage persistence)
    const { initializeAuth /*, getReactNativePersistence*/ } = require('firebase/auth');
    auth = initializeAuth(app, {
      // persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (_error) {
    // Auth already initialized
    auth = getAuth(app);
  }
} else {
  // Web uses standard getAuth
  auth = getAuth(app);
}

// Initialize Firestore - simplified for React Native
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

// Initialize Functions (only available on web)
let functions: any = null;
if (Platform.OS === 'web') {
  try {
    const { getFunctions } = require('firebase/functions');
    functions = getFunctions(app, 'southamerica-east1');
  } catch (error) {
    console.warn('[Firebase] Functions not available on this platform');
  }
}

// Remote Config (only on web due to IndexedDB requirement)
let remoteConfig: any = null;
if (Platform.OS === 'web') {
  try {
    const { getRemoteConfig, fetchAndActivate } = require('firebase/remote-config');
    remoteConfig = getRemoteConfig(app);
    remoteConfig.settings.minimumFetchIntervalMillis = 3600000;
    remoteConfig.defaultConfig = {
      'enable_multimodal_ai': true,
    };
    fetchAndActivate(remoteConfig);
  } catch (error) {
    console.warn('[Firebase] Remote Config not available on this platform');
  }
}

/**
 * Obtém um valor do Remote Config
 */
export function getRemoteValue(key: string): any {
  if (!remoteConfig) {
    console.warn('[Firebase] Remote Config not initialized');
    return null;
  }
  const { getValue } = require('firebase/remote-config');
  return getValue(remoteConfig, key);
}

// Connect to Emulators if configured
if (process.env.EXPO_PUBLIC_USE_EMULATOR === 'true') {
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  
  console.log(`[Firebase] Connecting to emulators at ${host}`);
  
  connectAuthEmulator(auth, `http://${host}:9099`);
  connectFirestoreEmulator(db, host, 8080);
  connectStorageEmulator(storage, host, 9199);
  
  if (functions && Platform.OS === 'web') {
    try {
      const { connectFunctionsEmulator } = require('firebase/functions');
      connectFunctionsEmulator(functions, host, 5001);
    } catch (error) {
      console.warn('[Firebase] Could not connect to Functions emulator');
    }
  }
}

export { app, auth, db, storage, functions };

