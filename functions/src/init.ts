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
import { logger } from './lib/logger';

// ============================================================================
// SECRETS DEFINITIONS
// ============================================================================

export const DB_PASS_SECRET = defineSecret('DB_PASS');
export const DB_USER_SECRET = defineSecret('DB_USER');
export const DB_NAME_SECRET = defineSecret('DB_NAME');
export const CLOUD_SQL_CONNECTION_NAME_SECRET = defineSecret('CLOUD_SQL_CONNECTION_NAME');
export const DB_HOST_IP_SECRET = defineSecret('DB_HOST_IP');
export const DB_HOST_IP_PUBLIC_SECRET = defineSecret('DB_HOST_IP_PUBLIC');

// Firebase Functions v2 CORS - explicitly list allowed origins
// Using 'cors: true' should work but has known issues in v2
// Explicitly listing origins is the recommended workaround
export const CORS_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:8083',
  'http://localhost:8084',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8083',
  'http://127.0.0.1:8084',
  'https://fisioflow-migration.web.app',
  'https://fisioflow.web.app',
  'https://moocafisio.com.br',
  'https://www.moocafisio.com.br',
  '*' // fallback for other origins
];

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
        // trim() removes trailing newlines that Secret Manager may add
        const rawDbUser = process.env.FUNCTIONS_EMULATOR === 'true'
            ? (process.env.DB_USER || 'fisioflow')
            : (DB_USER_SECRET.value() || process.env.DB_USER);
        const dbUser = typeof rawDbUser === 'string' ? rawDbUser.trim() : String(rawDbUser || '').trim();

        const rawDbPass = process.env.FUNCTIONS_EMULATOR === 'true'
            ? (process.env.DB_PASS || 'fisioflow2024')
            : (DB_PASS_SECRET.value() || process.env.DB_PASS);
        const dbPass = typeof rawDbPass === 'string' ? rawDbPass.trim() : String(rawDbPass || '').trim();

        const rawDbName = process.env.FUNCTIONS_EMULATOR === 'true'
            ? (process.env.DB_NAME || 'fisioflow')
            : (DB_NAME_SECRET.value() || process.env.DB_NAME);
        const dbName = typeof rawDbName === 'string' ? rawDbName.trim() : String(rawDbName || '').trim();

        if (!process.env.FUNCTIONS_EMULATOR && (!dbUser || !dbPass || !dbName)) {
            logger.error('[Pool] Critical: Missing database credentials in production environment.');
            logger.error('[Pool] Please set the following secrets: DB_USER, DB_PASS, DB_NAME');
        }

        // Local helper for safe secret access (trim to remove trailing newlines from Secret Manager)
        const getSecretValue = (secret: any) => {
            try {
                const v = secret.value();
                return typeof v === 'string' ? v.trim() : v;
            } catch (e) {
                return null;
            }
        };

        const rawConnectionName = process.env.FUNCTIONS_EMULATOR === 'true'
            ? process.env.CLOUD_SQL_CONNECTION_NAME
            : (getSecretValue(CLOUD_SQL_CONNECTION_NAME_SECRET) || process.env.CLOUD_SQL_CONNECTION_NAME || process.env.DB_HOST);
        const connectionName = rawConnectionName ? String(rawConnectionName).trim() : '';

        // Pool configuration optimized for Cloud Functions serverless
        // Each function instance gets its own pool, so keep it small
        const config: any = {
            user: dbUser,
            password: dbPass,
            database: dbName,
            // Cloud Functions typically only need 2-5 connections per instance
            // Multiple instances each get their own pool
            max: 5,                    // Reduced from 20 (better for serverless)
            min: 0,                   // Allow pool to drain completely
            idleTimeoutMillis: 30000, // 30 seconds (reduced from 60s)
            connectionTimeoutMillis: 10000, // 10 seconds (fail fast)
            acquireTimeoutMillis: 10000,      // Add acquire timeout
            evictionRunIntervalMillis: 5000,   // Clean idle connections periodically
            // Cloud Functions optimization
            allowExitOnIdle: true,             // Allow process to exit when pool is idle
        };

        // Prefer Public IP if available (as it's now authorized)
        let dbHostIp = null;
        if (process.env.FUNCTIONS_EMULATOR !== 'true') {
            const ipValue = getSecretValue(DB_HOST_IP_PUBLIC_SECRET) || getSecretValue(DB_HOST_IP_SECRET) || process.env.DB_HOST_IP;
            dbHostIp = ipValue ? ipValue.trim() : null;
        }

        if (process.env.FUNCTIONS_EMULATOR === 'true') {
            // EMULADOR: Usar configuração local para teste
            config.host = process.env.DB_HOST || 'localhost';
            config.port = parseInt(process.env.DB_PORT || '5432');
            logger.info(`[Pool] Using local emulator config: ${config.host}:${config.port}`);
        } else if (dbHostIp) {
            // PRODUÇÃO: Usar IP do Cloud SQL com SSL (Prioridade agora que autorizamos 0.0.0.0/0)
            // trim() removes trailing newlines that Secret Manager may add (causes ENOTFOUND)
            config.host = typeof dbHostIp === 'string' ? dbHostIp.trim() : String(dbHostIp).trim();
            config.port = 5432;
            config.ssl = {
                rejectUnauthorized: false, // Cloud SQL usa certificados auto-assinados
                mode: 'require', // Exigir SSL
            };
            logger.info(`[Pool] Using Cloud SQL IP with SSL: ${config.host}:${config.port}`);
        } else if (connectionName && (connectionName.includes(':') || connectionName.startsWith('/'))) {
            // PRODUÇÃO: Unix socket como fallback
            config.host = connectionName.startsWith('/') ? connectionName : `/cloudsql/${connectionName}`;
            // Socket doesn't use port
            delete config.port;
            logger.info(`[Pool] Using Cloud SQL Unix socket: ${config.host}`);
        } else {
            // Fallback total para localhost
            config.host = 'localhost';
            config.port = 5432;
            logger.warn('[Pool] Warning: No database host/connection configured. Falling back to localhost.');
        }

        poolInstance = new Pool(config);

        // Handle pool errors with better logging and error type detection
        poolInstance.on('error', (err: any) => {
            const errorInfo = {
                message: err.message,
                code: err.code,
                stack: err.stack,
                timestamp: new Date().toISOString(),
            };

            logger.error('[Pool] Unexpected error on idle client', errorInfo);

            // Handle specific error codes with actionable messages
            if (err.code === 'ECONNREFUSED') {
                logger.error('[Pool] Connection refused - PostgreSQL may not be running');
            } else if (err.code === 'ETIMEDOUT') {
                logger.error('[Pool] Connection timeout - check network/firewall settings');
            } else if (err.code === 'ENOTFOUND') {
                logger.error('[Pool] Host not found - check database host configuration');
            } else if (err.message && err.message.includes('connect')) {
                logger.error('[Pool] Connection error details:', {
                    hint: 'Check if PostgreSQL/Cloud SQL is running and accessible',
                    localHint: 'For local: ensure PostgreSQL is running on configured host',
                    prodHint: 'For production: ensure Cloud SQL secrets and IP authorization are configured',
                });
            }
        });

        // Test the connection
        poolInstance.query('SELECT 1').catch((err) => {
            logger.error('[Pool] Initial connection test failed:', err.message);
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

// ============================================================================
// POOL MANAGEMENT
// ============================================================================

/**
 * Get pool status for monitoring
 */
export function getPoolStatus() {
    if (!poolInstance) return { connected: false };
    return {
        connected: true,
        totalCount: poolInstance.totalCount,
        idleCount: poolInstance.idleCount,
        waitingCount: poolInstance.waitingCount,
    };
}

/**
 * Gracefully shutdown database pool
 * Call this when the function instance is being terminated
 */
export async function shutdownPool(): Promise<void> {
    if (poolInstance) {
        try {
            await poolInstance.end();
            poolInstance = null;
            logger.info('[Pool] Database pool closed gracefully');
        } catch (error) {
            logger.error('[Pool] Error closing pool:', error);
        }
    }
}

/**
 * Warmup the connection pool (call during cold starts)
 */
export async function warmupPool(): Promise<void> {
    const pool = getPool();
    try {
        await pool.query('SELECT 1');
        logger.info('[Pool] Warmup completed successfully');
    } catch (err) {
        logger.error('[Pool] Failed to warm up connection pool:', err);
    }
}

// Handle termination signals properly for graceful shutdown
if (typeof process !== 'undefined') {
    const shutdownHandler = async () => {
        await shutdownPool();
        process.exit(0);
    };

    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);
}
