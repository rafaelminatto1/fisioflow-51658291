/**
 * Firebase Configuration for FisioFlow Patient App
 *
 * This file initializes Firebase services for the patient app.
 * Uses Expo environment variables for configuration.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase only once
const APP_NAME = 'fisioflow-professional';

function getFirebaseApp() {
  const existingApps = getApps();
  const existingApp = existingApps.find(app => app.name === APP_NAME);

  if (existingApp) {
    return existingApp;
  }

  // Check for required config
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('[Firebase] Missing configuration. Check your .env file.');
  }

  return initializeApp(firebaseConfig, APP_NAME);
}

const app = getFirebaseApp();

// Initialize Auth with React Native persistence
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  // Auth already initialized, get existing instance
  auth = getAuth(app);
}

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

export { app, auth, db, storage };
export default app;
