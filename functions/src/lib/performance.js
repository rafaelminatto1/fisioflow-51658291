"use strict";
/**
 * Firebase Performance Monitoring Integration
 *
 * Provides performance tracking for Cloud Functions
 * Compatible with Firebase Performance Monitoring SDK
 *
 * @module lib/performance
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.PerformanceCounter = exports.HttpTrace = exports.FirebasePerformanceTrace = void 0;
exports.startTrace = startTrace;
exports.measure = measure;
exports.measureSync = measureSync;
exports.measureHttpCall = measureHttpCall;
exports.measureDatabase = measureDatabase;
exports.measureFirestore = measureFirestore;
exports.startHttpTrace = startHttpTrace;
exports.withPerformanceTracing = withPerformanceTracing;
exports.isPerformanceEnabled = isPerformanceEnabled;
exports.createCounter = createCounter;
var perf_hooks_1 = require("perf_hooks");
var logger_1 = require("./logger");
var logger = (0, logger_1.getLogger)('performance');
// ============================================================================
// CONFIGURATION
// ============================================================================
var PERFORMANCE_ENABLED = process.env.PERFORMANCE_MONITORING_ENABLED !== 'false';
// ============================================================================
// PERFORMANCE TRACE CLASS
// ============================================================================
/**
 * Firebase Performance Trace
 *
 * Measures the duration of an operation
 */
var FirebasePerformanceTrace = /** @class */ (function () {
    function FirebasePerformanceTrace(name, options) {
        this.stopped = false;
        this.name = name;
        this.startTime = perf_hooks_1.performance.now();
        this.attributes = new Map(Object.entries((options === null || options === void 0 ? void 0 : options.attributes) || {}));
        this.metrics = new Map();
        logger.debug("Trace started: ".concat(this.name));
    }
    /**
     * Record a metric value for this trace
     *
     * @param metricName - Name of the metric
     * @param value - Metric value (number)
     */
    FirebasePerformanceTrace.prototype.putMetric = function (metricName, value) {
        this.metrics.set(metricName, value);
        logger.debug("Trace [".concat(this.name, "] metric: ").concat(metricName, " = ").concat(value));
    };
    /**
     * Increment a metric value
     *
     * @param metricName - Name of the metric
     * @param increment - Amount to increment (default: 1)
     */
    FirebasePerformanceTrace.prototype.incrementMetric = function (metricName, increment) {
        if (increment === void 0) { increment = 1; }
        var currentValue = this.metrics.get(metricName) || 0;
        this.metrics.set(metricName, currentValue + increment);
    };
    /**
     * Set an attribute for this trace
     *
     * @param key - Attribute key
     * @param value - Attribute value
     */
    FirebasePerformanceTrace.prototype.putAttribute = function (key, value) {
        this.attributes.set(key, value);
    };
    /**
     * Get an attribute value
     *
     * @param key - Attribute key
     * @returns Attribute value or undefined
     */
    FirebasePerformanceTrace.prototype.getAttribute = function (key) {
        return this.attributes.get(key);
    };
    /**
     * Get all attributes
     *
     * @returns Object with all attributes
     */
    FirebasePerformanceTrace.prototype.getAttributes = function () {
        return Object.fromEntries(this.attributes);
    };
    /**
     * Get a metric value
     *
     * @param metricName - Name of the metric
     * @returns Metric value or undefined
     */
    FirebasePerformanceTrace.prototype.getMetric = function (metricName) {
        return this.metrics.get(metricName);
    };
    /**
     * Get all metrics
     *
     * @returns Object with all metrics
     */
    FirebasePerformanceTrace.prototype.getMetrics = function () {
        return Object.fromEntries(this.metrics);
    };
    /**
     * Stop the trace and record its duration
     *
     * @returns Duration in milliseconds
     */
    FirebasePerformanceTrace.prototype.stop = function () {
        if (this.stopped) {
            logger.warn("Trace [".concat(this.name, "] already stopped"));
            return 0;
        }
        this.stopped = true;
        var endTime = perf_hooks_1.performance.now();
        var duration = endTime - this.startTime;
        // Log trace completion
        logger.info("Trace [".concat(this.name, "] completed"), {
            duration: "".concat(duration.toFixed(2), "ms"),
            metrics: Object.fromEntries(this.metrics),
            attributes: Object.fromEntries(this.attributes),
        });
        // Record to Firebase Performance Monitoring
        if (PERFORMANCE_ENABLED) {
            this.recordToFirebase(duration);
        }
        return duration;
    };
    /**
     * Stop the trace and return a result
     *
     * @param result - Result value to return
     * @returns Tuple of [duration, result]
     */
    FirebasePerformanceTrace.prototype.stopWithResult = function (result) {
        var duration = this.stop();
        return [duration, result];
    };
    /**
     * Record the trace to Firebase Performance Monitoring
     */
    FirebasePerformanceTrace.prototype.recordToFirebase = function (duration) {
        try {
            // In a real Firebase Performance Monitoring SDK integration,
            // this would send the trace data to Firebase
            logger.debug("Trace [".concat(this.name, "] recorded to Firebase"), {
                duration: duration,
                metrics: Object.fromEntries(this.metrics),
            });
        }
        catch (error) {
            logger.error("Failed to record trace [".concat(this.name, "] to Firebase:"), error);
        }
    };
    return FirebasePerformanceTrace;
}());
exports.FirebasePerformanceTrace = FirebasePerformanceTrace;
// ============================================================================
// PERFORMANCE MONITORING FUNCTIONS
// ============================================================================
/**
 * Start a new performance trace
 *
 * @param name - Trace name
 * @param options - Trace options
 * @returns FirebasePerformanceTrace instance
 */
