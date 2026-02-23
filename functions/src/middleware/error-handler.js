"use strict";
/**
 * Centralized Error Handler Middleware
 * Provides structured error handling with logging and context
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
exports.ErrorCategory = void 0;
exports.createError = createError;
exports.handleError = handleError;
exports.withErrorHandling = withErrorHandling;
exports.validateRequiredFields = validateRequiredFields;
exports.validateAllowedValues = validateAllowedValues;
exports.withDatabaseErrorHandling = withDatabaseErrorHandling;
/**
 * Error categories for classification
 */
var https_1 = require("firebase-functions/v2/https");
var logger_1 = require("../lib/logger");
var audit_log_1 = require("./audit-log");
var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["AUTHENTICATION"] = "authentication";
    ErrorCategory["AUTHORIZATION"] = "authorization";
    ErrorCategory["VALIDATION"] = "validation";
    ErrorCategory["NOT_FOUND"] = "not_found";
    ErrorCategory["DATABASE"] = "database";
    ErrorCategory["BUSINESS_LOGIC"] = "business_logic";
    ErrorCategory["EXTERNAL_SERVICE"] = "external_service";
    ErrorCategory["INTERNAL"] = "internal";
})(ErrorCategory || (exports.ErrorCategory = ErrorCategory = {}));
/**
 * Creates a classified error
 */
function createError(category, message, context, originalError) {
    var error = new Error(message);
    error.category = category;
    error.context = context;
    error.originalError = originalError;
    if (originalError) {
        error.stack = originalError.stack;
    }
    return error;
}
/**
 * Handles errors with structured logging and converts to HttpsError
 *
 * @param error - The error to handle
 * @param functionName - Name of the function where error occurred
 * @param auth - Auth context if available
 * @param requestData - Request data for context
 * @returns HttpsError to throw
 */
function handleError(error, functionName, auth, requestData) {
    var logger = (0, logger_1.getLogger)(functionName);
    var logContext = {
        functionName: functionName,
        userId: auth === null || auth === void 0 ? void 0 : auth.userId,
        organizationId: auth === null || auth === void 0 ? void 0 : auth.organizationId,
    };
    // Already an HttpsError - just log and rethrow
    if (error instanceof https_1.HttpsError) {
        logger.error('HttpsError thrown', __assign(__assign({}, logContext), { code: error.code, message: error.message, requestData: requestData }));
        // Log audit for permission errors
        if (error.code === 'permission-denied' && auth) {
            (0, audit_log_1.logAudit)({
                action: audit_log_1.AuditAction.PERMISSION_CHANGE,
                category: audit_log_1.AuditCategory.USER,
                user_id: auth.userId,
                user_name: auth.email,
                user_email: auth.email,
                organization_id: auth.organizationId,
                details: {
                    function: functionName,
                    reason: error.message,
                },
                success: false,
                error_message: error.message,
            }).catch(function () { });
        }
        return error;
    }
    // Classified error
    if (isClassifiedError(error)) {
        return handleClassifiedError(error, logger, logContext, requestData);
    }
    // Database errors
    if (isDatabaseError(error)) {
        return handleDatabaseError(error, logger, logContext, requestData);
    }
    // Generic Error
    return handleGenericError(error, logger, logContext, requestData);
}
/**
 * Checks if error is a ClassifiedError
 */
function isClassifiedError(error) {
    return (error instanceof Error &&
        'category' in error &&
        typeof error.category === 'string');
}
/**
 * Checks if error is a database error
 */
function isDatabaseError(error) {
    if (!(error instanceof Error))
        return false;
    var errorMsg = error.message.toLowerCase();
    var errorName = error.constructor.name.toLowerCase();
    return (errorMsg.includes('database') ||
        errorMsg.includes('connection') ||
        errorMsg.includes('query') ||
        errorMsg.includes('constraint') ||
        errorMsg.includes('duplicate') ||
        errorMsg.includes('foreign key') ||
        errorName.includes('postgres') ||
        errorName.includes('database') ||
        'code' in error);
}
/**
 * Handles classified errors
 */
function handleClassifiedError(error, logger, logContext, requestData) {
    var _a;
    var category = error.category, message = error.message, context = error.context, originalError = error.originalError;
    logger.error('Classified error', __assign(__assign({}, logContext), { category: category, message: message, errorContext: context, originalError: originalError === null || originalError === void 0 ? void 0 : originalError.message, requestData: requestData }));
    // Map category to HttpsError code
    var codeMap = (_a = {},
        _a[ErrorCategory.AUTHENTICATION] = 'unauthenticated',
        _a[ErrorCategory.AUTHORIZATION] = 'permission-denied',
        _a[ErrorCategory.VALIDATION] = 'invalid-argument',
        _a[ErrorCategory.NOT_FOUND] = 'not-found',
        _a[ErrorCategory.DATABASE] = 'internal',
        _a[ErrorCategory.BUSINESS_LOGIC] = 'invalid-argument',
        _a[ErrorCategory.EXTERNAL_SERVICE] = 'internal',
        _a[ErrorCategory.INTERNAL] = 'internal',
        _a);
    return new https_1.HttpsError(codeMap[category] || 'internal', message, __assign({ category: category }, context));
}
/**
 * Handles database errors
 */
