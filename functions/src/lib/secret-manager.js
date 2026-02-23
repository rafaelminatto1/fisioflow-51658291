"use strict";
/**
 * Secret Manager Integration
 *
 * Integrates with Google Cloud Secret Manager for secure secret storage
 *
 * @module lib/secret-manager
 */
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
exports.accessSecret = accessSecret;
exports.accessSecretRequired = accessSecretRequired;
exports.getCachedSecret = getCachedSecret;
exports.accessSecrets = accessSecrets;
exports.clearSecretCache = clearSecretCache;
exports.getSecretCacheStats = getSecretCacheStats;
exports.createSecret = createSecret;
exports.updateSecret = updateSecret;
exports.deleteSecret = deleteSecret;
exports.listSecrets = listSecrets;
exports.withSecret = withSecret;
exports.withSecrets = withSecrets;
exports.isSecretManagerEnabled = isSecretManagerEnabled;
var secret_manager_1 = require("@google-cloud/secret-manager");
var logger_1 = require("./logger");
var logger = (0, logger_1.getLogger)('secret-manager');
// ============================================================================
// CONFIGURATION
// ============================================================================
var PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'fisioflow-migration';
var CACHE_TTL = 5 * 60 * 1000; // 5 minutes
var ENABLE_CACHING = process.env.SECRET_MANAGER_CACHE !== 'false';
// ============================================================================
// SINGLETON CLIENT
// ============================================================================
var client = null;
var secretCache = new Map();
/**
 * Get or create Secret Manager client (singleton)
 */
function getClient() {
    if (!client) {
        client = new secret_manager_1.SecretManagerServiceClient({
            projectId: PROJECT_ID,
        });
        logger.info('Secret Manager client initialized', { projectId: PROJECT_ID });
    }
    return client;
}
// ============================================================================
// SECRET ACCESS FUNCTIONS
// ============================================================================
/**
 * Access a secret from Secret Manager
 *
 * @param name - Secret name (without project prefix)
 * @param options - Options for accessing the secret
 * @returns Secret value or null if not found
 */
function accessSecret(name_1) {
    return __awaiter(this, arguments, void 0, function (name, options) {
        var _a, version, _b, caching, cached, clientInstance, secretPath, versionResult, payload, value, error_1, err;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = options.version, version = _a === void 0 ? 'latest' : _a, _b = options.caching, caching = _b === void 0 ? ENABLE_CACHING : _b;
                    // Check cache first if caching is enabled
                    if (caching) {
                        cached = secretCache.get("".concat(name, ":").concat(version));
                        if (cached && cached.expires > Date.now()) {
                            logger.debug("Returning cached secret: ".concat(name));
                            return [2 /*return*/, cached.value];
                        }
                    }
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    clientInstance = getClient();
                    secretPath = "projects/".concat(PROJECT_ID, "/secrets/").concat(name, "/versions/").concat(version);
                    logger.debug("Accessing secret: ".concat(name, "@").concat(version));
                    return [4 /*yield*/, clientInstance.accessSecretVersion({
                            name: secretPath,
                        })];
                case 2:
                    versionResult = (_c.sent())[0];
                    payload = versionResult.payload;
                    if (!payload || !payload.data) {
                        logger.warn("Secret ".concat(name, " has no payload"));
                        return [2 /*return*/, null];
                    }
                    value = payload.data.toString();
                    // Cache the result if caching is enabled
                    if (caching) {
                        secretCache.set("".concat(name, ":").concat(version), {
                            value: value,
                            expires: Date.now() + CACHE_TTL,
                        });
                    }
                    logger.debug("Successfully accessed secret: ".concat(name));
                    return [2 /*return*/, value];
                case 3:
                    error_1 = _c.sent();
                    err = error_1;
                    logger.error("Failed to access secret ".concat(name, ":"), err);
                    // Secret not found
                    if (err.code === 5) {
                        logger.warn("Secret not found: ".concat(name));
                        return [2 /*return*/, null];
                    }
                    throw new Error("Secret Manager error for ".concat(name, ": ").concat(err.message || 'Unknown error'));
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Access a required secret (throws if not found)
 *
 * @param name - Secret name
 * @param options - Options for accessing the secret
 * @returns Secret value
 * @throws Error if secret not found
 */
function accessSecretRequired(name_1) {
    return __awaiter(this, arguments, void 0, function (name, options) {
        var value;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, accessSecret(name, options)];
                case 1:
                    value = _a.sent();
                    if (!value) {
                        throw new Error("Required secret '".concat(name, "' not found in Secret Manager"));
                    }
                    return [2 /*return*/, value];
            }
        });
    });
}
/**
 * Access a secret with caching
 *
 * @param name - Secret name
 * @param version - Secret version (default: 'latest')
 * @returns Secret value or null
 */
