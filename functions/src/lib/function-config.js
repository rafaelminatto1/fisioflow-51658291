"use strict";
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
exports.globalRateLimiter = exports.RateLimiter = exports.queryCache = exports.organizationCache = exports.SimpleCache = exports.EVOLUTION_HTTP_OPTS = exports.WEBHOOK_FUNCTION = exports.LONG_RUNNING_FUNCTION = exports.AI_FUNCTION_CRITICAL = exports.AI_FUNCTION = exports.DATABASE_FUNCTION = exports.STANDARD_FUNCTION = exports.SIMPLE_FUNCTION = exports.GLOBAL_OPTIONS = void 0;
exports.withCors = withCors;
exports.withRetry = withRetry;
exports.measureTime = measureTime;
var cors_1 = require("./cors");
// ============================================================================
// CONFIGURAÇÕES GLOBAIS (usadas no setGlobalOptions)
// ============================================================================
exports.GLOBAL_OPTIONS = {
    region: 'southamerica-east1',
    // Aumentado para permitir mais instâncias concorrentes
    maxInstances: 10,
    // Memória suficiente para operações normais e concorrência
    memory: '512MiB',
    // CPU necessário para concorrência > 1
    cpu: 1,
    timeoutSeconds: 60,
    concurrency: 80, // Gen 2 standard concurrency
    minInstances: 0,
};
// ============================================================================
// PRESETS POR TIPO DE FUNÇÃO
// ============================================================================
/**
 * Funções simples (CRUD básico)
 * Baixa CPU, memória baixa, escalam rapidamente
 */
exports.SIMPLE_FUNCTION = {
    region: 'southamerica-east1',
    memory: '256MiB', // Aumentado para suportar concorrência
    maxInstances: 50,
    cpu: 1, // CPU 1 para permitir concurrency
    timeoutSeconds: 30,
    concurrency: 80,
};
/**
 * Funções padrão de API
 * Memória moderada, CPU moderada
 * Nota: concurrency > 1 requer cpu >= 1
 */
exports.STANDARD_FUNCTION = {
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 20,
    cpu: 1,
    timeoutSeconds: 60,
    concurrency: 80,
};
/**
 * Funções com queries de banco complexas
 * Mais memória para processar resultados
 * Nota: concurrency > 1 requer cpu >= 1
 */
exports.DATABASE_FUNCTION = {
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 10,
    cpu: 1,
    timeoutSeconds: 120,
    concurrency: 1, // Mantém 1 para operações pesadas de DB
};
/**
 * Funções de IA (processamento pesado)
 * Máxima CPU e memória para processamento
 */
exports.AI_FUNCTION = {
    region: 'southamerica-east1',
    memory: '1GiB',
    maxInstances: 3, // Limitado para controlar custos de GPU/API
    cpu: 2,
    timeoutSeconds: 300, // 5 minutos para operações de IA
    concurrency: 1,
};
/**
 * Funções de IA críticas (prioritárias)
 * Com minInstances para reduzir cold start
 */
exports.AI_FUNCTION_CRITICAL = {
    region: 'southamerica-east1',
    memory: '1GiB',
    maxInstances: 3,
    cpu: 2,
    timeoutSeconds: 540, // 9 minutos (máximo)
    concurrency: 1,
    minInstances: 1, // Mantém 1 instância sempre quente
};
/**
 * Funções de longa duração (migrations, reports)
 * Muito tempo de processamento
 */
exports.LONG_RUNNING_FUNCTION = {
    region: 'southamerica-east1',
    memory: '1GiB',
    maxInstances: 2,
    cpu: 1,
    timeoutSeconds: 540, // 9 minutos
    concurrency: 1,
};
/**
 * Funções de webhook (precisam responder rápido)
 * Baixa latência, processamento rápido
 */
exports.WEBHOOK_FUNCTION = {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 30,
    cpu: 0.5,
    timeoutSeconds: 30,
    concurrency: 20,
};
// EVOLUTION_HTTP_OPTS - Moved to evolutions.ts as inline config to avoid CORS conflict
exports.EVOLUTION_HTTP_OPTS = withCors(exports.DATABASE_FUNCTION, cors_1.CORS_ORIGINS);
/**
 * Funções com CORS HTTP
 * Para chamadas diretas do navegador
 */
function withCors(opts, corsOrigins) {
    return __assign(__assign({}, opts), { cors: corsOrigins, invoker: 'public' });
}
// ============================================================================
// CACHE CONFIGURATION
// ============================================================================
/**
 * Cache em memória para reduzir chamadas repetitivas
 */
