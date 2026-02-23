"use strict";
/**
 * Cloud Trace Integration
 * Integrates with Google Cloud Trace for distributed tracing
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
exports.TraceManager = void 0;
exports.extractTraceContext = extractTraceContext;
exports.generateTraceId = generateTraceId;
exports.generateSpanId = generateSpanId;
exports.createTraceParentHeader = createTraceParentHeader;
exports.createCloudTraceContextHeader = createCloudTraceContextHeader;
exports.getTraceViewerUrl = getTraceViewerUrl;
exports.addTraceToLog = addTraceToLog;
exports.withSpan = withSpan;
exports.withDatabaseSpan = withDatabaseSpan;
exports.withExternalServiceSpan = withExternalServiceSpan;
exports.createTraceFromRequest = createTraceFromRequest;
var logger_1 = require("./logger");
var logger = (0, logger_1.getLogger)('cloud-trace');
/**
 * Trace header names
 */
var TRACE_HEADERS = {
    TRACE_PARENT: 'traceparent',
    CLOUD_TRACE_CONTEXT: 'x-cloud-trace-context',
};
/**
 * Extracts trace context from HTTP headers
 *
 * @param headers - HTTP request headers
 * @returns Trace context
 */
function extractTraceContext(headers) {
    var context = {};
    // Try W3C traceparent header (standard format)
    var traceParent = typeof headers.get === 'function'
        ? headers.get(TRACE_HEADERS.TRACE_PARENT)
        : headers[TRACE_HEADERS.TRACE_PARENT];
    if (traceParent) {
        // traceparent format: version-traceId-spanId-flags
        // Example: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
        var parts = traceParent.split('-');
        if (parts.length >= 3) {
            context.traceId = parts[1];
            context.spanId = parts[2];
            context.traceSampled = parts.length > 3 ? parts[3][0] === '1' : undefined;
        }
    }
    // Try Cloud Trace context header (GCP specific)
    var cloudTrace = typeof headers.get === 'function'
        ? headers.get(TRACE_HEADERS.CLOUD_TRACE_CONTEXT)
        : headers[TRACE_HEADERS.CLOUD_TRACE_CONTEXT];
    if (cloudTrace && !context.traceId) {
        // Format: traceId/spanId;o=1
        var match = cloudTrace.match(/^([a-f0-9]+)(?:\/([a-f0-9]+))?(?:;o=(\d))?/);
        if (match) {
            context.traceId = match[1];
            context.spanId = match[2];
            context.traceSampled = match[3] === '1';
        }
    }
    return context;
}
/**
 * Generates a new trace ID
 *
 * @returns Random trace ID (16 bytes, hex encoded)
 */
function generateTraceId() {
    return Array.from({ length: 16 }, function () {
        return Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    }).join('');
}
/**
 * Generates a new span ID
 *
 * @returns Random span ID (8 bytes, hex encoded)
 */
function generateSpanId() {
    return Array.from({ length: 8 }, function () {
        return Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    }).join('');
}
/**
 * Creates a W3C traceparent header value
 *
 * @param traceId - Trace ID
 * @param spanId - Span ID
 * @param sampled - Whether to sample this trace
 * @returns Formatted traceparent header value
 */
function createTraceParentHeader(traceId, spanId, sampled) {
    var span = spanId || generateSpanId();
    var flags = sampled ? '01' : '00';
    return "00-".concat(traceId, "-").concat(span, "-").concat(flags);
}
/**
 * Creates a Cloud Trace context header value
 *
 * @param traceId - Trace ID
 * @param spanId - Span ID
 * @param sampled - Whether to sample this trace
 * @returns Formatted Cloud Trace context header value
 */
function createCloudTraceContextHeader(traceId, spanId, sampled) {
    var span = spanId || generateSpanId();
    var sampledFlag = sampled ? ';o=1' : '';
    return "".concat(traceId, "/").concat(span).concat(sampledFlag);
}
/**
 * Gets the URL for viewing a trace in Cloud Console
 *
 * @param projectId - Google Cloud project ID
 * @param traceId - Trace ID
 * @returns URL to trace in Cloud Console
 */
function getTraceViewerUrl(projectId, traceId) {
    return "https://console.cloud.google.com/traces/list?project=".concat(projectId, "&t=").concat(traceId);
}
/**
 * Adds trace context to log entry
 *
 * @param logData - Log entry data
 * @param traceContext - Trace context
 * @returns Enhanced log entry with trace information
 */
