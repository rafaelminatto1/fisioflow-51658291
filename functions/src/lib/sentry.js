"use strict";
/**
 * Sentry Backend Integration
 * Error tracking for Cloud Functions backend
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
exports.isSentryConfigured = isSentryConfigured;
exports.initSentry = initSentry;
exports.setSentryUser = setSentryUser;
exports.clearSentryUser = clearSentryUser;
exports.setSentryTags = setSentryTags;
exports.setSentryContext = setSentryContext;
exports.captureSentryException = captureSentryException;
exports.captureSentryMessage = captureSentryMessage;
exports.httpsErrorToSentry = httpsErrorToSentry;
exports.withSentryTracking = withSentryTracking;
exports.flushSentry = flushSentry;
var Sentry = require("@sentry/node");
var https_1 = require("firebase-functions/v2/https");
var logger_1 = require("./logger");
var logger = (0, logger_1.getLogger)('sentry');
/**
 * Current Sentry configuration
 */
var sentryConfig = null;
var sentryInitialized = false;
/**
 * Checks if Sentry is configured
 */
function isSentryConfigured() {
    return !!process.env.SENTRY_DSN && sentryInitialized;
}
/**
 * Initializes Sentry for error tracking
 */
function initSentry(config) {
    var dsn = (config === null || config === void 0 ? void 0 : config.dsn) || process.env.SENTRY_DSN;
    if (!dsn) {
        logger.warn('Sentry DSN not configured, error tracking disabled');
        return;
    }
    sentryConfig = {
        dsn: dsn,
        environment: (config === null || config === void 0 ? void 0 : config.environment) || process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
        release: (config === null || config === void 0 ? void 0 : config.release) || process.env.SENTRY_RELEASE,
        tracesSampleRate: (config === null || config === void 0 ? void 0 : config.tracesSampleRate) || 0.1,
        profilesSampleRate: (config === null || config === void 0 ? void 0 : config.profilesSampleRate) || 0.1,
    };
    logger.info('Initializing Sentry', {
        dsn: maskDsn(dsn),
        environment: sentryConfig.environment,
        release: sentryConfig.release,
    });
    Sentry.init({
        dsn: sentryConfig.dsn,
        environment: sentryConfig.environment,
        release: sentryConfig.release,
        tracesSampleRate: sentryConfig.tracesSampleRate,
        profilesSampleRate: sentryConfig.profilesSampleRate,
        // Filter out known errors
        beforeSend: function (event, hint) {
            return filterErrorEvent(event, hint);
        },
        // Set context tags
        initialScope: {
            tags: {
                platform: 'cloud-functions',
                runtime: 'nodejs',
            },
        },
    });
    sentryInitialized = true;
    logger.info('Sentry initialized successfully');
}
/**
 * Masks DSN for logging (hides the secret part)
 */
function maskDsn(dsn) {
    if (!dsn)
        return 'not-configured';
    try {
        var url = new URL(dsn);
        var publicKey = url.username;
        var host = url.host;
        return "https://".concat(publicKey, "@").concat(host);
    }
    catch (_a) {
        return dsn.substring(0, 20) + '...';
    }
}
/**
 * Sets user context for Sentry
 */
function setSentryUser(auth) {
    if (!isSentryConfigured())
        return;
    logger.debug('Setting Sentry user context', {
        userId: auth.userId,
        organizationId: auth.organizationId,
        role: auth.role,
    });
    Sentry.setUser({
        id: auth.userId,
        email: auth.email,
        segment: auth.role,
        // Custom data
        organizationId: auth.organizationId,
        profileId: auth.profileId,
    });
}
/**
 * Clears user context
 */
function clearSentryUser() {
    if (!isSentryConfigured())
        return;
    logger.debug('Clearing Sentry user context');
    Sentry.setUser(null);
}
/**
 * Sets custom tags for the current scope
 */
function setSentryTags(tags) {
    if (!isSentryConfigured())
        return;
    logger.debug('Setting Sentry tags', tags);
    Sentry.setTags(tags);
}
/**
 * Sets custom context (extra data)
 */
function setSentryContext(key, context) {
    if (!isSentryConfigured())
        return;
    logger.debug("Setting Sentry context: ".concat(key));
    Sentry.setContext(key, context);
}
/**
 * Captures an exception in Sentry
 */
function captureSentryException(error, context) {
    if (!isSentryConfigured()) {
        logger.debug('Sentry not configured, would capture exception', {
            error: error.message,
            context: context,
        });
        return undefined;
    }
    logger.info('Capturing exception in Sentry', {
        error: error.message,
        errorName: error.name,
        context: context,
    });
    // Set user if provided
    if (context === null || context === void 0 ? void 0 : context.user) {
        setSentryUser(context.user);
    }
    // Set tags
    if (context === null || context === void 0 ? void 0 : context.tags) {
        setSentryTags(context.tags);
    }
    // Set extra context
    if (context === null || context === void 0 ? void 0 : context.extra) {
        setSentryContext('error_context', context.extra);
    }
    // Capture the exception
    return Sentry.captureException(error);
}
/**
 * Captures a message in Sentry
 */
