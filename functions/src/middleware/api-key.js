"use strict";
/**
 * API Key Authentication Middleware
 *
 * @description
 * Provides API key authentication for external integrations and webhooks.
 * Supports key rotation, scopes, and rate limiting per key.
 *
 * @module middleware/api-key
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyScope = void 0;
exports.generateApiKey = generateApiKey;
exports.authenticateApiKey = authenticateApiKey;
exports.requireApiKeyScope = requireApiKeyScope;
exports.requireAnyApiKeyScope = requireAnyApiKeyScope;
exports.createApiKey = createApiKey;
exports.revokeApiKey = revokeApiKey;
exports.listApiKeys = listApiKeys;
exports.rotateApiKey = rotateApiKey;
// ============================================================================================
// TYPES
// ============================================================================================
/**
 * API Key scopes for permission management
 */
var https_1 = require("firebase-functions/v2/https");
var init_1 = require("../init");
var firebase_functions_1 = require("firebase-functions");
var crypto = require("crypto");
var ApiKeyScope;
(function (ApiKeyScope) {
    /** Full access to all resources */
    ApiKeyScope["FULL"] = "full";
    /** Read-only access to patient data */
    ApiKeyScope["PATIENTS_READ"] = "patients:read";
    /** Write access to patient data */
    ApiKeyScope["PATIENTS_WRITE"] = "patients:write";
    /** Read-only access to appointments */
    ApiKeyScope["APPOINTMENTS_READ"] = "appointments:read";
    /** Write access to appointments */
    ApiKeyScope["APPOINTMENTS_WRITE"] = "appointments:write";
    /** Access to webhooks */
    ApiKeyScope["WEBHOOKS"] = "webhooks";
    /** Access to reports */
    ApiKeyScope["REPORTS"] = "reports:read";
    /** Access to financial data */
    ApiKeyScope["FINANCIAL_READ"] = "financial:read";
    /** Write access to financial data */
    ApiKeyScope["FINANCIAL_WRITE"] = "financial:write";
})(ApiKeyScope || (exports.ApiKeyScope = ApiKeyScope = {}));
// ============================================================================================
// DATABASE OPERATIONS
// ============================================================================================
var API_KEYS_TABLE = 'api_keys';
/**
 * Initialize the API keys table
 */
function initApiKeysTable() {
    return __awaiter(this, void 0, void 0, function () {
        var pool;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query("\n    CREATE TABLE IF NOT EXISTS ".concat(API_KEYS_TABLE, " (\n      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      key_hash VARCHAR(255) UNIQUE NOT NULL,\n      name VARCHAR(255) NOT NULL,\n      organization_id VARCHAR(255) NOT NULL,\n      scopes TEXT[] NOT NULL DEFAULT '{}',\n      is_active BOOLEAN NOT NULL DEFAULT true,\n      rate_limit INTEGER DEFAULT 1000,\n      last_used_at TIMESTAMP,\n      expires_at TIMESTAMP,\n      created_at TIMESTAMP NOT NULL DEFAULT NOW(),\n      created_by VARCHAR(255) NOT NULL,\n      metadata JSONB DEFAULT '{}',\n      CONSTRAINT api_keys_organization_fk\n        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE\n    );\n\n    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON ").concat(API_KEYS_TABLE, "(key_hash);\n    CREATE INDEX IF NOT EXISTS idx_api_keys_organization ON ").concat(API_KEYS_TABLE, "(organization_id);\n    CREATE INDEX IF NOT EXISTS idx_api_keys_active ON ").concat(API_KEYS_TABLE, "(is_active) WHERE is_active = true;\n  "))];
                case 1:
                    _a.sent();
                    firebase_functions_1.logger.info('[ApiKey] API keys table initialized');
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Hash an API key for storage
 *
 * @param key - Raw API key
 * @returns Hashed key
 */
function hashApiKey(key) {
    // Use SHA-256 hashing
    return crypto.createHash('sha256').update(key).digest('hex');
}
/**
 * Generate a new API key
 *
 * @param prefix - Optional prefix for the key
 * @returns Generated API key
 */
function generateApiKey(prefix) {
    if (prefix === void 0) { prefix = 'fio'; }
    var randomBytes = crypto.randomBytes(32).toString('hex');
    return "".concat(prefix, "_").concat(randomBytes);
}
/**
 * Get API key record by key hash
 *
 * @param keyHash - Hashed API key
 * @returns API key record or null
 */
function getApiKeyByKeyHash(keyHash) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result, row;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query("SELECT * FROM ".concat(API_KEYS_TABLE, "\n     WHERE key_hash = $1 AND is_active = true\n     AND (expires_at IS NULL OR expires_at > NOW())"), [keyHash])];
                case 1:
                    result = _a.sent();
                    if (result.rows.length === 0) {
                        return [2 /*return*/, null];
                    }
                    row = result.rows[0];
                    return [2 /*return*/, {
                            id: row.id,
                            key_hash: row.key_hash,
                            name: row.name,
                            organization_id: row.organization_id,
                            scopes: row.scopes,
                            is_active: row.is_active,
                            rate_limit: row.rate_limit,
                            last_used_at: row.last_used_at,
                            expires_at: row.expires_at,
                            created_at: row.created_at,
                            created_by: row.created_by,
                            metadata: row.metadata,
                        }];
            }
        });
    });
}
/**
 * Update last used timestamp for an API key
 *
 * @param keyId - API key ID
 */
