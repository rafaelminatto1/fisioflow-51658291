"use strict";
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
exports.handleApiError = handleApiError;
exports.withErrorHandling = withErrorHandling;
var https_1 = require("firebase-functions/v2/https");
var logger_1 = require("./logger");
var cors_1 = require("./cors");
/**
 * Maps Firebase HttpsError codes to HTTP status codes
 */
var ERROR_CODE_MAP = {
    'ok': 200,
    'cancelled': 499,
    'unknown': 500,
    'invalid-argument': 400,
    'deadline-exceeded': 504,
    'not-found': 404,
    'already-exists': 409,
    'permission-denied': 403,
    'resource-exhausted': 429,
    'failed-precondition': 400,
    'aborted': 409,
    'out-of-range': 400,
    'unimplemented': 501,
    'internal': 500,
    'unavailable': 503,
    'data-loss': 500,
    'unauthenticated': 401
};
/**
 * Centralized error handler for HTTP functions
 * Logs the error appropriately and sends a standardized JSON response
 */
function handleApiError(error, req, res, context) {
    if (context === void 0) { context = 'ApiError'; }
    // Ensure CORS headers are set (crucial for frontend error handling)
    (0, cors_1.setCorsHeaders)(res, req);
    // Determine error details
    var statusCode = 500;
    var errorCode = 'internal';
    var errorMessage = 'An internal error occurred';
    var errorDetails = undefined;
    if (error instanceof https_1.HttpsError) {
        statusCode = ERROR_CODE_MAP[error.code] || 500;
        errorCode = error.code;
        errorMessage = error.message;
        errorDetails = error.details;
        // Log as warning for expected client errors, error for server errors
        if (statusCode >= 400 && statusCode < 500) {
            logger_1.logger.warn("".concat(context, ": ").concat(error.code, " - ").concat(error.message), { details: error.details });
        }
        else {
            logger_1.logger.error("".concat(context, ": ").concat(error.code, " - ").concat(error.message), error);
        }
    }
    else if (error instanceof Error) {
        errorMessage = error.message;
        // Log generic errors as errors
        logger_1.logger.error("".concat(context, ": ").concat(error.message), error);
    }
    else {
        errorMessage = String(error);
        logger_1.logger.error("".concat(context, ": Unknown error"), { error: error });
    }
    // Send JSON response
    var response = {
        error: {
            code: errorCode,
            message: errorMessage,
            details: errorDetails
        }
    };
    // Only send response if headers haven't been sent yet
    if (!res.headersSent) {
        res.status(statusCode).json(response);
    }
}
/**
 * Higher-order function to wrap HTTP handlers with error handling and CORS
 */
function withErrorHandling(handler, contextName) {
    var _this = this;
    return function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Ensure CORS headers are set for ALL requests (success or error)
                    (0, cors_1.setCorsHeaders)(res, req);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    // Handle preflight requests automatically
                    if (req.method === 'OPTIONS') {
                        res.status(204).send('');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, handler(req, res)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    handleApiError(error_1, req, res, contextName || 'FunctionHandler');
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
}
