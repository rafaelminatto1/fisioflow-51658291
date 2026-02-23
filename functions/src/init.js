"use strict";
/**
 * Firebase Functions - Initialization Module
 *
 * Centralized initialization of Firebase Admin SDK and Cloud SQL
 * Provides singleton instances for all services
 *
 * @version 2.0.0 - Enhanced with proper exports
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.adminStorage = exports.adminAuth = exports.adminDb = exports.RESEND_API_KEY_SECRET = exports.DB_HOST_IP_PUBLIC_SECRET = exports.DB_HOST_IP_SECRET = exports.CLOUD_SQL_CONNECTION_NAME_SECRET = exports.DB_NAME_SECRET = exports.DB_USER_SECRET = exports.DB_PASS_SECRET = void 0;
exports.getAdminDb = getAdminDb;
exports.getAdminAuth = getAdminAuth;
exports.getAdminStorage = getAdminStorage;
exports.getAdminMessaging = getAdminMessaging;
exports.getPool = getPool;
exports.resetInstances = resetInstances;
exports.batchFetchDocuments = batchFetchDocuments;
exports.deleteByQuery = deleteByQuery;
exports.createDocument = createDocument;
exports.getPoolStatus = getPoolStatus;
exports.shutdownPool = shutdownPool;
exports.warmupPool = warmupPool;
// ============================================================================
// SECRETS DEFINITIONS
// ============================================================================
var app_1 = require("firebase-admin/app");
var firestore_1 = require("firebase-admin/firestore");
var auth_1 = require("firebase-admin/auth");
var storage_1 = require("firebase-admin/storage");
var messaging_1 = require("firebase-admin/messaging");
var pg_1 = require("pg");
var params_1 = require("firebase-functions/params");
var logger_1 = require("./lib/logger");
exports.DB_PASS_SECRET = (0, params_1.defineSecret)('DB_PASS');
exports.DB_USER_SECRET = (0, params_1.defineSecret)('DB_USER');
exports.DB_NAME_SECRET = (0, params_1.defineSecret)('DB_NAME');
exports.CLOUD_SQL_CONNECTION_NAME_SECRET = (0, params_1.defineSecret)('CLOUD_SQL_CONNECTION_NAME');
exports.DB_HOST_IP_SECRET = (0, params_1.defineSecret)('DB_HOST_IP');
exports.DB_HOST_IP_PUBLIC_SECRET = (0, params_1.defineSecret)('DB_HOST_IP_PUBLIC');
exports.RESEND_API_KEY_SECRET = (0, params_1.defineSecret)('RESEND_API_KEY');
// Firebase Functions v2 CORS configuration is now centralied in lib/cors.ts
// ============================================================================
// SINGLETON INSTANCES
// ============================================================================
var adminApp;
var adminDbInstance;
var adminAuthInstance;
var adminStorageInstance;
var adminMessagingInstance;
var poolInstance = null;
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
        var app = getOrCreateApp();
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
        var app = getOrCreateApp();
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
        var app = getOrCreateApp();
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
        var app = getOrCreateApp();
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
        // trim() removes trailing newlines that Secret Manager may add
        var rawDbUser = process.env.FUNCTIONS_EMULATOR === 'true'
            ? (process.env.DB_USER || 'fisioflow')
            : (exports.DB_USER_SECRET.value() || process.env.DB_USER);
        var dbUser = typeof rawDbUser === 'string' ? rawDbUser.trim() : String(rawDbUser || '').trim();
        var rawDbPass = process.env.FUNCTIONS_EMULATOR === 'true'
            ? (process.env.DB_PASS || 'fisioflow2024')
            : (exports.DB_PASS_SECRET.value() || process.env.DB_PASS);
        var dbPass = typeof rawDbPass === 'string' ? rawDbPass.trim() : String(rawDbPass || '').trim();
        var rawDbName = process.env.FUNCTIONS_EMULATOR === 'true'
            ? (process.env.DB_NAME || 'fisioflow')
            : (exports.DB_NAME_SECRET.value() || process.env.DB_NAME);
        var dbName = typeof rawDbName === 'string' ? rawDbName.trim() : String(rawDbName || '').trim();
        if (!process.env.FUNCTIONS_EMULATOR && (!dbUser || !dbPass || !dbName)) {
            logger_1.logger.error('[Pool] Critical: Missing database credentials in production environment.');
            logger_1.logger.error('[Pool] Please set the following secrets: DB_USER, DB_PASS, DB_NAME');
        }
        // Local helper for safe secret access (trim to remove trailing newlines from Secret Manager)
        var getSecretValue = function (secret) {
            try {
                var v = secret.value();
                return typeof v === 'string' ? v.trim() : v;
            }
            catch (e) {
                return null;
            }
        };
        var rawConnectionName = process.env.FUNCTIONS_EMULATOR === 'true'
            ? process.env.CLOUD_SQL_CONNECTION_NAME
            : (getSecretValue(exports.CLOUD_SQL_CONNECTION_NAME_SECRET) || process.env.CLOUD_SQL_CONNECTION_NAME || process.env.DB_HOST);
        var connectionName = rawConnectionName ? String(rawConnectionName).trim() : '';
        // Pool configuration optimized for Cloud Functions serverless
        // Each function instance gets its own pool, so keep it small
        var config_1 = {
            user: dbUser,
            password: dbPass,
            database: dbName,
            // Cloud Functions typically only need 2-5 connections per instance
            // Multiple instances each get their own pool
            max: 20, // Increased from 5 to handle higher concurrency
            min: 0, // Allow pool to drain completely
            idleTimeoutMillis: 30000, // 30 seconds (reduced from 60s)
            connectionTimeoutMillis: 30000, // Increased from 10s to 30s (more time for connections)
            acquireTimeoutMillis: 30000, // Increased from 10s to 30s (more time to acquire connection)
            evictionRunIntervalMillis: 5000, // Clean idle connections periodically
            // Cloud Functions optimization
            allowExitOnIdle: true, // Allow process to exit when pool is idle
        };
        // Prefer Public IP if available (as it's now authorized)
        var dbHostIp = null;
        if (process.env.FUNCTIONS_EMULATOR !== 'true') {
            var ipValue = getSecretValue(exports.DB_HOST_IP_PUBLIC_SECRET) || getSecretValue(exports.DB_HOST_IP_SECRET) || process.env.DB_HOST_IP;
            dbHostIp = ipValue ? ipValue.trim() : null;
        }
        if (process.env.FUNCTIONS_EMULATOR === 'true') {
            // EMULADOR: Usar configuração local para teste
            config_1.host = process.env.DB_HOST || 'localhost';
            config_1.port = parseInt(process.env.DB_PORT || '5432');
            logger_1.logger.info("[Pool] Using local emulator config: ".concat(config_1.host, ":").concat(config_1.port));
        }
        else if (dbHostIp) {
            // PRODUÇÃO: Usar IP do Cloud SQL com SSL (Prioridade agora que autorizamos 0.0.0.0/0)
            // trim() removes trailing newlines that Secret Manager may add (causes ENOTFOUND)
            config_1.host = typeof dbHostIp === 'string' ? dbHostIp.trim() : String(dbHostIp).trim();
            config_1.port = 5432;
            config_1.ssl = {
                rejectUnauthorized: false, // Cloud SQL usa certificados auto-assinados
                mode: 'require', // Exigir SSL
            };
            logger_1.logger.info("[Pool] Using Cloud SQL IP with SSL: ".concat(config_1.host, ":").concat(config_1.port));
        }
        else if (connectionName && (connectionName.includes(':') || connectionName.startsWith('/'))) {
            // PRODUÇÃO: Unix socket como fallback
            config_1.host = connectionName.startsWith('/') ? connectionName : "/cloudsql/".concat(connectionName);
            // Socket doesn't use port
            delete config_1.port;
            logger_1.logger.info("[Pool] Using Cloud SQL Unix socket: ".concat(config_1.host));
        }
        else {
            // Fallback total para localhost
            config_1.host = 'localhost';
            config_1.port = 5432;
            logger_1.logger.warn('[Pool] Warning: No database host/connection configured. Falling back to localhost.');
        }
        poolInstance = new pg_1.Pool(config_1);
        // Handle pool errors with better logging and error type detection
        poolInstance.on('error', function (err) {
            var errorInfo = {
                message: err.message,
                code: err.code,
                stack: err.stack,
                timestamp: new Date().toISOString(),
            };
            logger_1.logger.error('[Pool] Unexpected error on idle client', errorInfo);
            // Handle specific error codes with actionable messages
            if (err.code === 'ECONNREFUSED') {
                logger_1.logger.error('[Pool] Connection refused - PostgreSQL may not be running');
            }
            else if (err.code === 'ETIMEDOUT') {
                logger_1.logger.error('[Pool] Connection timeout - check network/firewall settings');
            }
            else if (err.code === 'ENOTFOUND') {
                logger_1.logger.error('[Pool] Host not found - check database host configuration');
            }
            else if (err.message && err.message.includes('connect')) {
                logger_1.logger.error('[Pool] Connection error details:', {
                    hint: 'Check if PostgreSQL/Cloud SQL is running and accessible',
                    localHint: 'For local: ensure PostgreSQL is running on configured host',
                    prodHint: 'For production: ensure Cloud SQL secrets and IP authorization are configured',
                });
            }
        });
        // Test the connection
        poolInstance.query('SELECT 1').catch(function (err) {
            logger_1.logger.error('[Pool] Initial connection test failed:', err.message);
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
function batchFetchDocuments(collectionPath, ids) {
    return __awaiter(this, void 0, void 0, function () {
        var db, uniqueIds, results, chunkSize, i, chunk, snapshot;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (ids.length === 0) {
                        return [2 /*return*/, new Map()];
                    }
                    db = getAdminDb();
                    uniqueIds = __spreadArray([], new Set(ids), true);
                    results = new Map();
                    chunkSize = 10;
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < uniqueIds.length)) return [3 /*break*/, 4];
                    chunk = uniqueIds.slice(i, i + chunkSize);
                    return [4 /*yield*/, db
                            .collection(collectionPath)
                            .where('__name__', 'in', chunk)
                            .get()];
                case 2:
                    snapshot = _a.sent();
                    snapshot.docs.forEach(function (doc) {
                        results.set(doc.id, __assign({ id: doc.id }, doc.data()));
                    });
                    _a.label = 3;
                case 3:
                    i += chunkSize;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, results];
            }
        });
    });
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
function deleteByQuery(collectionPath, fieldName, operator, value, options) {
    return __awaiter(this, void 0, void 0, function () {
        var db, batchSize, maxDeletes, totalDeleted, lastDoc, _loop_1, state_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    db = getAdminDb();
                    batchSize = (options === null || options === void 0 ? void 0 : options.batchSize) || 500;
                    maxDeletes = options === null || options === void 0 ? void 0 : options.maxDeletes;
                    totalDeleted = 0;
                    lastDoc = null;
                    _loop_1 = function () {
                        var query, snapshot, batch;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    query = db
                                        .collection(collectionPath)
                                        .where(fieldName, operator, value)
                                        .limit(batchSize);
                                    // Start after the last document for pagination
                                    if (lastDoc) {
                                        query = query.startAfter(lastDoc);
                                    }
                                    return [4 /*yield*/, query.get()];
                                case 1:
                                    snapshot = _b.sent();
                                    if (snapshot.empty) {
                                        return [2 /*return*/, "break"];
                                    }
                                    batch = db.batch();
                                    snapshot.docs.forEach(function (doc) {
                                        batch.delete(doc.ref);
                                    });
                                    return [4 /*yield*/, batch.commit()];
                                case 2:
                                    _b.sent();
                                    totalDeleted += snapshot.docs.length;
                                    lastDoc = snapshot.docs[snapshot.docs.length - 1];
                                    // Stop if we've reached max deletes
                                    if (maxDeletes && totalDeleted >= maxDeletes) {
                                        return [2 /*return*/, "break"];
                                    }
                                    // Stop if we got fewer documents than batch size (means we're done)
                                    if (snapshot.docs.length < batchSize) {
                                        return [2 /*return*/, "break"];
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _a.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 3];
                    return [5 /*yield**/, _loop_1()];
                case 2:
                    state_1 = _a.sent();
                    if (state_1 === "break")
                        return [3 /*break*/, 3];
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/, totalDeleted];
            }
        });
    });
}
/**
 * Create a document with a generated ID
 * Convenience wrapper for doc().create() functionality
 *
 * @param collectionPath - Collection name
 * @param data - Document data
 * @returns Reference to the created document with ID
 */
