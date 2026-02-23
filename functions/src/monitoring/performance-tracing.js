"use strict";
/**
 * Performance Tracing System
 * Distributed tracing for monitoring request performance across functions
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
exports.cleanupOldTraces = exports.cleanupOldTracesHandler = exports.performanceStream = exports.performanceStreamHandler = exports.getPerformanceTrends = exports.getPerformanceTrendsHandler = exports.getTraceTimeline = exports.getTraceTimelineHandler = exports.getSlowRequests = exports.getSlowRequestsHandler = exports.getPerformanceStats = exports.getPerformanceStatsHandler = void 0;
exports.startSpan = startSpan;
exports.endSpan = endSpan;
exports.traceFunction = traceFunction;
var https_1 = require("firebase-functions/v2/https");
var admin = require("firebase-admin");
var logger_1 = require("../lib/logger");
var logger = (0, logger_1.getLogger)('performance-tracing');
var db = admin.firestore();
var TRACES_COLLECTION = 'performance_traces';
/**
 * Active spans storage (in-memory for ongoing requests)
 * CRITICAL: Spans older than 5 minutes are auto-cleaned to prevent memory leaks
 */
var activeSpans = new Map();
/**
 * Cleanup stale spans (called every 60 seconds)
 */
var SPAN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
function cleanupStaleSpans() {
    var now = Date.now();
    var cleaned = 0;
    for (var _i = 0, _a = activeSpans.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], spanId = _b[0], span = _b[1];
        if (now - span.createdAt > SPAN_TIMEOUT_MS) {
            activeSpans.delete(spanId);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        logger.debug('Cleaned stale spans', { count: cleaned });
    }
}
// Run cleanup every 60 seconds
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupStaleSpans, 60000);
}
/**
 * Start a new span
 */
function startSpan(traceId, name, parentSpanId, metadata) {
    var spanId = generateSpanId();
    var span = {
        spanId: spanId,
        parentSpanId: parentSpanId,
        name: name,
        startTime: Date.now(),
        metadata: metadata,
        createdAt: Date.now(), // Track creation time for cleanup
    };
    activeSpans.set(spanId, span);
    return spanId;
}
/**
 * End a span and record the trace
 */
function endSpan(spanId, success, statusCode, additionalMetadata) {
    return __awaiter(this, void 0, void 0, function () {
        var span, endTime, duration, traceEntry;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    span = activeSpans.get(spanId);
                    if (!span) {
                        logger.warn('Span not found', { spanId: spanId });
                        return [2 /*return*/, 0];
                    }
                    endTime = Date.now();
                    duration = endTime - span.startTime;
                    traceEntry = {
                        traceId: span.spanId.substring(0, 16),
                        parentSpanId: span.parentSpanId,
                        spanId: span.spanId,
                        timestamp: new Date(span.startTime),
                        function: span.name,
                        method: 'callable',
                        duration: duration,
                        statusCode: statusCode || (success ? 200 : 500),
                        success: success,
                        metadata: __assign(__assign({}, span.metadata), additionalMetadata),
                    };
                    // Store in Firestore
                    return [4 /*yield*/, db.collection(TRACES_COLLECTION).add(traceEntry)];
                case 1:
                    // Store in Firestore
                    _a.sent();
                    // Remove from active spans
                    activeSpans.delete(spanId);
                    return [2 /*return*/, duration];
            }
        });
    });
}
/**
 * Middleware wrapper for tracing function calls
 */
function traceFunction(functionName, fn, options) {
    var _this = this;
    return (function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return __awaiter(_this, void 0, void 0, function () {
            var spanId, result, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        spanId = startSpan(generateSpanId(), functionName, undefined, __assign(__assign({}, options === null || options === void 0 ? void 0 : options.metadata), { args: JSON.stringify(args).substring(0, 500) }));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 6]);
                        return [4 /*yield*/, fn.apply(void 0, args)];
                    case 2:
                        result = _a.sent();
                        return [4 /*yield*/, endSpan(spanId, true, 200, { result: 'success' })];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, result];
                    case 4:
                        error_1 = _a.sent();
                        return [4 /*yield*/, endSpan(spanId, false, 500, {
                                error: error_1.message,
                            })];
                    case 5:
                        _a.sent();
                        throw error_1;
                    case 6: return [2 /*return*/];
                }
            });
        });
    });
}
/**
 * Get performance statistics
 */
var getPerformanceStatsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, _a, organizationId, _b, timeRange, startTime, query, snapshot, traces, durations, errors, avgDuration, p95Index, p99Index, p95Duration, p99Duration, byFunction_1, error_2;
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
                    .collection(TRACES_COLLECTION)
                    .where('timestamp', '>=', startTime);
                if (organizationId) {
                    query = query.where('organizationId', '==', organizationId);
                }
                return [4 /*yield*/, query.get()];
            case 2:
                snapshot = _d.sent();
                traces = snapshot.docs.map(function (doc) { return doc.data(); });
                if (traces.length === 0) {
                    return [2 /*return*/, {
                            success: true,
                            stats: {
                                totalRequests: 0,
                                avgDuration: 0,
                                p95Duration: 0,
                                p99Duration: 0,
                                errorRate: 0,
                                byFunction: {},
                            },
                        }];
                }
                durations = traces.map(function (t) { return t.duration; }).sort(function (a, b) { return a - b; });
                errors = traces.filter(function (t) { return !t.success; });
                avgDuration = durations.reduce(function (a, b) { return a + b; }, 0) / durations.length;
                p95Index = Math.floor(durations.length * 0.95);
                p99Index = Math.floor(durations.length * 0.99);
                p95Duration = durations[p95Index] || durations[durations.length - 1];
                p99Duration = durations[p99Index] || durations[durations.length - 1];
                byFunction_1 = {};
                traces.forEach(function (trace) {
                    if (!byFunction_1[trace.function]) {
                        byFunction_1[trace.function] = {
                            count: 0,
                            avgDuration: 0,
                            maxDuration: 0,
                            minDuration: Infinity,
                            errorRate: 0,
                        };
                    }
                    var stats = byFunction_1[trace.function];
                    stats.count++;
                    stats.avgDuration += trace.duration;
                    stats.maxDuration = Math.max(stats.maxDuration, trace.duration);
                    stats.minDuration = Math.min(stats.minDuration, trace.duration);
                    if (!trace.success) {
                        stats.errorRate++;
                    }
                });
                // Calculate averages
                Object.keys(byFunction_1).forEach(function (fn) {
                    var stats = byFunction_1[fn];
                    stats.avgDuration = stats.avgDuration / stats.count;
                    stats.errorRate = (stats.errorRate / stats.count) * 100;
                    stats.minDuration = stats.minDuration === Infinity ? 0 : stats.minDuration;
                });
                return [2 /*return*/, {
                        success: true,
                        stats: {
                            totalRequests: traces.length,
                            avgDuration: Math.round(avgDuration),
                            p95Duration: Math.round(p95Duration),
                            p99Duration: Math.round(p99Duration),
                            errorRate: (errors.length / traces.length) * 100,
                            byFunction: byFunction_1,
                        },
                        timeRange: timeRange,
                    }];
            case 3:
                error_2 = _d.sent();
                logger.error('Failed to get performance stats', { error: error_2 });
                throw new https_1.HttpsError('internal', "Failed to get stats: ".concat(error_2.message));
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getPerformanceStatsHandler = getPerformanceStatsHandler;
exports.getPerformanceStats = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, exports.getPerformanceStatsHandler);
/**
 * Get slow requests
 */
var getSlowRequestsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, _a, organizationId, _b, limit, _c, thresholdMs, startTime, query, snapshot, traces, error_3;
    var _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                data = request.data;
                userId = (_d = request.auth) === null || _d === void 0 ? void 0 : _d.uid;
                if (!userId) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data, organizationId = _a.organizationId, _b = _a.limit, limit = _b === void 0 ? 20 : _b, _c = _a.thresholdMs, thresholdMs = _c === void 0 ? 3000 : _c;
                _e.label = 1;
            case 1:
                _e.trys.push([1, 3, , 4]);
                startTime = new Date();
                startTime.setHours(startTime.getHours() - 24);
                query = db
                    .collection(TRACES_COLLECTION)
                    .where('timestamp', '>=', startTime)
                    .where('duration', '>=', thresholdMs)
                    .orderBy('duration', 'desc')
                    .limit(limit);
                if (organizationId) {
                    query = query.where('organizationId', '==', organizationId);
                }
                return [4 /*yield*/, query.get()];
            case 2:
                snapshot = _e.sent();
                traces = snapshot.docs.map(function (doc) { return doc.data(); });
                return [2 /*return*/, { success: true, traces: traces, count: traces.length, thresholdMs: thresholdMs }];
            case 3:
                error_3 = _e.sent();
                logger.error('Failed to get slow requests', { error: error_3 });
                throw new https_1.HttpsError('internal', "Failed to get slow requests: ".concat(error_3.message));
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getSlowRequestsHandler = getSlowRequestsHandler;
exports.getSlowRequests = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, exports.getSlowRequestsHandler);
/**
 * Get trace timeline for a specific trace ID
 */
var getTraceTimelineHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, traceId, snapshot, traces, rootSpans_1, spanMap_1, totalDuration, error_4;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                data = request.data;
                userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
                if (!userId) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                traceId = data.traceId;
                if (!traceId) {
                    throw new https_1.HttpsError('invalid-argument', 'traceId is required');
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, db
                        .collection(TRACES_COLLECTION)
                        .where('traceId', '==', traceId)
                        .orderBy('timestamp', 'asc')
                        .get()];
            case 2:
                snapshot = _b.sent();
                if (snapshot.empty) {
                    return [2 /*return*/, { success: true, timeline: [], traceId: traceId }];
                }
                traces = snapshot.docs.map(function (doc) { return doc.data(); });
                rootSpans_1 = [];
                spanMap_1 = new Map();
                traces.forEach(function (trace) {
                    spanMap_1.set(trace.spanId, trace);
                });
                traces.forEach(function (trace) {
                    if (!trace.parentSpanId) {
                        rootSpans_1.push(trace);
                    }
                    else {
                        var parent_1 = spanMap_1.get(trace.parentSpanId);
                        if (parent_1) {
                            if (!parent_1.metadata) {
                                parent_1.metadata = {};
                            }
                            if (!parent_1.metadata.children) {
                                parent_1.metadata.children = [];
                            }
                            parent_1.metadata.children.push(trace);
                        }
                    }
                });
                totalDuration = Math.max.apply(Math, rootSpans_1.map(function (t) { var _a, _b; return t.duration + (((_b = (_a = t.metadata) === null || _a === void 0 ? void 0 : _a.children) === null || _b === void 0 ? void 0 : _b.length) || 0); }));
                return [2 /*return*/, {
                        success: true,
                        timeline: rootSpans_1,
                        traceId: traceId,
                        totalDuration: totalDuration,
                        spanCount: traces.length,
                    }];
            case 3:
                error_4 = _b.sent();
                logger.error('Failed to get trace timeline', { error: error_4 });
                throw new https_1.HttpsError('internal', "Failed to get timeline: ".concat(error_4.message));
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getTraceTimelineHandler = getTraceTimelineHandler;
exports.getTraceTimeline = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, exports.getTraceTimelineHandler);
/**
 * Get performance trends over time
 */
var getPerformanceTrendsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, _a, organizationId, _b, period, functionName, startTime, buckets, query, snapshot, traces_1, toDate_1, trends, error_5;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                data = request.data;
                userId = (_c = request.auth) === null || _c === void 0 ? void 0 : _c.uid;
                if (!userId) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data, organizationId = _a.organizationId, _b = _a.period, period = _b === void 0 ? '24h' : _b, functionName = _a.functionName;
                _d.label = 1;
            case 1:
                _d.trys.push([1, 3, , 4]);
                startTime = getTimeRangeStart(period);
                buckets = getTimeBuckets(period);
                query = db
                    .collection(TRACES_COLLECTION)
                    .where('timestamp', '>=', startTime);
                if (organizationId) {
                    query = query.where('organizationId', '==', organizationId);
                }
                if (functionName) {
                    query = query.where('function', '==', functionName);
                }
                return [4 /*yield*/, query.get()];
            case 2:
                snapshot = _d.sent();
                traces_1 = snapshot.docs.map(function (doc) { return doc.data(); });
                toDate_1 = function (d) {
                    return d instanceof Date ? d : d.toDate();
                };
                trends = buckets.map(function (bucket) {
                    var bucketTraces = traces_1.filter(function (t) {
                        var ts = toDate_1(t.timestamp);
                        return ts >= bucket.start && ts < bucket.end;
                    });
                    var durations = bucketTraces.map(function (t) { return t.duration; });
                    var avgDuration = durations.length > 0
                        ? durations.reduce(function (a, b) { return a + b; }, 0) / durations.length
                        : 0;
                    var errors = bucketTraces.filter(function (t) { return !t.success; }).length;
                    return {
                        label: bucket.label,
                        timestamp: bucket.start.toISOString(),
                        requestCount: bucketTraces.length,
                        avgDuration: Math.round(avgDuration),
                        errorRate: bucketTraces.length > 0
                            ? (errors / bucketTraces.length) * 100
                            : 0,
                        p95Duration: durations.length > 0
                            ? durations[Math.floor(durations.length * 0.95)] || 0
                            : 0,
                    };
                });
                return [2 /*return*/, { success: true, trends: trends, period: period }];
            case 3:
                error_5 = _d.sent();
                logger.error('Failed to get performance trends', { error: error_5 });
                throw new https_1.HttpsError('internal', "Failed to get trends: ".concat(error_5.message));
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getPerformanceTrendsHandler = getPerformanceTrendsHandler;
exports.getPerformanceTrends = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, exports.getPerformanceTrendsHandler);
/**
 * HTTP endpoint for real-time performance stream (SSE)
 */
var performanceStreamHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, organizationId, _b, slowThreshold, isAlive, keepAlive, unsubscribe, cleanup, startTime, query;
    return __generator(this, function (_c) {
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
        _a = req.query, organizationId = _a.organizationId, _b = _a.slowThreshold, slowThreshold = _b === void 0 ? '3000' : _b;
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
            logger.debug('Performance stream cleaned up');
        };
        // Handle connection errors
        req.on('error', function (error) {
            logger.error('Performance stream request error', { error: error });
            cleanup();
        });
        res.on('error', function (error) {
            logger.error('Performance stream response error', { error: error });
            cleanup();
        });
        res.on('close', cleanup);
        req.on('close', cleanup);
        // Send initial keep-alive
        try {
            res.write(': keep-alive\n\n');
        }
        catch (err) {
            logger.error('Failed to write initial keep-alive', { error: err });
            cleanup();
            return [2 /*return*/];
        }
        startTime = new Date();
        startTime.setSeconds(startTime.getSeconds() - 10); // Last 10 seconds
        query = db.collection(TRACES_COLLECTION)
            .where('timestamp', '>=', startTime)
            .orderBy('timestamp', 'desc')
            .limit(50);
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
                var traces = snapshot.docs.map(function (doc) {
                    var data = doc.data();
                    // Highlight slow requests
                    var isSlow = (data.duration || 0) >= parseInt(slowThreshold);
                    return __assign(__assign({}, data), { isSlow: isSlow });
                });
                res.write("data: ".concat(JSON.stringify({ traces: traces, count: traces.length }), "\n\n"));
            }
            catch (err) {
                logger.error('Failed to write performance data', { error: err });
                cleanup();
            }
        }, function (err) {
            logger.error('Performance stream error', { error: err });
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
                logger.debug('Performance stream timeout reached');
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
exports.performanceStreamHandler = performanceStreamHandler;
exports.performanceStream = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, exports.performanceStreamHandler);
/**
 * Cleanup old traces
 */
var cleanupOldTracesHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
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
                _a = data.olderThanDays, olderThanDays = _a === void 0 ? 7 : _a;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 4, , 5]);
                cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
                return [4 /*yield*/, db
                        .collection(TRACES_COLLECTION)
                        .where('timestamp', '<', cutoffDate)
                        .limit(1000)
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
                logger.info('Old traces cleaned up', { userId: userId, deletedCount: deletedCount_1, olderThanDays: olderThanDays });
                return [2 /*return*/, { success: true, deletedCount: deletedCount_1 }];
            case 4:
                error_6 = _c.sent();
                logger.error('Failed to cleanup old traces', { error: error_6 });
                throw new https_1.HttpsError('internal', "Failed to cleanup: ".concat(error_6.message));
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.cleanupOldTracesHandler = cleanupOldTracesHandler;
exports.cleanupOldTraces = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, exports.cleanupOldTracesHandler);
// Helper functions
function generateSpanId() {
    return "".concat(Date.now(), "-").concat(Math.random().toString(36).substring(2, 9));
}
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
        default:
            return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
}
function getTimeBuckets(period) {
    var now = new Date();
    var buckets = [];
    if (period === '1h') {
        // Minute buckets for last hour
        for (var i = 60; i > 0; i--) {
            var start = new Date(now.getTime() - i * 60 * 1000);
            var end = new Date(start.getTime() + 60 * 1000);
            buckets.push({
                label: start.getMinutes().toString(),
                start: start,
                end: end,
            });
        }
    }
    else if (period === '24h') {
        // Hourly buckets
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
    else {
        // Daily buckets for 7 days
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
    return buckets;
}
