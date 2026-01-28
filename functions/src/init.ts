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
import { defineSecret } from 'firebase-functions/params';

// ============================================================================
// SECRETS DEFINITIONS
// ============================================================================

export const DB_PASS_SECRET = defineSecret('DB_PASS');
export const DB_USER_SECRET = defineSecret('DB_USER');
export const DB_NAME_SECRET = defineSecret('DB_NAME');
export const CLOUD_SQL_CONNECTION_NAME_SECRET = defineSecret('CLOUD_SQL_CONNECTION_NAME');

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
        // Retrieve values from secrets or environment variables with safety
        const dbUser = process.env.FUNCTIONS_EMULATOR === 'true'
            ? (process.env.DB_USER || 'fisioflow')
            : (DB_USER_SECRET.value() || process.env.DB_USER);

        const dbPass = process.env.FUNCTIONS_EMULATOR === 'true'
            ? (process.env.DB_PASS || 'fisioflow2024')
            : (DB_PASS_SECRET.value() || process.env.DB_PASS);

        const dbName = process.env.FUNCTIONS_EMULATOR === 'true'
            ? (process.env.DB_NAME || 'fisioflow')
            : (DB_NAME_SECRET.value() || process.env.DB_NAME);

        if (!process.env.FUNCTIONS_EMULATOR && (!dbUser || !dbPass || !dbName)) {
            console.error('[Pool] Critical: Missing database credentials in production environment.');
            console.error('[Pool] Please set the following secrets: DB_USER, DB_PASS, DB_NAME');
        }

        const connectionName = process.env.FUNCTIONS_EMULATOR === 'true'
            ? process.env.CLOUD_SQL_CONNECTION_NAME
            : (CLOUD_SQL_CONNECTION_NAME_SECRET.value() || process.env.CLOUD_SQL_CONNECTION_NAME || process.env.DB_HOST);

        const config: any = {
            user: dbUser,
            password: dbPass,
            database: dbName,
            max: 20,
            idleTimeoutMillis: 60000,
            connectionTimeoutMillis: 30000,
        };

        if (process.env.FUNCTIONS_EMULATOR === 'true') {
            // EMULADOR: Usar configuração local para teste
            config.host = process.env.DB_HOST || 'localhost';
            config.port = parseInt(process.env.DB_PORT || '5432');
            console.log(`[Pool] Using local emulator config: ${config.host}:${config.port}`);
        } else if (connectionName && (connectionName.includes(':') || connectionName.startsWith('/'))) {
            // PRODUÇÃO: Sempre usar Unix socket do Cloud SQL (único método suportado sem VPC)
            // O connectionName deve ser no formato PROJECT:REGION:INSTANCE
            config.host = connectionName.startsWith('/') ? connectionName : `/cloudsql/${connectionName}`;
            console.log(`[Pool] Using Cloud SQL Unix socket: ${config.host}`);
        } else if (process.env.DB_HOST || connectionName) {
            // Local development ou Fallback: tentar localhost ou host direto
            config.host = process.env.DB_HOST || connectionName || 'localhost';
            config.port = parseInt(process.env.DB_PORT || '5432');

            console.log(`[Pool] Using direct host: ${config.host}:${config.port}`);
        } else {
            // Fallback total para localhost
            config.host = 'localhost';
            config.port = 5432;
            console.warn('[Pool] Warning: No database host/connection configured. Falling back to localhost.');
        }

        poolInstance = new Pool(config);

        // Handle pool errors with better logging
        poolInstance.on('error', (err) => {
            console.error('[Pool] Unexpected error on idle client:', err.message);
            if (err.message.includes('connect')) {
                console.error('[Pool] This usually means PostgreSQL is not running or not accessible.');
                console.error('[Pool] Check your database configuration:');
                console.error('[Pool] - For local development: ensure PostgreSQL is running');
                console.error('[Pool] - For production: ensure Cloud SQL secrets are configured');
            }
        });

        // Test the connection
        poolInstance.query('SELECT 1').catch((err) => {
            console.error('[Pool] Initial connection test failed:', err.message);
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