function updateLastUsed(keyId) {
    return __awaiter(this, void 0, void 0, function () {
        var pool;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query("UPDATE ".concat(API_KEYS_TABLE, " SET last_used_at = NOW() WHERE id = $1"), [keyId])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// ============================================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================================
/**
 * Authenticate a request using API key
 *
 * @description
 * Extracts API key from request headers and validates it against the database.
 * Returns the API key context if valid.
 *
 * @example
 * ```typescript
 * export const myFunction = onCall(async (request) => {
 *   const apiKeyContext = await authenticateApiKey(request);
 *   // Use apiKeyContext.organizationId for queries
 * });
 * ```
 *
 * @param request - Firebase function request
 * @returns API key context
 *
 * @throws {HttpsError} 'unauthenticated' - No API key provided or invalid
 * @throws {HttpsError} 'permission-denied' - API key is inactive or expired
 */
function authenticateApiKey(request) {
    return __awaiter(this, void 0, void 0, function () {
        var apiKey, keyHash, apiKeyRecord;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // Initialize table if needed
                return [4 /*yield*/, initApiKeysTable().catch(function () { })];
                case 1:
                    // Initialize table if needed
                    _a.sent();
                    apiKey = extractApiKeyFromHeaders(request.headers);
                    if (!apiKey) {
                        throw new https_1.HttpsError('unauthenticated', 'API key is required. Provide it in the X-API-Key header or Authorization header as "Bearer {key}".');
                    }
                    keyHash = hashApiKey(apiKey);
                    return [4 /*yield*/, getApiKeyByKeyHash(keyHash)];
                case 2:
                    apiKeyRecord = _a.sent();
                    if (!apiKeyRecord) {
                        firebase_functions_1.logger.warn('[ApiKey] Invalid API key attempted', { keyHash: keyHash });
                        throw new https_1.HttpsError('unauthenticated', 'Invalid or inactive API key');
                    }
                    // Update last used timestamp
                    return [4 /*yield*/, updateLastUsed(apiKeyRecord.id).catch(function () { })];
                case 3:
                    // Update last used timestamp
                    _a.sent();
                    firebase_functions_1.logger.info('[ApiKey] Authenticated', {
                        keyId: apiKeyRecord.id,
                        keyName: apiKeyRecord.name,
                        organizationId: apiKeyRecord.organization_id,
                    });
                    return [2 /*return*/, {
                            keyId: apiKeyRecord.id,
                            organizationId: apiKeyRecord.organization_id,
                            keyName: apiKeyRecord.name,
                            scopes: apiKeyRecord.scopes,
                            rateLimit: apiKeyRecord.rate_limit,
                            metadata: apiKeyRecord.metadata,
                        }];
            }
        });
    });
}
/**
 * Extract API key from various header formats
 *
 * @param headers - Request headers
 * @returns API key or null
 */
