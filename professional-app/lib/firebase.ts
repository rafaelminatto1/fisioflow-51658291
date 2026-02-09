import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth
} from 'firebase/auth';
import { initializeFirestore, CACHE_SIZE_UNLIMITED, enableMultiTabIndexedDbPersistence, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  // Auth already initialized
  auth = getAuth(app);
}

// Initialize Firestore with offline persistence
let db;
try {
  db = initializeFirestore(app, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  });

  // Enable multi-tab persistence for better offline support
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.log('Firestore persistence: Multiple tabs detected, using single tab persistence');
    } else if (err.code === 'unimplemented') {
      console.log('Firestore persistence: Not supported on this platform');
    } else {
      console.error('Firestore persistence error:', err);
    }
  });
} catch (error) {
  // Fallback to regular Firestore
  console.error('Error initializing Firestore with persistence, using default:', error);
  db = getFirestore(app);
}

// Initialize Storage
const storage = getStorage(app);

export { app, auth, db, storage };