function getCachedSecret(name_1) {
    return __awaiter(this, arguments, void 0, function (name, version) {
        if (version === void 0) { version = 'latest'; }
        return __generator(this, function (_a) {
            return [2 /*return*/, accessSecret(name, { version: version, caching: true })];
        });
    });
}
/**
 * Access multiple secrets at once
 *
 * @param names - Array of secret names
 * @returns Map of secret name to value (null for secrets not found)
 */
function accessSecrets(names) {
    return __awaiter(this, void 0, void 0, function () {
        var results;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    results = new Map();
                    return [4 /*yield*/, Promise.all(names.map(function (name) { return __awaiter(_this, void 0, void 0, function () {
                            var value;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, accessSecret(name)];
                                    case 1:
                                        value = _a.sent();
                                        results.set(name, value);
                                        return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 1:
                    _a.sent();
                    return [2 /*return*/, results];
            }
        });
    });
}
// ============================================================================
// CACHE MANAGEMENT
// ============================================================================
/**
 * Clear cached secret values
 *
 * @param name - Optional specific secret name to clear (clears all if not provided)
 */
function clearSecretCache(name) {
    if (name) {
        // Clear all versions of the specified secret
        for (var _i = 0, _a = secretCache.entries(); _i < _a.length; _i++) {
            var key = _a[_i][0];
            if (key.startsWith("".concat(name, ":"))) {
                secretCache.delete(key);
            }
        }
        logger.debug("Cleared cache for secret: ".concat(name));
    }
    else {
        // Clear all cached secrets
        secretCache.clear();
        logger.debug('Cleared all secret cache');
    }
}
/**
 * Get cache statistics
 */
function getSecretCacheStats() {
    var now = Date.now();
    var expiredCount = 0;
    for (var _i = 0, _a = secretCache.values(); _i < _a.length; _i++) {
        var cached = _a[_i];
        if (cached.expires <= now) {
            expiredCount++;
        }
    }
    return {
        size: secretCache.size,
        keys: Array.from(secretCache.keys()),
        expiredCount: expiredCount,
    };
}
// ============================================================================
// SECRET MANAGEMENT FUNCTIONS
// ============================================================================
/**
 * Create a new secret
 *
 * @param name - Secret name
 * @param value - Secret value
 */
function createSecret(name, value) {
    return __awaiter(this, void 0, void 0, function () {
        var clientInstance, parent_1, secret, error_2, err;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    clientInstance = getClient();
                    parent_1 = "projects/".concat(PROJECT_ID);
                    logger.info("Creating secret: ".concat(name));
                    return [4 /*yield*/, clientInstance.createSecret({
                            parent: parent_1,
                            secretId: name,
                            secret: {
                                replication: {
                                    automatic: {},
                                },
                            },
                        })];
                case 1:
                    secret = (_a.sent())[0];
                    logger.info("Secret created: ".concat(secret.name));
                    // Add the first version
                    return [4 /*yield*/, clientInstance.addSecretVersion({
                            parent: secret.name,
                            payload: {
                                data: Buffer.from(value),
                            },
                        })];
                case 2:
                    // Add the first version
                    _a.sent();
                    logger.info("Secret version added for: ".concat(name));
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    err = error_2;
                    logger.error("Failed to create secret ".concat(name, ":"), err);
                    throw new Error("Failed to create secret ".concat(name, ": ").concat(err.message));
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Update a secret with a new version
 *
 * @param name - Secret name
 * @param value - New secret value
 */
function updateSecret(name, value) {
    return __awaiter(this, void 0, void 0, function () {
        var clientInstance, secretPath, error_3, err;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    clientInstance = getClient();
                    secretPath = "projects/".concat(PROJECT_ID, "/secrets/").concat(name);
                    logger.info("Adding new version for secret: ".concat(name));
                    return [4 /*yield*/, clientInstance.addSecretVersion({
                            parent: secretPath,
                            payload: {
                                data: Buffer.from(value),
                            },
                        })];
                case 1:
                    _a.sent();
                    // Clear the cache for this secret
                    clearSecretCache(name);
                    logger.info("Secret version added for: ".concat(name));
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    err = error_3;
                    logger.error("Failed to update secret ".concat(name, ":"), err);
                    throw new Error("Failed to update secret ".concat(name, ": ").concat(err.message));
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Delete a secret and all its versions
 *
 * @param name - Secret name
 */
function deleteSecret(name) {
    return __awaiter(this, void 0, void 0, function () {
        var clientInstance, secretPath, error_4, err;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    clientInstance = getClient();
                    secretPath = "projects/".concat(PROJECT_ID, "/secrets/").concat(name);
                    logger.warn("Deleting secret: ".concat(name));
                    return [4 /*yield*/, clientInstance.deleteSecret({
                            name: secretPath,
                        })];
                case 1:
                    _a.sent();
                    // Clear the cache for this secret
                    clearSecretCache(name);
                    logger.info("Secret deleted: ".concat(name));
                    return [3 /*break*/, 3];
                case 2:
                    error_4 = _a.sent();
                    err = error_4;
                    logger.error("Failed to delete secret ".concat(name, ":"), err);
                    throw new Error("Failed to delete secret ".concat(name, ": ").concat(err.message));
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * List all secrets
 *
 * @returns Array of secret names
 */
function listSecrets() {
    return __awaiter(this, void 0, void 0, function () {
        var clientInstance, parent_2, secrets, error_5, err;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    clientInstance = getClient();
                    parent_2 = "projects/".concat(PROJECT_ID);
                    return [4 /*yield*/, clientInstance.listSecrets({
                            parent: parent_2,
                        })];
                case 1:
                    secrets = (_a.sent())[0];
                    return [2 /*return*/, (secrets || [])
                            .map(function (secret) { var _a; return (_a = secret.name) === null || _a === void 0 ? void 0 : _a.split('/').pop(); })
                            .filter(function (name) { return !!name; })];
                case 2:
                    error_5 = _a.sent();
                    err = error_5;
                    logger.error('Failed to list secrets:', err);
                    throw new Error("Failed to list secrets: ".concat(err.message));
                case 3: return [2 /*return*/];
            }
        });
    });
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Execute a function with a secret as parameter
 *
 * @param secretName - Name of the secret
 * @param fn - Function to execute with the secret value
 * @returns Result of the function
 */
function withSecret(secretName, fn) {
    return __awaiter(this, void 0, void 0, function () {
        var secret;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, accessSecretRequired(secretName)];
                case 1:
                    secret = _a.sent();
                    return [2 /*return*/, fn(secret)];
            }
        });
    });
}
/**
 * Execute a function with multiple secrets
 *
 * @param secretNames - Array of secret names
 * @param fn - Function to execute with secrets map
 * @returns Result of the function
 */
function withSecrets(secretNames, fn) {
    return __awaiter(this, void 0, void 0, function () {
        var secrets, validSecrets, _i, _a, _b, name_1, value;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, accessSecrets(secretNames)];
                case 1:
                    secrets = _c.sent();
                    validSecrets = new Map();
                    for (_i = 0, _a = secrets.entries(); _i < _a.length; _i++) {
                        _b = _a[_i], name_1 = _b[0], value = _b[1];
                        if (value === null) {
                            throw new Error("Required secret '".concat(name_1, "' not found"));
                        }
                        validSecrets.set(name_1, value);
                    }
                    return [2 /*return*/, fn(validSecrets)];
            }
        });
    });
}
/**
 * Check if Secret Manager should be used
 */
function isSecretManagerEnabled() {
    return process.env.USE_SECRET_MANAGER === 'true' || process.env.NODE_ENV === 'production';
}
