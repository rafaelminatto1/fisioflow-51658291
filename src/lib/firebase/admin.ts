/**
 * Firebase Admin SDK Helper for Server-Side Operations
 *
 * Provides a singleton instance of Firebase Admin for use in:
 * - Inngest workflows
 * - API routes
 * - Server-side functions
 */

import * as admin from 'firebase-admin';

let dbInstance: admin.firestore.Firestore | null = null;
let authInstance: admin.auth.Auth | null = null;
let appInstance: admin.app.App | null = null;

/**
 * Get or initialize Firebase Admin App
 * Ensures singleton pattern to avoid multiple initializations
 */
export function getFirebaseAdminApp(): admin.app.App {
  if (appInstance) {
    return appInstance;
  }

  // Check if already initialized elsewhere
  const existingApps = admin.apps;
  if (existingApps.length > 0 && existingApps[0]) {
    appInstance = existingApps[0];
    return appInstance;
  }

  // Get project ID from environment
  // Prefer server-side env var over EXPO_PUBLIC_ prefix
  const projectId = process.env.FIREBASE_PROJECT_ID ||
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GCP_PROJECT_ID;

  if (!projectId) {
    throw new Error(
      'Firebase Project ID not found. Set FIREBASE_PROJECT_ID or EXPO_PUBLIC_FIREBASE_PROJECT_ID environment variable.'
    );
  }

  // Initialize Firebase Admin
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    // Use service account key if available
    const serviceAccount = JSON.parse(serviceAccountKey);
    appInstance = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId,
    });
  } else {
    // Use Application Default Credentials (for Cloud Functions, Cloud Run, etc.)
    appInstance = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
  }

  return appInstance;
}

/**
 * Get Firestore database instance
 */
export function getAdminDb(): admin.firestore.Firestore {
  if (dbInstance) {
    return dbInstance;
  }

  const app = getFirebaseAdminApp();
  dbInstance = admin.firestore(app);

  // Configure settings for production
  // Only apply if we are in a Node environment (server-side)
  if (process.env.NODE_ENV === 'production' && typeof process !== 'undefined' && process.release?.name === 'node') {
    dbInstance.settings({
      ignoreUndefinedProperties: true,
    });
  }

  return dbInstance;
}

/**
 * Get Firebase Auth instance
 */
export function getAdminAuth(): admin.auth.Auth {
  if (authInstance) {
    return authInstance;
  }

  const app = getFirebaseAdminApp();
  authInstance = admin.auth(app);
  return authInstance;
}

/**
 * Reset all instances (useful for testing)
 */
export function resetAdminInstances(): void {
  dbInstance = null;
  authInstance = null;
  // Don't delete appInstance as it can't be reinitialized in the same process
}

/**
 * Get Firebase Messaging instance
 */
export function getAdminMessaging(): admin.messaging.Messaging {
  const app = getFirebaseAdminApp();
  return admin.messaging(app);
}

/**
 * Helper to check if a document exists
 */
export async function documentExists(
  collectionPath: string,
  docId: string
): Promise<boolean> {
  const db = getAdminDb();
  const doc = await db.collection(collectionPath).doc(docId).get();
  return doc.exists;
}

/**
 * Helper to get a document or throw error
 */
export async function getDocumentOrThrow<T = Record<string, unknown>>(
  collectionPath: string,
  docId: string,
  errorMessage?: string
): Promise<T> {
  const db = getAdminDb();
  const doc = await db.collection(collectionPath).doc(docId).get();

  if (!doc.exists) {
    throw new Error(errorMessage || `Document ${collectionPath}/${docId} not found`);
  }

  return { id: doc.id, ...doc.data() } as T;
}

/**
 * Helper to batch fetch documents
 */
export async function batchFetchDocuments<T = Record<string, unknown>>(
  collectionPath: string,
  docIds: string[]
): Promise<Map<string, T>> {
  if (docIds.length === 0) {
    return new Map();
  }

  const db = getAdminDb();
  const uniqueIds = [...new Set(docIds)];

  // Firestore allows up to 500 documents in a batch query
  const batchSize = 500;
  const results = new Map<string, T>();

  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize);

    // Create a query with multiple document references
    const promises = batch.map(id =>
      db.collection(collectionPath).doc(id).get()
    );

    const snapshots = await Promise.all(promises);

    for (const snap of snapshots) {
      if (snap.exists) {
        results.set(snap.id, { id: snap.id, ...snap.data() } as T);
      }
    }
  }

  return results;
}

/**
 * Helper to delete documents by query
 * Note: Firestore doesn't support delete by query, so we fetch and delete in batches
 */
export async function deleteByQuery(
  collectionPath: string,
  fieldName: string,
  operator: '<' | '<=' | '==' | '!=' | '>' | '>=',
  value: unknown,
  options?: { batchSize?: number; maxDeletes?: number }
): Promise<number> {
  const db = getAdminDb();
  const batchSize = options?.batchSize || 500;
  const maxDeletes = options?.maxDeletes;

  let totalDeleted = 0;
  let lastDoc: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData> | null = null;

  while (true) {
    let query = db.collection(collectionPath)
      .where(fieldName, operator, value)
      .limit(batchSize);

    // Start after the last document for pagination
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      break;
    }

    // Delete in batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    totalDeleted += snapshot.docs.length;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];

    // Stop if we've reached max deletes
    if (maxDeletes && totalDeleted >= maxDeletes) {
      break;
    }

    // Stop if we got fewer documents than batch size (means we're done)
    if (snapshot.docs.length < batchSize) {
      break;
    }
  }

  return totalDeleted;
}
