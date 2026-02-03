import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'southamerica-east1');

// Connect to emulators in development/testing
if (import.meta.env.DEV) {
  const authHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST;

  if (authHost && !authHost.startsWith('${')) {
    const [host, port] = authHost.split(':');
    connectAuthEmulator(auth, `http://${host}:${port}`, { disableWarnings: true });
    console.log(`[Firebase] Auth emulator connected to http://${host}:${port}`);
  }

  if (firestoreHost && !firestoreHost.startsWith('${')) {
    const [host, port] = firestoreHost.split(':');
    connectFirestoreEmulator(db, host, parseInt(port, 10));
    console.log(`[Firebase] Firestore emulator connected to http://${host}:${port}`);
  }

  // Functions emulator
  try {
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    console.log('[Firebase] Functions emulator connected to http://127.0.0.1:5001');
  } catch {
    // Functions emulator might not be running
  }
}

export default app;
