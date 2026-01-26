/**
 * Firebase Functions - Initialization Module
 *
 * Centralized initialization of Firebase Admin SDK and Cloud SQL
 * Provides singleton instances for all services
 *
 * @version 2.0.0 - Enhanced with proper exports
 */

import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getStorage, Storage } from 'firebase-admin/storage';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { Pool } from 'pg';

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

let adminApp: App;
let adminDbInstance: Firestore;
let adminAuthInstance: Auth;
let adminStorageInstance: Storage;
let adminMessagingInstance: Messaging;
let poolInstance: Pool | null = null;

// Initialize Firebase Admin SDK
function getOrCreateApp(): App {
    if (!adminApp) {
        if (getApps().length === 0) {
            adminApp = initializeApp();
        } else {
            adminApp = getApps()[0];
        }
    }
    return adminApp;
}

// ============================================================================
// PUBLIC EXPORTS - FIRESTORE
// ============================================================================

/**
 * Get Firestore database instance
 */
export function getAdminDb(): Firestore {
    if (!adminDbInstance) {
        const app = getOrCreateApp();
        adminDbInstance = getFirestore(app);

        // Configure settings for production
        if (process.env.NODE_ENV === 'production') {
            adminDbInstance.settings({
                ignoreUndefinedProperties: true,
            });
        }
    }
    return adminDbInstance;
}

// Backward compatibility
export const adminDb = getAdminDb();

// ============================================================================
// PUBLIC EXPORTS - AUTH
// ============================================================================

/**
 * Get Firebase Auth instance
 */
export function getAdminAuth(): Auth {
    if (!adminAuthInstance) {
        const app = getOrCreateApp();
        adminAuthInstance = getAuth(app);
    }
    return adminAuthInstance;
}

// Backward compatibility
export const adminAuth = getAdminAuth();

// ============================================================================
// PUBLIC EXPORTS - STORAGE
// ============================================================================

/**
 * Get Firebase Storage instance
 */
export function getAdminStorage(): Storage {
    if (!adminStorageInstance) {
        const app = getOrCreateApp();
        adminStorageInstance = getStorage(app);
    }
    return adminStorageInstance;
}

// Backward compatibility
export const adminStorage = getAdminStorage();

// ============================================================================
// PUBLIC EXPORTS - MESSAGING
// ============================================================================

/**
 * Get Firebase Cloud Messaging instance
 */
export function getAdminMessaging(): Messaging {
    if (!adminMessagingInstance) {
        const app = getOrCreateApp();
        adminMessagingInstance = getMessaging(app);
    }
    return adminMessagingInstance;
}

// ============================================================================
// PUBLIC EXPORTS - CLOUD SQL
// ============================================================================

/**
 * Get Cloud SQL connection pool
 */
export function getPool(): Pool {
    if (!poolInstance) {
        const config: any = {
            user: process.env.DB_USER || 'fisioflow',
            password: process.env.DB_PASS || 'fisioflow2024',
            database: process.env.DB_NAME || 'fisioflow',
            port: parseInt(process.env.DB_PORT || '5432'),
            max: 20,
            idleTimeoutMillis: 60000,
            connectionTimeoutMillis: 30000,
            // SSL configuration for Cloud SQL IP connection
            ssl: {
                require: true,
                rejectUnauthorized: false, // Required for Cloud SQL
            },
        };

        if (process.env.DB_HOST) {
            config.host = process.env.DB_HOST;
        } else if (process.env.NODE_ENV === 'production' || process.env.FUNCTIONS_EMULATOR !== 'true') {
            // TEMPORARY: Use direct IP connection instead of Cloud SQL socket
            // TODO: Configure Cloud SQL Proxy or VPC connector for production
            config.host = process.env.DB_HOST || '35.192.122.198'; // Cloud SQL instance IP
            console.log(`[Pool] Using Cloud SQL direct IP: ${config.host}`);
        } else {
            // Local fallback - try localhost or Supabase if configured
            config.host = process.env.VITE_SUPABASE_URL
                ? `db.${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`
                : 'localhost';

            console.log(`[Pool] Using local/fallback host: ${config.host}`);
        }

        poolInstance = new Pool(config);

        // Handle pool errors
        poolInstance.on('error', (err) => {
            console.error('[Pool] Unexpected error on idle client', err);
        });
    }
    return poolInstance;
}