function extractApiKeyFromHeaders(headers) {
    if (!headers) {
        return null;
    }
    // Try X-API-Key header first
    var apiKey = headers['x-api-key'] || headers['X-API-Key'];
    if (apiKey) {
        return apiKey;
    }
    // Try Authorization header with Bearer token
    var authHeader = headers['authorization'] || headers['Authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    // Try api_key query parameter (for webhooks)
    // Note: This would need to be passed from the request object
    return null;
}
/**
 * Check if API key has required scope
 *
 * @param context - API key context
 * @param requiredScope - Required scope
 * @returns True if has scope
 *
 * @throws {HttpsError} 'permission-denied' - Missing required scope
 */
function requireApiKeyScope(context, requiredScope) {
    // Full scope grants all permissions
    if (context.scopes.includes(ApiKeyScope.FULL)) {
        return true;
    }
    if (!context.scopes.includes(requiredScope)) {
        throw new https_1.HttpsError('permission-denied', "API key missing required scope: ".concat(requiredScope));
    }
    return true;
}
/**
 * Check if API key has any of the required scopes
 *
 * @param context - API key context
 * @param requiredScopes - Array of required scopes (any one is sufficient)
 * @returns True if has any of the scopes
 *
 * @throws {HttpsError} 'permission-denied' - Missing all required scopes
 */
function requireAnyApiKeyScope(context, requiredScopes) {
    // Full scope grants all permissions
    if (context.scopes.includes(ApiKeyScope.FULL)) {
        return true;
    }
    var hasScope = requiredScopes.some(function (scope) { return context.scopes.includes(scope); });
    if (!hasScope) {
        throw new https_1.HttpsError('permission-denied', "API key missing required scope. One of: ".concat(requiredScopes.join(', ')));
    }
    return true;
}
// ============================================================================================
// API KEY MANAGEMENT (ADMIN)
// ============================================================================================
/**
 * Create a new API key
 *
 * @param params - API key parameters
 * @returns Created API key (includes the raw key - return only on creation)
 */
function createApiKey(params) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, key, keyHash, result, row;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, initApiKeysTable()];
                case 1:
                    _a.sent();
                    pool = (0, init_1.getPool)();
                    key = generateApiKey();
                    keyHash = hashApiKey(key);
                    return [4 /*yield*/, pool.query("INSERT INTO ".concat(API_KEYS_TABLE, " (key_hash, name, organization_id, scopes, rate_limit, expires_at, created_by, metadata)\n     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)\n     RETURNING *"), [
                            keyHash,
                            params.name,
                            params.organizationId,
                            params.scopes,
                            params.rateLimit || 1000,
                            params.expiresAt || null,
                            params.createdBy,
                            params.metadata || {},
                        ])];
                case 2:
                    result = _a.sent();
                    row = result.rows[0];
                    firebase_functions_1.logger.info('[ApiKey] Created', {
                        keyId: row.id,
                        name: params.name,
                        organizationId: params.organizationId,
                    });
                    return [2 /*return*/, {
                            key: key, // Return the raw key only on creation
                            record: {
                                id: row.id,
                                key_hash: row.key_hash,
                                name: row.name,
                                organization_id: row.organization_id,
                                scopes: row.scopes,
                                is_active: row.is_active,
                                rate_limit: row.rate_limit,
                                last_used_at: row.last_used_at,
                                expires_at: row.expires_at,
                                created_at: row.created_at,
                                created_by: row.created_by,
                                metadata: row.metadata,
                            },
                        }];
            }
        });
    });
}
/**
 * Revoke an API key
 *
 * @param keyId - API key ID to revoke
 * @returns True if revoked
 */
function revokeApiKey(keyId) {
    return __awaiter(this, void 0, void 0, function () {
        var pool;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, initApiKeysTable()];
                case 1:
                    _a.sent();
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query("UPDATE ".concat(API_KEYS_TABLE, " SET is_active = false WHERE id = $1"), [keyId])];
                case 2:
                    _a.sent();
                    firebase_functions_1.logger.info('[ApiKey] Revoked', { keyId: keyId });
                    return [2 /*return*/, true];
            }
        });
    });
}
/**
 * List API keys for an organization
 *
 * @param organizationId - Organization ID
 * @returns Array of API key records
 */
function listApiKeys(organizationId) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, initApiKeysTable()];
                case 1:
                    _a.sent();
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query("SELECT * FROM ".concat(API_KEYS_TABLE, "\n     WHERE organization_id = $1\n     ORDER BY created_at DESC"), [organizationId])];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.rows.map(function (row) { return ({
                            id: row.id,
                            key_hash: row.key_hash,
                            name: row.name,
                            organization_id: row.organization_id,
                            scopes: row.scopes,
                            is_active: row.is_active,
                            rate_limit: row.rate_limit,
                            last_used_at: row.last_used_at,
                            expires_at: row.expires_at,
                            created_at: row.created_at,
                            created_by: row.created_by,
                            metadata: row.metadata,
                        }); })];
            }
        });
    });
}
/**
 * Rotate an API key (create new, revoke old)
 *
 * @param oldKeyId - Old API key ID
 * @param revokedBy - User ID performing the rotation
 * @returns New API key
 */
function rotateApiKey(oldKeyId, revokedBy) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, oldKeyResult, oldKey, newKey;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, initApiKeysTable()];
                case 1:
                    _a.sent();
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query("SELECT * FROM ".concat(API_KEYS_TABLE, " WHERE id = $1"), [oldKeyId])];
                case 2:
                    oldKeyResult = _a.sent();
                    if (oldKeyResult.rows.length === 0) {
                        throw new Error('API key not found');
                    }
                    oldKey = oldKeyResult.rows[0];
                    return [4 /*yield*/, createApiKey({
                            name: "".concat(oldKey.name, " (rotated)"),
                            organizationId: oldKey.organization_id,
                            scopes: oldKey.scopes,
                            createdBy: revokedBy,
                            rateLimit: oldKey.rate_limit,
                            metadata: __assign(__assign({}, oldKey.metadata), { rotatedFrom: oldKeyId }),
                        })];
                case 3:
                    newKey = _a.sent();
                    // Revoke old key
                    return [4 /*yield*/, revokeApiKey(oldKeyId)];
                case 4:
                    // Revoke old key
                    _a.sent();
                    firebase_functions_1.logger.info('[ApiKey] Rotated', {
                        oldKeyId: oldKeyId,
                        newKeyId: newKey.record.id,
                    });
                    return [2 /*return*/, newKey];
            }
        });
    });
}