var SimpleCache = /** @class */ (function () {
    function SimpleCache(ttlMs) {
        if (ttlMs === void 0) { ttlMs = 60000; }
        this.cache = new Map();
        this.ttl = ttlMs;
    }
    SimpleCache.prototype.get = function (key) {
        var entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.expires) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    };
    SimpleCache.prototype.set = function (key, value) {
        this.cache.set(key, {
            value: value,
            expires: Date.now() + this.ttl,
        });
    };
    SimpleCache.prototype.delete = function (key) {
        this.cache.delete(key);
    };
    SimpleCache.prototype.clear = function () {
        this.cache.clear();
    };
    /**
     * Remove entradas expiradas
     */
    SimpleCache.prototype.cleanup = function () {
        var now = Date.now();
        for (var _i = 0, _a = this.cache.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], entry = _b[1];
            if (now > entry.expires) {
                this.cache.delete(key);
            }
        }
    };
    return SimpleCache;
}());
exports.SimpleCache = SimpleCache;
/**
 * Cache global para organization ID (reduz queries repetidas)
 */
exports.organizationCache = new SimpleCache(300000); // 5 minutos
/**
 * Cache para resultados de queries frequentes
 */
exports.queryCache = new SimpleCache(60000); // 1 minuto
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Wrapper para função com retry automático
 */
function withRetry(fn_1) {
    return __awaiter(this, arguments, void 0, function (fn, maxRetries, delayMs) {
        var lastError, _loop_1, attempt, state_1;
        if (maxRetries === void 0) { maxRetries = 3; }
        if (delayMs === void 0) { delayMs = 100; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _loop_1 = function (attempt) {
                        var _b, error_1;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    _c.trys.push([0, 2, , 5]);
                                    _b = {};
                                    return [4 /*yield*/, fn()];
                                case 1: return [2 /*return*/, (_b.value = _c.sent(), _b)];
                                case 2:
                                    error_1 = _c.sent();
                                    lastError = error_1;
                                    if (!(attempt < maxRetries)) return [3 /*break*/, 4];
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delayMs * Math.pow(2, attempt)); })];
                                case 3:
                                    _c.sent();
                                    _c.label = 4;
                                case 4: return [3 /*break*/, 5];
                                case 5: return [2 /*return*/];
                            }
                        });
                    };
                    attempt = 0;
                    _a.label = 1;
                case 1:
                    if (!(attempt <= maxRetries)) return [3 /*break*/, 4];
                    return [5 /*yield**/, _loop_1(attempt)];
                case 2:
                    state_1 = _a.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _a.label = 3;
                case 3:
                    attempt++;
                    return [3 /*break*/, 1];
                case 4: throw lastError;
            }
        });
    });
}
/**
 * Mede tempo de execução de uma função
 */
function measureTime(fn, label) {
    return __awaiter(this, void 0, void 0, function () {
        var start, result, duration, error_2, duration;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    start = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fn()];
                case 2:
                    result = _a.sent();
                    duration = Date.now() - start;
                    console.log("[Performance] ".concat(label, ": ").concat(duration, "ms"));
                    return [2 /*return*/, result];
                case 3:
                    error_2 = _a.sent();
                    duration = Date.now() - start;
                    console.error("[Performance] ".concat(label, ": FAILED after ").concat(duration, "ms"));
                    throw error_2;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Limita taxa de execução (rate limiting por chave)
 */
var RateLimiter = /** @class */ (function () {
    function RateLimiter(windowMs, maxRequests) {
        if (windowMs === void 0) { windowMs = 60000; }
        if (maxRequests === void 0) { maxRequests = 100; }
        this.requests = new Map();
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
    }
    RateLimiter.prototype.check = function (key) {
        var _this = this;
        var now = Date.now();
        var requests = this.requests.get(key) || [];
        // Remove requisições antigas
        var validRequests = requests.filter(function (t) { return now - t < _this.windowMs; });
        this.requests.set(key, validRequests);
        if (validRequests.length >= this.maxRequests) {
            return false;
        }
        validRequests.push(now);
        this.requests.set(key, validRequests);
        return true;
    };
    RateLimiter.prototype.reset = function (key) {
        this.requests.delete(key);
    };
    RateLimiter.prototype.cleanup = function () {
        var _this = this;
        var now = Date.now();
        for (var _i = 0, _a = this.requests.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], requests = _b[1];
            var validRequests = requests.filter(function (t) { return now - t < _this.windowMs; });
            if (validRequests.length === 0) {
                this.requests.delete(key);
            }
            else {
                this.requests.set(key, validRequests);
            }
        }
    };
    return RateLimiter;
}());
exports.RateLimiter = RateLimiter;
/**
 * Rate limiter global para funções (100 requisições/minuto por IP)
 */
exports.globalRateLimiter = new RateLimiter(60000, 100);