// ============================================================================
// CONFIG EXPORT
// ============================================================================

/**
 * Legacy config export for backward compatibility
 * @deprecated Use the specific getter functions instead
 */
export const config = {
    pool: getPool,
    db: getAdminDb,
    auth: getAdminAuth,
    storage: getAdminStorage,
};

// ============================================================================
// RESET FUNCTION (for testing)
// ============================================================================

/**
 * Reset all singleton instances
 * WARNING: Only use this in tests!
 */
export function resetInstances(): void {
    adminDbInstance = null as unknown as Firestore;
    adminAuthInstance = null as unknown as Auth;
    adminStorageInstance = null as unknown as Storage;
    adminMessagingInstance = null as unknown as Messaging;
    // Don't reset pool as it can't be recreated properly
    // Don't reset adminApp as it can't be reinitialized in the same process
}

// ============================================================================
// HELPER FUNCTIONS - FIRESTORE
// ============================================================================

/**
 * Batch fetch documents from a collection by IDs
 * Useful for avoiding N+1 queries
 *
 * @param collectionPath - Collection name
 * @param ids - Document IDs to fetch
 * @returns Map of document ID to document data
 */
export async function batchFetchDocuments<T = any>(
    collectionPath: string,
    ids: string[]
): Promise<Map<string, T>> {
    if (ids.length === 0) {
        return new Map();
    }

    const db = getAdminDb();
    const uniqueIds = [...new Set(ids)];

    // Firestore allows up to 500 documents in a batch query
    // But whereIn only supports up to 10 values at a time
    const results = new Map<string, T>();

    // Process in chunks of 10 (Firestore whereIn limit)
    const chunkSize = 10;
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
        const chunk = uniqueIds.slice(i, i + chunkSize);

        const snapshot = await db
            .collection(collectionPath)
            .where('__name__', 'in', chunk)
            .get();

        snapshot.docs.forEach((doc) => {
            results.set(doc.id, { id: doc.id, ...doc.data() } as T);
        });
    }

    return results;
}

/**
 * Delete documents by query criteria
 * Note: Firestore doesn't support delete by query natively
 *
 * @param collectionPath - Collection name
 * @param fieldName - Field to query
 * @param operator - Comparison operator
 * @param value - Value to compare
 * @param options - Batch options
 * @returns Number of deleted documents
 */
export async function deleteByQuery(
    collectionPath: string,
    fieldName: string,
    operator: '<' | '<=' | '==' | '!=' | '>' | '>=',
    value: any,
    options?: { batchSize?: number; maxDeletes?: number }
): Promise<number> {
    const db = getAdminDb();
    const batchSize = options?.batchSize || 500;
    const maxDeletes = options?.maxDeletes;

    let totalDeleted = 0;
    let lastDoc: any = null;

    while (true) {
        let query = db
            .collection(collectionPath)
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

/**
 * Create a document with a generated ID
 * Convenience wrapper for doc().create() functionality
 *
 * @param collectionPath - Collection name
 * @param data - Document data
 * @returns Reference to the created document with ID
 */
export async function createDocument(
    collectionPath: string,
    data: Record<string, any>
): Promise<{ id: string; ref: any }> {
    const db = getAdminDb();
    const ref = db.collection(collectionPath).doc();
    const docData = {
        ...data,
        created_at: data.created_at || new Date().toISOString(),
    };
    await ref.create(docData);
    return { id: ref.id, ref };
}
