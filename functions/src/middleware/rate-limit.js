"use strict";
/**
 * Rate Limiting Middleware
 * Middleware para limitar requisições por usuário/IP usando PostgreSQL
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
exports.RATE_LIMITS = void 0;
exports.withRateLimit = withRateLimit;
exports.enforceRateLimit = enforceRateLimit;
exports.enforceHeavyRateLimit = enforceHeavyRateLimit;
exports.enforceExportRateLimit = enforceExportRateLimit;
exports.getRateLimitStats = getRateLimitStats;
exports.resetRateLimit = resetRateLimit;
exports.cleanupRateLimits = cleanupRateLimits;
var https_1 = require("firebase-functions/v2/https");
var init_1 = require("../init");
var logger_1 = require("../lib/logger");
/**
 * Tabela de rate limits no PostgreSQL
 */
var RATE_LIMIT_TABLE = 'rate_limits';
/**
 * Inicializa a tabela de rate limits se não existir
 */
function initRateLimitTable() {
    return __awaiter(this, void 0, void 0, function () {
        var pool;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query("\n    CREATE TABLE IF NOT EXISTS ".concat(RATE_LIMIT_TABLE, " (\n      id SERIAL PRIMARY KEY,\n      identifier VARCHAR(255) NOT NULL,\n      key VARCHAR(100) NOT NULL,\n      count INTEGER NOT NULL DEFAULT 1,\n      window_start TIMESTAMP NOT NULL DEFAULT NOW(),\n      window_end TIMESTAMP NOT NULL,\n      created_at TIMESTAMP NOT NULL DEFAULT NOW(),\n      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),\n      CONSTRAINT rate_limits_unique UNIQUE (identifier, key)\n    );\n\n    CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_key ON ").concat(RATE_LIMIT_TABLE, "(identifier, key);\n    CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end ON ").concat(RATE_LIMIT_TABLE, "(window_end);\n\n    -- Limpar registros antigos automaticamente\n    CREATE OR REPLACE FUNCTION cleanup_old_rate_limits() RETURNS void AS $$\n    BEGIN\n      DELETE FROM ").concat(RATE_LIMIT_TABLE, " WHERE window_end < NOW();\n    END;\n    $$ LANGUAGE plpgsql;\n  "))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Verifica se uma requisição deve ser limitada
 */
function checkRateLimit(identifier, config) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, now, windowEnd, result, row, remaining, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    now = new Date();
                    windowEnd = new Date(now.getTime() + config.window * 1000);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, pool.query("\n      INSERT INTO ".concat(RATE_LIMIT_TABLE, " (identifier, key, window_start, window_end, count)\n      VALUES ($1, $2, NOW(), $3, 1)\n      ON CONFLICT (identifier, key)\n      DO UPDATE SET\n        count = ").concat(RATE_LIMIT_TABLE, ".count + 1,\n        updated_at = NOW(),\n        window_end = CASE\n          WHEN ").concat(RATE_LIMIT_TABLE, ".window_end < NOW() THEN $3\n          ELSE ").concat(RATE_LIMIT_TABLE, ".window_end\n        END,\n        count = CASE\n          WHEN ").concat(RATE_LIMIT_TABLE, ".window_end < NOW() THEN 1\n          ELSE ").concat(RATE_LIMIT_TABLE, ".count + 1\n        END\n      RETURNING count, window_end\n    "), [identifier, config.key, windowEnd])];
                case 2:
                    result = _a.sent();
                    row = result.rows[0];
                    remaining = Math.max(0, config.limit - row.count);
                    // Limpar registros expirados periodicamente
                    if (Math.random() < 0.01) { // 1% de chance
                        pool.query('SELECT cleanup_old_rate_limits()').catch(function () { });
                    }
                    return [2 /*return*/, {
                            success: row.count <= config.limit,
                            limit: config.limit,
                            remaining: remaining,
                            reset: new Date(row.window_end).getTime(),
                        }];
                case 3:
                    error_1 = _a.sent();
                    logger_1.logger.error('[RateLimit] Error checking rate limit:', error_1);
                    // Fail open - permitir requisição se houver erro
                    return [2 /*return*/, {
                            success: true,
                            limit: config.limit,
                            remaining: config.limit - 1,
                            reset: now.getTime() + config.window * 1000,
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Configurações padrão de rate limit por tipo de requisição
 */
exports.RATE_LIMITS = {
    // API calls - 100 requests per minute
    default: { limit: 100, window: 60, key: 'default' },
    // Callable functions - 60 requests per minute
    callable: { limit: 60, window: 60, key: 'callable' },
    // Heavy operations - 10 requests per minute
    heavy: { limit: 10, window: 60, key: 'heavy' },
    // Auth operations - 20 requests per 5 minutes
    auth: { limit: 20, window: 300, key: 'auth' },
    // Export/generate reports - 5 requests per hour
    export: { limit: 5, window: 3600, key: 'export' },
};
/**
 * Middleware de rate limiting para callable functions
 *
 * @example
 * ```typescript
 * export const myFunction = onCall(
 *   withRateLimit(RATE_LIMITS.callable),
 *   async (request) => {
 *     // ...
 *   }
 * );
 * ```
 */
function withRateLimit(config) {
    if (config === void 0) { config = exports.RATE_LIMITS.callable; }
    return {
        enforceAppCheck: true,
        // Adicionar outras opções conforme necessário
    };
}
/**
 * Função para verificar rate limit dentro de uma callable function
 *
 * @example
 * ```typescript
 * export const myFunction = onCall(async (request) => {
 *   await enforceRateLimit(request, RATE_LIMITS.callable);
 *   // ...
 * });
 * ```
 */
function enforceRateLimit(request_1) {
    return __awaiter(this, arguments, void 0, function (request, config) {
        var userId, ipAddress, identifier, result;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        if (config === void 0) { config = exports.RATE_LIMITS.callable; }
        return __generator(this, function (_l) {
            switch (_l.label) {
                case 0:
                    userId = ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || ((_c = (_b = request.auth) === null || _b === void 0 ? void 0 : _b.token) === null || _c === void 0 ? void 0 : _c.user_id);
                    ipAddress = ((_e = (_d = request.rawRequest) === null || _d === void 0 ? void 0 : _d.headers) === null || _e === void 0 ? void 0 : _e['x-forwarded-for']) ||
                        ((_g = (_f = request.rawRequest) === null || _f === void 0 ? void 0 : _f.headers) === null || _g === void 0 ? void 0 : _g['fastly-client-ip']) ||
                        ((_j = (_h = request.rawRequest) === null || _h === void 0 ? void 0 : _h.socket) === null || _j === void 0 ? void 0 : _j.remoteAddress) ||
                        'unknown';
                    identifier = userId ? "user:".concat(userId) : "ip:".concat(ipAddress);
                    // Inicializar tabela se necessário (em background)
                    initRateLimitTable().catch(function () { });
                    return [4 /*yield*/, checkRateLimit(identifier, config)];
                case 1:
                    result = _l.sent();
                    // Adicionar headers de rate limit ao response (se disponível)
                    if ((_k = request.rawRequest) === null || _k === void 0 ? void 0 : _k.res) {
                        request.rawRequest.res.setHeader('X-RateLimit-Limit', result.limit.toString());
                        request.rawRequest.res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
                        request.rawRequest.res.setHeader('X-RateLimit-Reset', result.reset.toString());
                    }
                    if (!result.success) {
                        throw new https_1.HttpsError('resource-exhausted', "Rate limit exceeded. Please try again later.", {
                            limit: result.limit,
                            remaining: result.remaining,
                            reset: result.reset,
                        });
                    }
                    logger_1.logger.info("[RateLimit] ".concat(identifier, ": ").concat(result.limit - result.remaining, "/").concat(result.limit, " requests"));
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Rate limit específico para operações pesadas
 */
function enforceHeavyRateLimit(request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, enforceRateLimit(request, exports.RATE_LIMITS.heavy)];
        });
    });
}
/**
 * Rate limit específico para operações de exportação
 */
function enforceExportRateLimit(request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, enforceRateLimit(request, exports.RATE_LIMITS.export)];
        });
    });
}
/**
 * Obter estatísticas de rate limit de um usuário
 */