function createDocument(collectionPath, data) {
    return __awaiter(this, void 0, void 0, function () {
        var db, ref, docData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    db = getAdminDb();
                    ref = db.collection(collectionPath).doc();
                    docData = __assign(__assign({}, data), { created_at: data.created_at || new Date().toISOString() });
                    return [4 /*yield*/, ref.create(docData)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, { id: ref.id, ref: ref }];
            }
        });
    });
}
// ============================================================================
// POOL MANAGEMENT
// ============================================================================
/**
 * Get pool status for monitoring
 */
function getPoolStatus() {
    if (!poolInstance)
        return { connected: false };
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
function shutdownPool() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!poolInstance) return [3 /*break*/, 4];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, poolInstance.end()];
                case 2:
                    _a.sent();
                    poolInstance = null;
                    logger_1.logger.info('[Pool] Database pool closed gracefully');
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    logger_1.logger.error('[Pool] Error closing pool:', error_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Warmup the connection pool (call during cold starts)
 */
function warmupPool() {
    return __awaiter(this, void 0, void 0, function () {
        var pool, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = getPool();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, pool.query('SELECT 1')];
                case 2:
                    _a.sent();
                    logger_1.logger.info('[Pool] Warmup completed successfully');
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _a.sent();
                    logger_1.logger.error('[Pool] Failed to warm up connection pool:', err_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Handle termination signals properly for graceful shutdown
if (typeof process !== 'undefined') {
    var shutdownHandler = function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, shutdownPool()];
                case 1:
                    _a.sent();
                    process.exit(0);
                    return [2 /*return*/];
            }
        });
    }); };
    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);
}