function handleDatabaseError(error, logger, logContext, requestData) {
    var message = error.message.toLowerCase();
    logger.error('Database error', __assign(__assign({}, logContext), { errorMessage: error.message, errorName: error.name, errorCode: error.code, stack: error.stack, requestData: requestData }));
    // Check for specific database error codes
    var code = error.code;
    // PostgreSQL error codes
    if (code === '23505') {
        // Unique violation
        return new https_1.HttpsError('already-exists', 'Registro já existe', { originalMessage: error.message });
    }
    if (code === '23503') {
        // Foreign key violation
        return new https_1.HttpsError('failed-precondition', 'Registro dependente não encontrado', { originalMessage: error.message });
    }
    if (code === '23502') {
        // Not null violation
        return new https_1.HttpsError('invalid-argument', 'Campo obrigatório não fornecido', { originalMessage: error.message });
    }
    if (message.includes('connection') || message.includes('connect')) {
        return new https_1.HttpsError('internal', 'Erro de conexão com o banco de dados', { originalMessage: error.message });
    }
    return new https_1.HttpsError('internal', 'Erro ao executar operação no banco de dados', { originalMessage: error.message });
}
/**
 * Handles generic errors
 */
function handleGenericError(error, logger, logContext, requestData) {
    logger.error('Unhandled error', __assign(__assign({}, logContext), { errorMessage: error.message, errorName: error.name, stack: error.stack, requestData: requestData }));
    return new https_1.HttpsError('internal', error.message || 'Erro interno do servidor', { name: error.name });
}
/**
 * Wrapper for async handlers with automatic error handling
 *
 * @param handler - The async function to wrap
 * @param functionName - Name of the function for logging
 * @returns Wrapped function with error handling
 */
function withErrorHandling(handler, functionName) {
    var _this = this;
    return function (data, auth) { return __awaiter(_this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, handler(data, auth)];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_1 = _a.sent();
                    throw handleError(error_1, functionName, auth, data);
                case 3: return [2 /*return*/];
            }
        });
    }); };
}
/**
 * Validates required fields in request data
 *
 * @param data - Request data to validate
 * @param requiredFields - Array of required field names
 * @param atLeastOne - If true, at least one field must be present (optional)
 * @throws HttpsError if validation fails
 */
function validateRequiredFields(data, requiredFields, atLeastOne) {
    if (atLeastOne) {
        // At least one of the fields must be present
        var hasOne = requiredFields.some(function (field) {
            return data[field] !== undefined && data[field] !== null && data[field] !== '';
        });
        if (!hasOne) {
            throw createError(ErrorCategory.VALIDATION, "Pelo menos um dos campos \u00E9 obrigat\u00F3rio: ".concat(requiredFields.join(' ou ')), { requiredFields: requiredFields });
        }
        return;
    }
    var missing = [];
    for (var _i = 0, requiredFields_1 = requiredFields; _i < requiredFields_1.length; _i++) {
        var field = requiredFields_1[_i];
        if (data[field] === undefined || data[field] === null || data[field] === '') {
            missing.push(field);
        }
    }
    if (missing.length > 0) {
        throw createError(ErrorCategory.VALIDATION, "Campos obrigat\u00F3rios n\u00E3o fornecidos: ".concat(missing.join(', ')), { missingFields: missing });
    }
}
/**
 * Validates a field against allowed values
 *
 * @param field - Field name
 * @param value - Field value
 * @param allowedValues - Array of allowed values
 * @throws HttpsError if validation fails
 */
function validateAllowedValues(field, value, allowedValues) {
    if (!allowedValues.includes(value)) {
        throw createError(ErrorCategory.VALIDATION, "Valor inv\u00E1lido para ".concat(field, ": ").concat(value, ". Valores permitidos: ").concat(allowedValues.join(', ')), { field: field, value: value, allowedValues: allowedValues });
    }
}
/**
 * Wraps a database operation with error handling
 *
 * @param operation - Description of the operation
 * @param fn - Async function to execute
 * @returns Result of the function
 */
function withDatabaseErrorHandling(operation, fn) {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fn()];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_2 = _a.sent();
                    throw createError(ErrorCategory.DATABASE, "Erro ao ".concat(operation, ": ").concat(error_2.message), { operation: operation }, error_2);
                case 3: return [2 /*return*/];
            }
        });
    });
}
