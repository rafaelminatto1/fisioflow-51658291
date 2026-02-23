"use strict";
/**
 * Sentry Error Handler Middleware
 * Wrapper for Cloud Functions to capture errors in Sentry
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
exports.withSentryErrorHandler = withSentryErrorHandler;
exports.onCallWithSentry = onCallWithSentry;
exports.createSentryWrapper = createSentryWrapper;
exports.SentryCapture = SentryCapture;
var https_1 = require("firebase-functions/v2/https");
var sentry_1 = require("../lib/sentry");
var logger_1 = require("../lib/logger");
var logger = (0, logger_1.getLogger)('sentry-middleware');
/**
 * Wraps an onCall handler with Sentry error tracking
 *
 * @param handler - The function handler to wrap
 * @param options - Sentry wrapper options
 * @returns Wrapped handler
 */
function withSentryErrorHandler(handler, options) {
    var _this = this;
    return function (data, auth) { return __awaiter(_this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(0, sentry_1.isSentryConfigured)()) {
                        return [2 /*return*/, handler(data, auth)];
                    }
                    logger.debug('Sentry error handler active', {
                        function: options.functionName,
                        operation: options.operation,
                    });
                    // Set user context
                    if (auth) {
                        (0, sentry_1.setSentryUser)(auth);
                    }
                    // Set function context
                    (0, sentry_1.setSentryContext)('cloud_function', {
                        name: options.functionName,
                        operation: options.operation,
                    });
                    // Set environment tags
                    (0, sentry_1.setSentryTags)({
                        function_name: options.functionName,
                        region: process.env.FUNCTION_REGION || 'unknown',
                        memory: process.env.FUNCTION_MEMORY_MB || 'unknown',
                    });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, handler(data, auth)];
                case 2: return [2 /*return*/, _a.sent()];
                case 3:
                    error_1 = _a.sent();
                    // Check if we should skip this error type
                    if (error_1 instanceof https_1.HttpsError) {
                        if ((error_1.code === 'unauthenticated' && !options.captureAuthErrors) ||
                            (error_1.code === 'invalid-argument' && !options.captureValidationErrors) ||
                            (error_1.code === 'not-found' && !options.captureNotFoundErrors)) {
                            logger.debug('Skipping Sentry capture for expected error', {
                                code: error_1.code,
                            });
                            (0, sentry_1.clearSentryUser)();
                            throw error_1;
                        }
                    }
                    // Capture exception
                    (0, sentry_1.captureSentryException)(error_1, {
                        user: auth,
                        tags: {
                            function: options.functionName,
                            operation: options.operation || 'unknown',
                        },
                        extra: {
                            requestData: data,
                        },
                    });
                    throw error_1;
                case 4:
                    (0, sentry_1.clearSentryUser)();
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
}
/**
 * Creates a wrapped onCall function with Sentry
 *
 * @param functionName - Name of the function
 * @param handler - The function handler
 * @param options - Optional onCall options
 * @returns Wrapped onCall function
 */
function onCallWithSentry(functionName, handler, options) {
    var _this = this;
    return (0, https_1.onCall)(options, function (request) { return __awaiter(_this, void 0, void 0, function () {
        var wrappedHandler, auth, authContext;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            wrappedHandler = withSentryErrorHandler(handler, {
                functionName: functionName,
            });
            auth = request.auth;
            authContext = auth
                ? {
                    userId: auth.uid || ((_a = auth.token) === null || _a === void 0 ? void 0 : _a.user_id),
                    organizationId: (_b = auth.token) === null || _b === void 0 ? void 0 : _b.organization_id,
                    role: (_c = auth.token) === null || _c === void 0 ? void 0 : _c.role,
                    email: (_d = auth.token) === null || _d === void 0 ? void 0 : _d.email,
                    profileId: (_e = auth.token) === null || _e === void 0 ? void 0 : _e.profile_id,
                }
                : undefined;
            return [2 /*return*/, wrappedHandler(request.data, authContext)];
        });
    }); });
}
/**
 * Higher-order function for Sentry-wrapped handlers
 * Use this to wrap your existing handlers
 *
 * @param functionName - Name of the function for Sentry
 * @returns A function that accepts and wraps a handler
 */
function createSentryWrapper(functionName) {
    return function (handler) {
        return (0, sentry_1.withSentryTracking)(handler, {
            functionName: functionName,
            getAuth: function (data) {
                // Auth will be set by the actual function call
                return undefined;
            },
        });
    };
}
/**
 * Decorator for class methods (if using classes)
 * Note: TypeScript experimental decorators required
 */
function SentryCapture(functionName) {
    return function (target, propertyKey, descriptor) {
        var originalMethod = descriptor.value;
        descriptor.value = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return __awaiter(this, void 0, void 0, function () {
                var error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(0, sentry_1.isSentryConfigured)()) {
                                return [2 /*return*/, originalMethod.apply(this, args)];
                            }
                            (0, sentry_1.setSentryTags)({
                                class: target.constructor.name,
                                method: propertyKey,
                            });
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, originalMethod.apply(this, args)];
                        case 2: return [2 /*return*/, _a.sent()];
                        case 3:
                            error_2 = _a.sent();
                            (0, sentry_1.captureSentryException)(error_2, {
                                tags: {
                                    class: target.constructor.name,
                                    method: propertyKey,
                                },
                                extra: {
                                    args: JSON.stringify(args),
                                },
                            });
                            throw error_2;
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        return descriptor;
    };
}