function getRateLimitStats(identifier_1) {
    return __awaiter(this, arguments, void 0, function (identifier, key) {
        var pool, result, row, error_2;
        var _a;
        if (key === void 0) { key = 'default'; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, pool.query("\n      SELECT count, window_end\n      FROM ".concat(RATE_LIMIT_TABLE, "\n      WHERE identifier = $1 AND key = $2 AND window_end > NOW()\n      ORDER BY window_end DESC\n      LIMIT 1\n    "), [identifier, key])];
                case 2:
                    result = _b.sent();
                    if (result.rows.length === 0) {
                        return [2 /*return*/, null];
                    }
                    row = result.rows[0];
                    return [2 /*return*/, {
                            current: row.count,
                            limit: ((_a = exports.RATE_LIMITS[key]) === null || _a === void 0 ? void 0 : _a.limit) || exports.RATE_LIMITS.default.limit,
                            reset: new Date(row.window_end).getTime(),
                        }];
                case 3:
                    error_2 = _b.sent();
                    logger_1.logger.error('[RateLimit] Error getting stats:', error_2);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Resetar rate limit de um usuário (admin only)
 */
function resetRateLimit(identifier_1) {
    return __awaiter(this, arguments, void 0, function (identifier, key) {
        var pool, error_3;
        if (key === void 0) { key = 'default'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, pool.query("\n      DELETE FROM ".concat(RATE_LIMIT_TABLE, "\n      WHERE identifier = $1 AND key = $2\n    "), [identifier, key])];
                case 2:
                    _a.sent();
                    logger_1.logger.info("[RateLimit] Reset rate limit for ".concat(identifier, ":").concat(key));
                    return [2 /*return*/, true];
                case 3:
                    error_3 = _a.sent();
                    logger_1.logger.error('[RateLimit] Error resetting rate limit:', error_3);
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Limpar registros antigos de rate limit
 */
function cleanupRateLimits() {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, pool.query("\n      DELETE FROM ".concat(RATE_LIMIT_TABLE, "\n      WHERE window_end < NOW()\n      RETURNING id\n    "))];
                case 2:
                    result = _a.sent();
                    logger_1.logger.info("[RateLimit] Cleaned up ".concat(result.rows.length, " old rate limit records"));
                    return [2 /*return*/, result.rows.length];
                case 3:
                    error_4 = _a.sent();
                    logger_1.logger.error('[RateLimit] Error cleaning up rate limits:', error_4);
                    return [2 /*return*/, 0];
                case 4: return [2 /*return*/];
            }
        });
    });
}
