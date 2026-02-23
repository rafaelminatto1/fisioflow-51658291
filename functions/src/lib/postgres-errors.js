"use strict";
/**
 * PostgreSQL Error Handler
 *
 * Provides specific error handling for PostgreSQL error codes
 * https://www.postgresql.org/docs/current/errcodes-appendix.html
 *
 * @module lib/postgres-errors
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
exports.PostgresErrorCode = void 0;
exports.translatePostgresError = translatePostgresError;
exports.isRetryablePostgresError = isRetryablePostgresError;
exports.isPostgresError = isPostgresError;
exports.withPostgresErrorHandling = withPostgresErrorHandling;
exports.withRetry = withRetry;
// ============================================================================
// POSTGRESQL ERROR CODES
// ============================================================================
/**
 * PostgreSQL error codes that we handle specifically
 */
var https_1 = require("firebase-functions/v2/https");
var logger = require("firebase-functions/logger");
var PostgresErrorCode;
(function (PostgresErrorCode) {
    // Class 23 - Integrity Constraint Violation
    PostgresErrorCode["UNIQUE_VIOLATION"] = "23505";
    PostgresErrorCode["FOREIGN_KEY_VIOLATION"] = "23503";
    PostgresErrorCode["NOT_NULL_VIOLATION"] = "23502";
    PostgresErrorCode["CHECK_VIOLATION"] = "23514";
    PostgresErrorCode["EXCLUSION_VIOLATION"] = "23P01";
    // Class 40 - Transaction Rollback
    PostgresErrorCode["SERIALIZATION_FAILURE"] = "40001";
    PostgresErrorCode["TRANSACTION_ROLLBACK"] = "40002";
    PostgresErrorCode["DEADLOCK_DETECTED"] = "40P01";
    // Class 08 - Connection Exception
    PostgresErrorCode["CONNECTION_EXCEPTION"] = "08000";
    PostgresErrorCode["CONNECTION_DOES_NOT_EXIST"] = "08003";
    PostgresErrorCode["CONNECTION_FAILURE"] = "08006";
    // Class 53 - Insufficient Resources
    PostgresErrorCode["INSUFFICIENT_RESOURCES"] = "53000";
    PostgresErrorCode["DISK_FULL"] = "53100";
    PostgresErrorCode["OUT_OF_MEMORY"] = "53200";
    // Class 54 - Program Limit Exceeded
    PostgresErrorCode["PROGRAM_LIMIT_EXCEEDED"] = "54000";
    PostgresErrorCode["TOO_MANY_CONNECTIONS"] = "53300";
    // Class 40 - Query Cancellation
    PostgresErrorCode["QUERY_CANCELED"] = "57014";
    // Class 28 - Authorization
    PostgresErrorCode["INSUFFICIENT_PRIVILEGE"] = "42501";
})(PostgresErrorCode || (exports.PostgresErrorCode = PostgresErrorCode = {}));
// ============================================================================
// ERROR TRANSLATION
// ============================================================================
/**
 * Translates PostgreSQL errors to user-friendly Firebase HttpsError messages
 */
function translatePostgresError(error) {
    var postgresError = error;
    var code = postgresError.code;
    logger.error('[PostgresError]', {
        code: code,
        detail: postgresError.detail,
        table: postgresError.table,
        column: postgresError.column,
        constraint: postgresError.constraint,
        message: error.message,
    });
    switch (code) {
        // ========================================================================
        // UNIQUE VIOLATION (23505) - Duplicate key
        // ========================================================================
        case PostgresErrorCode.UNIQUE_VIOLATION:
            return new https_1.HttpsError('already-exists', formatUniqueViolationError(postgresError), { constraint: postgresError.constraint, table: postgresError.table });
        // ========================================================================
        // FOREIGN KEY VIOLATION (23503) - Referenced key doesn't exist
        // ========================================================================
        case PostgresErrorCode.FOREIGN_KEY_VIOLATION:
            return new https_1.HttpsError('failed-precondition', formatForeignKeyViolationError(postgresError), { constraint: postgresError.constraint, table: postgresError.table });
        // ========================================================================
        // NOT NULL VIOLATION (23502) - Required field missing
        // ========================================================================
        case PostgresErrorCode.NOT_NULL_VIOLATION:
            return new https_1.HttpsError('invalid-argument', "O campo '".concat(postgresError.column, "' \u00E9 obrigat\u00F3rio e n\u00E3o foi informado."), { column: postgresError.column, table: postgresError.table });
        // ========================================================================
        // SERIALIZATION FAILURE (40001) - Concurrent modification
        // ========================================================================
        case PostgresErrorCode.SERIALIZATION_FAILURE:
        case PostgresErrorCode.DEADLOCK_DETECTED:
            return new https_1.HttpsError('aborted', 'Este registro foi modificado por outro usuário. Por favor, tente novamente.', { code: code, retryable: true });
        // ========================================================================
        // CONNECTION ERRORS (08xxx)
        // ========================================================================
        case PostgresErrorCode.CONNECTION_EXCEPTION:
        case PostgresErrorCode.CONNECTION_FAILURE:
        case PostgresErrorCode.CONNECTION_DOES_NOT_EXIST:
            return new https_1.HttpsError('unavailable', 'Serviço temporariamente indisponível. Por favor, tente novamente em alguns instantes.', { code: code, retryable: true });
        // ========================================================================
        // INSUFFICIENT RESOURCES (53xxx, 54xxx)
        // ========================================================================
        case PostgresErrorCode.INSUFFICIENT_RESOURCES:
        case PostgresErrorCode.DISK_FULL:
        case PostgresErrorCode.OUT_OF_MEMORY:
        case PostgresErrorCode.TOO_MANY_CONNECTIONS:
            return new https_1.HttpsError('unavailable', 'Serviço sobrecarregado. Por favor, aguarde alguns instantes e tente novamente.', { code: code, retryable: true });
        // ========================================================================
        // AUTHORIZATION ERRORS (28xxx)
        // ========================================================================
        case PostgresErrorCode.INSUFFICIENT_PRIVILEGE:
            return new https_1.HttpsError('permission-denied', 'Você não tem permissão para realizar esta operação.', { code: code });
        // ========================================================================
        // DEFAULT - Unknown error
        // ========================================================================
        default:
            return new https_1.HttpsError('internal', 'Erro ao processar sua solicitação. Por favor, tente novamente.', { originalMessage: error.message, code: code });
    }
}
/**
 * Formats unique violation error messages
 */