function startTrace(name, options) {
    if (!PERFORMANCE_ENABLED) {
        logger.debug('Performance monitoring disabled');
    }
    return new FirebasePerformanceTrace(name, options);
}
/**
 * Measure the duration of an async function
 *
 * @param name - Trace name
 * @param fn - Function to measure
 * @returns Result of the function
 */
function measure(name, fn, options) {
    return __awaiter(this, void 0, void 0, function () {
        var trace, result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    trace = new FirebasePerformanceTrace(name, options);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fn(trace)];
                case 2:
                    result = _a.sent();
                    trace.stop();
                    return [2 /*return*/, result];
                case 3:
                    error_1 = _a.sent();
                    trace.stop();
                    throw error_1;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Measure the duration of a sync function
 *
 * @param name - Trace name
 * @param fn - Function to measure
 * @returns Result of the function
 */
function measureSync(name, fn, options) {
    var trace = new FirebasePerformanceTrace(name, options);
    try {
        var result = fn(trace);
        trace.stop();
        return result;
    }
    catch (error) {
        trace.stop();
        throw error;
    }
}
/**
 * Measure an HTTP call
 *
 * @param url - URL being called
 * @param fn - Function that performs the HTTP call
 * @returns Result of the function
 */
function measureHttpCall(url, fn) {
    return __awaiter(this, void 0, void 0, function () {
        var trace, result, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    trace = new FirebasePerformanceTrace("http_".concat(url));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fn()];
                case 2:
                    result = _a.sent();
                    trace.stop();
                    return [2 /*return*/, result];
                case 3:
                    error_2 = _a.sent();
                    trace.stop();
                    throw error_2;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Measure a database operation
 *
 * @param operation - Operation name
 * @param fn - Function that performs the operation
 * @returns Result of the function
 */
function measureDatabase(operation, fn) {
    return __awaiter(this, void 0, void 0, function () {
        var trace, result, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    trace = new FirebasePerformanceTrace("db_".concat(operation));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fn()];
                case 2:
                    result = _a.sent();
                    trace.stop();
                    return [2 /*return*/, result];
                case 3:
                    error_3 = _a.sent();
                    trace.stop();
                    throw error_3;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Measure a Firestore operation
 *
 * @param operation - Operation name (e.g., 'get_patient', 'update_appointment')
 * @param fn - Function that performs the operation
 * @returns Result of the function
 */
function measureFirestore(operation, fn) {
    return __awaiter(this, void 0, void 0, function () {
        var trace, result, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    trace = new FirebasePerformanceTrace("firestore_".concat(operation));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fn()];
                case 2:
                    result = _a.sent();
                    trace.stop();
                    return [2 /*return*/, result];
                case 3:
                    error_4 = _a.sent();
                    trace.stop();
                    throw error_4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
// ============================================================================
// HTTP TRACE CLASS
// ============================================================================
/**
 * HTTP Request/Response Trace
 *
 * Measures HTTP request performance with additional metrics
 */
var HttpTrace = /** @class */ (function (_super) {
    __extends(HttpTrace, _super);
    function HttpTrace(url, method) {
        var _this = _super.call(this, "http_".concat(method, "_").concat(url), {
            attributes: {
                url: url,
                method: method,
            },
        }) || this;
        _this.requestSize = 0;
        _this.responseSize = 0;
        _this.statusCode = 0;
        return _this;
    }
    /**
     * Set request size in bytes
     */
    HttpTrace.prototype.setRequestSize = function (size) {
        this.requestSize = size;
        this.putMetric('request_size', size);
    };
    /**
     * Set response size in bytes
     */
    HttpTrace.prototype.setResponseSize = function (size) {
        this.responseSize = size;
        this.putMetric('response_size', size);
    };
    /**
     * Set HTTP status code
     */
    HttpTrace.prototype.setStatusCode = function (code) {
        this.statusCode = code;
        this.putAttribute('status_code', String(code));
    };
    /**
     * Check if the request was successful
     */
    HttpTrace.prototype.isSuccessful = function () {
        return this.statusCode >= 200 && this.statusCode < 300;
    };
    /**
     * Stop the HTTP trace
     */
    HttpTrace.prototype.stop = function () {
        this.putMetric('request_size', this.requestSize);
        this.putMetric('response_size', this.responseSize);
        return _super.prototype.stop.call(this);
    };
    return HttpTrace;
}(FirebasePerformanceTrace));
exports.HttpTrace = HttpTrace;
/**
 * Start a new HTTP trace
 *
 * @param url - Request URL
 * @param method - HTTP method
 * @returns HttpTrace instance
 */
function startHttpTrace(url, method) {
    return new HttpTrace(url, method);
}
// ============================================================================
// PERFORMANCE MONITORING MIDDLEWARE
// ============================================================================
/**
 * Create a performance monitoring middleware
 *
 * Wraps a function with automatic performance tracing
 */
function withPerformanceTracing(name, fn) {
    return (function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var trace = startTrace(name);
        try {
            var result = fn.apply(void 0, args);
            // Handle both sync and async
            if (result instanceof Promise) {
                return result
                    .then(function (value) {
                    trace.stop();
                    return value;
                })
                    .catch(function (error) {
                    trace.stop();
                    throw error;
                });
            }
            trace.stop();
            return result;
        }
        catch (error) {
            trace.stop();
            throw error;
        }
    });
}
/**
 * Check if Performance Monitoring is enabled
 */
function isPerformanceEnabled() {
    return PERFORMANCE_ENABLED;
}
// ============================================================================
// PERFORMANCE COUNTERS
// ============================================================================
/**
 * Simple counter for tracking occurrences
 */
var PerformanceCounter = /** @class */ (function () {
    function PerformanceCounter(name) {
        this.count = 0;
        this.name = name;
    }
    /**
     * Increment the counter
     */
    PerformanceCounter.prototype.increment = function (amount) {
        if (amount === void 0) { amount = 1; }
        this.count += amount;
    };
    /**
     * Reset the counter
     */
    PerformanceCounter.prototype.reset = function () {
        this.count = 0;
    };
    /**
     * Get the current count
     */
    PerformanceCounter.prototype.getCount = function () {
        return this.count;
    };
    /**
     * Create a trace from this counter
     */
    PerformanceCounter.prototype.toTrace = function () {
        var trace = new FirebasePerformanceTrace("counter_".concat(this.name));
        trace.putMetric('count', this.count);
        return trace;
    };
    return PerformanceCounter;
}());
exports.PerformanceCounter = PerformanceCounter;
/**
 * Create a new performance counter
 */
function createCounter(name) {
    return new PerformanceCounter(name);
}
