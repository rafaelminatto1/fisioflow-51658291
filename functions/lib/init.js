"use strict";
/**
 * Firebase Functions - Initialization Module
 *
 * Centralized initialization of Firebase Admin SDK and Cloud SQL
 * Provides singleton instances for all services
 *
 * @version 2.0.0 - Enhanced with proper exports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.adminStorage = exports.adminAuth = exports.adminDb = exports.DB_HOST_IP_PUBLIC_SECRET = exports.DB_HOST_IP_SECRET = exports.CLOUD_SQL_CONNECTION_NAME_SECRET = exports.DB_NAME_SECRET = exports.DB_USER_SECRET = exports.DB_PASS_SECRET = void 0;
exports.getAdminDb = getAdminDb;
exports.getAdminAuth = getAdminAuth;
exports.getAdminStorage = getAdminStorage;
exports.getAdminMessaging = getAdminMessaging;
exports.getPool = getPool;
exports.resetInstances = resetInstances;
exports.batchFetchDocuments = batchFetchDocuments;
exports.deleteByQuery = deleteByQuery;
exports.createDocument = createDocument;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const storage_1 = require("firebase-admin/storage");
const messaging_1 = require("firebase-admin/messaging");
const pg_1 = require("pg");
const params_1 = require("firebase-functions/params");
// ============================================================================
// SECRETS DEFINITIONS
// ============================================================================
exports.DB_PASS_SECRET = (0, params_1.defineSecret)('DB_PASS');
exports.DB_USER_SECRET = (0, params_1.defineSecret)('DB_USER');
exports.DB_NAME_SECRET = (0, params_1.defineSecret)('DB_NAME');
exports.CLOUD_SQL_CONNECTION_NAME_SECRET = (0, params_1.defineSecret)('CLOUD_SQL_CONNECTION_NAME');
exports.DB_HOST_IP_SECRET = (0, params_1.defineSecret)('DB_HOST_IP');
exports.DB_HOST_IP_PUBLIC_SECRET = (0, params_1.defineSecret)('DB_HOST_IP_PUBLIC');
// ============================================================================
// SINGLETON INSTANCES
// ============================================================================
let adminApp;
let adminDbInstance;
let adminAuthInstance;
let adminStorageInstance;
let adminMessagingInstance;
let poolInstance = null;
// Initialize Firebase Admin SDK
function getOrCreateApp() {
    if (!adminApp) {
        if ((0, app_1.getApps)().length === 0) {
            adminApp = (0, app_1.initializeApp)();
        }
        else {
            adminApp = (0, app_1.getApps)()[0];
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
function getAdminDb() {
    if (!adminDbInstance) {
        const app = getOrCreateApp();
        adminDbInstance = (0, firestore_1.getFirestore)(app);
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
exports.adminDb = getAdminDb();
// ============================================================================
// PUBLIC EXPORTS - AUTH
// ============================================================================
/**
 * Get Firebase Auth instance
 */
function getAdminAuth() {
    if (!adminAuthInstance) {
        const app = getOrCreateApp();
        adminAuthInstance = (0, auth_1.getAuth)(app);
    }
    return adminAuthInstance;
}
// Backward compatibility
exports.adminAuth = getAdminAuth();
// ============================================================================
// PUBLIC EXPORTS - STORAGE
// ============================================================================
/**
 * Get Firebase Storage instance
 */
function getAdminStorage() {
    if (!adminStorageInstance) {
        const app = getOrCreateApp();
        adminStorageInstance = (0, storage_1.getStorage)(app);
    }
    return adminStorageInstance;
}
// Backward compatibility
exports.adminStorage = getAdminStorage();
// ============================================================================
// PUBLIC EXPORTS - MESSAGING
// ============================================================================
/**
 * Get Firebase Cloud Messaging instance
 */
function getAdminMessaging() {
    if (!adminMessagingInstance) {
        const app = getOrCreateApp();
        adminMessagingInstance = (0, messaging_1.getMessaging)(app);
    }
    return adminMessagingInstance;
}
// ============================================================================
// PUBLIC EXPORTS - CLOUD SQL
// ============================================================================
/**
 * Get Cloud SQL connection pool
 */
