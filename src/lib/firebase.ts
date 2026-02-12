/**
 * Firebase Legacy Module - Re-exports from new implementation
 * 
 * Este arquivo foi modificado para evitar duplicacao de inicializacao do Firebase.
 * Agora ele apenas re-exporta as instancias do novo modulo singleton em
 * src/integrations/firebase/app.ts
 */

// Re-export from new singleton implementation
export {
  app,
  auth,
  db,
  storage,
  functions,
  // Firestore functions
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  collectionGroup,
  getDocs,
  query,
  where,
  limit,
  addDoc,
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
  // Functions
  httpsCallable,
  // Types
  type FirebaseConfig,
  type Query,
  type CollectionReference,
  type DocumentReference,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
  type QueryConstraint,
  type Unsubscribe,
  // Helper functions
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseDb,
  getFirebaseStorage,
  getFirebaseFunctions,
  useFirebase,
  useAuth,
  useFirestore,
  useStorage,
  isFirebaseConfigured,
} from '@/integrations/firebase/app';

// Re-export default
export { app as default } from '@/integrations/firebase/app';

// NOTE: This file is a stable re-export layer from @/integrations/firebase/app.
// ~17 files still import from this path. A migration to direct imports is planned.