function captureSentryMessage(message, level) {
    if (level === void 0) { level = 'info'; }
    if (!isSentryConfigured()) {
        logger.debug('Sentry not configured, would capture message', { message: message });
        return undefined;
    }
    logger.info("Capturing message in Sentry (".concat(level, ")"), { message: message });
    return Sentry.captureMessage(message, level);
}
/**
 * Filters error events before sending to Sentry
 */
function filterErrorEvent(event, hint) {
    // Skip known errors that don't need tracking
    var _a, _b, _c, _d, _e;
    // Skip unauthenticated errors (expected behavior)
    if (((_a = event.tags) === null || _a === void 0 ? void 0 : _a['firebase.error.code']) === 'unauthenticated') {
        logger.debug('Skipping unauthenticated error in Sentry');
        return null;
    }
    // Skip permission denied errors (expected behavior)
    if (((_b = event.tags) === null || _b === void 0 ? void 0 : _b['firebase.error.code']) === 'permission-denied') {
        logger.debug('Skipping permission-denied error in Sentry');
        return null;
    }
    // Skip validation errors
    if (((_c = event.tags) === null || _c === void 0 ? void 0 : _c['firebase.error.code']) === 'invalid-argument') {
        logger.debug('Skipping validation error in Sentry');
        return null;
    }
    // Skip not-found errors
    if (((_d = event.tags) === null || _d === void 0 ? void 0 : _d['firebase.error.code']) === 'not-found') {
        logger.debug('Skipping not-found error in Sentry');
        return null;
    }
    // Skip already-exists errors (duplicate key violations)
    if (((_e = event.tags) === null || _e === void 0 ? void 0 : _e['firebase.error.code']) === 'already-exists') {
        logger.debug('Skipping already-exists error in Sentry');
        return null;
    }
    return event;
}
/**
 * Converts HttpsError to Sentry exception
 */
function httpsErrorToSentry(error) {
    var sentryError = new Error(error.message);
    sentryError.name = "HttpsError[".concat(error.code, "]");
    sentryError.code = error.code;
    sentryError.details = error.details;
    // Add stack trace if available
    if (error.stack) {
        sentryError.stack = error.stack;
    }
    return sentryError;
}
/**
 * Wraps a function with Sentry error tracking
 */
function withSentryTracking(fn, context) {
    var _this = this;
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return __awaiter(_this, void 0, void 0, function () {
            var auth, error_1, sentryError;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!isSentryConfigured()) {
                            return [2 /*return*/, fn.apply(void 0, args)];
                        }
                        auth = (_a = context === null || context === void 0 ? void 0 : context.getAuth) === null || _a === void 0 ? void 0 : _a.call.apply(_a, __spreadArray([context], args, false));
                        // Set user context if available
                        if (auth) {
                            setSentryUser(auth);
                        }
                        // Set function context
                        if (context === null || context === void 0 ? void 0 : context.functionName) {
                            setSentryContext('cloud_function', {
                                name: context.functionName,
                                operation: context === null || context === void 0 ? void 0 : context.operation,
                            });
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, fn.apply(void 0, args)];
                    case 2: return [2 /*return*/, _b.sent()];
                    case 3:
                        error_1 = _b.sent();
                        sentryError = error_1 instanceof https_1.HttpsError
                            ? httpsErrorToSentry(error_1)
                            : error_1 instanceof Error
                                ? error_1
                                : new Error(String(error_1));
                        // Capture exception
                        captureSentryException(sentryError, {
                            user: auth,
                            tags: {
                                function: (context === null || context === void 0 ? void 0 : context.functionName) || 'unknown',
                                operation: (context === null || context === void 0 ? void 0 : context.operation) || 'unknown',
                            },
                            extra: {
                                args: JSON.stringify(args),
                            },
                        });
                        throw error_1;
                    case 4:
                        // Clear user context
                        clearSentryUser();
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
}
/**
 * Flushes pending Sentry events
 */
function flushSentry() {
    return __awaiter(this, arguments, void 0, function (timeout) {
        if (timeout === void 0) { timeout = 2000; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!isSentryConfigured()) {
                        return [2 /*return*/];
                    }
                    logger.debug('Flushing Sentry events');
                    return [4 /*yield*/, Sentry.flush(timeout)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// Initialize Sentry on module load
try {
    initSentry();
}
catch (error) {
    logger.error('Failed to initialize Sentry', { error: error });
}
