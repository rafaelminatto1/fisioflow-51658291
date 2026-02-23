"use strict";
/**
 * Error Dashboard System
 * Real-time error tracking and aggregation for monitoring
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
exports.cleanupOldErrors = exports.cleanupOldErrorsHandler = exports.getErrorTrends = exports.getErrorTrendsHandler = exports.errorStream = exports.errorStreamHandler = exports.getErrorDetails = exports.getErrorDetailsHandler = exports.resolveError = exports.resolveErrorHandler = exports.getRecentErrors = exports.getRecentErrorsHandler = exports.getErrorStats = exports.getErrorStatsHandler = void 0;
exports.logError = logError;
var https_1 = require("firebase-functions/v2/https");
var admin = require("firebase-admin");
var logger_1 = require("../lib/logger");
var crypto = require("crypto");
var logger = (0, logger_1.getLogger)('error-dashboard');
var db = admin.firestore();
var ERRORS_COLLECTION = 'error_logs';
/**
 * Log an error to the error dashboard
 */
function logError(error) {
    return __awaiter(this, void 0, void 0, function () {
        var errorHash, errorRef, now;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    errorHash = generateErrorHash(error.function, error.errorType, error.errorMessage);
                    errorRef = db.collection(ERRORS_COLLECTION).doc(errorHash);
                    now = new Date();
                    return [4 /*yield*/, db.runTransaction(function (transaction) { return __awaiter(_this, void 0, void 0, function () {
                            var doc, data, newError;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, transaction.get(errorRef)];
                                    case 1:
                                        doc = _a.sent();
                                        if (doc.exists) {
                                            data = doc.data();
                                            transaction.update(errorRef, {
                                                occurrences: data.occurrences + 1,
                                                lastOccurrence: now,
                                                resolved: false,
                                                resolvedAt: null,
                                                resolvedBy: null,
                                            });
                                        }
                                        else {
                                            newError = {
                                                id: errorHash,
                                                timestamp: now,
                                                function: error.function,
                                                errorType: error.errorType,
                                                errorMessage: error.errorMessage,
                                                stackTrace: error.stackTrace,
                                                userId: error.userId,
                                                organizationId: error.organizationId,
                                                patientId: error.patientId,
                                                requestId: error.requestId,
                                                severity: error.severity || 'medium',
                                                resolved: false,
                                                occurrences: 1,
                                                lastOccurrence: now,
                                                metadata: error.metadata,
                                            };
                                            transaction.set(errorRef, newError);
                                        }
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Generate error hash for deduplication
 */
function generateErrorHash(func, type, message) {
    var data = "".concat(func, ":").concat(type, ":").concat(message);
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}
/**
 * Get error statistics
 */
var getErrorStatsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, _a, organizationId, _b, timeRange, startTime, query, snapshot, errors, stats_1, error_1;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                data = request.data;
                userId = (_c = request.auth) === null || _c === void 0 ? void 0 : _c.uid;
                if (!userId) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data, organizationId = _a.organizationId, _b = _a.timeRange, timeRange = _b === void 0 ? '24h' : _b;
                _d.label = 1;
            case 1:
                _d.trys.push([1, 3, , 4]);
                startTime = getTimeRangeStart(timeRange);
                query = db
                    .collection(ERRORS_COLLECTION)
                    .where('lastOccurrence', '>=', startTime);
                if (organizationId) {
                    query = query.where('organizationId', '==', organizationId);
                }
                return [4 /*yield*/, query.get()];
            case 2:
                snapshot = _d.sent();
                errors = snapshot.docs.map(function (doc) { return doc.data(); });
                stats_1 = {
                    totalErrors: errors.length,
                    byFunction: {},
                    byType: {},
                    bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
                    recentErrors: errors
                        .sort(function (a, b) {
                        var aTime = a.lastOccurrence instanceof Date
                            ? a.lastOccurrence.getTime()
                            : a.lastOccurrence.toMillis();
                        var bTime = b.lastOccurrence instanceof Date
                            ? b.lastOccurrence.getTime()
                            : b.lastOccurrence.toMillis();
                        return bTime - aTime;
                    })
                        .slice(0, 20),
                    topErrors: [],
                };
                errors.forEach(function (error) {
                    // By function
                    stats_1.byFunction[error.function] =
                        (stats_1.byFunction[error.function] || 0) + error.occurrences;
                    // By type
                    stats_1.byType[error.errorType] =
                        (stats_1.byType[error.errorType] || 0) + error.occurrences;
                    // By severity
                    stats_1.bySeverity[error.severity] =
                        (stats_1.bySeverity[error.severity] || 0) + error.occurrences;
                });
                // Top errors by occurrences
                stats_1.topErrors = errors
                    .sort(function (a, b) { return b.occurrences - a.occurrences; })
                    .slice(0, 10)
                    .map(function (error) { return ({ error: error, count: error.occurrences }); });
                return [2 /*return*/, { success: true, stats: stats_1, timeRange: timeRange }];
            case 3:
                error_1 = _d.sent();
                logger.error('Failed to get error stats', { error: error_1 });
                throw new https_1.HttpsError('internal', "Failed to get error stats: ".concat(error_1.message));
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getErrorStatsHandler = getErrorStatsHandler;
exports.getErrorStats = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, exports.getErrorStatsHandler);
/**
 * Get recent errors
 */
var getRecentErrorsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, _a, organizationId, _b, limit, _c, unresolvedOnly, query, snapshot, errors, error_2;
    var _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                data = request.data;
                userId = (_d = request.auth) === null || _d === void 0 ? void 0 : _d.uid;
                if (!userId) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data, organizationId = _a.organizationId, _b = _a.limit, limit = _b === void 0 ? 50 : _b, _c = _a.unresolvedOnly, unresolvedOnly = _c === void 0 ? false : _c;
                _e.label = 1;
            case 1:
                _e.trys.push([1, 3, , 4]);
                query = db
                    .collection(ERRORS_COLLECTION)
                    .orderBy('lastOccurrence', 'desc')
                    .limit(limit);
                if (organizationId) {
                    query = query.where('organizationId', '==', organizationId);
                }
                if (unresolvedOnly) {
                    query = query.where('resolved', '==', false);
                }
                return [4 /*yield*/, query.get()];
            case 2:
                snapshot = _e.sent();
                errors = snapshot.docs.map(function (doc) { return doc.data(); });
                return [2 /*return*/, { success: true, errors: errors, count: errors.length }];
            case 3:
                error_2 = _e.sent();
                logger.error('Failed to get recent errors', { error: error_2 });
                throw new https_1.HttpsError('internal', "Failed to get recent errors: ".concat(error_2.message));
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getRecentErrorsHandler = getRecentErrorsHandler;
exports.getRecentErrors = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, exports.getRecentErrorsHandler);
/**
 * Resolve an error
 */
var resolveErrorHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, errorId, errorRef, error_3;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                data = request.data;
                userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
                if (!userId) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                errorId = data.errorId;
                if (!errorId) {
                    throw new https_1.HttpsError('invalid-argument', 'errorId is required');
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                errorRef = db.collection(ERRORS_COLLECTION).doc(errorId);
                return [4 /*yield*/, errorRef.update({
                        resolved: true,
                        resolvedAt: new Date(),
                        resolvedBy: userId,
                    })];
            case 2:
                _b.sent();
                logger.info('Error resolved', { errorId: errorId, userId: userId });
                return [2 /*return*/, { success: true }];
            case 3:
                error_3 = _b.sent();
                logger.error('Failed to resolve error', { error: error_3 });
                throw new https_1.HttpsError('internal', "Failed to resolve error: ".concat(error_3.message));
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.resolveErrorHandler = resolveErrorHandler;
exports.resolveError = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, exports.resolveErrorHandler);
/**
 * Get error details
 */
var getErrorDetailsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, errorId, doc, error, error_4;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                data = request.data;
                userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
                if (!userId) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                errorId = data.errorId;
                if (!errorId) {
                    throw new https_1.HttpsError('invalid-argument', 'errorId is required');
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, db.collection(ERRORS_COLLECTION).doc(errorId).get()];
            case 2:
                doc = _b.sent();
                if (!doc.exists) {
                    throw new https_1.HttpsError('not-found', 'Error not found');
                }
                error = doc.data();
                return [2 /*return*/, { success: true, error: error }];
            case 3:
                error_4 = _b.sent();
                if (error_4.code === 'not-found') {
                    throw error_4;
                }
                logger.error('Failed to get error details', { error: error_4 });
                throw new https_1.HttpsError('internal', "Failed to get error details: ".concat(error_4.message));
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getErrorDetailsHandler = getErrorDetailsHandler;
exports.getErrorDetails = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, exports.getErrorDetailsHandler);
/**
 * HTTP endpoint for real-time error stream (Server-Sent Events)
 */
var errorStreamHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, isAlive, keepAlive, unsubscribe, cleanup, query;
    return __generator(this, function (_a) {
        // CORS
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return [2 /*return*/];
        }
        if (req.method !== 'GET') {
            res.status(405).json({ error: 'Method not allowed' });
            return [2 /*return*/];
        }
        // Set headers for SSE
        res.set('Content-Type', 'text/event-stream');
        res.set('Cache-Control', 'no-cache');
        res.set('Connection', 'keep-alive');
        res.set('X-Accel-Buffering', 'no'); // Disable nginx buffering
        organizationId = req.query.organizationId;
        isAlive = true;
        keepAlive = null;
        unsubscribe = null;
        cleanup = function () {
            if (!isAlive)
                return;
            isAlive = false;
            if (keepAlive) {
                clearInterval(keepAlive);
                keepAlive = null;
            }
            if (unsubscribe) {
                unsubscribe();
                unsubscribe = null;
            }
            logger.debug('Error stream cleaned up');
        };
        // Handle connection errors
        req.on('error', function (error) {
            logger.error('Error stream request error', { error: error });
            cleanup();
        });
        res.on('error', function (error) {
            logger.error('Error stream response error', { error: error });
            cleanup();
        });
        res.on('close', cleanup);
        req.on('close', cleanup);
        // Send initial keep-alive
        try {
            res.write(': keep-alive\n\n');
        }
        catch (error) {
            logger.error('Failed to write initial keep-alive', { error: error });
            cleanup();
            return [2 /*return*/];
        }
        query = db.collection(ERRORS_COLLECTION)
            .where('resolved', '==', false)
            .orderBy('lastOccurrence', 'desc')
            .limit(10);
        if (organizationId && typeof organizationId === 'string') {
            query = query.where('organizationId', '==', organizationId);
        }
        // Set up Firestore snapshot listener
        unsubscribe = query.onSnapshot(function (snapshot) {
            if (!isAlive) {
                if (unsubscribe)
                    unsubscribe();
                return;
            }
            try {
                var errors = snapshot.docs.map(function (doc) { return doc.data(); });
                res.write("data: ".concat(JSON.stringify({ errors: errors, count: errors.length }), "\n\n"));
            }
            catch (err) {
                logger.error('Failed to write error data', { error: err });
                cleanup();
            }
        }, function (err) {
            logger.error('Error stream error', { error: err });
            if (isAlive) {
                try {
                    res.write("data: ".concat(JSON.stringify({ error: 'Stream error' }), "\n\n"));
                }
                catch (_a) {
                    // Ignore write errors if connection is already closed
                }
            }
            cleanup();
        });
        // Send keep-alive every 30 seconds
        keepAlive = setInterval(function () {
            if (!isAlive) {
                if (keepAlive)
                    clearInterval(keepAlive);
                return;
            }
            try {
                res.write(': keep-alive\n\n');
            }
            catch (error) {
                logger.debug('Keep-alive failed, connection closed');
                cleanup();
            }
        }, 30000);
        // Set maximum connection timeout of 5 minutes
        setTimeout(function () {
            if (isAlive) {
                logger.debug('Error stream timeout reached');
                try {
                    res.write('data: {"type":"timeout","message":"Stream timeout"}\n\n');
                }
                catch (_a) {
                    // Ignore
                }
                cleanup();
            }
        }, 5 * 60 * 1000);
        return [2 /*return*/];
    });
}); };
exports.errorStreamHandler = errorStreamHandler;
exports.errorStream = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, exports.errorStreamHandler);
/**
 * Get error trends over time
 */
var getErrorTrendsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, _a, period, startTime, buckets, snapshot, errors_1, toDate_1, trends, error_5;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                data = request.data;
                userId = (_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid;
                if (!userId) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data.period, period = _a === void 0 ? '7d' : _a;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                startTime = getTimeRangeStart(period);
                buckets = getTimeBuckets(period);
                return [4 /*yield*/, db
                        .collection(ERRORS_COLLECTION)
                        .where('lastOccurrence', '>=', startTime)
                        .get()];
            case 2:
                snapshot = _c.sent();
                errors_1 = snapshot.docs.map(function (doc) { return doc.data(); });
                toDate_1 = function (d) {
                    return d instanceof Date ? d : d.toDate();
                };
                trends = buckets.map(function (bucket) {
                    var bucketErrors = errors_1.filter(function (e) {
                        var occ = toDate_1(e.lastOccurrence);
                        return occ >= bucket.start && occ < bucket.end;
                    });
                    return {
                        label: bucket.label,
                        timestamp: bucket.start.toISOString(),
                        count: bucketErrors.length,
                        uniqueErrors: bucketErrors.length,
                        critical: bucketErrors.filter(function (e) { return e.severity === 'critical'; }).length,
                        high: bucketErrors.filter(function (e) { return e.severity === 'high'; }).length,
                    };
                });
                return [2 /*return*/, { success: true, trends: trends, period: period }];
            case 3:
                error_5 = _c.sent();
                logger.error('Failed to get error trends', { error: error_5 });
                throw new https_1.HttpsError('internal', "Failed to get error trends: ".concat(error_5.message));
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getErrorTrendsHandler = getErrorTrendsHandler;
exports.getErrorTrends = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, exports.getErrorTrendsHandler);
/**
 * Batch delete old resolved errors
 */
var cleanupOldErrorsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, _a, olderThanDays, cutoffDate, snapshot, batch_1, deletedCount_1, error_6;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                data = request.data;
                userId = (_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid;
                if (!userId) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data.olderThanDays, olderThanDays = _a === void 0 ? 30 : _a;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 4, , 5]);
                cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
                return [4 /*yield*/, db
                        .collection(ERRORS_COLLECTION)
                        .where('resolved', '==', true)
                        .where('resolvedAt', '<', cutoffDate)
                        .limit(500)
                        .get()];
            case 2:
                snapshot = _c.sent();
                batch_1 = db.batch();
                deletedCount_1 = 0;
                snapshot.docs.forEach(function (doc) {
                    batch_1.delete(doc.ref);
                    deletedCount_1++;
                });
                return [4 /*yield*/, batch_1.commit()];
            case 3:
                _c.sent();
                logger.info('Old errors cleaned up', { userId: userId, deletedCount: deletedCount_1, olderThanDays: olderThanDays });
                return [2 /*return*/, { success: true, deletedCount: deletedCount_1 }];
            case 4:
                error_6 = _c.sent();
                logger.error('Failed to cleanup old errors', { error: error_6 });
                throw new https_1.HttpsError('internal', "Failed to cleanup: ".concat(error_6.message));
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.cleanupOldErrorsHandler = cleanupOldErrorsHandler;
exports.cleanupOldErrors = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, exports.cleanupOldErrorsHandler);
// Helper functions
function getTimeRangeStart(range) {
    var now = new Date();
    switch (range) {
        case '1h':
            return new Date(now.getTime() - 60 * 60 * 1000);
        case '6h':
            return new Date(now.getTime() - 6 * 60 * 60 * 1000);
        case '24h':
            return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        case '7d':
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case '30d':
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        default:
            return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
}
function getTimeBuckets(period) {
    var now = new Date();
    var buckets = [];
    if (period === '24h') {
        // Hourly buckets for last 24 hours
        for (var i = 24; i > 0; i--) {
            var start = new Date(now.getTime() - i * 60 * 60 * 1000);
            var end = new Date(start.getTime() + 60 * 60 * 1000);
            buckets.push({
                label: start.getHours() + ':00',
                start: start,
                end: end,
            });
        }
    }
    else if (period === '7d') {
        // Daily buckets for last 7 days
        for (var i = 7; i > 0; i--) {
            var start = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            start.setHours(0, 0, 0, 0);
            var end = new Date(start);
            end.setDate(end.getDate() + 1);
            buckets.push({
                label: start.toLocaleDateString('pt-BR', { weekday: 'short' }),
                start: start,
                end: end,
            });
        }
    }
    else {
        // Daily buckets for last 30 days
        for (var i = 30; i > 0; i--) {
            var start = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            start.setHours(0, 0, 0, 0);
            var end = new Date(start);
            end.setDate(end.getDate() + 1);
            buckets.push({
                label: start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                start: start,
                end: end,
            });
        }
    }
    return buckets;
}
