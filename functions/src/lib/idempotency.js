"use strict";
/**
 * Idempotency Cache Helper for AI Functions
 *
 * Prevents duplicate AI requests and implements caching for cost optimization
 *
 * @module lib/idempotency
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
exports.generateCacheKey = generateCacheKey;
exports.getCachedResult = getCachedResult;
exports.setCachedResult = setCachedResult;
exports.acquireLock = acquireLock;
exports.releaseLock = releaseLock;
exports.withIdempotency = withIdempotency;
exports.cleanupExpiredCache = cleanupExpiredCache;
var firestore_1 = require("firebase-admin/firestore");
var logger = require("firebase-functions/logger");
var CACHE_COLLECTION = 'ai_idempotency_cache';
var CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
/**
 * Generate a cache key from request parameters
 */
function generateCacheKey(feature, userId, params) {
    // Create a deterministic key from the parameters
    var sortedParams = Object.keys(params)
        .sort()
        .reduce(function (acc, key) {
        acc[key] = params[key];
        return acc;
    }, {});
    var paramsStr = JSON.stringify(sortedParams);
    return "".concat(feature, "_").concat(userId, "_").concat(Buffer.from(paramsStr).toString('base64').substring(0, 50));
}
/**
 * Get cached result for a request
 */
function getCachedResult(cacheKey) {
    return __awaiter(this, void 0, void 0, function () {
        var db, doc, cached, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    db = (0, firestore_1.getFirestore)();
                    return [4 /*yield*/, db.collection(CACHE_COLLECTION).doc(cacheKey).get()];
                case 1:
                    doc = _a.sent();
                    if (!doc.exists) {
                        return [2 /*return*/, null];
                    }
                    cached = doc.data();
                    if (!(Date.now() > cached.expiresAt)) return [3 /*break*/, 3];
                    // Cache expired, delete it
                    return [4 /*yield*/, doc.ref.delete()];
                case 2:
                    // Cache expired, delete it
                    _a.sent();
                    return [2 /*return*/, null];
                case 3:
                    logger.info("[Idempotency] Cache hit for key: ".concat(cacheKey));
                    return [2 /*return*/, cached];
                case 4:
                    error_1 = _a.sent();
                    logger.error('[Idempotency] Error getting cached result:', error_1);
                    return [2 /*return*/, null];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Set cached result for a request
 */
function setCachedResult(cacheKey_1, result_1) {
    return __awaiter(this, arguments, void 0, function (cacheKey, result, ttlMs) {
        var db, now, error_2;
        if (ttlMs === void 0) { ttlMs = CACHE_TTL_MS; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    db = (0, firestore_1.getFirestore)();
                    now = Date.now();
                    return [4 /*yield*/, db.collection(CACHE_COLLECTION).doc(cacheKey).set({
                            result: result,
                            timestamp: now,
                            expiresAt: now + ttlMs,
                        })];
                case 1:
                    _a.sent();
                    logger.info("[Idempotency] Cached result for key: ".concat(cacheKey));
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    logger.error('[Idempotency] Error setting cached result:', error_2);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Check if a request is in progress (prevent duplicate simultaneous requests)
 */
function acquireLock(cacheKey_1) {
    return __awaiter(this, arguments, void 0, function (cacheKey, lockTimeoutMs // 1 minute lock
    ) {
        var db, lockRef_1, now_1, result, error_3;
        var _this = this;
        if (lockTimeoutMs === void 0) { lockTimeoutMs = 60000; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    db = (0, firestore_1.getFirestore)();
                    lockRef_1 = db.collection(CACHE_COLLECTION).doc("lock_".concat(cacheKey));
                    now_1 = Date.now();
                    return [4 /*yield*/, db.runTransaction(function (transaction) { return __awaiter(_this, void 0, void 0, function () {
                            var lockDoc, lock;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, transaction.get(lockRef_1)];
                                    case 1:
                                        lockDoc = _a.sent();
                                        if (lockDoc.exists) {
                                            lock = lockDoc.data();
                                            // Check if lock expired
                                            if (lock && lock.expiresAt > now_1) {
                                                return [2 /*return*/, false]; // Lock still held
                                            }
                                        }
                                        // Acquire lock
                                        transaction.set(lockRef_1, {
                                            locked: true,
                                            acquiredAt: now_1,
                                            expiresAt: now_1 + lockTimeoutMs,
                                        });
                                        return [2 /*return*/, true];
                                }
                            });
                        }); })];
                case 1:
                    result = _a.sent();
                    if (result) {
                        logger.info("[Idempotency] Lock acquired for key: ".concat(cacheKey));
                    }
                    return [2 /*return*/, result];
                case 2:
                    error_3 = _a.sent();
                    logger.error('[Idempotency] Error acquiring lock:', error_3);
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Release a lock
 */
function releaseLock(cacheKey) {
    return __awaiter(this, void 0, void 0, function () {
        var db, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    db = (0, firestore_1.getFirestore)();
                    return [4 /*yield*/, db.collection(CACHE_COLLECTION).doc("lock_".concat(cacheKey)).delete()];
                case 1:
                    _a.sent();
                    logger.info("[Idempotency] Lock released for key: ".concat(cacheKey));
                    return [3 /*break*/, 3];
                case 2:
                    error_4 = _a.sent();
                    logger.error('[Idempotency] Error releasing lock:', error_4);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Wrapper for AI functions with idempotency and caching
 */
function withIdempotency(feature, userId, params, fn, options) {
    return __awaiter(this, void 0, void 0, function () {
        var cacheKey, cached, lockAcquired, cached, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cacheKey = generateCacheKey(feature, userId, params);
                    if (!!(options === null || options === void 0 ? void 0 : options.skipCache)) return [3 /*break*/, 2];
                    return [4 /*yield*/, getCachedResult(cacheKey)];
                case 1:
                    cached = _a.sent();
                    if (cached) {
                        return [2 /*return*/, cached.result];
                    }
                    _a.label = 2;
                case 2: return [4 /*yield*/, acquireLock(cacheKey, options === null || options === void 0 ? void 0 : options.lockTimeout)];
                case 3:
                    lockAcquired = _a.sent();
                    if (!!lockAcquired) return [3 /*break*/, 6];
                    // Lock held, wait and check cache again
                    return [4 /*yield*/, sleep(500)];
                case 4:
                    // Lock held, wait and check cache again
                    _a.sent();
                    return [4 /*yield*/, getCachedResult(cacheKey)];
                case 5:
                    cached = _a.sent();
                    if (cached) {
                        return [2 /*return*/, cached.result];
                    }
                    // Still no cache and lock held - throw or wait
                    throw new Error('Request already in progress. Please try again in a moment.');
                case 6:
                    _a.trys.push([6, , 9, 11]);
                    return [4 /*yield*/, fn()];
                case 7:
                    result = _a.sent();
                    // Cache the result
                    return [4 /*yield*/, setCachedResult(cacheKey, result, options === null || options === void 0 ? void 0 : options.cacheTtl)];
                case 8:
                    // Cache the result
                    _a.sent();
                    return [2 /*return*/, result];
                case 9: 
                // Always release the lock
                return [4 /*yield*/, releaseLock(cacheKey)];
                case 10:
                    // Always release the lock
                    _a.sent();
                    return [7 /*endfinally*/];
                case 11: return [2 /*return*/];
            }
        });
    });
}
/**
 * Clean up expired cache entries (call via scheduled function)
 */
function cleanupExpiredCache() {
    return __awaiter(this, void 0, void 0, function () {
        var db, now, snapshot, batch_1, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    db = (0, firestore_1.getFirestore)();
                    now = Date.now();
                    return [4 /*yield*/, db
                            .collection(CACHE_COLLECTION)
                            .where('expiresAt', '<', now)
                            .limit(500)
                            .get()];
                case 1:
                    snapshot = _a.sent();
                    if (snapshot.empty) {
                        return [2 /*return*/, 0];
                    }
                    batch_1 = db.batch();
                    snapshot.docs.forEach(function (doc) {
                        batch_1.delete(doc.ref);
                    });
                    return [4 /*yield*/, batch_1.commit()];
                case 2:
                    _a.sent();
                    logger.info("[Idempotency] Cleaned up ".concat(snapshot.size, " expired cache entries"));
                    return [2 /*return*/, snapshot.size];
                case 3:
                    error_5 = _a.sent();
                    logger.error('[Idempotency] Error cleaning up cache:', error_5);
                    return [2 /*return*/, 0];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Sleep utility
 */
function sleep(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
