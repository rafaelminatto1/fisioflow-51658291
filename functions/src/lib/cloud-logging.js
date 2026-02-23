"use strict";
/**
 * Cloud Logging Integration
 *
 * Integrates with Google Cloud Logging for centralized log management
 *
 * @module lib/cloud-logging
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
exports.CloudLoggingSink = void 0;
exports.getLoggingClient = getLoggingClient;
exports.writeLog = writeLog;
exports.writeLogBatch = writeLogBatch;
exports.createCloudLoggingSink = createCloudLoggingSink;
exports.extractTraceId = extractTraceId;
exports.isCloudLoggingEnabled = isCloudLoggingEnabled;
var logging_1 = require("@google-cloud/logging");
var logger_1 = require("./logger");
var logger = (0, logger_1.getLogger)('cloud-logging');
// ============================================================================
// SINGLETON CLIENT
// ============================================================================
var loggingClient = null;
var PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'fisioflow-migration';
/**
 * Get or create Cloud Logging client (singleton)
 */
function getLoggingClient() {
    if (!loggingClient) {
        loggingClient = new logging_1.Logging({
            projectId: PROJECT_ID,
        });
        logger.info('Cloud Logging client initialized', { projectId: PROJECT_ID });
    }
    return loggingClient;
}
// ============================================================================
// LOG ENTRY CREATION
// ============================================================================
/**
 * Map our LogLevel to Cloud Logging severity
 */
function mapSeverity(level) {
    var _a;
    var severityMap = (_a = {},
        _a[logger_1.LogLevel.DEBUG] = 'DEBUG',
        _a[logger_1.LogLevel.INFO] = 'INFO',
        _a[logger_1.LogLevel.WARN] = 'WARNING',
        _a[logger_1.LogLevel.ERROR] = 'ERROR',
        _a[logger_1.LogLevel.CRITICAL] = 'CRITICAL',
        _a);
    return severityMap[level] || 'DEFAULT';
}
/**
 * Write a structured log entry to Cloud Logging
 */
function writeLog(options) {
    return __awaiter(this, void 0, void 0, function () {
        var client, log, labels, metadata, logEntry, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    client = getLoggingClient();
                    log = client.log('functions');
                    labels = __assign({ function_name: process.env.FUNCTION_NAME || 'unknown', region: process.env.FUNCTION_REGION || 'southamerica-east1' }, options.labels);
                    if (process.env.FUNCTION_INVOCATION_ID) {
                        labels.invocation_id = process.env.FUNCTION_INVOCATION_ID;
                    }
                    metadata = {
                        severity: options.severity,
                        labels: labels,
                        trace: options.traceId
                            ? "projects/".concat(PROJECT_ID, "/traces/").concat(options.traceId)
                            : undefined,
                        spanId: options.spanId,
                    };
                    logEntry = log.entry(metadata, __assign({ message: options.message, timestamp: new Date().toISOString() }, options.jsonPayload));
                    // Write the log entry
                    return [4 /*yield*/, log.write(logEntry)];
                case 1:
                    // Write the log entry
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    // Fallback to console.log if Cloud Logging fails
                    console.error("[CloudLogging] Failed to write log:", error_1);
                    console.log(JSON.stringify(options));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Write multiple log entries in batch
 */
function writeLogBatch(entries) {
    return __awaiter(this, void 0, void 0, function () {
        var client, log_1, logEntries, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    client = getLoggingClient();
                    log_1 = client.log('functions');
                    logEntries = entries.map(function (entry) {
                        var entryLabels = __assign({ function_name: process.env.FUNCTION_NAME || 'unknown', region: process.env.FUNCTION_REGION || 'southamerica-east1' }, entry.labels);
                        if (process.env.FUNCTION_INVOCATION_ID) {
                            entryLabels.invocation_id = process.env.FUNCTION_INVOCATION_ID;
                        }
                        var metadata = {
                            severity: entry.severity,
                            labels: entryLabels,
                            trace: entry.traceId
                                ? "projects/".concat(PROJECT_ID, "/traces/").concat(entry.traceId)
                                : undefined,
                            spanId: entry.spanId,
                        };
                        return log_1.entry(metadata, __assign({ message: entry.message, timestamp: new Date().toISOString() }, entry.jsonPayload));
                    });
                    return [4 /*yield*/, log_1.write(logEntries)];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    console.error("[CloudLogging] Failed to write batch:", error_2);
                    entries.forEach(function (entry) { return console.log(JSON.stringify(entry)); });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// ============================================================================
// CLOUD LOGGING SINK FOR STRUCTURED LOGGER
// ============================================================================
/**
 * Create a Cloud Logging sink that can be used with StructuredLogger
 */
var CloudLoggingSink = /** @class */ (function () {
    function CloudLoggingSink(labels) {
        this.labels = __assign({}, labels);
    }
    /**
     * Write a log entry with the specified level
     */
    CloudLoggingSink.prototype.write = function (level, message, context) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, writeLog({
                            severity: mapSeverity(level),
                            message: message,
                            labels: this.labels,
                            jsonPayload: context,
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set additional labels
     */
    CloudLoggingSink.prototype.setLabels = function (labels) {
        Object.assign(this.labels, labels);
    };
    /**
     * Clear all labels
     */
    CloudLoggingSink.prototype.clearLabels = function () {
        var _this = this;
        Object.keys(this.labels).forEach(function (key) {
            delete _this.labels[key];
        });
    };
    return CloudLoggingSink;
}());
exports.CloudLoggingSink = CloudLoggingSink;
/**
 * Create a new CloudLoggingSink with the specified labels
 */
function createCloudLoggingSink(labels) {
    return new CloudLoggingSink(labels);
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Extract trace ID from incoming request headers
 */
function extractTraceId(headers) {
    if (!headers)
        return undefined;
    // Check for X-Cloud-Trace-Context header (format: TRACE_ID/SPAN_ID;o=OPTIONS)
    var traceContext = headers['x-cloud-trace-context'];
    if (typeof traceContext === 'string') {
        return traceContext.split('/')[0];
    }
    // Check for traceparent header (W3C format)
    var traceParent = headers['traceparent'];
    if (typeof traceParent === 'string') {
        // Format: 00-TRACE_ID-PARENT_ID-TRACE_FLAGS
        var parts = traceParent.split('-');
        if (parts.length >= 2) {
            return parts[1];
        }
    }
    return undefined;
}
/**
 * Check if Cloud Logging should be enabled
 */
function isCloudLoggingEnabled() {
    // Enable in production by default, can be disabled via env var
    if (process.env.CLOUD_LOGGING_ENABLED === 'false') {
        return false;
    }
    return process.env.NODE_ENV === 'production' || process.env.FUNCTIONS_EMULATOR !== 'true';
}