function formatUniqueViolationError(error) {
    var constraint = error.constraint || '';
    var table = error.table || '';
    // Common constraint patterns
    if (constraint.includes('email') || constraint.includes('cpf')) {
        return 'Já existe um registro com este e-mail/CPF.';
    }
    if (constraint.includes('username') || constraint.includes('name')) {
        return 'Já existe um registro com este nome.';
    }
    if (table === 'patients' && constraint.includes('organization_id')) {
        return 'Já existe um paciente com este código na organização.';
    }
    if (table === 'appointments' && constraint.includes('patient_professional_time')) {
        return 'Já existe um agendamento para este horário.';
    }
    return 'Já existe um registro com estes dados. Por favor, verifique e tente novamente.';
}
/**
 * Formats foreign key violation error messages
 */
function formatForeignKeyViolationError(error) {
    var constraint = error.constraint || '';
    if (constraint.includes('organization')) {
        return 'Organização não encontrada.';
    }
    if (constraint.includes('patient')) {
        return 'Paciente não encontrado.';
    }
    if (constraint.includes('professional') || constraint.includes('therapist')) {
        return 'Profissional não encontrado.';
    }
    if (constraint.includes('appointment')) {
        return 'Agendamento não encontrado.';
    }
    if (constraint.includes('exercise')) {
        return 'Exercício não encontrado.';
    }
    return 'Registro relacionado não encontrado. Por favor, verifique os dados informados.';
}
// ============================================================================
// ERROR CHECKING UTILITIES
// ============================================================================
/**
 * Check if an error is a retryable PostgreSQL error
 */
function isRetryablePostgresError(error) {
    var postgresError = error;
    var code = postgresError.code;
    return [
        PostgresErrorCode.SERIALIZATION_FAILURE,
        PostgresErrorCode.DEADLOCK_DETECTED,
        PostgresErrorCode.CONNECTION_EXCEPTION,
        PostgresErrorCode.CONNECTION_FAILURE,
        PostgresErrorCode.INSUFFICIENT_RESOURCES,
        PostgresErrorCode.TOO_MANY_CONNECTIONS,
        PostgresErrorCode.QUERY_CANCELED,
    ].includes(code);
}
/**
 * Check if an error is a PostgreSQL error
 */
function isPostgresError(error) {
    var postgresError = error;
    return postgresError.code !== undefined;
}
/**
 * Wrap a database operation with automatic error translation
 */
function withPostgresErrorHandling(operation, context) {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, operation()];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_1 = _a.sent();
                    if (isPostgresError(error_1)) {
                        logger.error("[PostgresError".concat(context ? " in ".concat(context) : '', "]"), {
                            code: error_1.code,
                            message: error_1.message,
                        });
                        throw translatePostgresError(error_1);
                    }
                    throw error_1;
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Retry wrapper for retryable PostgreSQL errors
 */
function withRetry(operation_1) {
    return __awaiter(this, arguments, void 0, function (operation, maxRetries, delayMs) {
        var lastError, attempt, error_2, delay;
        if (maxRetries === void 0) { maxRetries = 3; }
        if (delayMs === void 0) { delayMs = 500; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    attempt = 0;
                    _a.label = 1;
                case 1:
                    if (!(attempt <= maxRetries)) return [3 /*break*/, 7];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 6]);
                    return [4 /*yield*/, operation()];
                case 3: return [2 /*return*/, _a.sent()];
                case 4:
                    error_2 = _a.sent();
                    lastError = error_2;
                    if (attempt === maxRetries || !isRetryablePostgresError(error_2)) {
                        throw error_2;
                    }
                    delay = delayMs * Math.pow(2, attempt);
                    logger.warn("[PostgresRetry] Attempt ".concat(attempt + 1, " failed, retrying in ").concat(delay, "ms..."), {
                        code: error_2.code,
                        message: error_2.message,
                    });
                    return [4 /*yield*/, sleep(delay)];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 6:
                    attempt++;
                    return [3 /*break*/, 1];
                case 7: throw lastError;
            }
        });
    });
}
/**
 * Sleep utility
 */
function sleep(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