function addTraceToLog(logData, traceContext) {
    var projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '';
    var enhanced = __assign({}, logData);
    if (traceContext.traceId && projectId) {
        enhanced['logging.googleapis.com/trace'] = "projects/".concat(projectId, "/traces/").concat(traceContext.traceId);
    }
    if (traceContext.spanId) {
        enhanced['logging.googleapis.com/spanId'] = traceContext.spanId;
    }
    if (traceContext.traceSampled !== undefined) {
        enhanced['logging.googleapis.com/trace_sampled'] = traceContext.traceSampled;
    }
    return enhanced;
}
/**
 * Executes a function within a trace span
 *
 * @param options - Span options
 * @param fn - Function to execute within the span
 * @returns Result of the function
 */
function withSpan(options, fn) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, spanId, result, duration, error_1, duration;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    spanId = generateSpanId();
                    logger.debug("[Span:".concat(options.name, "] Started"), {
                        span_id: spanId,
                        attributes: options.attributes,
                    });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fn()];
                case 2:
                    result = _a.sent();
                    duration = Date.now() - startTime;
                    logger.debug("[Span:".concat(options.name, "] Completed"), {
                        span_id: spanId,
                        duration_ms: duration,
                    });
                    return [2 /*return*/, result];
                case 3:
                    error_1 = _a.sent();
                    duration = Date.now() - startTime;
                    logger.error("[Span:".concat(options.name, "] Failed"), {
                        span_id: spanId,
                        duration_ms: duration,
                        error: error_1 instanceof Error ? error_1.message : String(error_1),
                    });
                    throw error_1;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Creates a database operation span
 */
function withDatabaseSpan(operation, table, fn) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, withSpan({
                    name: 'database_query',
                    attributes: {
                        'db.operation': operation,
                        'db.table': table,
                        'db.system': 'postgresql',
                    },
                }, fn)];
        });
    });
}
/**
 * Creates an external API call span
 */
function withExternalServiceSpan(serviceName, operation, fn) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, withSpan({
                    name: 'external_api_call',
                    attributes: {
                        'service.name': serviceName,
                        'http.method': operation,
                    },
                }, fn)];
        });
    });
}
/**
 * Trace manager for correlating logs across function calls
 */
var TraceManager = /** @class */ (function () {
    function TraceManager(traceId) {
        this.traceId = traceId || generateTraceId();
        this.rootSpanId = generateSpanId();
        this.spans = new Map();
    }
    /**
     * Gets the current trace ID
     */
    TraceManager.prototype.getTraceId = function () {
        return this.traceId;
    };
    /**
     * Gets the root span ID
     */
    TraceManager.prototype.getRootSpanId = function () {
        return this.rootSpanId;
    };
    /**
     * Creates a new child span
     */
    TraceManager.prototype.createChildSpan = function (name, parentSpanId) {
        var spanId = generateSpanId();
        this.spans.set(spanId, {
            startTime: Date.now(),
            parent: parentSpanId || this.rootSpanId,
        });
        logger.debug("[Trace:".concat(this.traceId, "] Span created"), {
            span_name: name,
            span_id: spanId,
            parent_span_id: parentSpanId || this.rootSpanId,
        });
        return spanId;
    };
    /**
     * Closes a span
     */
    TraceManager.prototype.closeSpan = function (spanId) {
        var span = this.spans.get(spanId);
        if (span) {
            span.endTime = Date.now();
            var duration = span.endTime - span.startTime;
            logger.debug("[Trace:".concat(this.traceId, "] Span closed"), {
                span_id: spanId,
                duration_ms: duration,
            });
        }
    };
    /**
     * Gets trace context for logging
     */
    TraceManager.prototype.getTraceContext = function () {
        return {
            traceId: this.traceId,
            spanId: this.rootSpanId,
        };
    };
    /**
     * Gets trace viewer URL
     */
    TraceManager.prototype.getViewerUrl = function (projectId) {
        return getTraceViewerUrl(projectId, this.traceId);
    };
    /**
     * Gets all active spans
     */
    TraceManager.prototype.getActiveSpans = function () {
        var now = Date.now();
        var active = [];
        for (var _i = 0, _a = this.spans.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], id = _b[0], span = _b[1];
            if (!span.endTime) {
                active.push({ id: id, duration: now - span.startTime });
            }
        }
        return active;
    };
    /**
     * Closes all active spans
     */
    TraceManager.prototype.closeAll = function () {
        var now = Date.now();
        for (var _i = 0, _a = this.spans.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], id = _b[0], span = _b[1];
            if (!span.endTime) {
                span.endTime = now;
                var duration = span.endTime - span.startTime;
                logger.debug("[Trace:".concat(this.traceId, "] Auto-closing span"), {
                    span_id: id,
                    duration_ms: duration,
                });
            }
        }
    };
    return TraceManager;
}());
exports.TraceManager = TraceManager;
/**
 * Creates a trace manager from request headers
 */
function createTraceFromRequest(headers) {
    var context = extractTraceContext(headers);
    return new TraceManager(context.traceId);
}
