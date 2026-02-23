"use strict";
/**
 * Structured Logging Module
 * Logging estruturado para Cloud Functions compatível com Cloud Logging
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
exports.logger = exports.StructuredLogger = exports.LogLevel = void 0;
exports.getLogger = getLogger;
exports.logExecution = logExecution;
/**
 * Níveis de log
 */
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
    LogLevel["CRITICAL"] = "CRITICAL";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * Logger para Cloud Functions
 */
var StructuredLogger = /** @class */ (function () {
    function StructuredLogger(functionName, region) {
        if (region === void 0) { region = 'southamerica-east1'; }
        this.functionName = functionName;
        this.region = region;
        this.context = {
            functionName: functionName,
            functionRegion: region,
        };
    }
    /**
     * Define o contexto de log
     */
    StructuredLogger.prototype.setContext = function (context) {
        Object.assign(this.context, context);
    };
    /**
     * Limpa o contexto de log
     */
    StructuredLogger.prototype.clearContext = function () {
        this.context.userId = undefined;
        this.context.organizationId = undefined;
        this.context.requestId = undefined;
    };
    /**
     * Log em nível DEBUG
     */
    StructuredLogger.prototype.debug = function (message, data) {
        this.log(LogLevel.DEBUG, message, data);
    };
    /**
     * Log em nível INFO
     */
    StructuredLogger.prototype.info = function (message, data) {
        this.log(LogLevel.INFO, message, data);
    };
    /**
     * Log em nível WARN
     */
    StructuredLogger.prototype.warn = function (message, data) {
        this.log(LogLevel.WARN, message, data);
    };
    /**
     * Log em nível ERROR.
     * Assinatura: (message, data?) — use um único objeto no 2º argumento para múltiplos campos (ex: { message, stack, error }).
     */
    StructuredLogger.prototype.error = function (message, error) {
        this.log(LogLevel.ERROR, message, error);
    };
    /**
     * Log em nível CRITICAL
     */
    StructuredLogger.prototype.critical = function (message, error) {
        this.log(LogLevel.CRITICAL, message, error);
    };
    /**
     * Log genérico
     */
    StructuredLogger.prototype.log = function (severity, message, data) {
        var entry = __assign({ severity: severity, message: message, timestamp: new Date().toISOString() }, this.context);
        // Adicionar dados adicionais
        if (data) {
            if (data instanceof Error) {
                entry.error = {
                    name: data.name,
                    message: data.message,
                    stack: data.stack,
                };
                entry.errorType = data.name;
                entry.errorMessage = data.message;
            }
            else {
                Object.assign(entry, data);
            }
        }
        // Formatar para Cloud Logging
        var formatted = this.formatForCloudLogging(entry);
        // Escrever no console com o formato correto
        switch (severity) {
            case LogLevel.DEBUG:
                console.debug(formatted);
                break;
            case LogLevel.INFO:
                console.info(formatted);
                break;
            case LogLevel.WARN:
                console.warn(formatted);
                break;
            case LogLevel.ERROR:
            case LogLevel.CRITICAL:
                console.error(formatted);
                break;
        }
    };
    /**
     * Formata entrada para Cloud Logging
     */
    StructuredLogger.prototype.formatForCloudLogging = function (entry) {
        // Cloud Logging espera JSON estruturado
        var cloudEntry = {
            severity: entry.severity,
            message: entry.message,
            time: entry.timestamp,
            // Labels para filtragem - usar notação de colchetes para keys com pontos
            'logging.googleapis.com/labels': __assign(__assign({ function_name: this.functionName, region: this.region }, (entry.userId && { user_id: entry.userId })), (entry.organizationId && { organization_id: entry.organizationId })),
        };
        // Adicionar contexto
        if (entry.context) {
            Object.assign(cloudEntry, entry.context);
        }
        // Adicionar erro se presente
        if (entry.error) {
            cloudEntry.stack_trace = entry.error.stack;
            cloudEntry.serviceContext = {
                service: this.functionName,
                version: '1.0.0',
            };
        }
        return JSON.stringify(cloudEntry);
    };
    /**
     * Mede tempo de execução
     */
    StructuredLogger.prototype.measure = function (operation, fn) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, result, duration, error_1, duration;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = Date.now();
                        this.debug("".concat(operation, " - Started"));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, fn()];
                    case 2:
                        result = _a.sent();
                        duration = Date.now() - startTime;
                        this.info("".concat(operation, " - Completed"), { duration_ms: duration });
                        return [2 /*return*/, result];
                    case 3:
                        error_1 = _a.sent();
                        duration = Date.now() - startTime;
                        this.error("".concat(operation, " - Failed after ").concat(duration, "ms"), error_1);
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return StructuredLogger;
}());
exports.StructuredLogger = StructuredLogger;
/**
 * Mapa de loggers singleton por função
 */
var loggerInstances = new Map();
/**
 * Obtém um logger para a função atual
 */
function getLogger(functionName, region) {
    if (!loggerInstances.has(functionName)) {
        loggerInstances.set(functionName, new StructuredLogger(functionName, region));
    }
    return loggerInstances.get(functionName);
}
/**
 * Decorator para logging automático de funções
 */
function logExecution(logger, operationName) {
    return function (target, propertyKey, descriptor) {
        var originalMethod = descriptor.value;
        var operation = operationName || propertyKey;
        descriptor.value = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return __awaiter(this, void 0, void 0, function () {
                var startTime, result, duration, error_2, duration;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            logger.debug("".concat(operation, " - Started"), { args: args });
                            startTime = Date.now();
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, originalMethod.apply(this, args)];
                        case 2:
                            result = _a.sent();
                            duration = Date.now() - startTime;
                            logger.info("".concat(operation, " - Completed"), {
                                duration_ms: duration,
                                result: typeof result === 'object' ? __assign({}, result) : result,
                            });
                            return [2 /*return*/, result];
                        case 3:
                            error_2 = _a.sent();
                            duration = Date.now() - startTime;
                            logger.error("".concat(operation, " - Failed"), {
                                duration_ms: duration,
                                error: error_2,
                                args: args,
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
/**
 * Logger padrão para uso geral
 */
exports.logger = {
    debug: function (message, data) {
        getLogger('default').debug(message, data);
    },
    info: function (message, data) {
        getLogger('default').info(message, data);
    },
    warn: function (message, data) {
        getLogger('default').warn(message, data);
    },
    error: function (message, error) {
        getLogger('default').error(message, error);
    },
    critical: function (message, error) {
        getLogger('default').critical(message, error);
    },
    measure: function (operation, fn) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, getLogger('default').measure(operation, fn)];
        });
    }); },
};