function getPool() {
    if (!poolInstance) {
        // Retrieve values from secrets or environment variables with safety
        const dbUser = process.env.FUNCTIONS_EMULATOR === 'true'
            ? (process.env.DB_USER || 'fisioflow')
            : (exports.DB_USER_SECRET.value() || process.env.DB_USER);
        const dbPass = process.env.FUNCTIONS_EMULATOR === 'true'
            ? (process.env.DB_PASS || 'fisioflow2024')
            : (exports.DB_PASS_SECRET.value() || process.env.DB_PASS);
        const dbName = process.env.FUNCTIONS_EMULATOR === 'true'
            ? (process.env.DB_NAME || 'fisioflow')
            : (exports.DB_NAME_SECRET.value() || process.env.DB_NAME);
        if (!process.env.FUNCTIONS_EMULATOR && (!dbUser || !dbPass || !dbName)) {
            console.error('[Pool] Critical: Missing database credentials in production environment.');
            console.error('[Pool] Please set the following secrets: DB_USER, DB_PASS, DB_NAME');
        }
        const connectionName = process.env.FUNCTIONS_EMULATOR === 'true'
            ? process.env.CLOUD_SQL_CONNECTION_NAME
            : (exports.CLOUD_SQL_CONNECTION_NAME_SECRET.value() || process.env.CLOUD_SQL_CONNECTION_NAME || process.env.DB_HOST);
        const config = {
            user: dbUser,
            password: dbPass,
            database: dbName,
            max: 20,
            idleTimeoutMillis: 60000,
            connectionTimeoutMillis: 30000,
        };
        // Prefer IP for production (more reliable without VPC)
        const dbHostIp = process.env.FUNCTIONS_EMULATOR === 'true'
            ? null
            : (exports.DB_HOST_IP_SECRET.value() || process.env.DB_HOST_IP || '35.192.122.198');
        if (process.env.FUNCTIONS_EMULATOR === 'true') {
            // EMULADOR: Usar configuração local para teste
            config.host = process.env.DB_HOST || 'localhost';
            config.port = parseInt(process.env.DB_PORT || '5432');
            console.log(`[Pool] Using local emulator config: ${config.host}:${config.port}`);
        }
        else if (dbHostIp) {
            // PRODUÇÃO: Usar IP público do Cloud SQL com SSL
            config.host = dbHostIp;
            config.port = 5432;
            config.ssl = {
                rejectUnauthorized: false, // Cloud SQL usa certificados auto-assinados
                mode: 'require', // Exigir SSL
            };
            console.log(`[Pool] Using Cloud SQL public IP with SSL: ${config.host}:${config.port}`);
        }
        else if (connectionName && (connectionName.includes(':') || connectionName.startsWith('/'))) {
            // PRODUÇÃO: Fallback para Unix socket do Cloud SQL
            config.host = connectionName.startsWith('/') ? connectionName : `/cloudsql/${connectionName}`;
            console.log(`[Pool] Using Cloud SQL Unix socket: ${config.host}`);
        }
        else {
            // Fallback total para localhost
            config.host = 'localhost';
            config.port = 5432;
            console.warn('[Pool] Warning: No database host/connection configured. Falling back to localhost.');
        }
        poolInstance = new pg_1.Pool(config);
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
exports.config = {
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
function resetInstances() {
    adminDbInstance = null;
    adminAuthInstance = null;
    adminStorageInstance = null;
    adminMessagingInstance = null;
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
async function batchFetchDocuments(collectionPath, ids) {
    if (ids.length === 0) {
        return new Map();
    }
    const db = getAdminDb();
    const uniqueIds = [...new Set(ids)];
    // Firestore allows up to 500 documents in a batch query
    // But whereIn only supports up to 10 values at a time
    const results = new Map();
    // Process in chunks of 10 (Firestore whereIn limit)
    const chunkSize = 10;
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
        const chunk = uniqueIds.slice(i, i + chunkSize);
        const snapshot = await db
            .collection(collectionPath)
            .where('__name__', 'in', chunk)
            .get();
        snapshot.docs.forEach((doc) => {
            results.set(doc.id, { id: doc.id, ...doc.data() });
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
async function deleteByQuery(collectionPath, fieldName, operator, value, options) {
    const db = getAdminDb();
    const batchSize = options?.batchSize || 500;
    const maxDeletes = options?.maxDeletes;
    let totalDeleted = 0;
    let lastDoc = null;
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
async function createDocument(collectionPath, data) {
    const db = getAdminDb();
    const ref = db.collection(collectionPath).doc();
    const docData = {
        ...data,
        created_at: data.created_at || new Date().toISOString(),
    };
    await ref.create(docData);
    return { id: ref.id, ref };
}
//# sourceMappingURL=init.js.map