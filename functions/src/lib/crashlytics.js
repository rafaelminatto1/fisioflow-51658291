"use strict";
/**
 * Firebase Crashlytics Integration (stub for Cloud Functions)
 *
 * Crashlytics is primarily for mobile apps. In Cloud Functions we log locally.
 * Install @firebase/crashlytics in functions/package.json if runtime integration is needed.
 *
 * @module lib/crashlytics
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
exports.CrashlyticsLogger = void 0;
exports.initCrashlytics = initCrashlytics;
exports.isCrashlyticsEnabled = isCrashlyticsEnabled;
exports.recordError = recordError;
exports.recordException = recordException;
exports.setUserId = setUserId;
exports.clearUserId = clearUserId;
exports.setCustomKeys = setCustomKeys;
exports.setCustomKey = setCustomKey;
exports.log = log;
exports.logMessages = logMessages;
exports.createCrashlyticsLogger = createCrashlyticsLogger;
exports.withCrashlyticsErrorRecording = withCrashlyticsErrorRecording;
exports.withCrashlyticsAsync = withCrashlyticsAsync;
var logger_1 = require("./logger");
var logger = (0, logger_1.getLogger)('crashlytics');
// ============================================================================
// CONFIGURATION
// ============================================================================
var CRASHLYTICS_ENABLED = process.env.CRASHLYTICS_ENABLED === 'true';
// ============================================================================
// INITIALIZATION
// ============================================================================
var initialized = false;
function initCrashlytics() {
    if (initialized)
        return;
    if (!CRASHLYTICS_ENABLED) {
        logger.info('Crashlytics disabled via CRASHLYTICS_ENABLED');
    }
    initialized = true;
}
function isCrashlyticsEnabled() {
    return CRASHLYTICS_ENABLED;
}
// ============================================================================
// ERROR RECORDING (log only - no @firebase/crashlytics in functions)
// ============================================================================
function recordError(error, context) {
    return __awaiter(this, void 0, void 0, function () {
        var message;
        return __generator(this, function (_a) {
            message = typeof error === 'string' ? error : error.message;
            logger.error("[Crashlytics] ".concat(message), __assign({ stack: error.stack }, context));
            return [2 /*return*/];
        });
    });
}
function recordException(name, message, stack, context) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            logger.error("[Crashlytics] ".concat(name, ": ").concat(message), __assign({ stack: stack }, context));
            return [2 /*return*/];
        });
    });
}
function setUserId(userId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            logger.debug("Crashlytics user ID set: ".concat(userId));
            return [2 /*return*/];
        });
    });
}
function clearUserId() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            logger.debug('Crashlytics user ID cleared');
            return [2 /*return*/];
        });
    });
}
function setCustomKeys(keys) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            logger.debug("Crashlytics custom keys: ".concat(Object.keys(keys).join(', ')));
            return [2 /*return*/];
        });
    });
}
function setCustomKey(key, value) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            logger.debug("Crashlytics custom key: ".concat(key));
            return [2 /*return*/];
        });
    });
}
function log(message) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            logger.info("[Crashlytics] ".concat(message));
            return [2 /*return*/];
        });
    });
}
function logMessages() {
    var messages = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        messages[_i] = arguments[_i];
    }
    return __awaiter(this, void 0, void 0, function () {
        var _a, messages_1, m;
        return __generator(this, function (_b) {
            for (_a = 0, messages_1 = messages; _a < messages_1.length; _a++) {
                m = messages_1[_a];
                logger.info("[Crashlytics] ".concat(m));
            }
            return [2 /*return*/];
        });
    });
}
// ============================================================================
// CRASHLYTICS LOGGER
// ============================================================================
var CrashlyticsLogger = /** @class */ (function () {
    function CrashlyticsLogger(context) {
        this.context = context;
    }
    CrashlyticsLogger.prototype.error = function (error, additionalContext) {
        return __awaiter(this, void 0, void 0, function () {
            var merged;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        merged = __assign(__assign({}, this.context), additionalContext);
                        if (typeof error === 'string') {
                            logger.error(error, merged);
                        }
                        else {
                            logger.error(error.message, __assign({ stack: error.stack }, merged));
                        }
                        return [4 /*yield*/, recordError(error, merged)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    CrashlyticsLogger.prototype.withContext = function (context) {
        return new CrashlyticsLogger(__assign(__assign({}, this.context), context));
    };
    CrashlyticsLogger.prototype.setUserId = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                logger.debug("Crashlytics user ID set: ".concat(userId));
                return [2 /*return*/, this.withContext({ userId: userId })];
            });
        });
    };
    return CrashlyticsLogger;
}());
exports.CrashlyticsLogger = CrashlyticsLogger;
function createCrashlyticsLogger(context) {
    return new CrashlyticsLogger(context);
}
function withCrashlyticsErrorRecording(fn, context) {
    var _this = this;
    return (function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return __awaiter(_this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        return [4 /*yield*/, fn.apply(void 0, args)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_1 = _a.sent();
                        return [4 /*yield*/, recordError(error_1, context)];
                    case 3:
                        _a.sent();
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    });
}
function withCrashlyticsAsync(fn, context) {
    var _this = this;
    return (function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return __awaiter(_this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        return [4 /*yield*/, fn.apply(void 0, args)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_2 = _a.sent();
                        return [4 /*yield*/, recordError(error_2, context)];
                    case 3:
                        _a.sent();
                        throw error_2;
                    case 4: return [2 /*return*/];
                }
            });
        });
    });
}
